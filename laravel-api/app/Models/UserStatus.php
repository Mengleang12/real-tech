<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserStatus extends Model
{
    protected $table = 'user_status';
    
    protected $fillable = [
        'customer_id',
        'status',
        'reason',
        'suspended_until',
        'updated_by',
    ];

    protected $casts = [
        'suspended_until' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function updatedByAdmin()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
