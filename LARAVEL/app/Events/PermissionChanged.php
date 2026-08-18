<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast over the target user's private channel whenever Super Admin grants,
 * revokes, or bulk-updates their permissions. The React client listens and
 * re-fetches /api/user to pull updated permissions live — no logout, no reload.
 */
class PermissionChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly User   $targetUser,
        /** 'granted' | 'revoked' | 'updated' */
        public readonly string $action,
    ) {}

    /**
     * The private channel for this specific user.
     * Route: private-App.Models.User.{id}
     */
    public function broadcastOn(): Channel
    {
        return new PrivateChannel("App.Models.User.{$this->targetUser->id}");
    }

    public function broadcastAs(): string
    {
        return 'PermissionChanged';
    }

    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'userId' => $this->targetUser->id,
        ];
    }
}
