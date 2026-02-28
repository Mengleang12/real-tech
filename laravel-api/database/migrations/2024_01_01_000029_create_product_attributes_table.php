<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Attribute templates (e.g. Color, Size, Material)
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('name_km', 255)->nullable();
            $table->enum('type', ['text', 'number', 'select', 'boolean'])->default('text');
            $table->json('options')->nullable(); // For 'select' type: ["Red","Blue","Green"]
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Attribute values assigned to products
        Schema::create('product_attribute_values', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('app_id');
            $table->unsignedBigInteger('attribute_id');
            $table->text('value');
            $table->timestamps();

            $table->foreign('app_id')->references('id')->on('apps')->onDelete('cascade');
            $table->foreign('attribute_id')->references('id')->on('product_attributes')->onDelete('cascade');
            $table->unique(['app_id', 'attribute_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attribute_values');
        Schema::dropIfExists('product_attributes');
    }
};
