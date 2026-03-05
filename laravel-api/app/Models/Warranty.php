<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warranty extends Model
{
    protected $fillable = [
        'name',
        'duration_days',
        'policy',
        'is_default',
    ];

    protected $casts = [
        'duration_days' => 'integer',
        'is_default' => 'boolean',
    ];
}
