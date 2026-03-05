<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sliders', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->string('title_km')->nullable();
            $table->string('subtitle')->nullable();
            $table->string('subtitle_km')->nullable();
            $table->string('badge')->nullable();
            $table->string('badge_km')->nullable();
            $table->string('image_url');
            $table->string('link_url')->nullable();
            $table->string('accent_color')->default('#007AFF');
            $table->string('gradient')->default('from-slate-950/90 via-slate-900/60 to-transparent');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sliders');
    }
};
