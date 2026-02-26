<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('discount_value', 10, 2);
            $table->decimal('min_price', 10, 2)->default(0);
            $table->decimal('max_discount', 10, 2)->nullable(); // For percentage type
            $table->datetime('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('code');
            $table->index('is_active');
        });

        Schema::create('user_coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('coupon_id');
            $table->boolean('is_used')->default(false);
            $table->uuid('used_on_order_id')->nullable();
            $table->datetime('used_at')->nullable();
            $table->timestamps();

            $table->foreign('coupon_id')->references('id')->on('coupons')->cascadeOnDelete();
            $table->index('user_id');
            $table->index('coupon_id');
            $table->index('is_used');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_coupons');
        Schema::dropIfExists('coupons');
    }
};
