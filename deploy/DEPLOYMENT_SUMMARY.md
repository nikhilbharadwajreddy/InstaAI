# InstaAI AWS Deployment Summary

## Deployment Date
December 15, 2025

## AWS Account
- **Account ID**: 414691912191
- **Region**: us-east-1
- **IAM Role**: TelegramLinkedInLambdaRole (arn:aws:iam::414691912191:role/TelegramLinkedInLambdaRole)

## Resources Deployed

### DynamoDB Tables (3)
1. **InstaAITokens** - Stores Instagram access tokens and user metadata
2. **InstaAIWebhookEvents** - Stores webhook events from Instagram
3. **InstaAIMessages** - Stores message history (optional caching)

### Lambda Functions (8)
All functions use Python 3.11 runtime:

1. **InstaAIExchangeToken** - Exchanges Instagram auth code for access token
   - Environment: `INSTAGRAM_CLIENT_SECRET`
   
2. **InstaAIStoreToken** - Stores tokens in DynamoDB
   - Environment: `TOKEN_TABLE_NAME=InstaAITokens`
   
3. **InstaAIGetConversations** - Retrieves Instagram conversations
   - Environment: `TOKEN_TABLE_NAME=InstaAITokens`
   
4. **InstaAIGetMessages** - Retrieves messages from conversations
   - Environment: `TOKEN_TABLE_NAME=InstaAITokens`, `MESSAGES_TABLE_NAME=InstaAIMessages`
   
5. **InstaAISendMessage** - Sends messages via Instagram API
   - Environment: `TOKEN_TABLE_NAME=InstaAITokens`
   
6. **InstaAIGetEvents** - Retrieves webhook events
   - Environment: `EVENTS_TABLE_NAME=InstaAIWebhookEvents`
   
7. **InstaAIDeleteUser** - Marks user data as deleted
   - Environment: `TOKEN_TABLE_NAME=InstaAITokens`
   
8. **InstaAIWebhook** - Handles Instagram webhook verification and events
   - Environment: `VERIFY_TOKEN=InstaAI_Webhook_Verify_2024`, `EVENTS_TABLE_NAME=InstaAIWebhookEvents`

### API Gateway
- **API Name**: InstaAIAPI
- **API ID**: mdpc9wjdgc
- **Stage**: prod
- **Base URL**: https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod

#### Endpoints:
- `POST /exchange-token` → InstaAIExchangeToken
- `POST /store-token` → InstaAIStoreToken
- `GET /get-conversations` → InstaAIGetConversations
- `GET /get-messages` → InstaAIGetMessages
- `POST /send-message` → InstaAISendMessage
- `GET /get-events` → InstaAIGetEvents
- `POST /delete-user` → InstaAIDeleteUser
- `GET /webhook` → InstaAIWebhook
- `POST /webhook` → InstaAIWebhook

## Configuration

### Instagram Credentials
- **Client Secret**: 41fbd6c7036faf31d7c0ff548acf0bd7
- **Client ID**: 2388890974807228
- **Redirect URI**: https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html

### Webhook Configuration
- **Verify Token**: InstaAI_Webhook_Verify_2024

## Next Steps

1. **Update Frontend Files**: Replace old API Gateway URL with new one:
   - Old: `https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod`
   - New: `https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod`

2. **Test Endpoints**: Verify all endpoints are working correctly

3. **Configure CORS**: Ensure CORS is properly configured for frontend access

4. **Set up Webhook**: Configure Instagram webhook to point to:
   - `https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/webhook`

## Deployment Scripts

All deployment scripts are in the `deploy/` directory:
- `config.sh` - Configuration file
- `deploy.sh` - Main deployment script
- `scripts/1_create_dynamodb_tables.sh` - Creates DynamoDB tables
- `scripts/2_deploy_lambdas.sh` - Deploys Lambda functions
- `scripts/3_create_api_gateway.sh` - Creates API Gateway

## Notes

- All resources are prefixed with "InstaAI"
- DynamoDB tables use PAY_PER_REQUEST billing mode
- Lambda functions have 30-second timeout and 256MB memory
- API Gateway uses AWS_PROXY integration type

