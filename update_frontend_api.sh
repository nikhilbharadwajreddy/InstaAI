#!/bin/bash

# Script to update frontend files with new API Gateway URL

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <API_GATEWAY_URL>"
    echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/prod"
    exit 1
fi

API_URL=$1
OLD_API_URL="https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod"

echo "Updating frontend files..."
echo "Old URL: $OLD_API_URL"
echo "New URL: $API_URL"
echo ""

# List of files to update
FILES=(
    "auth.js"
    "auth-form.html"
    "conversations.js"
    "dashboard.js"
    "events.js"
    "insta_redirect.html"
    "messages.js"
    "token-manager.js"
    "debug.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        # Use sed to replace the URL
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|$OLD_API_URL|$API_URL|g" "$file"
        else
            # Linux
            sed -i "s|$OLD_API_URL|$API_URL|g" "$file"
        fi
        echo "Updated $file"
    else
        echo "File not found: $file"
    fi
done

echo ""
echo "✓ Frontend files updated!"

