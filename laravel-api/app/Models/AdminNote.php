<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminNote extends Model
{
    protected $table = 'admin_notes';

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'category',
        'is_pinned',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
