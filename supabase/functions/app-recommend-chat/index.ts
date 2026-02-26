/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LARAVEL_API_URL = (Deno.env.get("LARAVEL_API_URL") || "https://api.realtechcomputer.com").replace(/\/$/, '');

interface App {
  id: number;
  name: string;
  name_km?: string;
  description?: string;
  description_km?: string;
  icon_url?: string;
  price?: number;
  category?: string;
  is_popular?: boolean;
  download_count?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    console.log("LOVABLE_API_KEY present:", !!LOVABLE_API_KEY);
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { messages } = await req.json();
    console.log("Received messages count:", messages?.length, "Messages:", JSON.stringify(messages?.map((m: {role: string, content: string}) => ({ role: m.role, content: m.content.substring(0, 50) }))));
    
    // Fetch ALL apps from Laravel API by paginating through all pages
    let apps: App[] = [];
    try {
      // First, get total count
      const countResponse = await fetch(`${LARAVEL_API_URL}/api/apps?limit=1`);
      let totalApps = 1500; // default fallback
      if (countResponse.ok) {
        const countData = await countResponse.json();
        totalApps = countData.pagination?.total || 1500;
        console.log("Total apps in catalog:", totalApps);
      }
      
      // Fetch all apps in one request with high limit
      console.log("Fetching all apps with limit:", totalApps);
      const appsResponse = await fetch(`${LARAVEL_API_URL}/api/apps?limit=${totalApps}`);
      if (appsResponse.ok) {
        const data = await appsResponse.json();
        // API returns apps in "apps" key
        apps = data.apps || data.data || [];
        console.log("Fetched apps count:", apps.length);
        
        // Log if Microsoft Office apps are found
        const officeApps = apps.filter(a => a.name?.toLowerCase().includes('microsoft office'));
        console.log("Microsoft Office apps found:", officeApps.length, officeApps.map(a => `${a.id}:${a.name}`));
      } else {
        console.error("Failed to fetch apps:", appsResponse.status);
      }
    } catch (e) {
      console.error("Failed to fetch apps:", e);
    }

    // Create a structured apps context for the AI - use icon_url as-is from database
    // Only expose minimal data needed for AI recommendations - exclude pricing and download stats
    const appsContext = apps.map(app => ({
      id: app.id,
      name: app.name,
      name_km: app.name_km || app.name,
      description: app.description || "",
      description_km: app.description_km || app.description || "",
      icon_url: app.icon_url || "",
      category: app.category || "programs",
      is_popular: app.is_popular || false,
    }));

    const systemPrompt = `You are an intelligent assistant for "Style Ghost" app store. Your mission is to UNDERSTAND what users need and recommend the BEST matching apps from our catalog.

Available apps in our store:
${JSON.stringify(appsContext, null, 2)}

## YOUR CORE MISSION:
1. Understand what the user wants to accomplish
2. ALWAYS find and recommend the closest matching apps from our catalog
3. NEVER say an app is "not available" - instead, recommend alternatives that serve the same purpose

## UNDERSTANDING USER INTENT:
1. **Direct requests**: "I need Microsoft Office" → find Office suites, document editors, spreadsheet apps, presentation software
2. **Task-based requests**: "I want to edit videos" → find video editing software
3. **Problem-based requests**: "My computer is slow" → find system optimizers
4. **Download requests**: "download videos from YouTube/Facebook" → find download managers

## SMART MATCHING STRATEGY:
When user asks for a specific app (e.g., "Microsoft Office", "Photoshop", "Chrome"):
1. First, search for the EXACT app name in our catalog
2. If exact match found, recommend it
3. If NOT found, find apps that serve the SAME PURPOSE:
   - "Microsoft Office" → find any office suite, document editor, Word alternative, Excel alternative, presentation app
   - "Photoshop" → find any photo editor, image editor, graphic design software
   - "Chrome" → find any web browser
4. ALWAYS recommend something - there's usually a relevant app in our catalog!

## RESPONSE FORMAT - ALL 7 FIELDS ARE MANDATORY:
[APP:id:name:icon_url:is_popular:download_count:description]

**CRITICAL - THE DESCRIPTION FIELD MUST NEVER BE EMPTY!**
- Always include a description - use the app's description from the data
- If the app has no description in the data, write a helpful 1-2 sentence description based on the app name
- Use the icon_url EXACTLY as provided in the app data (e.g., /icons/app_name.png)

✅ CORRECT: [APP:2054:Downie 4:/icons/downie_4.png:false:0:Downie 4 is a powerful video downloader for Mac that supports YouTube, Facebook, Vimeo and thousands of other sites.]
❌ WRONG: [APP:2054:Downie 4:https://example.com/icons/downie_4.png:false:0:]

## CRITICAL RULES:
1. **ONLY recommend apps from the list above** - use their exact ID, icon_url (keep the original path as-is), is_popular, and download_count
2. Find 1-4 relevant apps based on the user's need
3. **DESCRIPTION IS MANDATORY** - Never leave it empty!
4. Match user's language (English/Khmer)
5. **NEVER say "not available"** - always find the closest alternative and explain how it can help
6. When recommending alternatives, say something like "While Microsoft Office isn't in our store, here are excellent alternatives that can handle your document needs:"

Example for "I need Microsoft Office":
"Great choice for productivity! Here are some excellent office suite options available in our store:

[APP:123:LibreOffice:/icons/libreoffice.png:true:5000:A powerful free office suite compatible with Microsoft Office formats, including Writer, Calc, and Impress for all your document needs.]

This is a fantastic alternative that opens and edits Word, Excel, and PowerPoint files!"`;

    console.log("Calling AI Gateway with improved intent understanding");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
