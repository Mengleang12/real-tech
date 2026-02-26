<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderAttachment extends Model
{
    protected $fillable = [
        'order_id',
        'file_url',
        'file_name',
        'file_type',
        'file_size',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
