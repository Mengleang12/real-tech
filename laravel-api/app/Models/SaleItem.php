<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $table = 'sale_items';

    protected $fillable = [
        'sale_id',
        'product_id',
        'variant_id',
        'product_name',
        'quantity',
        'unit_price',
        'total_price',
        'discount',
        'discount_type',
        'serial_numbers',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'discount' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /**
     * Get a human-readable variant label from the variant's combination.
     */
    public function getVariantLabelAttribute(): ?string
    {
        if (!$this->variant) return null;
        $combo = $this->variant->combination;
        if (empty($combo)) return null;
        return implode(' / ', array_values($combo));
    }

    protected $appends = ['variant_label'];
}
