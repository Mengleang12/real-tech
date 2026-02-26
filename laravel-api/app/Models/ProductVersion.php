<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppVersion extends Model
{
    protected $fillable = [
        'app_id',
        'version',
        'release_date',
        'changelog',
        'changelog_km',
        'file_size',
        'download_url',
        'is_latest',
        'is_visible',
        'min_os_version',
        'architecture',
    ];

    protected $casts = [
        'is_latest' => 'boolean',
        'is_visible' => 'boolean',
        'release_date' => 'date',
    ];

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    public function download_links(): HasMany
    {
        return $this->hasMany(AppDownloadLink::class, 'app_version_id');
    }
}
