# Animitra — Production Deployment Guide
# Subdomain: app.vetmechpharma.in
# Date: May 2026

## ═══════════════════════════════════════════════
## STEP 1: DNS SETUP
## ═══════════════════════════════════════════════

In your domain provider (GoDaddy / Cloudflare / etc.):
  Add A Record:
    Name:  app
    Value: YOUR_VPS_IP
    TTL:   Auto

  Wait 5-15 minutes for DNS to propagate.
  Test: ping app.vetmechpharma.in → should return your VPS IP


## ═══════════════════════════════════════════════
## STEP 2: GET THE CODE ON YOUR VPS
## ═══════════════════════════════════════════════

# In Emergent → "Save to GitHub" → push to your repo
# Then on VPS:

cd /home/ubuntu    # or your preferred directory

git clone https://github.com/YOUR_USERNAME/animitra.git
cd animitra


## ═══════════════════════════════════════════════
## STEP 3: INSTALL BACKEND
## ═══════════════════════════════════════════════

cd animitra/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Create production .env
cp .env.production .env

# Edit .env — update JWT_SECRET to something secure!
nano .env


## ═══════════════════════════════════════════════
## STEP 4: TEST BACKEND MANUALLY
## ═══════════════════════════════════════════════

source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8002

# In another terminal:
curl http://localhost:8002/api/
# Expected: {"message":"Animitra API running","version":"3.0.0"}

# Press Ctrl+C to stop the test


## ═══════════════════════════════════════════════
## STEP 5: SYSTEMD SERVICE (auto-start on reboot)
## ═══════════════════════════════════════════════

sudo nano /etc/systemd/system/animitra.service

--- PASTE THIS (change /home/ubuntu to your actual path) ---

[Unit]
Description=Animitra Veterinary App Backend
After=network.target mongod.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/animitra/backend
Environment="PATH=/home/ubuntu/animitra/backend/venv/bin"
ExecStart=/home/ubuntu/animitra/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8002 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

--- END ---

sudo systemctl daemon-reload
sudo systemctl start animitra
sudo systemctl enable animitra

# Verify it's running:
sudo systemctl status animitra
# Look for: active (running) ✓


## ═══════════════════════════════════════════════
## STEP 6: NGINX SUBDOMAIN CONFIG
## ═══════════════════════════════════════════════

# Create new config file (don't touch your existing site!)
sudo nano /etc/nginx/sites-available/animitra

--- PASTE THIS ---

server {
    listen 80;
    server_name app.vetmechpharma.in;

    # CORS headers for mobile app
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

    location / {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
            add_header 'Content-Length' 0;
            return 204;
        }
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 10M;
    }
}

--- END ---

# Enable the site
sudo ln -s /etc/nginx/sites-available/animitra /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t
# Must say: syntax is ok, test is successful

# Reload nginx
sudo systemctl reload nginx


## ═══════════════════════════════════════════════
## STEP 7: SSL CERTIFICATE (HTTPS — required!)
## ═══════════════════════════════════════════════

sudo certbot --nginx -d app.vetmechpharma.in

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose option 2 (redirect HTTP to HTTPS)

# Verify HTTPS works:
curl https://app.vetmechpharma.in/api/
# Expected: {"message":"Animitra API running","version":"3.0.0"} ✓


## ═══════════════════════════════════════════════
## STEP 8: MONGODB (if not already installed)
## ═══════════════════════════════════════════════

# Check if MongoDB is running:
sudo systemctl status mongod

# If not installed:
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod


## ═══════════════════════════════════════════════
## STEP 9: VERIFY EVERYTHING
## ═══════════════════════════════════════════════

# Backend API:
curl https://app.vetmechpharma.in/api/

# Admin login:
curl -X POST https://app.vetmechpharma.in/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","password":"Admin@1234"}'
# Should return a JWT token ✓

# Get unused coupon codes:
# Login as admin → get token → curl https://app.vetmechpharma.in/api/admin/coupons?only_unused=true


## ═══════════════════════════════════════════════
## APK BUILD — Method 1: EAS Build (Cloud, Easiest)
## ═══════════════════════════════════════════════

# On your LOCAL computer (not VPS):
cd animitra/frontend

# The eas.json and app.json are already configured!
# Backend URL is already set to: https://app.vetmechpharma.in

# Install EAS CLI
npm install -g eas-cli

# Login to Expo (free at expo.dev)
eas login

# Build APK (takes 15-20 mins, runs on Expo cloud servers)
eas build -p android --profile preview

# You'll get a download link ✓
# Install directly on Android phones


## ═══════════════════════════════════════════════
## APK BUILD — Method 2: Android Studio (Local)
## ═══════════════════════════════════════════════

# Step 1: Generate Android project
cd animitra/frontend
yarn install
npx expo prebuild --platform android --clean

# Step 2: Open Android Studio
# File → Open → select: animitra/frontend/android

# Step 3: Wait for Gradle sync

# Step 4: Generate Signed APK
# Build → Generate Signed Bundle/APK
# Select: APK
# Create new keystore:
#   - Store path: ~/animitra-release-key.jks
#   - Store password: (your choice — SAVE IT!)
#   - Key alias: animitra
#   - Key password: (your choice — SAVE IT!)
# Select: release build variant
# Click Finish

# APK location:
# animitra/frontend/android/app/build/outputs/apk/release/app-release.apk


## ═══════════════════════════════════════════════
## APK BUILD — Method 3: CLI (No Android Studio)
## ═══════════════════════════════════════════════

# Requires: JDK 17, Android SDK

cd animitra/frontend
yarn install
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease

# APK: android/app/build/outputs/apk/release/app-release-unsigned.apk
# Note: This is unsigned. Use EAS Build for signed APK.


## ═══════════════════════════════════════════════
## UPDATING THE APP IN FUTURE
## ═══════════════════════════════════════════════

# 1. Make changes in Emergent
# 2. Save to GitHub
# 3. On VPS:
cd /home/ubuntu/animitra
git pull
sudo systemctl restart animitra
echo "Backend updated!"

# 4. Rebuild APK with new versionCode in app.json
#    Change: "versionCode": 1  →  "versionCode": 2


## ═══════════════════════════════════════════════
## CREDENTIALS SUMMARY
## ═══════════════════════════════════════════════

Admin Login:
  Mobile:   9999999999
  Password: Admin@1234

Demo Login:
  Mobile:   1234567890
  Password: Demo@123

Production URL: https://app.vetmechpharma.in
Admin Panel:    Login with admin account → More → Admin Panel
Coupon Export:  GET https://app.vetmechpharma.in/api/admin/coupons/export
