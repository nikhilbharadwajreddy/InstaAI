# Your Insta - Frontend

A modern, clean Instagram management interface built with vanilla JavaScript.

## Features

- 🔐 **Instagram Authentication** - Secure OAuth 2.0 flow
- 💬 **Conversations** - View and manage Instagram conversations
- 📨 **Messages** - Send and receive messages
- 🔔 **Events** - Real-time webhook events
- 📊 **Dashboard** - Overview of account activity

## Quick Start

### Local Development

```bash
cd frontend
python3 -m http.server 8000
# Open http://localhost:8000
```

### Deploy to Vercel

**Option 1: Via Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`
5. Click "Deploy"

**Option 2: Via CLI**
```bash
cd frontend
vercel login
vercel --prod
```

**Option 3: Via GitHub Actions**
- Push to GitHub (main branch)
- GitHub Actions will automatically deploy to Vercel
- Requires Vercel secrets in GitHub (see DEPLOY_VERCEL.md)

## After Deployment

1. **Get your Vercel URL** (e.g., `https://your-insta.vercel.app`)

2. **Update Lambda redirect URI**:
   ```bash
   ./update_vercel_redirect.sh https://your-insta.vercel.app
   # Then deploy the Lambda function
   ```

3. **Add redirect URI in Instagram App Dashboard**:
   - Go to Meta App Dashboard
   - Products → Instagram → Basic Display
   - Add: `https://your-insta.vercel.app/auth-callback.html`

## Structure

```
frontend/
├── index.html          # Main dashboard
├── auth.html          # Authentication page
├── auth-callback.html  # OAuth callback handler
├── config.js          # API configuration
├── vercel.json        # Vercel configuration
├── package.json       # Package info
├── css/
│   └── styles.css     # Main stylesheet
└── js/
    ├── app.js         # Main application logic
    ├── auth.js        # Authentication module
    ├── conversations.js # Conversations module
    ├── messages.js    # Messages module
    ├── events.js      # Events module
    └── utils.js       # Utility functions
```

## Configuration

The `config.js` file automatically detects the environment:
- **Localhost**: Uses `http://localhost:8000/auth-callback.html`
- **Production**: Uses `window.location.origin + '/auth-callback.html'`

No manual changes needed after deployment!

## API Endpoints

All endpoints are configured in `config.js`:
- `/exchange-token` - Exchange auth code for token
- `/store-token` - Store token in backend
- `/get-conversations` - Get user conversations
- `/get-messages` - Get messages for a conversation
- `/send-message` - Send a message
- `/get-events` - Get webhook events
- `/delete-user` - Delete user data

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- Uses localStorage for token storage
- All API calls are made to AWS API Gateway
- Responsive design for mobile and desktop
- Automatically detects production vs development environment
