#!/bin/bash

# Load configuration
source ../config.sh

echo "Fixing API Gateway endpoints..."

API_ID=$(cat ../api_id.txt 2>/dev/null || echo "mdpc9wjdgc")

if [ -z "$API_ID" ]; then
    echo "Error: API ID not found"
    exit 1
fi

echo "Using API ID: ${API_ID}"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id ${API_ID} \
    --region ${AWS_REGION} \
    --query 'items[?path==`/`].id' --output text)

echo "Root Resource ID: ${ROOT_RESOURCE_ID}"

# Function to create endpoint
create_endpoint() {
    local PATH_NAME=$1
    local METHOD=$2
    local FUNCTION_NAME=$3
    
    echo "Creating endpoint: ${METHOD} ${PATH_NAME}"
    
    # Remove leading slash
    PATH_PART=$(echo ${PATH_NAME} | sed 's|^/||')
    
    # Check if resource exists
    RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id ${API_ID} \
        --region ${AWS_REGION} \
        --query "items[?path=='${PATH_NAME}'].id" --output text)
    
    if [ -z "$RESOURCE_ID" ]; then
        echo "  Creating resource: ${PATH_NAME}"
        RESOURCE_ID=$(aws apigateway create-resource \
            --rest-api-id ${API_ID} \
            --parent-id ${ROOT_RESOURCE_ID} \
            --path-part ${PATH_PART} \
            --region ${AWS_REGION} \
            --query 'id' --output text)
        echo "  Resource created: ${RESOURCE_ID}"
    else
        echo "  Resource exists: ${RESOURCE_ID}"
    fi
    
    # Get Lambda ARN
    LAMBDA_ARN=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}
    
    # Create method
    echo "  Creating ${METHOD} method..."
    aws apigateway put-method \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${METHOD} \
        --authorization-type NONE \
        --region ${AWS_REGION} 2>&1 | grep -v "already exists" || true
    
    # Create integration
    echo "  Creating integration..."
    aws apigateway put-integration \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${METHOD} \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations \
        --region ${AWS_REGION} 2>&1 | grep -v "already exists" || true
    
    # Add Lambda permission
    STATEMENT_ID="api-invoke-${FUNCTION_NAME}-${METHOD}"
    echo "  Adding Lambda permission..."
    aws lambda add-permission \
        --function-name ${FUNCTION_NAME} \
        --statement-id ${STATEMENT_ID} \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/${METHOD}${PATH_NAME}" \
        --region ${AWS_REGION} 2>&1 | grep -v "already exists" || true
    
    echo "  ✓ Endpoint ${METHOD} ${PATH_NAME} configured"
    echo ""
}

# Create all endpoints
create_endpoint "/exchange-token" "POST" ${EXCHANGE_TOKEN_FUNCTION}
create_endpoint "/store-token" "POST" ${STORE_TOKEN_FUNCTION}
create_endpoint "/get-conversations" "GET" ${GET_CONVERSATIONS_FUNCTION}
create_endpoint "/get-messages" "GET" ${GET_MESSAGES_FUNCTION}
create_endpoint "/send-message" "POST" ${SEND_MESSAGE_FUNCTION}
create_endpoint "/get-events" "GET" ${GET_EVENTS_FUNCTION}
create_endpoint "/delete-user" "POST" ${DELETE_USER_FUNCTION}
create_endpoint "/webhook" "GET" ${WEBHOOK_FUNCTION}
create_endpoint "/webhook" "POST" ${WEBHOOK_FUNCTION}

# Deploy API
echo "Deploying API to ${API_STAGE} stage..."
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name ${API_STAGE} \
    --region ${AWS_REGION} \
    --query 'id' --output text)

echo ""
echo "=========================================="
echo "API Gateway Deployment Complete!"
echo "=========================================="
echo "API URL: https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}"
echo ""

