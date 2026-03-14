<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class SerialChanged implements ShouldBroadcastNow
{
    public string $action;
    public int $productId;
    public ?int $variantId;

    public function __construct(string $action, int $productId, ?int $variantId = null)
    {
        $this->action = $action;
        $this->productId = $productId;
        $this->variantId = $variantId;
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
            'timestamp' => now()->toISOString(),
        ];
    }
}
