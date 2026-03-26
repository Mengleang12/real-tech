<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Customer extends Authenticatable
{
    protected $table = 'customers';

    protected $fillable = [
        'email',
        'password_hash',
        'full_name',
        'phone',
        'telegram',
        'facebook_name',
        'avatar_url',
        'address',
        'email_verified_at',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'customer_id');
    }

    public function status(): HasOne
    {
        return $this->hasOne(UserStatus::class, 'customer_id');
    }

    public function roles(): HasMany
    {
        return $this->hasMany(UserRole::class, 'customer_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(UserActivityLog::class, 'customer_id');
    }
}
