<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Rename admins table to users
        Schema::rename('admins', 'users');

        // 2. Update user_roles: change FK from customers to users (admins)
        Schema::table('user_roles', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->renameColumn('customer_id', 'user_id');
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        // Reverse: user_roles FK back to customers
        Schema::table('user_roles', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->renameColumn('user_id', 'customer_id');
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
        });

        // Rename users back to admins
        Schema::rename('users', 'admins');
    }
};
