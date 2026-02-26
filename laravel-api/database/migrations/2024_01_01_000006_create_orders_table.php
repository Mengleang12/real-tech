<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('app_id');
            $table->string('app_name', 255);
            $table->decimal('amount', 10, 2);
            $table->decimal('original_price', 10, 2)->nullable();
            $table->decimal('item_discount', 10, 2)->nullable()->default(0);
            $table->string('item_discount_type', 10)->nullable();
            $table->decimal('sale_discount', 10, 2)->nullable()->default(0);
            $table->string('sale_discount_type', 10)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['pending', 'paid', 'failed', 'expired'])->default('pending');
            $table->string('payment_md5', 64)->nullable();
            $table->string('bakong_transaction_id', 100)->nullable();
            $table->datetime('paid_at')->nullable();
            $table->datetime('expires_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('app_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
