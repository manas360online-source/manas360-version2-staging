# Corporate Admin Login Credentials

## Primary Credentials
- **Role:** Corporate Admin
- **Phone:** +919000000001
- **Company Key:** CORP-TEST
- **Status:** Saved locally in this file

## Backup Credentials (if email/password login needed)
- **Email:** corp-admin-[timestamp]@test.local (assigned on creation)
- **Password:** CorpAdmin@2025

## Setup Instructions

### Quick Setup (Automated - Windows PowerShell)
```powershell
cd c:\projects\MANAS360_new
.\setup-corporate-admin.ps1
```

### Quick Setup (Automated - Bash)
```bash
cd ~/path/to/MANAS360_new
bash setup-corporate-admin.sh
```

### Manual Setup

#### Step 1: Start the Database and Services
```powershell
cd c:\projects\MANAS360_new
docker compose up -d
```
Wait for services to be ready (30-60 seconds)

#### Step 2: Run Database Migrations
```powershell
cd c:\projects\MANAS360_new\backend
npm run prisma:migrate:deploy
```

#### Step 3: Create the Corporate Admin Account
```powershell
node create-corp-admin-phone.js
```

#### Step 4: Login with OTP
1. Open browser: http://localhost:5173/auth/login
2. Enter phone: **+919000000001**
3. Click "Send OTP"
4. Copy the Development OTP shown on screen
5. Paste OTP in the OTP field
6. Click "Verify OTP and Login"

#### Step 5: Verify Access
You should be redirected to `/corporate/dashboard`

## What This Account Has
✅ Phone verified
✅ Company admin privileges
✅ Corporate dashboard access
✅ Employee management rights
✅ Reports access
✅ Billing management

## Notes
- This is a test/development account
- Phone OTP login is the primary method
- Backup email login also available
- Account linked to company: CORP-TEST

## Troubleshooting

### Database connection failed
**Error:** "Can't reach database server at localhost:5432"
- Ensure Docker is running: `docker ps`
- Ensure services started: `docker compose up -d`
- Wait 10 seconds for PostgreSQL to be ready

### OTP not showing
- Make sure `NODE_ENV=development` (not production)
- Check browser console for error messages
- Refresh the page and try again

### "Failed to send OTP" error
- Database must be running (see Database connection failed)
- Phone number must be valid format: +91XXXXXXXXXX
- Clear browser cache and try again

### User already exists
- The script uses `upsert`, so it will update existing user
- Use a different phone number or delete the user first

### Port already in use
- Backend default: 5000
- Frontend default: 5173
- Change ports in docker-compose.yml if needed

## Files Created
- `/backend/create-corp-admin-phone.js` - Corporate admin creation script
- `/setup-corporate-admin.ps1` - Automated setup (PowerShell)
- `/setup-corporate-admin.sh` - Automated setup (Bash)
- `/CORPORATE_ADMIN_CREDENTIALS.md` - This file
