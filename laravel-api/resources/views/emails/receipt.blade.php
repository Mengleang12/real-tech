<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - {{ $receipt->app_name }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        }
        .logo {
            position: relative;
            z-index: 1;
        }
        .logo h1 {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 8px;
        }
        .logo .apps {
            color: #ffffff;
        }
        .logo .torrent {
            color: #93c5fd;
        }
        .success-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            color: white;
            padding: 10px 24px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 16px;
        }
        .success-icon {
            width: 20px;
            height: 20px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Content */
        .content {
            padding: 40px 30px;
        }
        .greeting {
            text-align: center;
            margin-bottom: 32px;
        }
        .greeting h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
        }
        .greeting p {
            color: #6b7280;
            font-size: 16px;
        }
        
        /* Receipt Card */
        .receipt-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            border: 1px solid #e2e8f0;
        }
        .receipt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px dashed #cbd5e1;
        }
        .receipt-number {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
        }
        .receipt-number span {
            color: #3b82f6;
            font-weight: 700;
        }
        .receipt-date {
            font-size: 12px;
            color: #64748b;
        }
        
        /* App Info */
        .app-info {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
        }
        .app-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 28px;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
        }
        .app-details h3 {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
        }
        .app-details p {
            font-size: 14px;
            color: #6b7280;
        }
        
        /* Price Row */
        .price-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0;
            border-top: 1px solid #e2e8f0;
        }
        .price-label {
            font-size: 14px;
            color: #6b7280;
        }
        .price-value {
            font-size: 14px;
            color: #111827;
            font-weight: 500;
        }
        .total-row {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            margin: 16px -24px -24px -24px;
            padding: 20px 24px;
            border-radius: 0 0 16px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .total-label {
            color: rgba(255,255,255,0.9);
            font-size: 16px;
            font-weight: 600;
        }
        .total-value {
            color: white;
            font-size: 28px;
            font-weight: 800;
        }
        
        /* Details Section */
        .details-section {
            margin-bottom: 24px;
        }
        .details-title {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .detail-item {
            background: #f9fafb;
            padding: 14px;
            border-radius: 10px;
        }
        .detail-label {
            font-size: 11px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .detail-value {
            font-size: 14px;
            color: #111827;
            font-weight: 600;
            word-break: break-all;
        }
        
        /* Download Section */
        .download-section {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            border: 1px solid #a7f3d0;
        }
        .download-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
            font-weight: 700;
            color: #065f46;
            margin-bottom: 16px;
        }
        .download-icon {
            width: 32px;
            height: 32px;
            background: #10b981;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
        }
        .download-btn {
            display: block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-decoration: none;
            text-align: center;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        
        /* Support Section */
        .support-section {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin-bottom: 24px;
        }
        .support-section h4 {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
        }
        .support-section p {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 12px;
        }
        .support-email {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 600;
        }
        
        /* Footer */
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer-logo {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        .footer-logo .apps {
            color: #3b82f6;
        }
        .footer-logo .torrent {
            color: #6b7280;
        }
        .footer-text {
            font-size: 12px;
            color: #9ca3af;
            margin-bottom: 16px;
        }
        .social-links {
            display: flex;
            justify-content: center;
            gap: 12px;
        }
        .social-link {
            width: 36px;
            height: 36px;
            background: #e5e7eb;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            text-decoration: none;
            font-size: 16px;
            transition: background 0.2s, color 0.2s;
        }
        .social-link:hover {
            background: #3b82f6;
            color: white;
        }
        .copyright {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 20px;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            body {
                padding: 20px 10px;
            }
            .header, .content, .footer {
                padding-left: 20px;
                padding-right: 20px;
            }
            .details-grid {
                grid-template-columns: 1fr;
            }
            .total-value {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <h1><span class="apps">apps</span><span class="torrent">torrent</span></h1>
            </div>
            <div class="success-badge">
                <span class="success-icon">✓</span>
                Payment Successful
            </div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <div class="greeting">
                <h2>Thank you for your purchase! 🎉</h2>
                <p>Hi {{ $receipt->user_name ?? 'Valued Customer' }}, your payment has been confirmed.</p>
            </div>
            
            <!-- Receipt Card -->
            <div class="receipt-card">
                <div class="receipt-header">
                    <div class="receipt-number">
                        Receipt No: <span>{{ $receipt->receipt_number }}</span>
                    </div>
                    <div class="receipt-date">
                        {{ $receipt->paid_at->format('M d, Y') }}
                    </div>
                </div>
                
                <div class="app-info">
                    <div class="app-icon">
                        {{ strtoupper(substr($receipt->app_name, 0, 1)) }}
                    </div>
                    <div class="app-details">
                        <h3>{{ $receipt->app_name }}</h3>
                        <p>Digital Software License</p>
                    </div>
                </div>
                
                <div class="price-row">
                    <span class="price-label">Subtotal</span>
                    <span class="price-value">${{ number_format($receipt->amount, 2) }}</span>
                </div>
                <div class="price-row">
                    <span class="price-label">Payment Method</span>
                    <span class="price-value">{{ $receipt->payment_method }}</span>
                </div>
                
                <div class="total-row">
                    <span class="total-label">Total Paid</span>
                    <span class="total-value">${{ number_format($receipt->amount, 2) }}</span>
                </div>
            </div>
            
            <!-- Transaction Details -->
            <div class="details-section">
                <h4 class="details-title">Transaction Details</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Order ID</div>
                        <div class="detail-value">{{ substr($receipt->order_id, 0, 8) }}...</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Transaction ID</div>
                        <div class="detail-value">{{ $receipt->transaction_id ?? 'N/A' }}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date & Time</div>
                        <div class="detail-value">{{ $receipt->paid_at->format('M d, Y H:i') }}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">{{ $receipt->user_email }}</div>
                    </div>
                </div>
            </div>
            
            <!-- Download Section -->
            <div class="download-section">
                <div class="download-title">
                    <span class="download-icon">↓</span>
                    Ready to Download
                </div>
                <a href="{{ config('app.frontend_url', 'https://style-ghost-app.lovable.app') }}/my-purchases" class="download-btn">
                    Go to My Purchases →
                </a>
            </div>
            
            <!-- Support -->
            <div class="support-section">
                <h4>Need Help?</h4>
                <p>If you have any questions about your purchase, please contact our support team.</p>
                <a href="mailto:support@appstorrent.com" class="support-email">support@appstorrent.com</a>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-logo">
                <span class="apps">apps</span><span class="torrent">torrent</span>
            </div>
            <p class="footer-text">
                Your trusted source for premium software
            </p>
            <div class="social-links">
                <a href="#" class="social-link" title="Facebook">f</a>
                <a href="#" class="social-link" title="Twitter">𝕏</a>
                <a href="#" class="social-link" title="Telegram">✈</a>
            </div>
            <p class="copyright">
                © {{ date('Y') }} AppsTorrent. All rights reserved.<br>
                This is an automated receipt. Please keep it for your records.
            </p>
        </div>
    </div>
</body>
</html>
