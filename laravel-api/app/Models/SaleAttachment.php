<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleAttachment extends Model
{
    protected $table = 'sale_attachments';

    protected $fillable = [
        'sale_id',
        'file_url',
        'file_name',
        'file_type',
        'file_size',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
