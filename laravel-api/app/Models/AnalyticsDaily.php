<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalyticsDaily extends Model
{
    protected $table = 'analytics_daily';
    
    protected $fillable = [
        'date',
        'total_users',
        'new_users',
        'total_orders',
        'paid_orders',
        'total_revenue',
        'total_downloads',
        'active_users',
    ];

    protected $casts = [
        'date' => 'date',
        'total_revenue' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}