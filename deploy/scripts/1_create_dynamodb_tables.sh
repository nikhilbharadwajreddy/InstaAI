#!/bin/bash

# Load configuration
source ../config.sh

echo "Creating DynamoDB tables..."

# Create InstagramTokens table
echo "Creating ${TOKENS_TABLE} table..."
aws dynamodb create-table \
    --table-name ${TOKENS_TABLE} \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ${AWS_REGION} \
    --tags Key=Project,Value=InstaAI Key=Environment,Value=Production || echo "Table may already exist"

# Create InstagramWebhookEvents table
echo "Creating ${EVENTS_TABLE} table..."
aws dynamodb create-table \
    --table-name ${EVENTS_TABLE} \
    --attribute-definitions \
        AttributeName=event_id,AttributeType=S \
    --key-schema \
        AttributeName=event_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ${AWS_REGION} \
    --tags Key=Project,Value=InstaAI Key=Environment,Value=Production || echo "Table may already exist"

# Create InstagramMessages table
echo "Creating ${MESSAGES_TABLE} table..."
aws dynamodb create-table \
    --table-name ${MESSAGES_TABLE} \
    --attribute-definitions \
        AttributeName=message_id,AttributeType=S \
    --key-schema \
        AttributeName=message_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ${AWS_REGION} \
    --tags Key=Project,Value=InstaAI Key=Environment,Value=Production || echo "Table may already exist"

echo "Waiting for tables to be active..."
aws dynamodb wait table-exists --table-name ${TOKENS_TABLE} --region ${AWS_REGION}
aws dynamodb wait table-exists --table-name ${EVENTS_TABLE} --region ${AWS_REGION}
aws dynamodb wait table-exists --table-name ${MESSAGES_TABLE} --region ${AWS_REGION}

echo "DynamoDB tables created successfully!"

