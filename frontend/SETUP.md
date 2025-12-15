# Your Insta - Setup Guide

## Quick Start

### 1. Update Redirect URI

The redirect URI needs to match your hosting location. Update in three places:

**A. Frontend `config.js`:**
```javascript
REDIRECT_URI: window.location.origin + '/frontend/auth-callback.html'
```

**B. Lambda Function `lambdas/exchange_token.py`:**
```python
REDIRECT_URI = "YOUR_HOSTING_URL/frontend/auth-callback.html"
```

**C. Instagram App Dashboard:**
- Go to Meta App Dashboard
- Products → Instagram → Basic Display
- Add redirect URI: `YOUR_HOSTING_URL/frontend/auth-callback.html`

### 2. Deploy Frontend

You can host the frontend folder using:
- **Static hosting** (S3, Netlify, Vercel, GitHub Pages)
- **Local development server** (for testing)
- **Any web server**

### 3. Local Testing

For local testing, you can use Python's HTTP server:

```bash
cd frontend
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

**Note:** For local testing, update redirect URI to:
- `http://localhost:8000/auth-callback.html`

### 4. API Configuration

The API Gateway URL is already configured in `config.js`:
```javascript
BASE_URL: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod'
```

If you need to change it, update `config.js`.

## File Structure

```
frontend/
├── index.html              # Main dashboard
├── auth.html               # Login page
├── auth-callback.html      # OAuth callback
├── config.js               # API configuration
├── README.md               # Documentation
├── SETUP.md                # This file
├── css/
│   └── styles.css          # All styles
└── js/
    ├── app.js              # Main app logic
    ├── auth.js             # Authentication
    ├── conversations.js    # Conversations
    ├── messages.js         # Messages
    ├── events.js           # Events
    └── utils.js            # Utilities
```

## Features

✅ Instagram OAuth Authentication
✅ View Conversations
✅ Send/Receive Messages
✅ View Webhook Events
✅ Dashboard Overview
✅ Responsive Design
✅ Modern UI

## Troubleshooting

### Redirect URI Mismatch
- Ensure redirect URI matches exactly in all three places
- Check for trailing slashes
- Verify HTTPS vs HTTP

### CORS Errors
- API Gateway CORS is already configured
- Check browser console for specific errors

### Token Issues
- Clear localStorage and reconnect
- Check Lambda logs for token exchange errors

## Next Steps

1. Update redirect URI in all locations
2. Deploy frontend to your hosting
3. Test authentication flow
4. Start using Your Insta!

