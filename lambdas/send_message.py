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
        
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        recipient_id = body.get('recipient_id')
        message_text = body.get('message')
        
        # Validate required parameters
        if not user_id or not recipient_id or not message_text:
            return {
                'statusCode': 400,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'error': 'Missing required parameters'})
            }
        
        # Ensure IDs are strings
        user_id = str(user_id)
        recipient_id = str(recipient_id)
        
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
        
        # Send the message using Instagram Graph API
        ig_api_url = f"https://graph.facebook.com/v22.0/{user_id}/messages"
        message_data = {
            'recipient': {'id': recipient_id},
            'message': {'text': message_text},
            'access_token': access_token
        }
        
        response = requests.post(ig_api_url, json=message_data)
        result = response.json()
        
        print("Instagram API Response:", result)
        
        if response.status_code == 200:
            return {
                'statusCode': 200,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({
                    'success': True,
                    'message_id': result.get('message_id', ''),
                    'recipient_id': recipient_id
                })
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