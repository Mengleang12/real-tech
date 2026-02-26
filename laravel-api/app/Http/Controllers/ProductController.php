<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\AppScreenshot;
use App\Models\AppVideo;
use App\Models\Order;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class AppController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $query = App::with(['versions' => function ($q) {
            $q->where('is_latest', true);
        }, 'screenshots', 'categoryRelation', 'brand', 'attributeValues.attribute', 'variants']);

        // Filter by category
        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        // Search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_km', 'like', "%{$search}%")
                  ->orWhere('developer', 'like', "%{$search}%");
            });
        }

        // Featured filter
        if ($request->has('featured') && $request->featured === 'true') {
            $query->where('is_featured', true);
        }

        // Popular filter
        if ($request->has('popular') && $request->popular === 'true') {
            $query->where('is_popular', true);
        }

        // Price range filters
        if ($request->has('min_price') && is_numeric($request->min_price)) {
            $query->where('price', '>=', (float) $request->min_price);
        }

        if ($request->has('max_price') && is_numeric($request->max_price)) {
            $query->where('price', '<=', (float) $request->max_price);
        }

        // Free only filter
        if ($request->has('free_only') && $request->free_only === 'true') {
            $query->where(function ($q) {
                $q->whereNull('price')->orWhere('price', 0);
            });
        }

        // Pagination
        $page = (int) ($request->page ?? 1);
        $limit = (int) ($request->limit ?? 20);
        $offset = ($page - 1) * $limit;

        $total = $query->count();
        $apps = $query->skip($offset)->take($limit)->get();

        // For app list, always hide download URLs (security)
        $apps = $apps->map(function ($app) {
            if ($app->versions) {
                $app->versions = $app->versions->map(function ($version) {
                    $version->download_url = null;
                    return $version;
                });
            }
            return $app;
        });

        return response()->json([
            'apps' => $apps,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit),
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        $app = App::with(['versions.download_links', 'screenshots', 'videos', 'categoryRelation', 'brand', 'attributeValues.attribute', 'variants'])->find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        // Check if user has access to download URLs
        $canAccessDownloads = false;
        
        // Check if request is from admin (admin can always access all data)
        $token = $request->bearerToken();
        if ($token) {
            $admin = \App\Models\Admin::where('auth_token', $token)
                ->where('token_expiry', '>', now())
                ->first();
            if ($admin) {
                $canAccessDownloads = true;
            }
        }

        // Free apps allow downloads
        if (!$canAccessDownloads && (!$app->price || $app->price == 0)) {
            $canAccessDownloads = true;
        }
        
        if (!$canAccessDownloads) {
            // For paid apps, verify user authentication via JWT token
            if ($token) {
                try {
                    $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(config('app.jwt_secret'), 'HS256'));
                    $userId = $decoded->user_id;
                    
                    $hasPurchased = Order::where('user_id', $userId)
                        ->where('app_id', $id)
                        ->whereIn('status', ['paid', 'approved'])
                        ->exists();
                    $canAccessDownloads = $hasPurchased;
                } catch (\Exception $e) {
                    $canAccessDownloads = false;
                }
            }
        }

        // If user cannot access downloads, hide the URLs and videos
        if (!$canAccessDownloads && $app->versions) {
            $app->versions = $app->versions->map(function ($version) {
                $version->download_url = null;
                if ($version->download_links) {
                    $version->download_links = $version->download_links->map(function ($link) {
                        $link->url = null;
                        return $link;
                    });
                }
                return $version;
            });
            // Hide videos for paid apps that user hasn't purchased
            $app->setRelation('videos', collect([]));
        }

        return response()->json(['app' => $app]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:programs,games,extensions,os',
        ]);

        $app = App::create([
            'name' => $request->name,
            'name_km' => $request->name_km,
            'description' => $request->description,
            'description_km' => $request->description_km,
            'category' => $request->category,
            'category_id' => $request->category_id,
            'icon_url' => $request->icon_url,
            'developer' => $request->developer,
            'brand_id' => $request->brand_id,
            'website' => $request->website,
            'is_featured' => $request->is_featured ?? false,
            'is_popular' => $request->is_popular ?? false,
            'price' => $request->price,
            'stock_quantity' => $request->stock_quantity ?? 0,
            'low_stock_threshold' => $request->low_stock_threshold ?? 5,
        ]);

        // Update stock status
        $app->updateStockStatus();

        // Handle screenshots
        if ($request->has('screenshots') && is_array($request->screenshots)) {
            foreach ($request->screenshots as $index => $url) {
                AppScreenshot::create([
                    'app_id' => $app->id,
                    'image_url' => $url,
                    'sort_order' => $index,
                ]);
            }
        }

        // Handle videos
        if ($request->has('videos') && is_array($request->videos)) {
            foreach ($request->videos as $index => $video) {
                AppVideo::create([
                    'app_id' => $app->id,
                    'title' => $video['title'] ?? '',
                    'youtube_url' => $video['youtube_url'] ?? '',
                    'sort_order' => $index,
                ]);
            }
        }

        // Handle attribute values
        if ($request->has('attribute_values') && is_array($request->attribute_values)) {
            foreach ($request->attribute_values as $av) {
                if (!empty($av['attribute_id']) && isset($av['value'])) {
                    ProductAttributeValue::create([
                        'app_id' => $app->id,
                        'attribute_id' => $av['attribute_id'],
                        'value' => $av['value'],
                        'stock_quantity' => $av['stock_quantity'] ?? 0,
                    ]);
                }
            }
        }

        // Handle variants
        if ($request->has('variants') && is_array($request->variants)) {
            foreach ($request->variants as $variant) {
                if (!empty($variant['combination'])) {
                    ProductVariant::create([
                        'app_id' => $app->id,
                        'combination' => $variant['combination'],
                        'sku' => $variant['sku'] ?? null,
                        'stock_quantity' => $variant['stock_quantity'] ?? 0,
                        'price_adjustment' => $variant['price_adjustment'] ?? 0,
                        'is_active' => $variant['is_active'] ?? true,
                    ]);
                }
            }
        }

        $this->logActivity($request, 'app_create', [
            'app_id' => $app->id,
            'app_name' => $app->name,
        ]);

        return response()->json([
            'success' => true,
            'id' => $app->id,
            'message' => 'App created successfully',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $app = App::find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        $app->update([
            'name' => $request->name ?? $app->name,
            'name_km' => $request->name_km ?? $app->name_km,
            'description' => $request->description ?? $app->description,
            'description_km' => $request->description_km ?? $app->description_km,
            'category' => $request->category ?? $app->category,
            'category_id' => $request->has('category_id') ? $request->category_id : $app->category_id,
            'icon_url' => $request->icon_url ?? $app->icon_url,
            'developer' => $request->developer ?? $app->developer,
            'brand_id' => $request->has('brand_id') ? $request->brand_id : $app->brand_id,
            'website' => $request->website ?? $app->website,
            'is_featured' => $request->is_featured ?? $app->is_featured,
            'is_popular' => $request->is_popular ?? $app->is_popular,
            'price' => $request->price ?? $app->price,
            'stock_quantity' => $request->has('stock_quantity') ? $request->stock_quantity : $app->stock_quantity,
            'low_stock_threshold' => $request->has('low_stock_threshold') ? $request->low_stock_threshold : $app->low_stock_threshold,
        ]);

        // Update stock status
        $app->updateStockStatus();

        // Handle screenshots update
        if ($request->has('screenshots') && is_array($request->screenshots)) {
            $app->screenshots()->delete();
            foreach ($request->screenshots as $index => $url) {
                AppScreenshot::create([
                    'app_id' => $app->id,
                    'image_url' => $url,
                    'sort_order' => $index,
                ]);
            }
        }

        // Handle videos update
        if ($request->has('videos') && is_array($request->videos)) {
            $app->videos()->delete();
            foreach ($request->videos as $index => $video) {
                AppVideo::create([
                    'app_id' => $app->id,
                    'title' => $video['title'] ?? '',
                    'youtube_url' => $video['youtube_url'] ?? '',
                    'sort_order' => $index,
                ]);
            }
        }

        // Handle attribute values update
        if ($request->has('attribute_values') && is_array($request->attribute_values)) {
            $app->attributeValues()->delete();
            foreach ($request->attribute_values as $av) {
                if (!empty($av['attribute_id']) && isset($av['value'])) {
                    ProductAttributeValue::create([
                        'app_id' => $app->id,
                        'attribute_id' => $av['attribute_id'],
                        'value' => $av['value'],
                        'stock_quantity' => $av['stock_quantity'] ?? 0,
                    ]);
                }
            }
        }

        // Handle variants update
        if ($request->has('variants') && is_array($request->variants)) {
            $app->variants()->delete();
            foreach ($request->variants as $variant) {
                if (!empty($variant['combination'])) {
                    ProductVariant::create([
                        'app_id' => $app->id,
                        'combination' => $variant['combination'],
                        'sku' => $variant['sku'] ?? null,
                        'stock_quantity' => $variant['stock_quantity'] ?? 0,
                        'price_adjustment' => $variant['price_adjustment'] ?? 0,
                        'is_active' => $variant['is_active'] ?? true,
                    ]);
                }
            }
        }

        $this->logActivity($request, 'app_update', [
            'app_id' => $app->id,
            'app_name' => $app->name,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'App updated successfully',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $app = App::find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        $appName = $app->name;
        $app->delete();

        $this->logActivity($request, 'app_delete', [
            'app_id' => $id,
            'app_name' => $appName,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'App deleted successfully',
        ]);
    }
}
