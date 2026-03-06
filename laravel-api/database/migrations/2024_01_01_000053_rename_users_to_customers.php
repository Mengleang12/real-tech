<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('users', 'customers');

        // Update foreign key references in related tables
        // user_roles
        Schema::table('user_roles', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->renameColumn('user_id', 'customer_id');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
        });

        // user_activity_logs
        if (Schema::hasColumn('user_activity_logs', 'user_id')) {
            Schema::table('user_activity_logs', function (Blueprint $table) {
                $table->renameColumn('user_id', 'customer_id');
            });
        }

        // user_status
        if (Schema::hasColumn('user_status', 'user_id')) {
            Schema::table('user_status', function (Blueprint $table) {
                $table->renameColumn('user_id', 'customer_id');
            });
        }

        // user_coupons
        if (Schema::hasColumn('user_coupons', 'user_id')) {
            Schema::table('user_coupons', function (Blueprint $table) {
                $table->renameColumn('user_id', 'customer_id');
            });
        }

        // sales
        if (Schema::hasColumn('sales', 'user_id')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->renameColumn('user_id', 'customer_id');
            });
        }

        // otp_codes - no FK, just column name
        // receipts
        if (Schema::hasColumn('receipts', 'user_id')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->renameColumn('user_id', 'customer_id');
            });
        }
    }

    public function down(): void
    {
        // Reverse all column renames
        Schema::table('receipts', function (Blueprint $table) {
            if (Schema::hasColumn('receipts', 'customer_id')) {
                $table->renameColumn('customer_id', 'user_id');
            }
        });

        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'customer_id')) {
                $table->renameColumn('customer_id', 'user_id');
            }
        });

        Schema::table('user_coupons', function (Blueprint $table) {
            if (Schema::hasColumn('user_coupons', 'customer_id')) {
                $table->renameColumn('customer_id', 'user_id');
            }
        });

        Schema::table('user_status', function (Blueprint $table) {
            if (Schema::hasColumn('user_status', 'customer_id')) {
                $table->renameColumn('customer_id', 'user_id');
            }
        });

        Schema::table('user_activity_logs', function (Blueprint $table) {
            if (Schema::hasColumn('user_activity_logs', 'customer_id')) {
                $table->renameColumn('customer_id', 'user_id');
            }
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->renameColumn('customer_id', 'user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::rename('customers', 'users');
    }
};
