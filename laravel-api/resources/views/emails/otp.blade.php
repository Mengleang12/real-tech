<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $type === 'registration' ? 'Verify Your Email' : 'Password Reset' }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            margin: 0;
            font-size: 28px;
        }
        .logo .apps {
            color: #3b82f6;
        }
        .logo .torrent {
            color: #6b7280;
        }
        .otp-code {
            text-align: center;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 20px 40px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .message {
            text-align: center;
            color: #6b7280;
            margin-bottom: 20px;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            font-size: 14px;
            color: #92400e;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1><span class="apps">apps</span><span class="torrent">torrent</span></h1>
        </div>
        
        <p class="message">
            @if($type === 'registration')
                Thank you for registering! Use the code below to verify your email address:
            @else
                You requested to reset your password. Use the code below to proceed:
            @endif
        </p>
        
        <div class="otp-code">{{ $otp }}</div>
        
        <p class="message">This code will expire in <strong>10 minutes</strong>.</p>
        
        <div class="warning">
            ⚠️ If you didn't request this code, please ignore this email. Never share this code with anyone.
        </div>
        
        <div class="footer">
            <p>© {{ date('Y') }} AppsTorrent. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
