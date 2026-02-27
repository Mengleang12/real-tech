<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Purchase orders (from suppliers)
        Schema::create('purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference_number', 50)->unique();
            $table->string('supplier_name', 255);
            $table->enum('status', ['draft', 'ordered', 'partial', 'received', 'completed', 'cancelled'])->default('draft');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->text('notes')->nullable();
            $table->datetime('ordered_at')->nullable();
            $table->datetime('received_at')->nullable();
            $table->datetime('completed_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();

            $table->index('status');
            $table->index('supplier_name');
        });

        // Purchase order items
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('purchase_id');
            $table->unsignedBigInteger('product_id');
            $table->string('product_name', 255);
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->string('variant_label', 255)->nullable();
            $table->integer('quantity')->default(1);
            $table->integer('received_quantity')->default(0);
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->decimal('total_cost', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('purchases')->cascadeOnDelete();
            $table->index('purchase_id');
            $table->index('product_id');
        });

        // Purchase payments (to supplier)
        Schema::create('purchase_payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('purchase_id');
            $table->decimal('amount', 10, 2);
            $table->string('method', 50)->default('cash');
            $table->string('reference', 255)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('paid_at')->useCurrent();
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('purchases')->cascadeOnDelete();
            $table->index('purchase_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_payments');
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
    }
};
