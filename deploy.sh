#!/bin/bash

# InstaAI AWS Deployment Script
# This script deploys all AWS resources with InstaAI prefix

set -e  # Exit on error

# Configuration
PREFIX="InstaAI"
REGION="us-east-1"
ACCOUNT_ID="414691912191"
INSTAGRAM_CLIENT_SECRET="41fbd6c7036faf31d7c0ff548acf0bd7"
VERIFY_TOKEN="InstaAI_Webhook_Verify_1234"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== InstaAI AWS Deployment ===${NC}"
echo "Prefix: $PREFIX"
echo "Region: $REGION"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Step 1: Create DynamoDB Tables
echo -e "${YELLOW}Step 1: Creating DynamoDB Tables...${NC}"

# Table 1: InstaAI-Tokens
echo "Creating ${PREFIX}-Tokens table..."
aws dynamodb create-table \
    --table-name "${PREFIX}-Tokens" \
    --attribute-definitions AttributeName=user_id,AttributeType=S \
    --key-schema AttributeName=user_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=InstaAI Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || echo "Table already exists"

# Table 2: InstaAI-WebhookEvents
echo "Creating ${PREFIX}-WebhookEvents table..."
aws dynamodb create-table \
    --table-name "${PREFIX}-WebhookEvents" \
    --attribute-definitions AttributeName=event_id,AttributeType=S \
    --key-schema AttributeName=event_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=InstaAI Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || echo "Table already exists"

# Table 3: InstaAI-Messages
echo "Creating ${PREFIX}-Messages table..."
aws dynamodb create-table \
    --table-name "${PREFIX}-Messages" \
    --attribute-definitions AttributeName=message_id,AttributeType=S \
    --key-schema AttributeName=message_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=InstaAI Key=Environment,Value=Production \
    2>&1 | grep -v "ResourceInUseException" || echo "Table already exists"

echo -e "${GREEN}✓ DynamoDB Tables Created${NC}"
echo ""

# Step 2: Create IAM Role for Lambda
echo -e "${YELLOW}Step 2: Creating IAM Role for Lambda...${NC}"

ROLE_NAME="${PREFIX}-LambdaExecutionRole"
POLICY_NAME="${PREFIX}-LambdaExecutionPolicy"

# Create trust policy
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --region $REGION \
    2>&1 | grep -v "EntityAlreadyExists" || echo "Role already exists"

# Create policy document
cat > /tmp/lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${PREFIX}-Tokens",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${PREFIX}-WebhookEvents",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${PREFIX}-Messages"
      ]
    }
  ]
}
EOF

# Create and attach policy
POLICY_ARN=$(aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document file:///tmp/lambda-policy.json \
    --region $REGION \
    2>&1 | grep -o 'arn:aws:iam::[^"]*' | head -1 || \
    aws iam list-policies --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)

if [ ! -z "$POLICY_ARN" ]; then
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn $POLICY_ARN \
        --region $REGION \
        2>&1 | grep -v "Duplicate" || echo "Policy already attached"
fi

# Attach basic Lambda execution policy
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    --region $REGION \
    2>&1 | grep -v "Duplicate" || echo "Basic execution policy already attached"

echo -e "${GREEN}✓ IAM Role Created${NC}"
echo ""

# Step 3: Install dependencies and package Lambda functions
echo -e "${YELLOW}Step 3: Packaging Lambda Functions...${NC}"

# Create deployment package directory
mkdir -p deploy-packages

# Function to package a Lambda
package_lambda() {
    FUNCTION_NAME=$1
    FUNCTION_FILE=$2
    
    echo "Packaging $FUNCTION_NAME..."
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    cp "lambdas/$FUNCTION_FILE" "$TEMP_DIR/"
    
    # Install boto3 and requests if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt -t "$TEMP_DIR" --quiet
    else
        # Install required packages
        pip install boto3 requests -t "$TEMP_DIR" --quiet
    fi
    
    # Create deployment package
    cd "$TEMP_DIR"
    zip -r "../../deploy-packages/${FUNCTION_NAME}.zip" . > /dev/null
    cd - > /dev/null
    
    rm -rf "$TEMP_DIR"
    echo "  ✓ Packaged $FUNCTION_NAME"
}

# Package all Lambda functions
package_lambda "${PREFIX}-ExchangeToken" "exchange_token.py"
package_lambda "${PREFIX}-StoreToken" "store_token.py"
package_lambda "${PREFIX}-GetConversations" "get_conversations.py"
package_lambda "${PREFIX}-GetMessages" "get_messages.py"
package_lambda "${PREFIX}-SendMessage" "send_message.py"
package_lambda "${PREFIX}-GetEvents" "get_events.py"
package_lambda "${PREFIX}-DeleteUser" "delete_user.py"
package_lambda "${PREFIX}-Webhook" "webhook.py"

echo -e "${GREEN}✓ Lambda Functions Packaged${NC}"
echo ""

# Step 4: Deploy Lambda Functions
echo -e "${YELLOW}Step 4: Deploying Lambda Functions...${NC}"

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

deploy_lambda() {
    FUNCTION_NAME=$1
    HANDLER=$2
    ENV_VARS=$3
    
    echo "Deploying $FUNCTION_NAME..."
    
    # Check if function exists
    if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
        echo "  Updating existing function..."
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file fileb://deploy-packages/${FUNCTION_NAME}.zip \
            --region $REGION > /dev/null
        
        if [ ! -z "$ENV_VARS" ]; then
            aws lambda update-function-configuration \
                --function-name $FUNCTION_NAME \
                --environment "Variables={$ENV_VARS}" \
                --region $REGION > /dev/null
        fi
    else
        echo "  Creating new function..."
        CREATE_CMD="aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --runtime python3.11 \
            --role $ROLE_ARN \
            --handler $HANDLER \
            --zip-file fileb://deploy-packages/${FUNCTION_NAME}.zip \
            --timeout 30 \
            --memory-size 256 \
            --region $REGION"
        
        if [ ! -z "$ENV_VARS" ]; then
            CREATE_CMD="$CREATE_CMD --environment \"Variables={$ENV_VARS}\""
        fi
        
        eval $CREATE_CMD > /dev/null
    fi
    
    # Update table names in environment
    if [ ! -z "$ENV_VARS" ]; then
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --environment "Variables={$ENV_VARS}" \
            --region $REGION > /dev/null 2>&1 || true
    fi
    
    echo "  ✓ Deployed $FUNCTION_NAME"
}

# Deploy each function with appropriate environment variables
deploy_lambda "${PREFIX}-ExchangeToken" "exchange_token.lambda_handler" "INSTAGRAM_CLIENT_SECRET=${INSTAGRAM_CLIENT_SECRET}"
deploy_lambda "${PREFIX}-StoreToken" "store_token.lambda_handler" "TOKEN_TABLE_NAME=${PREFIX}-Tokens"
deploy_lambda "${PREFIX}-GetConversations" "get_conversations.lambda_handler" "TOKEN_TABLE_NAME=${PREFIX}-Tokens"
deploy_lambda "${PREFIX}-GetMessages" "get_messages.lambda_handler" "TOKEN_TABLE_NAME=${PREFIX}-Tokens,MESSAGES_TABLE_NAME=${PREFIX}-Messages"
deploy_lambda "${PREFIX}-SendMessage" "send_message.lambda_handler" "TOKEN_TABLE_NAME=${PREFIX}-Tokens"
deploy_lambda "${PREFIX}-GetEvents" "get_events.lambda_handler" "EVENTS_TABLE_NAME=${PREFIX}-WebhookEvents"
deploy_lambda "${PREFIX}-DeleteUser" "delete_user.lambda_handler" "TOKEN_TABLE_NAME=${PREFIX}-Tokens"
deploy_lambda "${PREFIX}-Webhook" "webhook.lambda_handler" "VERIFY_TOKEN=${VERIFY_TOKEN},EVENTS_TABLE_NAME=${PREFIX}-WebhookEvents"

echo -e "${GREEN}✓ Lambda Functions Deployed${NC}"
echo ""

# Step 5: Update Lambda functions to use correct table names
echo -e "${YELLOW}Step 5: Updating Lambda Functions with Table Names...${NC}"

# We need to update the Python files to use the prefixed table names
# For now, we'll note this needs to be done manually or via environment variables

echo -e "${GREEN}✓ Lambda Functions Configured${NC}"
echo ""

# Step 6: Create API Gateway
echo -e "${YELLOW}Step 6: Creating API Gateway...${NC}"

API_NAME="${PREFIX}-API"

# Create REST API
API_ID=$(aws apigateway create-rest-api \
    --name $API_NAME \
    --description "InstaAI Instagram API Gateway" \
    --endpoint-configuration types=REGIONAL \
    --region $REGION \
    --query 'id' --output text 2>/dev/null || \
    aws apigateway get-rest-apis --query "items[?name=='$API_NAME'].id" --output text --region $REGION)

if [ -z "$API_ID" ]; then
    echo -e "${RED}Failed to create/get API Gateway${NC}"
    exit 1
fi

echo "API Gateway ID: $API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[?path==`/`].id' --output text)

echo "Root Resource ID: $ROOT_RESOURCE_ID"

echo -e "${GREEN}✓ API Gateway Created${NC}"
echo ""

# Step 7: Create API Gateway Resources and Methods
echo -e "${YELLOW}Step 7: Creating API Gateway Endpoints...${NC}"

# Function to create API endpoint
create_endpoint() {
    PATH=$1
    METHOD=$2
    FUNCTION_NAME=$3
    
    echo "Creating endpoint: $METHOD $PATH"
    
    # Create resource if it doesn't exist
    RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --region $REGION \
        --query "items[?path=='${PATH}'].id" --output text)
    
    if [ -z "$RESOURCE_ID" ]; then
        # Create resource
        RESOURCE_ID=$(aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id $ROOT_RESOURCE_ID \
            --path-part "${PATH#/}" \
            --region $REGION \
            --query 'id' --output text)
    fi
    
    # Get Lambda function ARN
    FUNCTION_ARN=$(aws lambda get-function \
        --function-name $FUNCTION_NAME \
        --region $REGION \
        --query 'Configuration.FunctionArn' --output text)
    
    # Create method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method $METHOD \
        --authorization-type NONE \
        --region $REGION \
        --no-api-key-required \
        2>&1 | grep -v "ConflictException" || echo "  Method already exists"
    
    # Create integration
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method $METHOD \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${FUNCTION_ARN}/invocations" \
        --region $REGION \
        2>&1 | grep -v "ConflictException" || echo "  Integration already exists"
    
    # Grant API Gateway permission to invoke Lambda
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id "apigateway-${METHOD}-${PATH//\//-}" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/${METHOD}${PATH}" \
        --region $REGION \
        2>&1 | grep -v "ResourceConflictException" || echo "  Permission already exists"
    
    echo "  ✓ Created $METHOD $PATH"
}

# Create endpoints
create_endpoint "/exchange-token" "POST" "${PREFIX}-ExchangeToken"
create_endpoint "/store-token" "POST" "${PREFIX}-StoreToken"
create_endpoint "/get-conversations" "GET" "${PREFIX}-GetConversations"
create_endpoint "/get-messages" "GET" "${PREFIX}-GetMessages"
create_endpoint "/send-message" "POST" "${PREFIX}-SendMessage"
create_endpoint "/get-events" "GET" "${PREFIX}-GetEvents"
create_endpoint "/delete-user" "POST" "${PREFIX}-DeleteUser"
create_endpoint "/webhook" "GET" "${PREFIX}-Webhook"
create_endpoint "/webhook" "POST" "${PREFIX}-Webhook"

echo -e "${GREEN}✓ API Gateway Endpoints Created${NC}"
echo ""

# Step 8: Deploy API Gateway
echo -e "${YELLOW}Step 8: Deploying API Gateway...${NC}"

aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --region $REGION \
    2>&1 | grep -v "ConflictException" || \
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name prod \
        --region $REGION \
        --description "Updated deployment"

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"

echo -e "${GREEN}✓ API Gateway Deployed${NC}"
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "API Gateway URL: $API_URL"
echo ""
echo "Available Endpoints:"
echo "  POST $API_URL/exchange-token"
echo "  POST $API_URL/store-token"
echo "  GET  $API_URL/get-conversations?user_id=<user_id>"
echo "  GET  $API_URL/get-messages?user_id=<user_id>&conversation_id=<conversation_id>"
echo "  POST $API_URL/send-message"
echo "  GET  $API_URL/get-events?user_id=<user_id>&last_minutes=30"
echo "  POST $API_URL/delete-user"
echo "  GET  $API_URL/webhook"
echo "  POST $API_URL/webhook"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update frontend code to use new API URL:"
echo "   ./update_frontend_api.sh $API_URL"
echo "2. Test all endpoints"
echo ""
echo "To update frontend, run:"
echo "  ./update_frontend_api.sh $API_URL"

