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
        conversation_id = query_params.get('conversation_id')
        
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
        
        # Prepare API call - if conversation_id is provided, get messages for that conversation
        # Otherwise get all conversations with messages
        if conversation_id:
            ig_api_url = f"https://graph.facebook.com/v22.0/{conversation_id}"
            fields = 'messages{id,message,from,to,created_time,attachments}'
        else:
            ig_api_url = f"https://graph.facebook.com/v22.0/{user_id}/conversations"
            fields = 'messages{id,message,from,to,created_time,attachments}'
        
        params = {
            'fields': fields,
            'access_token': access_token
        }
        
        response = requests.get(ig_api_url, params=params)
        result = response.json()
        
        print("Instagram API Response (truncated):", json.dumps(result)[:500])
        
        if response.status_code == 200:
            # Store messages in DynamoDB for history (optional)
            if conversation_id and 'messages' in result and 'data' in result['messages']:
                store_messages(result['messages']['data'], user_id, conversation_id)
                
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

def store_messages(messages, user_id, conversation_id):
    """Store messages in DynamoDB (optional)"""
    # Initialize messages table
    try:
        messages_table = dynamodb.Table('InstagramMessages')
        
        # Process each message
        for msg in messages:
            # Skip if no message ID
            if 'id' not in msg:
                continue
                
            # Prepare item for DynamoDB
            item = {
                'message_id': msg['id'],
                'conversation_id': conversation_id,
                'user_id': user_id,
                'message': msg.get('message', ''),
                'created_time': msg.get('created_time', ''),
                'timestamp': int(datetime.now().timestamp())
            }
            
            # Add sender and recipient if available
            if 'from' in msg and 'id' in msg['from']:
                item['sender_id'] = msg['from']['id']
                
            if 'to' in msg and 'data' in msg['to'] and len(msg['to']['data']) > 0:
                item['recipient_id'] = msg['to']['data'][0]['id']
            
            # Store in DynamoDB
            messages_table.put_item(Item=item)
                
    except Exception as e:
        # Log error but continue - this is optional storage
        print(f"Error storing messages: {str(e)}")