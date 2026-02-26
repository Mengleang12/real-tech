<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class App extends Model
{
    protected $fillable = [
        'name',
        'name_km',
        'description',
        'description_km',
        'category',
        'category_id',
        'icon_url',
        'developer',
        'brand_id',
        'website',
        'youtube_url',
        'is_featured',
        'is_popular',
        'download_count',
        'price',
        'stock_quantity',
        'low_stock_threshold',
        'stock_status',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_popular' => 'boolean',
        'download_count' => 'integer',
        'price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(AppVersion::class);
    }

    public function screenshots(): HasMany
    {
        return $this->hasMany(AppScreenshot::class);
    }

    public function videos(): HasMany
    {
        return $this->hasMany(AppVideo::class)->orderBy('sort_order');
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
        return $this->hasMany(ProductAttributeValue::class, 'app_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class, 'app_id');
    }

    public function latestVersion()
    {
        return $this->versions()->where('is_latest', true)->first();
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
