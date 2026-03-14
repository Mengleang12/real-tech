<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class SerialChanged implements ShouldBroadcastNow
{
    public string $action;
    public int $productId;
    public ?int $variantId;
    public array $serialIds;

    public function __construct(string $action, int $productId, ?int $variantId = null, array $serialIds = [])
    {
        $this->action = $action;
        $this->productId = $productId;
        $this->variantId = $variantId;
        $this->serialIds = $serialIds;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('serials');
    }

    public function broadcastAs(): string
    {
        return 'serial.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'product_id' => $this->productId,
            'variant_id' => $this->variantId,
            'serial_ids' => $this->serialIds,
            'timestamp' => now()->toISOString(),
        ];
    }
}
