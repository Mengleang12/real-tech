<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSubmission extends Model
{
    protected $fillable = [
        'app_id',
        'version',
        'status',
        'submitted_by',
        'reviewed_by',
        'review_notes',
        'rejection_reason',
        'submitted_at',
        'reviewed_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function app()
    {
        return $this->belongsTo(App::class);
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewedByAdmin()
    {
        return $this->belongsTo(Admin::class, 'reviewed_by');
    }
}