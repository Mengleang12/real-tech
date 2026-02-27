import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Common carriers for China shipments
const CARRIER_MAP: Record<string, number> = {
  "17post": 190011,
  "china-post": 3011,
  "china-ems": 3041,
  "yanwen": 190012,
  "cainiao": 2151,
  "yun-express": 190003,
  "sf-express": 3061,
  "zto-express": 3071,
  "sto-express": 3081,
  "yto-express": 3091,
  "best-express": 3101,
  "dpd": 100052,
  "dhl": 100001,
  "fedex": 100003,
  "ups": 100002,
  "usps": 21051,
  "jt-express": 190237,
  "shopee-express": 190272,
  "auto": 0,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TRACK_API_KEY = Deno.env.get("TRACKING_API_KEY");
    if (!TRACK_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "TRACKING_API_KEY is not configured",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tracking_number, carrier } = await req.json();

    if (!tracking_number) {
      return new Response(
        JSON.stringify({ success: false, error: "tracking_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use 17track Register & Track API
    // Step 1: Register the tracking number
    const carrierCode = CARRIER_MAP[carrier || "auto"] ?? 0;

    const registerBody = [
      {
        number: tracking_number,
        carrier: carrierCode,
      },
    ];

    const registerRes = await fetch("https://api.17track.net/track/v2.2/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACK_API_KEY,
      },
      body: JSON.stringify(registerBody),
    });

    const registerData = await registerRes.json();
    console.log("17track register response:", JSON.stringify(registerData));

    // Step 2: Get tracking info
    // Wait a moment for registration to process
    await new Promise((r) => setTimeout(r, 1000));

    const trackBody = [{ number: tracking_number, carrier: carrierCode }];

    const trackRes = await fetch("https://api.17track.net/track/v2.2/gettrackinfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": TRACK_API_KEY,
      },
      body: JSON.stringify(trackBody),
    });

    const trackData = await trackRes.json();
    console.log("17track gettrackinfo response:", JSON.stringify(trackData));

    if (trackData.code !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: trackData.data?.errors?.[0]?.message || "Failed to get tracking info",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse tracking results
    const accepted = trackData.data?.accepted || [];
    const trackInfo = accepted.length > 0 ? accepted[0] : null;

    if (!trackInfo) {
      return new Response(
        JSON.stringify({
          success: true,
          tracking: {
            tracking_number,
            status: "not_found",
            status_text: "Tracking information not yet available",
            carrier_name: carrier || "Unknown",
            events: [],
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map 17track status codes
    const statusMap: Record<number, string> = {
      0: "not_found",
      10: "in_transit",
      20: "expired",
      30: "pick_up",
      35: "undelivered",
      40: "delivered",
      50: "alert",
    };

    const statusTextMap: Record<number, string> = {
      0: "Not Found",
      10: "In Transit",
      20: "Expired",
      30: "Pick Up",
      35: "Undelivered / Returned",
      40: "Delivered",
      50: "Alert",
    };

    const track = trackInfo.track_info || {};
    const latestStatus = track.latest_status?.status ?? 0;
    const events = (track.tracking?.providers || []).flatMap(
      (p: { events?: Array<{ time_iso: string; description: string; location?: string }> }) =>
        (p.events || []).map((e: { time_iso: string; description: string; location?: string }) => ({
          date: e.time_iso,
          description: e.description,
          location: e.location || "",
        }))
    );

    // Sort events by date descending
    events.sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return new Response(
      JSON.stringify({
        success: true,
        tracking: {
          tracking_number,
          status: statusMap[latestStatus] || "unknown",
          status_text: statusTextMap[latestStatus] || "Unknown",
          carrier_name: track.latest_status?.carrier_name || carrier || "Unknown",
          origin: track.misc_info?.original?.country || "",
          destination: track.misc_info?.destination?.country || "",
          estimated_delivery: track.time_metrics?.estimated_delivery_date?.from || null,
          last_update: track.latest_event?.time_iso || null,
          last_event: track.latest_event?.description || "",
          events,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Tracking error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
