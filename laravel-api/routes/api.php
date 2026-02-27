<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UploadController;

use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\OtpController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\UserStatusController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProductSubmissionController;
use App\Http\Controllers\AIChatController;
use App\Http\Controllers\ReceiptController;
use App\Http\Controllers\MailTestController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\SystemSettingController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductAttributeController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\PurchaseController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [UserController::class, 'register']);
Route::post('/users/login', [UserController::class, 'login']);

// OTP routes (public)
Route::post('/otp/send-registration', [OtpController::class, 'sendRegistrationOtp']);
Route::post('/otp/verify-registration', [OtpController::class, 'verifyRegistrationOtp']);
Route::post('/otp/send-password-reset', [OtpController::class, 'sendPasswordResetOtp']);
Route::post('/otp/verify-password-reset', [OtpController::class, 'verifyPasswordResetOtp']);
Route::post('/otp/verify-reset-code', [OtpController::class, 'verifyResetCode']);
Route::post('/otp/resend', [OtpController::class, 'resendOtp']);

// Products (public read)
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);


// Public: categories & brands for filtering
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/brands', [BrandController::class, 'index']);
Route::get('/product-attributes', [ProductAttributeController::class, 'index']);

// Public maintenance check
Route::get('/admin/settings/maintenance', [SystemSettingController::class, 'maintenanceStatus']);

Route::post('/ai/chat', [AIChatController::class, 'chat']);
Route::post('/ai/chat/stream', [AIChatController::class, 'streamChat']);

// Protected admin routes (admin + moderator)
Route::middleware('auth.admin')->group(function () {
    // Product management
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    
    
    Route::post('/upload', [UploadController::class, 'store']);

    // Categories management
    Route::post('/admin/categories', [CategoryController::class, 'store']);
    Route::put('/admin/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/admin/categories/{id}', [CategoryController::class, 'destroy']);

    // Brands management
    Route::post('/admin/brands', [BrandController::class, 'store']);
    Route::put('/admin/brands/{id}', [BrandController::class, 'update']);
    Route::delete('/admin/brands/{id}', [BrandController::class, 'destroy']);

    // Product attributes management
    Route::post('/admin/product-attributes', [ProductAttributeController::class, 'store']);
    Route::put('/admin/product-attributes/{id}', [ProductAttributeController::class, 'update']);
    Route::delete('/admin/product-attributes/{id}', [ProductAttributeController::class, 'destroy']);
    
    // Notifications
    Route::get('/admin/notifications', [NotificationController::class, 'index']);
    Route::post('/admin/notifications', [NotificationController::class, 'store']);
    Route::put('/admin/notifications/{id}', [NotificationController::class, 'update']);
    Route::delete('/admin/notifications/{id}', [NotificationController::class, 'destroy']);
    
    // Product submissions/review
    Route::get('/admin/submissions', [ProductSubmissionController::class, 'index']);
    Route::put('/admin/submissions/{id}', [ProductSubmissionController::class, 'update']);
    
    // Activity logs
    Route::get('/admin/activity-logs', [ActivityLogController::class, 'index']);

});

// Admin-only routes (no moderator access)
Route::middleware('auth.admin:admin_only')->group(function () {
    // Product deletion (admin only)
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);
    
    
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    
    // Admin user management
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::get('/admin/users/{id}', [AdminUserController::class, 'show']);
    Route::get('/admin/users/{id}/orders', [AdminUserController::class, 'orders']);
    Route::post('/admin/users/{id}/grant-product', [AdminUserController::class, 'grantProduct']);
    Route::delete('/admin/users/{userId}/revoke-product/{productId}', [AdminUserController::class, 'revokeProduct']);
    Route::get('/admin/orders', [AdminUserController::class, 'allOrders']);
    Route::get('/admin/orders/{orderId}', [AdminUserController::class, 'getOrderDetail']);
    Route::put('/admin/orders/{orderId}', [AdminUserController::class, 'updateOrder']);
    Route::post('/admin/orders/{orderId}/approve', [AdminUserController::class, 'approveOrder']);
    Route::delete('/admin/orders/{orderId}', [AdminUserController::class, 'deleteOrder']);
    Route::post('/admin/orders/bulk-delete', [AdminUserController::class, 'bulkDeleteOrders']);
    
    // Order attachments
    Route::post('/admin/orders/{orderId}/attachments', [AdminUserController::class, 'addAttachment']);
    Route::delete('/admin/orders/{orderId}/attachments/{attachmentId}', [AdminUserController::class, 'deleteAttachment']);
    
    // Order payments
    Route::post('/admin/orders/{orderId}/payments', [AdminUserController::class, 'addPayment']);
    Route::delete('/admin/orders/{orderId}/payments/{paymentId}', [AdminUserController::class, 'deletePayment']);
    
    // Analytics
    Route::get('/admin/analytics', [AnalyticsController::class, 'dashboard']);
    
    // Roles management
    Route::get('/admin/roles', [RoleController::class, 'index']);
    Route::post('/admin/roles', [RoleController::class, 'store']);
    Route::delete('/admin/roles', [RoleController::class, 'destroy']);
    
    // Permissions management
    Route::get('/admin/permissions', [RoleController::class, 'permissions']);
    Route::post('/admin/permissions/role', [RoleController::class, 'createRole']);
    Route::put('/admin/permissions/role', [RoleController::class, 'updateRolePermissions']);
    Route::delete('/admin/permissions/role/{role}', [RoleController::class, 'deleteRole']);
    
    // User status (ban/suspend)
    Route::get('/admin/user-status', [UserStatusController::class, 'index']);
    Route::post('/admin/user-status', [UserStatusController::class, 'update']);
    
    // Admin receipts
    Route::get('/admin/receipts', [ReceiptController::class, 'adminIndex']);

    // Sales module
    Route::get('/admin/sales/dashboard', [SaleController::class, 'dashboard']);
    Route::get('/admin/sales/stock', [SaleController::class, 'stockOverview']);
    Route::put('/admin/sales/stock/{productId}', [SaleController::class, 'updateStock']);
    Route::post('/admin/sales/stock/bulk', [SaleController::class, 'bulkUpdateStock']);
    Route::post('/admin/sales/create', [SaleController::class, 'createSale']);
    Route::get('/admin/sales/customers', [SaleController::class, 'searchCustomers']);
    Route::get('/admin/sales/products', [SaleController::class, 'searchProducts']);
    
    // Coupon management
    Route::get('/admin/coupons', [CouponController::class, 'index']);
    Route::post('/admin/coupons', [CouponController::class, 'store']);
    Route::put('/admin/coupons/{id}', [CouponController::class, 'update']);
    Route::delete('/admin/coupons/{id}', [CouponController::class, 'destroy']);
    Route::post('/admin/coupons/{id}/assign', [CouponController::class, 'assignToUsers']);
    Route::get('/admin/coupons/{id}/users', [CouponController::class, 'getCouponUsers']);
    Route::delete('/admin/coupons/{couponId}/users/{userId}', [CouponController::class, 'removeFromUser']);

    // Mail test routes (admin-protected)
    Route::post('/test/send-receipt-email', [MailTestController::class, 'testReceiptEmail']);
    Route::get('/test/mail-config', [MailTestController::class, 'testMailConfig']);

    // System settings
    Route::get('/admin/settings', [SystemSettingController::class, 'index']);
    Route::put('/admin/settings', [SystemSettingController::class, 'update']);

    // Purchase module (from supplier)
    Route::get('/admin/purchases/dashboard', [PurchaseController::class, 'dashboard']);
    Route::get('/admin/purchases', [PurchaseController::class, 'index']);
    Route::get('/admin/purchases/{id}', [PurchaseController::class, 'show']);
    Route::post('/admin/purchases', [PurchaseController::class, 'store']);
    Route::put('/admin/purchases/{id}', [PurchaseController::class, 'update']);
    Route::put('/admin/purchases/{id}/status', [PurchaseController::class, 'updateStatus']);
    Route::delete('/admin/purchases/{id}', [PurchaseController::class, 'destroy']);
    Route::post('/admin/purchases/{id}/payments', [PurchaseController::class, 'addPayment']);
    Route::delete('/admin/purchases/{id}/payments/{paymentId}', [PurchaseController::class, 'deletePayment']);
});

// Protected user routes
Route::middleware('auth.user')->group(function () {
    Route::get('/users/me', [UserController::class, 'me']);
    Route::put('/users/profile', [UserController::class, 'updateProfile']);
    Route::post('/users/change-password', [UserController::class, 'changePassword']);
    Route::get('/users/permissions', [RoleController::class, 'myPermissions']);
    Route::post('/users/upload-avatar', [UploadController::class, 'uploadAvatar']);
    
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/purchased', [OrderController::class, 'hasPurchased']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}/confirm', [OrderController::class, 'confirm']);
    
    // Receipts
    Route::get('/receipts', [ReceiptController::class, 'index']);
    Route::get('/receipts/{id}', [ReceiptController::class, 'show']);
    Route::post('/receipts/{id}/resend', [ReceiptController::class, 'resend']);
    
    // User notifications
    Route::get('/notifications', [NotificationController::class, 'userNotifications']);
    
    // Product submission by users
    Route::post('/submissions', [ProductSubmissionController::class, 'store']);
    
    // Activity tracking (download)
    Route::post('/track-download', [ActivityLogController::class, 'trackDownload']);
    
    
    // User coupons
    Route::get('/coupons/my', [CouponController::class, 'myAvailableCoupons']);
    Route::get('/coupons/applicable', [CouponController::class, 'getApplicableCoupons']);
    Route::post('/coupons/apply', [CouponController::class, 'applyCoupon']);
});

// Payment routes
Route::post('/payment/generate-qr', [PaymentController::class, 'generateQr'])->middleware('auth.user');
Route::post('/payment/verify', [PaymentController::class, 'verify'])->middleware('auth.user');
Route::post('/payment/confirm-manual', [PaymentController::class, 'confirmManual'])->middleware('auth.user');
Route::post('/payment/webhook', [PaymentController::class, 'webhook']); // Public webhook
