<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apps', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('name_km', 255)->nullable();
            $table->text('description')->nullable();
            $table->text('description_km')->nullable();
            $table->enum('category', ['programs', 'games', 'extensions', 'os'])->default('programs');
            $table->string('icon_url', 500)->nullable();
            $table->string('developer', 255)->nullable();
            $table->string('website', 500)->nullable();
            $table->boolean('is_featured')->default(false);
            $table->integer('download_count')->default(0);
            $table->decimal('price', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apps');
    }
};
