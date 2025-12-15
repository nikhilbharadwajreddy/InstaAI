import json
import boto3
import os
import logging
from datetime import datetime
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
TOKEN_TABLE_NAME = os.environ.get('TOKEN_TABLE_NAME', 'InstaAI-Tokens')
token_table = dynamodb.Table(TOKEN_TABLE_NAME)

def lambda_handler(event, context):
    try:
        logger.info(f"Received Event: {json.dumps(event)}")
        
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        access_token = body.get('access_token')
        token_type = body.get('token_type', 'unknown')
        
        # Validate required parameters
        if not access_token or not token_type:
            return {
                'statusCode': 400,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'error': 'Missing required parameters: access_token and token_type'})
            }
        
        # Validate token by calling Instagram API
        validation = validate_token(access_token)
        if not validation.get('valid'):
            return {
                'statusCode': 400,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'error': 'Invalid token', 'details': validation})
            }
        
        # Extract required fields from validation response
        user_id = validation.get('user_id')
        username = validation.get('username')
        insta_id = validation.get('id')
        
        # Convert user_id to string to ensure it matches the DynamoDB schema
        user_id_str = str(user_id)
        logger.info(f"Storing details for user_id: {user_id_str}, username: {username}")
        
        # Store the token and metadata in DynamoDB
        current_time = datetime.now().isoformat()
        item = {
            'user_id': user_id_str,
            'access_token': access_token,
            'token_type': token_type,
            'username': username,
            'id': insta_id,
            'created_at': current_time,
            'updated_at': current_time
        }
        
        token_table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            'body': json.dumps({
                'status': 'success',
                'message': 'Token stored successfully',
                'user_id': user_id_str,
                'username': username,
                'id': insta_id,
                'token_type': token_type
            })
        }
            
    except Exception as e:
        logger.exception(f"Lambda Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            'body': json.dumps({'error': str(e)})
        }
        
def validate_token(token):
    """Validate the token by calling the Instagram Graph API"""
    try:
        url = "https://graph.instagram.com/v22.0/me"
        params = {
            'fields': 'user_id,username',
            'access_token': token
        }
        
        response = requests.get(url, params=params)
        logger.info(f"Token validation response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # Expected response sample:
            # {
            #    "user_id": "17841472981824707",
            #    "username": "madhuram.moment",
            #    "id": "9418608091521799"
            # }
            # The 'id' field may come along depending on the API version/settings.
            if 'user_id' in data and 'username' in data:
                # Fallback if 'id' is not provided, you can decide to use user_id as a substitute.
                insta_id = data.get('id', data['user_id'])
                return {
                    'valid': True,
                    'user_id': data['user_id'],
                    'username': data['username'],
                    'id': insta_id
                }
            else:
                return {'valid': False, 'reason': 'Missing required fields in response'}
        else:
            error_data = response.json().get('error', {})
            return {
                'valid': False, 
                'reason': error_data.get('message', 'Unknown error'),
                'code': error_data.get('code', 'unknown')
            }
    except Exception as e:
        logger.exception(f"Token validation error: {str(e)}")
        return {'valid': False, 'reason': str(e)}
