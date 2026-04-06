# Animitra - Veterinary Practice Manager

## App Overview
**Name:** Animitra  
**Type:** Veterinarian Productivity Mobile App  
**Stack:** Expo React Native + FastAPI + MongoDB  
**Theme:** Green & White (nature/medical feel)

---

## Architecture
- **Frontend:** Expo Router (file-based routing), AsyncStorage for JWT, React Native components
- **Backend:** FastAPI + Motor (async MongoDB), bcrypt passwords, JWT (30-day mobile tokens)
- **DB:** MongoDB (animitra_db)

## Core Components Built
- `app/index.tsx` - Login screen (mobile + password)
- `app/register.tsx` - Full registration form with India location dropdowns
- `app/activate.tsx` - 8-char OTP-style coupon activation
- `app/(tabs)/dashboard.tsx` - 6-card stats dashboard
- `contexts/AuthContext.tsx` - JWT auth state management
- `backend/server.py` - All API endpoints
- `backend/india_locations.py` - Comprehensive India states/districts/taluks data

---

## What's Implemented (as of April 2026)

### Auth Flow
- [x] Registration with Name, Reg No, Mobile, Password, State/District/Taluk
- [x] 8-character coupon activation (one-time, lifetime)
- [x] Mobile + Password login
- [x] JWT token (30-day) stored in AsyncStorage
- [x] Admin user seeded (mobile: 9999999999)

### Location System
- [x] 36 India states/UTs served via API
- [x] Cascading state → district → taluk dropdowns
- [x] Searchable dropdown modals

### Coupon System
- [x] 10,000 unique 8-char codes auto-generated on startup
- [x] One-time use, lifetime validity
- [x] Admin can generate more coupons
- [x] Admin can export unused coupons as CSV
- [x] Coupon tied to user account on activation

### Dashboard
- [x] 6 stat cards: Today's Cases, Pending Cases, Today's Earnings, Total Earnings, Pending Payment, Total Cases
- [x] Doctor name + location pill header
- [x] 4 quick action buttons (stub for next phase)
- [x] Pull-to-refresh
- [x] Coming Soon banner for upcoming features

---

## User Personas
- **Primary:** Licensed veterinarians in India (single practitioners)
- **Secondary:** Small vet clinic operators
- **Admin:** Animitra staff managing coupon distribution

---

## Prioritized Backlog

### Done (Phase 2 - April 2026)
- [x] Floating Quick Add (FAB) button on Dashboard
- [x] Quick Add modal: Mobile + Contacts picker + Owner Name + Animal Type chips + Visit Reason chips + Amount + Notes
- [x] POST /api/cases/quick-add endpoint — saves lead/case to DB
- [x] GET /api/cases — list cases per vet
- [x] Dashboard stats now reflect real case data

### P0 (Next Phase - Core Features)
- [ ] Cases list screen (view all cases, filter by status)
- [ ] Case detail screen (update status: pending → in-progress → closed)
- [ ] Patient/animal profile management
- [ ] Mark case as paid (update earnings in dashboard)

### P1 (Important Features)
- [ ] Appointment scheduling with calendar view
- [ ] Prescription & treatment plan creation
- [ ] Invoice/billing generation
- [ ] Case history per patient

### P2 (Nice to Have)
- [ ] Admin mobile panel (manage users, change mobile number)
- [ ] Push notifications for appointment reminders
- [ ] Vaccination reminders
- [ ] PDF export for prescriptions/invoices
- [ ] Mobile number change flow (via admin)

---

## Admin Capabilities (Current)
- Login: mobile=9999999999, password=Admin@1234
- View all coupons: GET /api/admin/coupons
- Generate more coupons: POST /api/admin/coupons/generate
- Export unused coupons as CSV: GET /api/admin/coupons/export

---

## Mobile Number Change Solution (Planned P2)
Admin can search vet by Registration Number → update mobile. Coupon stays active.

---

## Next Tasks (Priority Order)
1. Patient management screen (add/edit animal patients)
2. Case creation flow (link to patient, set amount, status)
3. Dashboard stats connected to real case data
4. Appointment scheduling
5. Admin mobile panel for user management
