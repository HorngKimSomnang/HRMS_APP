<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast on a public channel whenever any resource version is bumped.
 * React/Flutter listen on this channel and immediately re-fetch data
 * instead of waiting for the next poll cycle.
 */
class LiveDataChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $resource,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('hrms.live');
    }

    public function broadcastAs(): string
    {
        return 'LiveDataChanged';
    }

    public function broadcastWith(): array
    {
        return [
            'resource' => $this->resource,
            'changedAt' => now()->toISOString(),
        ];
    }
}
