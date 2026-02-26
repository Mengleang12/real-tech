<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename app_id -> product_id and app_name -> product_name across all tables
        Schema::table('orders', function (Blueprint $table) {
            $table->renameColumn('app_id', 'product_id');
            $table->renameColumn('app_name', 'product_name');
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->renameColumn('app_id', 'product_id');
            $table->renameColumn('app_name', 'product_name');
        });

        Schema::table('product_screenshots', function (Blueprint $table) {
            $table->renameColumn('app_id', 'product_id');
        });

        Schema::table('product_videos', function (Blueprint $table) {
            $table->renameColumn('app_id', 'product_id');
        });

        Schema::table('product_submissions', function (Blueprint $table) {
            $table->renameColumn('app_id', 'product_id');
        });

        Schema::table('product_attribute_values', function (Blueprint $table) {
            $table->renameColumn('app_id', 'product_id');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->renameColumn('app_id', 'product_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->renameColumn('product_id', 'app_id');
            $table->renameColumn('product_name', 'app_name');
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->renameColumn('product_id', 'app_id');
            $table->renameColumn('product_name', 'app_name');
        });

        Schema::table('product_screenshots', function (Blueprint $table) {
            $table->renameColumn('product_id', 'app_id');
        });

        Schema::table('product_videos', function (Blueprint $table) {
            $table->renameColumn('product_id', 'app_id');
        });

        Schema::table('product_submissions', function (Blueprint $table) {
            $table->renameColumn('product_id', 'app_id');
        });

        Schema::table('product_attribute_values', function (Blueprint $table) {
            $table->renameColumn('product_id', 'app_id');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->renameColumn('product_id', 'app_id');
        });
    }
};
