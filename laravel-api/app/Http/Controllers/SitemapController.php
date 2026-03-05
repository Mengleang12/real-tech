<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index()
    {
        $siteUrl = 'https://realtechcomputer.com';
        $today = now()->toDateString();

        $products = Product::select('id', 'updated_at')->get();

        $urls = '';
        $urls .= $this->buildUrl($siteUrl . '/', $today, 'daily', '1.0');

        foreach ($products as $product) {
            $lastmod = $product->updated_at ? $product->updated_at->toDateString() : $today;
            $urls .= $this->buildUrl($siteUrl . '/' . $product->id, $lastmod, 'weekly', '0.8');
        }

        $sitemap = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $sitemap .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        $sitemap .= $urls;
        $sitemap .= '</urlset>';

        return response($sitemap, 200)
            ->header('Content-Type', 'application/xml')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    private function buildUrl(string $loc, string $lastmod, string $changefreq, string $priority): string
    {
        return "  <url>\n" .
               "    <loc>{$loc}</loc>\n" .
               "    <lastmod>{$lastmod}</lastmod>\n" .
               "    <changefreq>{$changefreq}</changefreq>\n" .
               "    <priority>{$priority}</priority>\n" .
               "  </url>\n";
    }
}
