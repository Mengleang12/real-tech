<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Admin extends Authenticatable
{
    protected $fillable = [
        'username',
        'password_hash',
        'auth_token',
        'token_expiry',
    ];

    protected $hidden = [
        'password_hash',
        'auth_token',
    ];

    protected $casts = [
        'token_expiry' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}
