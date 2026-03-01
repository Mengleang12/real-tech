<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_receive_logs', function (Blueprint $table) {
            $table->id();
            $table->char('purchase_id', 36);
            $table->unsignedBigInteger('purchase_item_id');
            $table->string('product_name');
            $table->string('variant_label')->nullable();
            $table->integer('quantity_received');
            $table->integer('previous_received')->default(0);
            $table->integer('new_total_received')->default(0);
            $table->unsignedBigInteger('received_by')->nullable();
            $table->timestamp('received_at')->useCurrent();
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('purchases')->onDelete('cascade');
            $table->foreign('purchase_item_id')->references('id')->on('purchase_items')->onDelete('cascade');
            $table->index('purchase_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_receive_logs');
    }
};
