#!/bin/bash

# Load configuration
source ../config.sh

echo "Creating API Gateway..."

# Check if API already exists
API_ID=$(aws apigateway get-rest-apis --region ${AWS_REGION} --query "items[?name=='${API_NAME}'].id" --output text)

if [ -z "$API_ID" ]; then
    echo "Creating new API Gateway: ${API_NAME}..."
    API_ID=$(aws apigateway create-rest-api \
        --name ${API_NAME} \
        --description "Instagram AI API Gateway" \
        --region ${AWS_REGION} \
        --endpoint-configuration types=REGIONAL \
        --tags Project=InstaAI,Environment=Production \
        --query 'id' --output text)
    
    echo "API Gateway created with ID: ${API_ID}"
else
    echo "API Gateway already exists with ID: ${API_ID}"
fi

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id ${API_ID} \
    --region ${AWS_REGION} \
    --query 'items[?path==`/`].id' --output text)

echo "Root Resource ID: ${ROOT_RESOURCE_ID}"

# Function to create API Gateway resource and method
create_endpoint() {
    local PATH=$1
    local METHOD=$2
    local FUNCTION_NAME=$3
    
    echo "Creating endpoint: ${METHOD} ${PATH}"
    
    # Remove leading slash for path part
    PATH_PART=$(echo ${PATH} | tr -d '/')
    
    # Create resource if it doesn't exist
    RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id ${API_ID} \
        --region ${AWS_REGION} \
        --query "items[?path=='${PATH}'].id" --output text)
    
    if [ -z "$RESOURCE_ID" ]; then
        # Create resource directly under root
        RESOURCE_ID=$(aws apigateway create-resource \
            --rest-api-id ${API_ID} \
            --parent-id ${ROOT_RESOURCE_ID} \
            --path-part ${PATH_PART} \
            --region ${AWS_REGION} \
            --query 'id' --output text)
    fi
    
    # Get Lambda function ARN
    LAMBDA_ARN=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}
    
    # Create method
    aws apigateway put-method \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${METHOD} \
        --authorization-type NONE \
        --region ${AWS_REGION} 2>/dev/null || echo "Method may already exist"
    
    # Set up integration
    aws apigateway put-integration \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${METHOD} \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations \
        --region ${AWS_REGION}
    
    # Add permission for API Gateway to invoke Lambda
    STATEMENT_ID="api-gateway-invoke-${FUNCTION_NAME}"
    aws lambda add-permission \
        --function-name ${FUNCTION_NAME} \
        --statement-id ${STATEMENT_ID} \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
        --region ${AWS_REGION} 2>/dev/null || echo "Permission may already exist"
    
    # Enable CORS for the method
    aws apigateway put-method-response \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${METHOD} \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Origin=false \
        --region ${AWS_REGION} 2>/dev/null || true
    
    # Add CORS headers to integration response
    aws apigateway put-integration-response \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${METHOD} \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'\''*'\''"}' \
        --region ${AWS_REGION} 2>/dev/null || true
}

# Create endpoints
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

echo "API Gateway deployed successfully!"
echo "API ID: ${API_ID}"
echo "API URL: https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}"
echo ""
echo "Save this API ID for updating frontend: ${API_ID}"

# Save API ID to file
echo ${API_ID} > ../api_id.txt
echo "API ID saved to deploy/api_id.txt"

