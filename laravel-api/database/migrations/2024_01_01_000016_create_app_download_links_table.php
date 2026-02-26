<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_download_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('app_version_id');
            $table->string('title');
            $table->text('url');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('app_version_id')
                  ->references('id')
                  ->on('app_versions')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_download_links');
    }
};
