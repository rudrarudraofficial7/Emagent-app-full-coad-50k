# APK Build Instructions | APK बनाने के लिए निर्देश

## Quick Start (तेजी से शुरू करें)

### Step 1: Frontend folder में जाओ
```bash
cd frontend
```

### Step 2: Dependencies install करो
```bash
yarn install
# या
npm install
```

### Step 3: APK build करो
```bash
yarn build:android
# या
npm run build:android
```

---

## क्या मैंने Fix किया? (What I Fixed?)

✅ **app.json Updated** - Build errors को हटाया  
✅ **package.json Cleaned** - Duplicate dependencies हटाए  
✅ **Build Script Added** - `yarn build:android` command add किया  
✅ **Android Config Fixed** - Permissions add किए  

---

## अगर Prebuild करना है (If you want local prebuild):

```bash
# Clean करो
rm -rf android ios build

# Prebuild करो
expo prebuild --clean --platform android

# Build करो
eas build --platform android --local
```

---

## Images की जरूरत है?

अगर build fail हो तो `frontend/assets/images/` में ये files डालो:
- `splash-icon.png` (200x200 px)
- `adaptive-icon.png` (108x108 px)  
- `favicon.png` (अगर web के लिए चाहिए)

---

**Ab try करो और बताओ कि क्या हुआ!** 🚀
