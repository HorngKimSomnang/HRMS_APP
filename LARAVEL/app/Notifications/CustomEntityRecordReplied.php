<?php

namespace App\Notifications;

use App\Models\CustomEntity;
use App\Models\CustomEntityRecord;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CustomEntityRecordReplied extends Notification
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
        return [
            'type' => 'custom_entity_record_replied',
            'message' => "You got a reply on your \"{$this->entity->name}\" submission",
            'entity_slug' => $this->entity->slug,
            'record_id' => $this->record->id,
        ];
    }
}
