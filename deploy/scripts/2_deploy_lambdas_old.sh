#!/bin/bash

# Load configuration
source ../config.sh

echo "Deploying Lambda functions..."

# Create packages directory if it doesn't exist
mkdir -p ../packages

# Function to deploy a Lambda
deploy_lambda() {
    local FUNCTION_NAME=$1
    local HANDLER=$2
    local LAMBDA_FILE=$3
    local ENV_VARS_JSON=$4
    
    echo "Deploying ${FUNCTION_NAME}..."
    
    # Create deployment package
    cd ../packages
    rm -rf ${FUNCTION_NAME}
    mkdir -p ${FUNCTION_NAME}
    
    # Copy Lambda function
    cp ../../lambdas/${LAMBDA_FILE} ${FUNCTION_NAME}/lambda_function.py
    
    # Install dependencies (boto3 is already available in Lambda runtime)
    # Only install requests if needed
    if grep -q "import requests" ${FUNCTION_NAME}/lambda_function.py; then
        pip3 install requests -t ${FUNCTION_NAME} --quiet 2>/dev/null || true
    fi
    
    # Create zip file
    cd ${FUNCTION_NAME}
    zip -r ../${FUNCTION_NAME}.zip . -q
    cd ..
    
    # Check if function exists
    if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${AWS_REGION} &>/dev/null; then
        echo "Updating existing function ${FUNCTION_NAME}..."
        aws lambda update-function-code \
            --function-name ${FUNCTION_NAME} \
            --zip-file fileb://${FUNCTION_NAME}.zip \
            --region ${AWS_REGION}
        
        # Update environment variables if provided
        if [ ! -z "$ENV_VARS_JSON" ] && [ "$ENV_VARS_JSON" != "{}" ]; then
            echo "Updating environment variables..."
            ENV_FILE=$(mktemp)
            echo "{\"Variables\":${ENV_VARS_JSON}}" > ${ENV_FILE}
            aws lambda update-function-configuration \
                --function-name ${FUNCTION_NAME} \
                --cli-input-json file://${ENV_FILE} \
                --region ${AWS_REGION} 2>/dev/null || \
            aws lambda update-function-configuration \
                --function-name ${FUNCTION_NAME} \
                --environment Variables="${ENV_VARS_JSON}" \
                --region ${AWS_REGION}
            rm -f ${ENV_FILE}
        fi
    else
        echo "Creating new function ${FUNCTION_NAME}..."
        CREATE_CMD="aws lambda create-function \
            --function-name ${FUNCTION_NAME} \
            --runtime python3.11 \
            --role ${IAM_ROLE_ARN} \
            --handler ${HANDLER} \
            --zip-file fileb://${FUNCTION_NAME}.zip \
            --timeout 30 \
            --memory-size 256"
        
        if [ ! -z "$ENV_VARS_JSON" ] && [ "$ENV_VARS_JSON" != "{}" ]; then
            ENV_FILE=$(mktemp)
            echo "{\"Variables\":${ENV_VARS_JSON}}" > ${ENV_FILE}
            eval "${CREATE_CMD} --cli-input-json file://${ENV_FILE} --region ${AWS_REGION} --tags Project=InstaAI,Environment=Production" 2>/dev/null || \
            eval "${CREATE_CMD} --environment Variables='${ENV_VARS_JSON}' --region ${AWS_REGION} --tags Project=InstaAI,Environment=Production"
            rm -f ${ENV_FILE}
        else
            eval "${CREATE_CMD} --region ${AWS_REGION} --tags Project=InstaAI,Environment=Production"
        fi
    fi
    
    # Clean up
    rm -rf ${FUNCTION_NAME}
    cd ../scripts
}

# Deploy each Lambda function
deploy_lambda ${EXCHANGE_TOKEN_FUNCTION} "lambda_function.lambda_handler" "exchange_token.py" '{"INSTAGRAM_CLIENT_SECRET":"'${INSTAGRAM_CLIENT_SECRET}'"}'

deploy_lambda ${STORE_TOKEN_FUNCTION} "lambda_function.lambda_handler" "store_token.py" '{"TOKEN_TABLE_NAME":"'${TOKENS_TABLE}'"}'

deploy_lambda ${GET_CONVERSATIONS_FUNCTION} "lambda_function.lambda_handler" "get_conversations.py" '{"TOKEN_TABLE_NAME":"'${TOKENS_TABLE}'"}'

deploy_lambda ${GET_MESSAGES_FUNCTION} "lambda_function.lambda_handler" "get_messages.py" '{"TOKEN_TABLE_NAME":"'${TOKENS_TABLE}'","MESSAGES_TABLE_NAME":"'${MESSAGES_TABLE}'"}'

deploy_lambda ${SEND_MESSAGE_FUNCTION} "lambda_function.lambda_handler" "send_message.py" '{"TOKEN_TABLE_NAME":"'${TOKENS_TABLE}'"}'

deploy_lambda ${GET_EVENTS_FUNCTION} "lambda_function.lambda_handler" "get_events.py" '{"EVENTS_TABLE_NAME":"'${EVENTS_TABLE}'"}'

deploy_lambda ${DELETE_USER_FUNCTION} "lambda_function.lambda_handler" "delete_user.py" '{"TOKEN_TABLE_NAME":"'${TOKENS_TABLE}'"}'

deploy_lambda ${WEBHOOK_FUNCTION} "lambda_function.lambda_handler" "webhook.py" '{"VERIFY_TOKEN":"'${VERIFY_TOKEN}'","EVENTS_TABLE_NAME":"'${EVENTS_TABLE}'"}'

echo "Lambda functions deployed successfully!"

