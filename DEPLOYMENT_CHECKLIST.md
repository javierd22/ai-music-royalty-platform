# Attribution Service Deployment Checklist

## Pre-Deployment Setup ✅

- [x] **requirements.txt** created with pinned versions
- [x] **main.py** configured for production (host 0.0.0.0, PORT env var)
- [x] **CORS** configured for localhost:3000 and ai-music-royalty-platform.vercel.app
- [x] **Dockerfile** created (optional)
- [x] **README.md** with deployment instructions
- [x] **Verification script** created

## Render Deployment (Recommended)

### Step-by-Step Instructions:

1. **Go to Render Dashboard**
   - Visit https://render.com/dashboard
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub repository
   - Select the repository containing the attribution service

3. **Configure Service**
   - **Name**: `attribution-service` (or your preferred name)
   - **Root Directory**: `attrib`
   - **Runtime**: `Python 3.11`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`

4. **Environment Variables** (Optional)
   - `ALLOWED_ORIGINS`: Additional CORS origins if needed

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the public URL (e.g., `https://attribution-service.onrender.com`)

## Railway Deployment (Alternative)

### Step-by-Step Instructions:

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Click "New Project" → "Deploy from GitHub repo"

2. **Select Repository**
   - Choose your repository
   - Set **Root Directory** to `attrib`

3. **Configure Service**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Environment Variables** (Optional)
   - `ALLOWED_ORIGINS`: Additional CORS origins if needed

5. **Deploy**
   - Railway will automatically deploy
   - Note the public URL (e.g., `https://attribution-service-production.up.railway.app`)

## Post-Deployment Verification

### 1. Run Verification Script

```bash
# Replace with your actual service URL
./verify-deployment.sh https://your-service-url.com
```

### 2. Manual Health Check

```bash
curl -sSL https://your-service-url.com/health
# Expected: {"ok":true}
```

### 3. Test File Upload (if you have a test audio file)

```bash
curl -sSL -X POST https://your-service-url.com/compare \
  -F "file=@test-audio.wav" | jq
# Expected: JSON with matches array
```

## Frontend Configuration

### 1. Update Vercel Environment Variables

- Go to your Vercel dashboard
- Navigate to your project settings
- Add/Update environment variable:
  - `ATTRIB_BASE_URL` = `https://your-service-url.com`
- Redeploy your Next.js app

### 2. Update Local Development

- Update `.env.local`:
  ```bash
  ATTRIB_BASE_URL=https://your-service-url.com
  ```
- Restart your development server

## Final Verification Checklist

- [ ] **Public URL live** - Service is accessible at the public URL
- [ ] **/health returns ok** - Health endpoint responds with `{"ok":true}`
- [ ] **/compare returns JSON** - Upload endpoint returns proper JSON response
- [ ] **Vercel ATTRIB_BASE_URL updated** - Frontend points to the new service
- [ ] **Next app upload flow works** - End-to-end test from frontend to backend

## Troubleshooting

### Common Issues:

1. **CORS Origin Mismatch**
   - **Symptom**: Browser shows CORS error
   - **Fix**: Check `ALLOWED_ORIGINS` environment variable includes your domain

2. **413 Payload Too Large**
   - **Symptom**: Large audio files fail to upload
   - **Fix**: Increase upload size limit in `main.py` (currently 10MB)

3. **Service Not Starting**
   - **Symptom**: Service fails to start or crashes
   - **Fix**: Check Python version is 3.11 and all dependencies are installed

4. **Wrong Start Command**
   - **Symptom**: Service starts but doesn't respond
   - **Fix**: Ensure start command is `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Service URLs

After deployment, you'll have:

- **Health Check**: `https://your-service-url.com/health`
- **API Documentation**: `https://your-service-url.com/docs`
- **Compare Endpoint**: `https://your-service-url.com/compare`

## Next Steps

1. Deploy the service using Render or Railway
2. Run the verification script
3. Update your Next.js app's `ATTRIB_BASE_URL`
4. Test the complete upload flow
5. Monitor service performance and logs
