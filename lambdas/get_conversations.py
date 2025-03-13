import json
import boto3
import requests
import os
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
token_table = dynamodb.Table('InstagramTokens')

def lambda_handler(event, context):
    try:
        print("Received Event:", json.dumps(event))
        
        # Parse the request
        query_params = event.get('queryStringParameters', {}) or {}
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
        
        # Ensure user_id is a string
        user_id = str(user_id)
        
        # Retrieve the access token for this user from DynamoDB
        try:
            response = token_table.get_item(Key={'user_id': user_id})
            item = response.get('Item', {})
            
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
        
        # Get Instagram conversations using Graph API
        ig_api_url = f"https://graph.facebook.com/v22.0/{user_id}/conversations"
        params = {
            'fields': 'id,participants{id,username,profile_pic_url},updated_time',
            'access_token': access_token
        }
        
        response = requests.get(ig_api_url, params=params)
        result = response.json()
        
        print("Instagram API Response (truncated):", json.dumps(result)[:500])
        
        if response.status_code == 200:
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
            return {
                'statusCode': response.status_code,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                'body': json.dumps({
                    'error': result.get('error', {}).get('message', 'Unknown error'),
                    'error_code': result.get('error', {}).get('code', 'unknown'),
                    'error_subcode': result.get('error', {}).get('error_subcode', 'unknown')
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