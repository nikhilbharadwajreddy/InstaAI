import json
import os
import boto3
import requests
from botocore.exceptions import ClientError

# Initialize DynamoDB client and table
dynamodb = boto3.resource('dynamodb')
TOKEN_TABLE_NAME = os.environ.get('TOKEN_TABLE_NAME', 'InstaAI-Tokens')
token_table = dynamodb.Table(TOKEN_TABLE_NAME)

def lambda_handler(event, context):
    try:
        print("Received Event:", json.dumps(event))
        
        # Parse query parameters from the event
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('user_id')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS"
                },
                'body': json.dumps({'error': 'Missing user_id parameter'})
            }
        
        # Ensure user_id is a string (DynamoDB key)
        user_id = str(user_id)
        
        # Retrieve the stored access token from DynamoDB
        try:
            response = token_table.get_item(Key={'user_id': user_id})
            item = response.get('Item')
            
            if not item:
                return {
                    'statusCode': 404,
                    'headers': {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                    'body': json.dumps({'error': 'User token not found'})
                }
                
            access_token = item.get('access_token')
            if not access_token:
                return {
                    'statusCode': 401,
                    'headers': {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                    'body': json.dumps({'error': 'Access token not found'})
                }
        except ClientError as e:
            print(f"Error retrieving token: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                'body': json.dumps({'error': str(e)})
            }
        
        # Build the Instagram Graph API URL for conversations
        ig_api_url = "https://graph.instagram.com/v22.0/me/conversations"
        params = {
            'platform': 'instagram',
            'fields': 'id,participants{id,username,profile_pic_url},updated_time',
            'access_token': access_token
        }
        
        # Call the Instagram Graph API
        api_response = requests.get(ig_api_url, params=params)
        result = api_response.json()
        print("Instagram API Response (truncated):", json.dumps(result)[:500])
        
        if api_response.status_code == 200:
            return {
                'statusCode': 200,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS"
                },
                'body': json.dumps(result)
            }
        else:
            error_details = result.get('error', {})
            return {
                'statusCode': api_response.status_code,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                'body': json.dumps({
                    'error': error_details.get('message', 'Unknown error'),
                    'error_code': error_details.get('code', 'unknown'),
                    'error_subcode': error_details.get('error_subcode', 'unknown')
                })
            }
            
    except Exception as e:
        print(f"Lambda Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            'body': json.dumps({'error': str(e)})
        }
