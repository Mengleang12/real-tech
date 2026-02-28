<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add purchase_price to product_variants
        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('purchase_price', 10, 2)->default(0)->after('price_adjustment');
        });

        // Remove price, sku, stock fields from products table
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['sku', 'price', 'purchase_price', 'stock_quantity', 'low_stock_threshold', 'stock_status']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('sku', 100)->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->integer('low_stock_threshold')->default(5);
            $table->enum('stock_status', ['in_stock', 'low_stock', 'out_of_stock'])->default('in_stock');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('purchase_price');
        });
    }
};
