<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppVideo extends Model
{
    protected $fillable = [
        'app_id',
        'title',
        'youtube_url',
        'sort_order',
    ];

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }
}
