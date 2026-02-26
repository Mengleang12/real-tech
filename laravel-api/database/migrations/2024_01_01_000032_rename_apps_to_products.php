<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('apps', 'products');
        Schema::rename('app_versions', 'product_versions');
        Schema::rename('app_screenshots', 'product_screenshots');
        Schema::rename('app_videos', 'product_videos');
        Schema::rename('app_download_links', 'product_download_links');
        Schema::rename('app_submissions', 'product_submissions');
    }

    public function down(): void
    {
        Schema::rename('products', 'apps');
        Schema::rename('product_versions', 'app_versions');
        Schema::rename('product_screenshots', 'app_screenshots');
        Schema::rename('product_videos', 'app_videos');
        Schema::rename('product_download_links', 'app_download_links');
        Schema::rename('product_submissions', 'app_submissions');
    }
};
