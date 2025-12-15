# Frontend Update Instructions

## New API Gateway URL

**Old API Gateway URL:**
```
https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod
```

**New API Gateway URL:**
```
https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod
```

## Files to Update

Replace the old API Gateway URL with the new one in the following files:

1. **auth-form.html** (line 216)
2. **auth.js** (lines 5-6)
3. **conversations.js** (line 5)
4. **dashboard.js** (lines 5-10)
5. **events.js** (line 5)
6. **insta_redirect.html** (lines 119-120)
7. **messages.js** (lines 5-6)
8. **token-manager.js** (lines 5-8)
9. **utils.js** (if any API calls)
10. **debug.html** (multiple locations)

## Quick Find & Replace Command

You can use this command to replace all occurrences:

```bash
find . -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i '' 's|76pohrq9ej\.execute-api\.us-east-1\.amazonaws\.com/prod|mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod|g' {} +
```

Or manually update each file with the new URL.

## Endpoints

All endpoints remain the same, only the API Gateway ID changes:

- POST `/exchange-token`
- POST `/store-token`
- GET `/get-conversations`
- GET `/get-messages`
- POST `/send-message`
- GET `/get-events`
- POST `/delete-user`
- GET `/webhook`
- POST `/webhook`

