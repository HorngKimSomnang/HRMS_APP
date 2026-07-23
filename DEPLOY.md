# Deploying HRMS to DigitalOcean (for thesis defense)

Goal: get the **Laravel API + PostgreSQL + React admin panel** live on a single
DigitalOcean Droplet over HTTPS, then build an **Android APK** that points at it. Once done,
your advisor and friend just need a URL (panel) and the APK (mobile) — your laptop
does not need to be running.

Everything the app needs is already configurable via env vars / build flags:
- React API URL → `VITE_API_BASE_URL` (`REACT/.env.production`)
- Laravel CORS → `CORS_ALLOWED_ORIGINS`
- Flutter API URL → `--dart-define=API_BASE_URL=...` (no source edit needed)

Replace `your-domain.com` everywhere below with your real domain (or the Droplet's
public IP if you skip the domain — but HTTPS with a real domain is strongly recommended).

---

## 0. What you'll need
- A DigitalOcean account.
- A domain name you can add a DNS record to. A cheap `.com`, or a free subdomain
  from Duck DNS / Cloudflare, is fine. HTTPS needs a hostname, not just an IP.
- SSH key pair (add your public key when creating the Droplet, or use password auth).

---

## 1. Create a Droplet
1. **Create** → **Droplets**.
2. Image: **Ubuntu 24.04 (LTS) x64**.
3. Plan: **Basic**, Regular SSD, **2 GB RAM / 1 vCPU** (~$12/mo). The smallest 512MB–1GB
   plans can run out of memory during `npm run build` with PHP + Postgres also
   running. If you must use a 1 GB droplet, add a 2 GB swap file (see Appendix A).
4. Authentication: **SSH key** (upload your public key — recommended) or password.
5. Hostname: e.g. `hrms`.
6. **Networking → Firewall**: create/attach one allowing inbound:
   - SSH (22) from *your IP* (or anywhere if your IP changes often)
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
7. Create, then note the Droplet's **public IPv4 address**.

### Point your domain at it
Create a DNS **A record**: `your-domain.com` → the Droplet's public IP. Wait a few
minutes for it to propagate (`ping your-domain.com` should show that IP).

### Connect
```bash
ssh root@your-domain.com
```
(If you used password auth instead of an SSH key, you'll be prompted for the
password DigitalOcean emailed you, and asked to change it on first login.)

---

## 2. Install the stack
```bash
sudo apt update && sudo apt upgrade -y

# PHP 8.2 + extensions Laravel needs (incl. pgsql)
sudo apt install -y php8.2 php8.2-fpm php8.2-cli php8.2-pgsql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-bcmath php8.2-gd unzip git

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node 20 (for building the React panel)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL + Nginx
sudo apt install -y postgresql nginx
```

---

## 3. Create the database
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE "HRMS";
CREATE USER hrms WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE "HRMS" TO hrms;
\c HRMS
GRANT ALL ON SCHEMA public TO hrms;
SQL
```

---

## 4. Get the code onto the server
Push your repo to GitHub (private is fine) and clone it. Target dir:
```bash
mkdir -p /var/www/hrms
git clone <your-repo-url> /var/www/hrms
cd /var/www/hrms
```

---

## 5. Bring over your real data (instead of fresh seed data)
Since you already have real data entered locally, the goal is to move your actual
database to the Droplet — not start over with seeded demo accounts.

**On your local machine (Windows/PowerShell), take a fresh dump right before you
transfer it** so it includes everything up to the moment you deploy:
```powershell
powershell -ExecutionPolicy Bypass -File D:\HRMS\backups\backup_database.ps1
```
This creates a new file like `backups\HRMS_2026-07-23_HHMMSS.dump` (custom-format
`pg_dump`, per `backup_database.ps1`).

**Copy that dump, and your uploaded files, to the Droplet:**
```powershell
scp D:\HRMS\backups\HRMS_2026-07-23_HHMMSS.dump root@your-domain.com:/tmp/hrms.dump
scp -r D:\HRMS\LARAVEL\storage\app root@your-domain.com:/tmp/storage_app
```

**On the Droplet, restore it into the empty database from Step 3:**
```bash
pg_restore -h localhost -U hrms -d HRMS --no-owner --role=hrms /tmp/hrms.dump
rm /tmp/hrms.dump
```
(You'll be prompted for the `hrms` role's password — the one you set in Step 3.)

---

## 6. Deploy the Laravel API
```bash
cd /var/www/hrms/LARAVEL
composer install --no-dev --optimize-autoloader

cp .env.example .env
# Edit .env — use LARAVEL/.env.production.example in this repo as your checklist:
#   APP_ENV=production, APP_DEBUG=false, APP_URL=https://your-domain.com
#   DB_* pointing at the Postgres user/db from Step 3
#   CORS_ALLOWED_ORIGINS=https://your-domain.com
#   SANCTUM_STATEFUL_DOMAINS=your-domain.com
nano .env

php artisan key:generate
php artisan migrate          # applies any migrations newer than your dump — data itself came from the restore above, so no --seed
php artisan config:cache
php artisan route:cache
php artisan storage:link

# Restore your uploaded files (avatars, documents, etc.) over the fresh storage/app
rm -rf storage/app
mv /tmp/storage_app storage/app

# Let the web server read/write storage + cache
sudo chown -R www-data:www-data storage bootstrap/cache
```

> Data safety: this project blocks destructive commands (`migrate:fresh`, `db:wipe`)
> on purpose — see `DATA_SAFETY.md`. Use plain `migrate` only, and only against this
> fresh cloud database (never re-point it at your local dev DB). Set up the backup
> routine on the server too if you want defense-day insurance — copy
> `backups/backup_database.ps1`'s approach (`pg_dump`, keep last N, rotate) as a cron
> job on the Droplet, adapted for Linux (`pg_dump` is already installed with the
> `postgresql` package from Step 2).

---

## 7. Build & place the React admin panel
Build it **pointing at the production API**, then hand the static files to Nginx.
```bash
cd /var/www/hrms/REACT
cp .env.production.example .env.production
nano .env.production          # set VITE_API_BASE_URL=https://your-domain.com/api
npm install
npm run build                 # outputs to REACT/dist

# Serve the build from a clean path
sudo mkdir -p /var/www/hrms/web
sudo cp -r dist/* /var/www/hrms/web/
```

---

## 8. Configure Nginx
A ready template is in this repo at `deploy/nginx-hrms.conf` (serves the panel at
`/`, proxies `/api` + `/sanctum` to Laravel).
```bash
cd /var/www/hrms
sudo cp deploy/nginx-hrms.conf /etc/nginx/sites-available/hrms
# edit server_name in that file to your real domain, then:
sudo ln -s /etc/nginx/sites-available/hrms /etc/nginx/sites-enabled/hrms
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
At this point `http://your-domain.com` should load the panel and log-in should hit
the API. Now add HTTPS.

---

## 9. Enable HTTPS (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
Certbot edits the Nginx config to serve 443 and redirect 80 → 443, and auto-renews.
Confirm `https://your-domain.com` loads with a valid padlock.

> Why HTTPS matters here: modern Android blocks plaintext HTTP by default, and a
> valid certificate avoids scary warnings during your defense. With HTTPS you can
> also flip `usesCleartextTraffic` back to false in the Android manifest later.

---

## 10. Build the Android APK
On **your dev machine** (Flutter SDK installed), build a release APK aimed at the
live API — no source edit needed thanks to the `--dart-define` support just added:
```bash
cd FLUTTER
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=https://your-domain.com/api
```
Send your friend: `FLUTTER/build/app/outputs/flutter-apk/app-release.apk`
On their phone: enable "Install unknown apps" for the app they open it with, then tap
to install. It talks to your live API from anywhere.

---

## 11. Verify before the defense
- [ ] `https://your-domain.com` loads the panel with a valid padlock.
- [ ] Log in with one of your **real, already-existing accounts** (not a seeded
      demo one — you restored your actual data in Step 5).
- [ ] Open the panels (Assets, Employees, etc.) and confirm your real records show
      up, not empty tables (proves the restore actually worked).
- [ ] Install the APK on a phone that is **not** on your Wi-Fi (mobile data) and log
      in — proves it's truly public, not depending on your laptop.
- [ ] Reboot the Droplet and confirm everything comes back up (Nginx, Postgres,
      php-fpm are all enabled services by default).

---

## Appendix A — swap file (only if using a 512 MB–1 GB droplet)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Appendix B — redeploying after code changes
```bash
cd /var/www/hrms && git pull
# API changed:
cd LARAVEL && composer install --no-dev -o && php artisan migrate \
  && php artisan config:cache && php artisan route:cache
# Panel changed:
cd ../REACT && npm install && npm run build && sudo cp -r dist/* /var/www/hrms/web/
# Mobile changed: rebuild the APK (Step 10) and resend.
```

## Cost note
A 2 GB Droplet runs ~$12/month, billed hourly up to that cap. You can destroy the
Droplet and recreate it from a snapshot when not demoing to avoid charges (unlike
AWS, DigitalOcean has no "stop but keep the IP for free" state — the IP is released
when the Droplet is destroyed, so you'd need to update DNS again next time, or just
leave it running through the defense period since the cost is low).
