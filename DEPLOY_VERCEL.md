# Deploy Your Insta to Vercel

## Quick Setup

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Install Vercel CLI** (optional, for local testing):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `frontend`
   - Click "Deploy"

3. **Get your Vercel URL**:
   - After deployment, you'll get a URL like: `https://your-insta.vercel.app`
   - Copy this URL

4. **Update Redirect URIs**:

   **A. Lambda Function:**
   ```bash
   # Update lambdas/exchange_token.py
   REDIRECT_URI = "https://your-insta.vercel.app/auth-callback.html"
   ```
   Then redeploy the Lambda function.

   **B. Instagram App Dashboard:**
   - Go to Meta App Dashboard
   - Products → Instagram → Basic Display
   - Add redirect URI: `https://your-insta.vercel.app/auth-callback.html`

### Option 2: Deploy via GitHub Actions

1. **Add Vercel Secrets to GitHub**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `VERCEL_TOKEN` - Get from Vercel Dashboard → Settings → Tokens
     - `VERCEL_ORG_ID` - Get from Vercel Dashboard → Settings → General
     - `VERCEL_PROJECT_ID` - Get from Vercel Dashboard → Project Settings → General

2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Setup Vercel deployment"
   git push origin main
   ```

3. **GitHub Actions will automatically deploy** to Vercel

## Manual Deployment via CLI

```bash
cd frontend
vercel login
vercel --prod
```

## Environment Variables (if needed)

If you need to set environment variables in Vercel:
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add any required variables

## Update Redirect URI After Deployment

After getting your Vercel URL, update:

1. **Lambda Function** (`lambdas/exchange_token.py`):
   ```python
   REDIRECT_URI = "https://YOUR-VERCEL-URL.vercel.app/auth-callback.html"
   ```

2. **Instagram App Dashboard**:
   - Add: `https://YOUR-VERCEL-URL.vercel.app/auth-callback.html`

3. **Redeploy Lambda**:
   ```bash
   cd deploy/packages
   # ... (follow Lambda deployment steps)
   ```

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update redirect URIs with your custom domain

## Notes

- The frontend `config.js` automatically detects the environment
- Localhost is used for local development
- Production URL is used when deployed to Vercel
- No code changes needed after initial setup

