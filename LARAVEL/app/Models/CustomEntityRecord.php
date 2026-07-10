<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomEntityRecord extends Model
{
    use SoftDeletes;

    // Reserved key inside `data` for an admin/super-admin reply — kept out of
    // the entity's real fields so it never collides with user-defined field keys
    // and never renders as a dynamic-form column.
    const ADMIN_REPLY_KEY = '__admin_reply';

    protected $fillable = [
        'custom_entity_id',
        'data',
        'created_by',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    protected $appends = ['admin_reply'];

    public function entity()
    {
        return $this->belongsTo(CustomEntity::class, 'custom_entity_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected function adminReply(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->data[self::ADMIN_REPLY_KEY] ?? null,
        );
    }
}
