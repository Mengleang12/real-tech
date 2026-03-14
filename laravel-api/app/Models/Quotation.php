<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number', 'customer_id', 'customer_name', 'customer_phone', 'customer_email',
        'status', 'subtotal', 'discount_amount', 'discount_type', 'total', 'currency',
        'valid_until', 'notes', 'terms', 'converted_sale_id', 'created_by',
    ];

    protected $casts = [
        'valid_until' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Generate next quotation number like QT-0001
     */
    public static function generateNumber(): string
    {
        $last = self::orderByDesc('id')->first();
        $next = $last ? ((int) substr($last->quotation_number, 3)) + 1 : 1;
        return 'QT-' . str_pad($next, 4, '0', STR_PAD_LEFT);
    }
}
