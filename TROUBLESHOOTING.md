# 🔧 QUICK FIX GUIDE - Backend Connection Issues

## Problem: Variations Just Buffer/Load Forever

### ✅ **SOLUTION STEPS** (Follow in order):

---

### **Step 1: Wake Up Your Render Backend (MOST COMMON ISSUE)**

Render's **free tier sleeps after 15 minutes** of inactivity. It takes **30-60 seconds** to wake up on first request.

**Test if backend is awake:**
```bash
# Open this in your browser or use curl
https://retexture.onrender.com/health
```

**Expected Response:**
```json
{"status":"healthy"}
```

**If you get 502 Bad Gateway:**
- ✅ This is NORMAL - service is waking up
- ✅ Wait 30-60 seconds
- ✅ Try again
- ✅ Once it responds, try variations again

**Pro Tip:** Keep this tab open to ping every few minutes:
```html
<!-- Save as wake-render.html and open in browser -->
<script>
setInterval(() => {
  fetch('https://retexture.onrender.com/health')
    .then(r => r.json())
    .then(d => console.log('✓ Backend alive:', d))
    .catch(e => console.log('✗ Waking up...', e));
}, 300000); // Every 5 min
</script>
```

---

### **Step 2: Verify Environment Variable in Vercel**

1. Go to https://vercel.com/dashboard
2. Select your `ReTexture` project
3. Go to **Settings** → **Environment Variables**
4. Check `NEXT_PUBLIC_API_URL` exists and equals: `https://retexture.onrender.com`
5. If missing or wrong, add/fix it
6. **Important:** Go to **Deployments** → Click ••• → **Redeploy**

---

### **Step 3: Check Render Logs**

1. Go to https://dashboard.render.com
2. Click your `retexture-backend` service
3. Click **Logs** tab
4. Look for errors when you try to generate variations

**Common issues in logs:**
- `GOOGLE_API_KEY not found` → Add it in Render environment variables
- `ModuleNotFoundError` → Build may have failed, redeploy
- `Port already in use` → Render issue, redeploy service

---

### **Step 4: Test Backend Locally**

Open the test file I created: `backend-test.html` in your browser

```bash
# Or test with curl
curl https://retexture.onrender.com/health
curl https://retexture.onrender.com/
```

---

### **Step 5: Check Browser Console**

1. Open your Vercel site: https://retexture.vercel.app
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Try to generate variations
5. Look for errors

**Common errors:**

**❌ "Failed to fetch"**
- Backend is down or sleeping
- Wrong backend URL
- Solution: Wait for backend to wake up

**❌ "CORS error"**
- Backend CORS not configured
- Solution: Check `app/main.py` has CORS middleware (already added)

**❌ "502 Bad Gateway"**
- Backend is cold starting
- Solution: Wait 30-60 seconds and retry

**❌ "Request timeout"**
- Backend taking too long
- Solution: Check Render logs, may need to upgrade from free tier

---

## 🚀 **QUICK CHECKLIST:**

- [ ] Backend responds at https://retexture.onrender.com/health
- [ ] Vercel has `NEXT_PUBLIC_API_URL=https://retexture.onrender.com`
- [ ] Vercel redeployed after adding env variable
- [ ] Render has `GOOGLE_API_KEY` set
- [ ] Waited 30-60 seconds for cold start on first request
- [ ] Browser console shows no errors

---

## 💡 **STILL NOT WORKING?**

### Test API directly:

```bash
# Test variations endpoint (replace with actual base64 image)
curl -X POST https://retexture.onrender.com/generate/variations/stream \
  -H "Content-Type: application/json" \
  -d '{"image_data":"BASE64_IMAGE_HERE","concept":"product photography"}'
```

### Check environment variables are loaded:

**In Vercel (Frontend):**
```javascript
// Add this to any page temporarily
console.log('Backend URL:', process.env.NEXT_PUBLIC_API_URL);
// Should show: https://retexture.onrender.com
```

**In Render (Backend):**
- Check Render dashboard → Environment → Variables
- Should have `GOOGLE_API_KEY`

---

## 🎯 **MOST LIKELY CAUSES (in order):**

1. **75% chance:** Render free tier sleeping (wait 30-60 sec)
2. **15% chance:** Missing/wrong `NEXT_PUBLIC_API_URL` in Vercel
3. **5% chance:** Missing `GOOGLE_API_KEY` in Render
4. **5% chance:** Vercel not redeployed after env variable change

---

## 📊 **How to Know It's Working:**

✅ Backend responds to `/health` in < 2 seconds
✅ Frontend shows "Starting AI service..." toast
✅ After 5-10 seconds, first variation appears
✅ All 3 variations generated within 30-45 seconds

---

## 💰 **Upgrade to Fix Forever:**

**Problem:** Free tier sleeps = slow
**Solution:** Upgrade to Render Starter ($7/month)

Benefits:
- ⚡ Always running (no cold starts)
- 🚀 Instant responses
- 💪 Better performance
- 📈 More RAM (512MB)

**To upgrade:**
1. Go to Render dashboard
2. Select your service
3. Click **Upgrade** → **Starter**
4. Confirm

---

Need more help? Check backend logs or DM me!
