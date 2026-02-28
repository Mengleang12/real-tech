<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = ['product_id', 'combination', 'sku', 'stock_quantity', 'price_adjustment', 'purchase_price', 'is_active'];

    protected $casts = [
        'combination' => 'array',
        'stock_quantity' => 'integer',
        'price_adjustment' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get stock status for this variant.
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->stock_quantity <= 0) return 'out_of_stock';
        if ($this->stock_quantity <= 5) return 'low_stock';
        return 'in_stock';
    }
}
