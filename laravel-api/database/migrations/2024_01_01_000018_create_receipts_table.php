<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('receipt_number', 50)->unique();
            $table->integer('app_id');
            $table->string('app_name', 255);
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('payment_method', 50)->default('ABA PayWay');
            $table->string('transaction_id', 100)->nullable();
            $table->string('user_email', 255);
            $table->string('user_name', 255)->nullable();
            $table->datetime('paid_at');
            $table->boolean('email_sent')->default(false);
            $table->datetime('email_sent_at')->nullable();
            $table->text('download_links')->nullable(); // JSON array of download links
            $table->timestamps();

            $table->index('order_id');
            $table->index('user_id');
            $table->index('receipt_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
