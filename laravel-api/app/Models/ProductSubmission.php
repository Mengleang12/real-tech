<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductSubmission extends Model
{
    protected $table = 'product_submissions';

    protected $fillable = [
        'product_id',
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

    public function product()
    {
        return $this->belongsTo(Product::class);
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
