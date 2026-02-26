<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Seed default settings
        $defaults = [
            'maintenance_mode' => 'false',
            'maintenance_message' => 'We are currently performing scheduled maintenance. Please try again later.',
            'allow_new_registrations' => 'true',
            'max_upload_size' => '500',
            'auto_approve_apps' => 'false',
            'site_name' => 'Macsofy',
            'support_email' => 'support@macsofy.com',
            'enable_analytics' => 'true',
        ];

        $now = now();
        foreach ($defaults as $key => $value) {
            DB::table('system_settings')->insert([
                'key' => $key,
                'value' => $value,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
