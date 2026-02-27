<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->decimal('delivery_fee', 10, 2)->default(0)->after('total_amount');
            $table->decimal('other_expense', 10, 2)->default(0)->after('delivery_fee');
            $table->string('other_expense_note', 255)->nullable()->after('other_expense');
            $table->decimal('grand_total', 12, 2)->default(0)->after('other_expense_note');
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn(['delivery_fee', 'other_expense', 'other_expense_note', 'grand_total']);
        });
    }
};
