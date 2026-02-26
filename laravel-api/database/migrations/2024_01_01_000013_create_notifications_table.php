<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('title_km')->nullable();
            $table->text('message');
            $table->text('message_km')->nullable();
            $table->enum('type', ['announcement', 'update', 'promotion', 'system'])->default('announcement');
            $table->enum('target_users', ['all', 'admins', 'specific'])->default('all');
            $table->json('specific_user_ids')->nullable();
            $table->json('is_read_by')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('admins')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};