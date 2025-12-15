#!/bin/bash

# Main deployment script
set -e

echo "=========================================="
echo "InstaAI AWS Deployment Script"
echo "=========================================="
echo ""

# Load configuration
source config.sh

# Make scripts executable
chmod +x scripts/*.sh

# Step 1: Create DynamoDB tables
echo "Step 1: Creating DynamoDB tables..."
cd scripts
./1_create_dynamodb_tables.sh
cd ..

# Step 2: Deploy Lambda functions
echo ""
echo "Step 2: Deploying Lambda functions..."
cd scripts
./2_deploy_lambdas.sh
cd ..

# Step 3: Create API Gateway
echo ""
echo "Step 3: Creating API Gateway..."
cd scripts
./3_create_api_gateway.sh
cd ..

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "API Gateway URL:"
if [ -f api_id.txt ]; then
    API_ID=$(cat api_id.txt)
    echo "https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}"
    echo ""
    echo "Endpoints:"
    echo "  POST   https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/exchange-token"
    echo "  POST   https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/store-token"
    echo "  GET    https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/get-conversations"
    echo "  GET    https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/get-messages"
    echo "  POST   https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/send-message"
    echo "  GET    https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/get-events"
    echo "  POST   https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/delete-user"
    echo "  GET    https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/webhook"
    echo "  POST   https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}/webhook"
fi
echo ""
echo "Next steps:"
echo "1. Update frontend files with new API Gateway URL"
echo "2. Test the endpoints"
echo "3. Configure CORS if needed"

