<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change user_roles.role from enum to varchar to allow custom roles
        // MySQL doesn't support ALTER COLUMN on enums easily, so we recreate
        DB::statement("ALTER TABLE user_roles MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user'");

        // Create role_permissions table
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role', 50); // Role name (e.g., 'admin', 'moderator', 'editor')
            $table->string('permission', 100); // Permission key (e.g., 'apps.create')
            $table->timestamps();
            
            $table->unique(['role', 'permission']);
            $table->index('role');
        });

        // Seed default permissions for admin and moderator
        $adminPermissions = [
            'apps.view', 'apps.create', 'apps.edit', 'apps.delete',
            'users.view', 'users.manage',
            'orders.view', 'orders.manage',
            'roles.manage',
            'analytics.view',
            'notifications.manage',
            'reviews.manage',
            'activity.view',
            'user_status.manage',
            'coupons.manage',
            'settings.manage',
            'storage.manage',
            'receipts.view',
        ];

        $moderatorPermissions = [
            'apps.view', 'apps.create', 'apps.edit',
            'reviews.manage',
            'notifications.manage',
            'activity.view',
        ];

        $now = now();
        
        foreach ($adminPermissions as $perm) {
            DB::table('role_permissions')->insert([
                'role' => 'admin',
                'permission' => $perm,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach ($moderatorPermissions as $perm) {
            DB::table('role_permissions')->insert([
                'role' => 'moderator',
                'permission' => $perm,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
        DB::statement("ALTER TABLE user_roles MODIFY COLUMN role ENUM('admin', 'moderator', 'user') NOT NULL DEFAULT 'user'");
    }
};
