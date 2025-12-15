#!/bin/bash

# Script to update Lambda redirect URI after Vercel deployment
# Usage: ./update_vercel_redirect.sh https://your-app.vercel.app

if [ -z "$1" ]; then
    echo "Usage: ./update_vercel_redirect.sh <VERCEL_URL>"
    echo "Example: ./update_vercel_redirect.sh https://your-insta.vercel.app"
    exit 1
fi

VERCEL_URL=$1
REDIRECT_URI="${VERCEL_URL}/auth-callback.html"

echo "Updating redirect URI to: $REDIRECT_URI"

# Update Lambda function
sed -i.bak "s|REDIRECT_URI = \".*\"|REDIRECT_URI = \"$REDIRECT_URI\"|g" lambdas/exchange_token.py

echo "✓ Updated lambdas/exchange_token.py"
echo ""
echo "Next steps:"
echo "1. Deploy updated Lambda function"
echo "2. Add redirect URI in Instagram App Dashboard: $REDIRECT_URI"
echo ""
echo "To deploy Lambda:"
echo "  cd deploy/packages"
echo "  rm -rf InstaAIExchangeToken InstaAIExchangeToken.zip"
echo "  mkdir -p InstaAIExchangeToken"
echo "  cp ../../lambdas/exchange_token.py InstaAIExchangeToken/lambda_function.py"
echo "  pip3 install requests -t InstaAIExchangeToken --quiet"
echo "  cd InstaAIExchangeToken && zip -r ../InstaAIExchangeToken.zip . && cd .."
echo "  aws lambda update-function-code --function-name InstaAIExchangeToken --zip-file fileb://InstaAIExchangeToken.zip --region us-east-1"

