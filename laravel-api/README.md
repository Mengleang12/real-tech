# Laravel API Backend

This is the Laravel backend for the App Store application.

## Requirements

- PHP 8.1+
- Composer
- MySQL 5.7+
- Laravel 10.x

## Installation

1. **Clone/Copy the laravel-api folder to your Hostinger server**

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Update `.env` with your database credentials**
   ```env
   DB_HOST=localhost
   DB_DATABASE=your_database
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   
   JWT_SECRET=your-random-secret-key
   
   PAYWAY_URL=https://your-aba-payway-url
   PAYWAY_SECRET=your-payway-secret
   ```

5. **Run migrations**
   ```bash
   php artisan migrate
   ```

6. **Create storage link**
   ```bash
   php artisan storage:link
   ```

## Required Composer Packages

Add to your `composer.json`:
```json
{
    "require": {
        "firebase/php-jwt": "^6.0",
        "guzzlehttp/guzzle": "^7.0"
    }
}
```

Then run:
```bash
composer require firebase/php-jwt guzzlehttp/guzzle
```

## API Endpoints

### Public
- `GET /api/apps` - List all apps
- `GET /api/apps/{id}` - Get app details
- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration

### Admin Protected
- `POST /api/auth/login` - Admin login
- `POST /api/apps` - Create app
- `PUT /api/apps/{id}` - Update app
- `DELETE /api/apps/{id}` - Delete app
- `POST /api/upload` - Upload file

### User Protected
- `GET /api/users/me` - Get current user
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `POST /api/payment/generate-qr` - Generate payment QR
- `POST /api/payment/verify` - Verify payment

## Hostinger Deployment

1. Upload all files to your Hostinger public_html or subdomain folder
2. Point your domain to the `public` folder
3. Ensure PHP 8.1+ is selected in Hostinger panel
4. Run migrations via SSH or use phpMyAdmin to import SQL

## Default Admin

- Username: `admin`
- Password: `admin123`

**Change this immediately after deployment!**
