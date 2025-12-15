#!/bin/bash

# Load configuration
source ../config.sh

echo "Adding CORS configuration to API Gateway..."

API_ID=$(cat ../api_id.txt 2>/dev/null || echo "mdpc9wjdgc")

if [ -z "$API_ID" ]; then
    echo "Error: API ID not found"
    exit 1
fi

echo "Using API ID: ${API_ID}"

# Function to add CORS to an endpoint
add_cors_to_endpoint() {
    local PATH_NAME=$1
    local METHOD=$2
    
    echo "Adding CORS to: ${METHOD} ${PATH_NAME}"
    
    # Get resource ID
    RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id ${API_ID} \
        --region ${AWS_REGION} \
        --query "items[?path=='${PATH_NAME}'].id" --output text)
    
    if [ -z "$RESOURCE_ID" ]; then
        echo "  Resource not found: ${PATH_NAME}"
        return
    fi
    
    # Add OPTIONS method for CORS preflight
    echo "  Adding OPTIONS method..."
    aws apigateway put-method \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region ${AWS_REGION} 2>&1 | grep -v "already exists" || true
    
    # Create mock integration for OPTIONS
    echo "  Creating OPTIONS integration..."
    aws apigateway put-integration \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method OPTIONS \
        --type MOCK \
        --integration-http-method OPTIONS \
        --request-templates '{"application/json":"{\"statusCode\":200}"}' \
        --region ${AWS_REGION} 2>&1 | grep -v "already exists" || true
    
    # Add method response for OPTIONS
    echo "  Adding OPTIONS method response..."
    aws apigateway put-method-response \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true,"method.response.header.Access-Control-Allow-Origin":true}' \
        --region ${AWS_REGION} 2>&1 | grep -v "already exists" || true
    
    # Add integration response for OPTIONS
    echo "  Adding OPTIONS integration response..."
    aws apigateway put-integration-response \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'\''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\''","method.response.header.Access-Control-Allow-Methods":"'\''GET,POST,OPTIONS'\''","method.response.header.Access-Control-Allow-Origin":"'\''*'\''"}' \
        --region ${AWS_REGION} 2>&1 | grep -v "already exists" || true
    
    echo "  ✓ CORS configured for ${METHOD} ${PATH_NAME}"
    echo ""
}

# Add CORS to all endpoints
add_cors_to_endpoint "/exchange-token" "POST"
add_cors_to_endpoint "/store-token" "POST"
add_cors_to_endpoint "/get-conversations" "GET"
add_cors_to_endpoint "/get-messages" "GET"
add_cors_to_endpoint "/send-message" "POST"
add_cors_to_endpoint "/get-events" "GET"
add_cors_to_endpoint "/delete-user" "POST"
add_cors_to_endpoint "/webhook" "GET"
add_cors_to_endpoint "/webhook" "POST"

# Deploy API
echo "Deploying API with CORS configuration..."
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name ${API_STAGE} \
    --region ${AWS_REGION} \
    --query 'id' --output text)

echo ""
echo "=========================================="
echo "CORS Configuration Complete!"
echo "=========================================="
echo "API URL: https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}"
echo ""

