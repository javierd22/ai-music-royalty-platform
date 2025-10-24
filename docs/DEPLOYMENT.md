# Production Deployment Checklist

## Attribution Service Deployment

### 1. Deploy Attribution Service

Choose one platform:

#### Option A: Render

- [ ] Connect repository to Render
- [ ] Create Web Service with:
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Python Version: `3.11`
- [ ] Set environment variables:
  - `PORT` (auto-set by Render)
  - `ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app` (optional)
- [ ] Deploy and get public URL

#### Option B: Railway

- [ ] Connect repository to Railway
- [ ] Create project from repo
- [ ] Configure service:
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Python Version: `3.11`
- [ ] Set environment variables:
  - `PORT` (auto-set by Railway)
  - `ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app` (optional)
- [ ] Deploy and get public URL

### 2. Update Next.js App

- [ ] Set `NEXT_PUBLIC_ATTRIB_BASE_URL` in Vercel environment variables to your attribution service URL
- [ ] Ensure URL uses HTTPS in production
- [ ] Test the upload flow

### 3. Production Considerations

- [ ] **HTTPS**: All URLs use HTTPS
- [ ] **Upload Size**: Increase from 10MB if needed (edit `attrib/main.py`)
- [ ] **CORS**: Set `ALLOWED_ORIGINS` for your production domain
- [ ] **Monitoring**: Set up health check monitoring for `/health` endpoint

### 4. Testing

- [ ] Test attribution service health: `GET https://your-service.com/health`
- [ ] Test file upload from Next.js app
- [ ] Verify CORS is working correctly
- [ ] Check attribution policy is working (similarity >= 0.8, influence >= 0.2)

## Environment Variables Summary

### Attribution Service

- `PORT`: Auto-set by hosting platform
- `ALLOWED_ORIGINS`: Comma-separated production domains (optional)

### Next.js App (Vercel)

- `NEXT_PUBLIC_ATTRIB_BASE_URL`: Your attribution service URL (HTTPS)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase key
- `NEXT_PUBLIC_ENVIRONMENT`: Set to `production`
