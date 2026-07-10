<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomEntity extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * "Employee-submittable" isn't a real column — it's represented by the
     * existence of a hidden CustomEntityField row with this reserved key,
     * so the feature needs no schema change. See fields()/allFieldsIncludingSystem()
     * and the allowEmployeeSubmissions() accessor below.
     */
    const SUBMISSION_FLAG_KEY = '__allow_employee_submissions';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'created_by',
    ];

    protected $appends = ['allow_employee_submissions'];

    /**
     * The user-visible fields only — excludes the reserved submission-flag row.
     * This is the relationship every existing consumer (dynamic form rendering,
     * the builder's edit dialog, fields_count) already uses, so none of them
     * need to know the reserved row exists.
     */
    public function fields()
    {
        return $this->hasMany(CustomEntityField::class)
            ->where('key', '!=', self::SUBMISSION_FLAG_KEY)
            ->orderBy('sort_order');
    }

    /**
     * Unfiltered — used only to check for/manage the reserved submission-flag row.
     */
    public function allFieldsIncludingSystem()
    {
        return $this->hasMany(CustomEntityField::class)->orderBy('sort_order');
    }

    protected function allowEmployeeSubmissions(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->allFieldsIncludingSystem()->where('key', self::SUBMISSION_FLAG_KEY)->exists(),
        );
    }

    public function records()
    {
        return $this->hasMany(CustomEntityRecord::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
