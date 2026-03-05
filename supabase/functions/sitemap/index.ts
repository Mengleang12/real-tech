import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SITE_URL = "https://realtechcomputer.com";
const API_BASE_URL = Deno.env.get("API_BASE_URL") || "https://api.realtechcomputer.com";

serve(async () => {
  try {
    // Fetch all products from Laravel API
    const response = await fetch(`${API_BASE_URL}/api/products?per_page=1000`);
    const data = await response.json();
    const products = data?.data || data?.products || [];

    const today = new Date().toISOString().split("T")[0];

    let urls = `
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    for (const product of products) {
      const lastmod = product.updated_at
        ? new Date(product.updated_at).toISOString().split("T")[0]
        : today;
      urls += `
  <url>
    <loc>${SITE_URL}/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    // Return minimal sitemap on error
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    return new Response(sitemap, {
      headers: { "Content-Type": "application/xml" },
    });
  }
});
