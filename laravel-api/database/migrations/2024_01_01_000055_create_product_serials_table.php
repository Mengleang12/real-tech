<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_serials', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->string('serial_number', 255);
            $table->string('barcode', 255)->unique(); // unique scannable code (auto-generated or = serial)
            $table->enum('status', ['available', 'sold', 'reserved', 'defective'])->default('available');
            $table->string('sale_id', 36)->nullable(); // linked sale when sold
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->index(['barcode']);
            $table->index(['serial_number']);
            $table->index(['product_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_serials');
    }
};
