<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductScreenshot;
use App\Models\ProductVideo;
use App\Models\Order;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $query = Product::with(['screenshots', 'categoryRelation', 'brand', 'attributeValues.attribute', 'variants'])
            ->where('is_visible', true);

        if ($request->has('category_id') && is_numeric($request->category_id)) {
            $query->where('category_id', (int) $request->category_id);
        } elseif ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_km', 'like', "%{$search}%")
                  ->orWhereHas('variants', function ($vq) use ($search) {
                      $vq->where('sku', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('featured') && $request->featured === 'true') {
            $query->where('is_featured', true);
        }

        if ($request->has('popular') && $request->popular === 'true') {
            $query->where('is_popular', true);
        }

        if ($request->has('min_price') && is_numeric($request->min_price)) {
            $minPrice = (float) $request->min_price;
            $query->whereHas('variants', function ($q) use ($minPrice) {
                $q->where('is_active', true)->where('price_adjustment', '>=', $minPrice);
            });
        }

        if ($request->has('max_price') && is_numeric($request->max_price)) {
            $maxPrice = (float) $request->max_price;
            $query->whereHas('variants', function ($q) use ($maxPrice) {
                $q->where('is_active', true)->where('price_adjustment', '<=', $maxPrice);
            });
        }

        if ($request->has('free_only') && $request->free_only === 'true') {
            $query->whereHas('variants', function ($q) {
                $q->where('is_active', true)->where(function ($sq) {
                    $sq->whereNull('price_adjustment')->orWhere('price_adjustment', 0);
                });
            });
        }

        $page = (int) ($request->page ?? 1);
        $limit = (int) ($request->limit ?? 20);
        $offset = ($page - 1) * $limit;

        $total = $query->count();
        $products = $query->skip($offset)->take($limit)->get();

        return response()->json([
            'products' => $products,
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
        $product = Product::with(['screenshots', 'videos', 'categoryRelation', 'brand', 'attributeValues.attribute', 'variants'])->find($id);

        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $canAccessDownloads = false;
        
        $token = $request->bearerToken();
        if ($token) {
            $admin = \App\Models\User::where('auth_token', $token)
                ->where('token_expiry', '>', now())
                ->first();
            if ($admin) {
                $canAccessDownloads = true;
            }
        }

        // Check if all variants are free
        if (!$canAccessDownloads) {
            $hasOnlyFreeVariants = $product->variants->every(function ($v) {
                return !$v->price_adjustment || $v->price_adjustment == 0;
            });
            if ($hasOnlyFreeVariants) {
                $canAccessDownloads = true;
            }
        }
        
        if (!$canAccessDownloads) {
            if ($token) {
                try {
                    $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(config('app.jwt_secret'), 'HS256'));
                    $userId = $decoded->user_id;
                    
                    $hasPurchased = Order::where('user_id', $userId)
                        ->where('product_id', $id)
                        ->whereIn('status', ['paid', 'approved'])
                        ->exists();
                    $canAccessDownloads = $hasPurchased;
                } catch (\Exception $e) {
                    $canAccessDownloads = false;
                }
            }
        }

        if (!$canAccessDownloads) {
            $product->setRelation('videos', collect([]));
        }

        return response()->json(['product' => $product]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:programs,games,extensions,os',
            'variants' => 'required|array|min:1',
            'variants.*.combination' => 'required|array',
            'variants.*.price_adjustment' => 'required|numeric|min:0',
        ]);

        $product = Product::create([
            'name' => $request->name,
            'name_km' => $request->name_km,
            'description' => $request->description,
            'description_km' => $request->description_km,
            'category' => $request->category,
            'category_id' => $request->category_id,
            'icon_url' => $request->icon_url,
            'brand_id' => $request->brand_id,
            'is_featured' => $request->is_featured ?? false,
            'is_popular' => $request->is_popular ?? false,
            'is_visible' => $request->is_visible ?? true,
        ]);

        if ($request->has('screenshots') && is_array($request->screenshots)) {
            foreach ($request->screenshots as $index => $url) {
                ProductScreenshot::create([
                    'product_id' => $product->id,
                    'image_url' => $url,
                    'sort_order' => $index,
                ]);
            }
        }

        if ($request->has('videos') && is_array($request->videos)) {
            foreach ($request->videos as $index => $video) {
                ProductVideo::create([
                    'product_id' => $product->id,
                    'title' => $video['title'] ?? '',
                    'youtube_url' => $video['youtube_url'] ?? '',
                    'sort_order' => $index,
                ]);
            }
        }

        if ($request->has('attribute_values') && is_array($request->attribute_values)) {
            foreach ($request->attribute_values as $av) {
                if (!empty($av['attribute_id']) && isset($av['value'])) {
                    ProductAttributeValue::create([
                        'product_id' => $product->id,
                        'attribute_id' => $av['attribute_id'],
                        'value' => $av['value'],
                    ]);
                }
            }
        }

        foreach ($request->variants as $variant) {
            if (!empty($variant['combination'])) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'combination' => $variant['combination'],
                    'sku' => $variant['sku'] ?? null,
                    'stock_quantity' => $variant['stock_quantity'] ?? 0,
                    'price_adjustment' => $variant['price_adjustment'] ?? 0,
                    'purchase_price' => $variant['purchase_price'] ?? 0,
                    'is_active' => $variant['is_active'] ?? true,
                    'is_default' => $variant['is_default'] ?? false,
                    'display_color' => $variant['display_color'] ?? null,
                    'variant_image' => $variant['variant_image'] ?? null,
                ]);
            }
        }

        $this->logActivity($request, 'product_create', [
            'product_id' => $product->id,
            'product_name' => $product->name,
        ]);

        return response()->json([
            'success' => true,
            'id' => $product->id,
            'message' => 'Product created successfully',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $product->update([
            'name' => $request->name ?? $product->name,
            'name_km' => $request->name_km ?? $product->name_km,
            'description' => $request->description ?? $product->description,
            'description_km' => $request->description_km ?? $product->description_km,
            'category' => $request->category ?? $product->category,
            'category_id' => $request->has('category_id') ? $request->category_id : $product->category_id,
            'icon_url' => $request->icon_url ?? $product->icon_url,
            'brand_id' => $request->has('brand_id') ? $request->brand_id : $product->brand_id,
            'is_featured' => $request->is_featured ?? $product->is_featured,
            'is_popular' => $request->is_popular ?? $product->is_popular,
            'is_visible' => $request->has('is_visible') ? $request->is_visible : $product->is_visible,
        ]);

        if ($request->has('screenshots') && is_array($request->screenshots)) {
            $product->screenshots()->delete();
            foreach ($request->screenshots as $index => $url) {
                ProductScreenshot::create([
                    'product_id' => $product->id,
                    'image_url' => $url,
                    'sort_order' => $index,
                ]);
            }
        }

        if ($request->has('videos') && is_array($request->videos)) {
            $product->videos()->delete();
            foreach ($request->videos as $index => $video) {
                ProductVideo::create([
                    'product_id' => $product->id,
                    'title' => $video['title'] ?? '',
                    'youtube_url' => $video['youtube_url'] ?? '',
                    'sort_order' => $index,
                ]);
            }
        }

        if ($request->has('attribute_values') && is_array($request->attribute_values)) {
            $product->attributeValues()->delete();
            foreach ($request->attribute_values as $av) {
                if (!empty($av['attribute_id']) && isset($av['value'])) {
                    ProductAttributeValue::create([
                        'product_id' => $product->id,
                        'attribute_id' => $av['attribute_id'],
                        'value' => $av['value'],
                    ]);
                }
            }
        }

        if ($request->has('variants') && is_array($request->variants)) {
            $product->variants()->delete();
            foreach ($request->variants as $variant) {
                if (!empty($variant['combination'])) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'combination' => $variant['combination'],
                        'sku' => $variant['sku'] ?? null,
                        'stock_quantity' => $variant['stock_quantity'] ?? 0,
                        'price_adjustment' => $variant['price_adjustment'] ?? 0,
                        'purchase_price' => $variant['purchase_price'] ?? 0,
                        'is_active' => $variant['is_active'] ?? true,
                        'is_default' => $variant['is_default'] ?? false,
                        'display_color' => $variant['display_color'] ?? null,
                    ]);
                }
            }
        }

        $this->logActivity($request, 'product_update', [
            'product_id' => $product->id,
            'product_name' => $product->name,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $productName = $product->name;
        $product->delete();

        $this->logActivity($request, 'product_delete', [
            'product_id' => $id,
            'product_name' => $productName,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ]);
    }
}
