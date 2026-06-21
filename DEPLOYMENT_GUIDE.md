# 🚀 Complete Deployment Guide

## **Phase 1: Backend Setup on Railway**

### 1. Create MongoDB Database
- Go to MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Create a cluster and get your `MONGO_URL`
- Create database named `trading_app`

### 2. Deploy Backend to Railway
```bash
# Login to Railway
railway login

# Link to project
railway link

# Set Environment Variables in Railway
railway variables set MONGO_URL="your_mongo_url_here"
railway variables set DB_NAME="trading_app"

# Deploy
railway up
```

### 3. Get Backend URL
```bash
railway domain
# Copy your domain: https://your-app.up.railway.app
```

---

## **Phase 2: Frontend Setup on Expo**

### 1. Update Frontend Environment
Edit `frontend/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://your-app.up.railway.app
```

### 2. Install Expo CLI
```bash
npm install -g eas-cli
eas login
```

### 3. Configure EAS
```bash
cd frontend
eas build:configure
```

### 4. Build APK for Android
```bash
# Development Build
eas build --platform android --profile preview

# Production Build
eas build --platform android --profile production
```

### 5. Download APK
- Monitor build progress on EAS dashboard
- Once complete, download APK to your phone
- Install and test

---

## **Phase 3: Verification Checklist**

- [ ] Backend running on Railway
- [ ] MongoDB connected
- [ ] Frontend `.env` has correct backend URL
- [ ] EAS build successful
- [ ] APK installs on phone
- [ ] App connects to backend
- [ ] API calls working

---

## **Troubleshooting**

### Backend not starting?
```bash
railway logs --tail 100
```

### Frontend can't reach backend?
1. Check `.env` EXPO_PUBLIC_BACKEND_URL
2. Verify backend is running: `curl https://your-app.up.railway.app/api/`
3. Check CORS is enabled in backend

### APK build fails?
1. Check EAS logs
2. Verify all dependencies in `package.json`
3. Check Node version compatibility

---

## **Important Files Modified:**
- ✅ `backend/requirements.txt` - Fixed Python dependencies
- ✅ `railway.toml` - Added Railway config
- ✅ `frontend/eas.json` - Complete build configuration
- ✅ `.env.example` - Environment template
