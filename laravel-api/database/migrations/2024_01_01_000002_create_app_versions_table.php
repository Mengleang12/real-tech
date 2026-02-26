<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('app_id')->constrained()->cascadeOnDelete();
            $table->string('version', 50);
            $table->date('release_date')->nullable();
            $table->text('changelog')->nullable();
            $table->text('changelog_km')->nullable();
            $table->string('file_size', 50)->nullable();
            $table->string('download_url', 500)->nullable();
            $table->boolean('is_latest')->default(false);
            $table->string('min_os_version', 50)->nullable();
            $table->timestamps();

            $table->index('app_id');
            $table->index('is_latest');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_versions');
    }
};
