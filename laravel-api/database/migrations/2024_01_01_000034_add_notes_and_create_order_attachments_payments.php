<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add notes column to orders
        Schema::table('orders', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('expires_at');
        });

        // Order attachments (images)
        Schema::create('order_attachments', function (Blueprint $table) {
            $table->id();
            $table->uuid('order_id');
            $table->string('file_url', 500);
            $table->string('file_name', 255);
            $table->string('file_type', 50)->default('image');
            $table->unsignedInteger('file_size')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('order_id');
        });

        // Order payments (partial payments)
        Schema::create('order_payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('order_id');
            $table->decimal('amount', 10, 2);
            $table->string('method', 50)->default('cash');
            $table->string('reference', 255)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('paid_at')->useCurrent();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payments');
        Schema::dropIfExists('order_attachments');

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
