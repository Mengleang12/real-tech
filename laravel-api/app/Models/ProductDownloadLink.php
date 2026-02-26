<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppDownloadLink extends Model
{
    protected $fillable = [
        'app_version_id',
        'title',
        'url',
        'link_type',
        'sort_order',
    ];

    public function version(): BelongsTo
    {
        return $this->belongsTo(AppVersion::class, 'app_version_id');
    }
}
