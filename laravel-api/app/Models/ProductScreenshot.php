<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppScreenshot extends Model
{
    protected $fillable = [
        'app_id',
        'image_url',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public $timestamps = false;

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }
}
