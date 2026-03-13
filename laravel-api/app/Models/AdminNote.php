<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminNote extends Model
{
    use \Illuminate\Database\Eloquent\Concerns\HasUuids;

    protected $table = 'admin_notes';
    public $incrementing = false;
    protected $keyType = 'string';

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
