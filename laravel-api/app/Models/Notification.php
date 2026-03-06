<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'title',
        'title_km',
        'message',
        'message_km',
        'type',
        'target_users',
        'specific_user_ids',
        'is_read_by',
        'published_at',
        'expires_at',
        'created_by',
    ];

    protected $casts = [
        'specific_user_ids' => 'array',
        'is_read_by' => 'array',
        'published_at' => 'datetime',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function createdByAdmin()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublished($query)
    {
        return $query->whereNotNull('published_at')
                     ->where('published_at', '<=', now());
    }

    public function scopeActive($query)
    {
        return $query->published()
                     ->where(function ($q) {
                         $q->whereNull('expires_at')
                           ->orWhere('expires_at', '>', now());
                     });
    }
}