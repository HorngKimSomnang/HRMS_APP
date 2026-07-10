<?php

namespace App\Notifications;

use App\Models\CustomEntity;
use App\Models\CustomEntityRecord;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CustomEntityRecordSubmitted extends Notification
{
    use Queueable;

    protected $record;
    protected $entity;

    public function __construct(CustomEntityRecord $record, CustomEntity $entity)
    {
        $this->record = $record;
        $this->entity = $entity;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $submitterName = $this->record->creator?->name ?? 'An employee';

        return [
            'type' => 'custom_entity_record_submitted',
            'message' => "New \"{$this->entity->name}\" submission from {$submitterName}",
            'entity_slug' => $this->entity->slug,
            'record_id' => $this->record->id,
        ];
    }
}
