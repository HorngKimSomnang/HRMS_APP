#!/bin/bash
echo "Starting HRMS..."

# Trap Ctrl+C to kill all background processes
trap "kill 0" SIGINT

# Go to script directory
cd "$(dirname "$0")"

# Hardcode localhost for development to avoid IP issues
MAC_IP="127.0.0.1"
echo "Detected Local IP: $MAC_IP"

# Extract Reverb Key from LARAVEL/.env
REVERB_KEY=$(grep '^REVERB_APP_KEY=' LARAVEL/.env | cut -d '=' -f2)

# Inject the detected IP and Reverb config into React's .env
echo "Updating REACT/.env with $MAC_IP and Reverb config..."
cat <<EOF > REACT/.env
VITE_API_BASE_URL=http://$MAC_IP:8000/api
VITE_SERVER_URL=http://$MAC_IP:8000
VITE_REVERB_APP_KEY=$REVERB_KEY
VITE_REVERB_HOST=$MAC_IP
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
EOF

# Inject the detected IP into Flutter's env_config.dart
echo "Updating FLUTTER/lib/core/env_config.dart with $MAC_IP..."
sed -i '' "s|return 'http://.*:8000/api';|return 'http://$MAC_IP:8000/api';|g" FLUTTER/lib/core/env_config.dart

# Laravel backend
echo "Starting Laravel backend..."
cd LARAVEL
php artisan serve --host=0.0.0.0 --port=8000 &
php artisan reverb:start --host=0.0.0.0 --port=8080 &
cd ..

# React frontend
echo "Starting React frontend..."
cd REACT
npm run dev &
cd ..

echo ""
echo "======================================"
echo "HRMS Dev Environment is running!"
echo "Laravel API  -> http://127.0.0.1:8000"
echo "Reverb WS    -> ws://127.0.0.1:8080"
echo "React Admin  -> http://127.0.0.1:5173"
echo "Press Ctrl+C to stop all servers"
echo "======================================"
echo ""

wait
