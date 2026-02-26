<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_download_links', function (Blueprint $table) {
            $table->enum('link_type', ['direct', 'page'])->default('direct')->after('url');
        });
    }

    public function down(): void
    {
        Schema::table('app_download_links', function (Blueprint $table) {
            $table->dropColumn('link_type');
        });
    }
};
