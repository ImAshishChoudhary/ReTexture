# Backend Deployment Guide - Render.com

## Step 1: Prepare Your Repository

### 1.1 Commit all changes to GitHub
```bash
cd "C:\Users\imash\Downloads\Business Portfolio\ReTexture"
git add .
git commit -m "Add Render deployment files"
git push origin main
```

## Step 2: Create Render Account & Deploy

### 2.1 Sign up for Render
1. Go to https://render.com
2. Sign up using your GitHub account
3. Authorize Render to access your repositories

### 2.2 Create New Web Service
1. Click **"New +"** button → **"Web Service"**
2. Connect your GitHub repository: `ImAshishChoudhary/ReTexture`
3. Configure the service:

**Basic Settings:**
- **Name:** `retexture-backend` (or any name you prefer)
- **Region:** Choose closest to your users (e.g., Oregon, Frankfurt, Singapore)
- **Branch:** `main`
- **Root Directory:** `Agents`
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Instance Type:**
- Select **Free** tier (for testing) or **Starter** ($7/month for production)

### 2.3 Add Environment Variables
In the Environment section, add:
- **Key:** `GOOGLE_API_KEY`
- **Value:** `AIzaSyC8mHEWeLEsvcJWtr0Gs9oyEHnzJacpUG0`

Click **"Create Web Service"**

### 2.4 Wait for Deployment
- Render will automatically build and deploy your backend
- This may take 3-5 minutes
- Watch the logs for any errors
- Once deployed, you'll see a URL like: `https://retexture-backend.onrender.com`

## Step 3: Update Frontend Configuration

### 3.1 Add Environment Variable to Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your `ReTexture` project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://retexture-backend.onrender.com` (use your actual Render URL)
   - **Environment:** All (Production, Preview, Development)
5. Click **Save**

### 3.2 Redeploy Frontend
1. Go to **Deployments** tab
2. Click the three dots (•••) on the latest deployment
3. Click **Redeploy**
4. Check "Use existing Build Cache"
5. Click **Redeploy**

## Step 4: Test Integration

### 4.1 Test Backend Directly
```bash
# Replace with your Render URL
curl https://retexture-backend.onrender.com/health
```
Expected response: `{"status":"healthy"}`

### 4.2 Test Frontend Integration
1. Open your Vercel deployment URL
2. Try using AI features (variations, validation, etc.)
3. Check browser console for any CORS or connection errors

## Step 5: Enable CORS (If Needed)

If you see CORS errors, the backend is already configured to allow all origins.
Check `app/main.py` - the CORS middleware is already set up:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Backend Deployment Issues

**Problem:** Build fails with "Module not found"
**Solution:** Check `requirements.txt` has all dependencies

**Problem:** App crashes on startup
**Solution:** 
- Check Render logs for errors
- Verify environment variables are set correctly
- Ensure Python version is 3.12

**Problem:** 502 Bad Gateway
**Solution:**
- Check if app is binding to `0.0.0.0` (not `127.0.0.1`)
- Verify start command uses `$PORT` environment variable
- Check Render logs for crashes

### Frontend Connection Issues

**Problem:** Network error when calling API
**Solution:**
- Verify `NEXT_PUBLIC_API_URL` is set in Vercel
- Check Render service is running (not sleeping)
- Verify CORS is configured

**Problem:** API returns 404
**Solution:**
- Check the API endpoint path is correct
- Verify backend is deployed successfully
- Test the endpoint directly with curl

### Free Tier Limitations

**Render Free Tier:**
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-50 seconds to wake up
- 750 hours/month free
- Limited to 512MB RAM

**Solution for Production:**
- Upgrade to Starter plan ($7/month)
- Keeps service always running
- Better performance and reliability

## Next Steps

1. ✅ Backend deployed on Render
2. ✅ Frontend configured with backend URL
3. ✅ Test all features work end-to-end
4. 📝 Monitor logs in Render dashboard
5. 🚀 Consider upgrading for production use

## Important URLs

- **Render Dashboard:** https://dashboard.render.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Backend URL:** https://[your-service].onrender.com
- **Frontend URL:** https://[your-app].vercel.app

## Cost Summary

- **Render Free Tier:** $0/month (with limitations)
- **Render Starter:** $7/month (recommended for production)
- **Vercel Hobby:** $0/month
- **Vercel Pro:** $20/month (if you need more)

---

Need help? Check the Render logs or contact support!
