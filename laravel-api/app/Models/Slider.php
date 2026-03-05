<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Slider extends Model
{
    protected $fillable = [
        'title', 'title_km', 'subtitle', 'subtitle_km',
        'badge', 'badge_km', 'image_url', 'link_url',
        'accent_color', 'gradient', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
