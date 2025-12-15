# InstaAI AWS Deployment Guide

## Quick Start

### Prerequisites
- AWS CLI installed and configured
- Python 3.x installed
- AWS credentials with appropriate permissions

### Running the Deployment

#### Option 1: Run Full Deployment (Recommended)
```bash
cd deploy
bash deploy.sh
```

This will:
1. Create DynamoDB tables
2. Deploy all Lambda functions
3. Create API Gateway endpoints
4. Deploy the API

#### Option 2: Run Individual Steps

**Step 1: Create DynamoDB Tables**
```bash
cd deploy/scripts
source ../config.sh
bash 1_create_dynamodb_tables.sh
```

**Step 2: Deploy Lambda Functions**
```bash
cd deploy/scripts
source ../config.sh
bash 2_deploy_lambdas.sh
```

**Step 3: Create API Gateway**
```bash
cd deploy/scripts
source ../config.sh
bash 4_fix_api_gateway.sh
```

### Configuration

All configuration is in `deploy/config.sh`. The script automatically:
- Sets AWS credentials
- Configures AWS CLI
- Sets up environment variables

### After Deployment

1. **Get API Gateway URL:**
   ```bash
   cat deploy/api_id.txt
   ```
   The API URL will be: `https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod`

2. **Update Frontend:**
   See `deploy/UPDATE_FRONTEND.md` for instructions on updating frontend files with the new API Gateway URL.

3. **Test Endpoints:**
   ```bash
   # Test exchange token endpoint
   curl -X POST https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/exchange-token \
     -H "Content-Type: application/json" \
     -d '{"code":"YOUR_AUTH_CODE"}'
   ```

### Troubleshooting

**If Lambda deployment fails:**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM role exists: `aws iam get-role --role-name TelegramLinkedInLambdaRole`
- Check function logs: `aws lambda get-function --function-name InstaAIExchangeToken`

**If API Gateway deployment fails:**
- Verify Lambda functions are deployed: `aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'InstaAI')].FunctionName"`
- Check API Gateway: `aws apigateway get-rest-apis --query "items[?name=='InstaAIAPI']"`

### Current Deployment Status

- **API Gateway ID**: `mdpc9wjdgc`
- **API URL**: `https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod`
- **Region**: `us-east-1`
- **Account**: `414691912191`

### Files Structure

```
deploy/
├── config.sh                    # Configuration file
├── deploy.sh                    # Main deployment script
├── api_id.txt                   # API Gateway ID (generated)
├── scripts/
│   ├── 1_create_dynamodb_tables.sh
│   ├── 2_deploy_lambdas.sh
│   ├── 3_create_api_gateway.sh
│   └── 4_fix_api_gateway.sh
└── packages/                    # Lambda deployment packages (generated)
```

