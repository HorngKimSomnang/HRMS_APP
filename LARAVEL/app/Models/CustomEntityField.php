<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomEntityField extends Model
{
    protected $fillable = [
        'custom_entity_id',
        'key',
        'label',
        'type',
        'options',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
    ];

    public function entity()
    {
        return $this->belongsTo(CustomEntity::class, 'custom_entity_id');
    }
}
