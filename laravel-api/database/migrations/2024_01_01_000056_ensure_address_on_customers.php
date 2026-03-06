<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('customers', 'address')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->text('address')->nullable()->after('avatar_url');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('customers', 'address')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('address');
            });
        }
    }
};
