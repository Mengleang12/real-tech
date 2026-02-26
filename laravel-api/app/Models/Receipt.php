<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Receipt extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'order_id',
        'user_id',
        'receipt_number',
        'product_id',
        'product_name',
        'amount',
        'currency',
        'payment_method',
        'transaction_id',
        'user_email',
        'user_name',
        'paid_at',
        'email_sent',
        'email_sent_at',
        'download_links',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'email_sent' => 'boolean',
        'email_sent_at' => 'datetime',
        'download_links' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->receipt_number)) {
                $model->receipt_number = self::generateReceiptNumber();
            }
        });
    }

    public static function generateReceiptNumber(): string
    {
        $prefix = 'RCP';
        $date = now()->format('Ymd');
        $random = strtoupper(Str::random(6));
        return "{$prefix}-{$date}-{$random}";
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
