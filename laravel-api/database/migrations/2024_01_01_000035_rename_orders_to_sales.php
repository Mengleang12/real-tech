<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename orders → sales
        Schema::rename('orders', 'sales');

        // Rename order_id → sale_id in payment_logs
        Schema::table('payment_logs', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->renameColumn('order_id', 'sale_id');
            $table->foreign('sale_id')->references('id')->on('sales')->cascadeOnDelete();
        });

        // Rename order_id → sale_id in receipts
        Schema::table('receipts', function (Blueprint $table) {
            $table->renameColumn('order_id', 'sale_id');
        });

        // Rename order_attachments → sale_attachments
        Schema::table('order_attachments', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->renameColumn('order_id', 'sale_id');
        });
        Schema::rename('order_attachments', 'sale_attachments');
        Schema::table('sale_attachments', function (Blueprint $table) {
            $table->foreign('sale_id')->references('id')->on('sales')->cascadeOnDelete();
        });

        // Rename order_payments → sale_payments
        Schema::table('order_payments', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->renameColumn('order_id', 'sale_id');
        });
        Schema::rename('order_payments', 'sale_payments');
        Schema::table('sale_payments', function (Blueprint $table) {
            $table->foreign('sale_id')->references('id')->on('sales')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Reverse sale_payments → order_payments
        Schema::table('sale_payments', function (Blueprint $table) {
            $table->dropForeign(['sale_id']);
            $table->renameColumn('sale_id', 'order_id');
        });
        Schema::rename('sale_payments', 'order_payments');
        Schema::table('order_payments', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        // Reverse sale_attachments → order_attachments
        Schema::table('sale_attachments', function (Blueprint $table) {
            $table->dropForeign(['sale_id']);
            $table->renameColumn('sale_id', 'order_id');
        });
        Schema::rename('sale_attachments', 'order_attachments');
        Schema::table('order_attachments', function (Blueprint $table) {
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        // Reverse receipts
        Schema::table('receipts', function (Blueprint $table) {
            $table->renameColumn('sale_id', 'order_id');
        });

        // Reverse payment_logs
        Schema::table('payment_logs', function (Blueprint $table) {
            $table->dropForeign(['sale_id']);
            $table->renameColumn('sale_id', 'order_id');
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        // Reverse sales → orders
        Schema::rename('sales', 'orders');
    }
};
