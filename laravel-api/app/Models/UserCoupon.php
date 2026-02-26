<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class UserCoupon extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'coupon_id',
        'is_used',
        'used_on_sale_id',
        'used_at',
    ];

    protected $casts = [
        'is_used' => 'boolean',
        'used_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function coupon()
    {
        return $this->belongsTo(Coupon::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class, 'used_on_sale_id');
    }
}
