<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('(UUID())'));
            $table->uuid('user_id');
            $table->string('title');
            $table->text('content')->nullable();
            $table->string('category')->default('general');
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();

            $table->index('user_id');
            $table->index('category');
            $table->index('is_pinned');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notes');
    }
};
