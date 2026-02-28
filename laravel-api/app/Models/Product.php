<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'name',
        'name_km',
        'description',
        'description_km',
        'category',
        'category_id',
        'icon_url',
        'brand_id',
        'youtube_url',
        'is_featured',
        'is_popular',
        'download_count',
        'price',
        'purchase_price',
        'stock_quantity',
        'low_stock_threshold',
        'stock_status',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_popular' => 'boolean',
        'download_count' => 'integer',
        'price' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
    ];

    public function screenshots(): HasMany
    {
        return $this->hasMany(ProductScreenshot::class);
    }

    public function videos(): HasMany
    {
        return $this->hasMany(ProductVideo::class)->orderBy('sort_order');
    }

    public function categoryRelation(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function attributeValues(): HasMany
    {
        return $this->hasMany(ProductAttributeValue::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Automatically update stock_status based on quantity and threshold.
     */
    public function updateStockStatus(): void
    {
        if ($this->stock_quantity <= 0) {
            $this->stock_status = 'out_of_stock';
        } elseif ($this->stock_quantity <= $this->low_stock_threshold) {
            $this->stock_status = 'low_stock';
        } else {
            $this->stock_status = 'in_stock';
        }
        $this->saveQuietly();
    }
}
