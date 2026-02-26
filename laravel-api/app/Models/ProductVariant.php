<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = ['app_id', 'combination', 'sku', 'stock_quantity', 'price_adjustment', 'is_active'];

    protected $casts = [
        'combination' => 'array',
        'stock_quantity' => 'integer',
        'price_adjustment' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'app_id');
    }
}
