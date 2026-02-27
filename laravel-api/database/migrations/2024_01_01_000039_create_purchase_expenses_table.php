<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_expenses', function (Blueprint $table) {
            $table->id();
            $table->uuid('purchase_id');
            $table->string('category', 100); // e.g. delivery, tax, packaging, customs, other
            $table->string('description', 255)->nullable();
            $table->decimal('amount', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('purchases')->cascadeOnDelete();
            $table->index('purchase_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_expenses');
    }
};
