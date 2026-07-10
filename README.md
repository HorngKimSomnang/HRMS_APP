# HRMS — HR Management System

A full-stack HR Management System: Laravel API backend, React admin web panel, and a Flutter mobile app for employees.

## Stack

- **Backend**: Laravel 12 (PHP), PostgreSQL, Sanctum auth, Spatie roles/permissions
- **Web admin**: React + TypeScript + Vite
- **Mobile**: Flutter (Android/iOS)

## Prerequisites

- PHP 8.2+ and Composer
- PostgreSQL (a running server, with a database you can create)
- Node.js 18+ and npm
- (Optional, for the mobile app) Flutter SDK

## 1. Backend setup (Laravel)

```bash
cd LARAVEL
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` and set your PostgreSQL connection (create the database first, e.g. `createdb HRMS`):

```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=HRMS
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

Run migrations and seed a base dataset:

```bash
php artisan migrate --seed
```

This creates two accounts via `DatabaseSeeder` (roles, settings, and leave types are seeded too):

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@gmail.com` | `password` |
| Admin | `admin@gmail.com` | `password` |

> Note: there are additional seeders in `database/seeders/` (`ThesisDemoSeeder`, `DemoDataSeeder`, etc.) that add richer sample data, but they were written for ad-hoc use during development and assume things run in a specific order — stick to the plain `DatabaseSeeder` above for a reliable first setup.

Start the API:

```bash
php artisan serve
```

The API is now available at `http://localhost:8000/api`.

## 2. Web admin setup (React)

```bash
cd REACT
npm install
cp .env.example .env
npm run dev
```

`.env` should point at your local Laravel server (defaults already match a default `php artisan serve` setup):

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_SERVER_URL=http://127.0.0.1:8000
```

Open `http://localhost:5173` and log in with one of the seeded accounts above.

## 3. Mobile app setup (Flutter) — optional

```bash
cd FLUTTER
flutter pub get
```

The API base URL is set in `lib/core/env_config.dart` — it currently points at a developer's ngrok tunnel. To run against your own local backend, change it to your machine's LAN IP (physical device) or `10.0.2.2` (Android emulator, aliases the host machine's `localhost`):

```dart
return 'http://10.0.2.2:8000/api'; // Android emulator example
```

Then run:

```bash
flutter run
```

## Data safety

See [DATA_SAFETY.md](DATA_SAFETY.md) for rules around destructive database commands (`migrate:fresh`, `db:wipe`, etc.) — these are intentionally blocked by default.
