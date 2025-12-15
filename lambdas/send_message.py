import json
import os
import boto3
import requests
from botocore.exceptions import ClientError

# Initialize DynamoDB resource and table for tokens
dynamodb = boto3.resource('dynamodb')
TOKEN_TABLE_NAME = os.environ.get('TOKEN_TABLE_NAME', 'InstaAI-Tokens')
token_table = dynamodb.Table(TOKEN_TABLE_NAME)

def lambda_handler(event, context):
    try:
        print("Received Event:", json.dumps(event))
        
        # Parse the request body. (Using "or '{}'" to default if body is None)
        body = json.loads(event.get('body') or '{}')
        user_id = body.get('user_id')
        recipient_id = body.get('recipient_id')
        message_type = body.get('message_type', 'text').lower()
        
        # Validate required parameters
        if not user_id or not recipient_id:
            return {
                'statusCode': 400,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'error': 'Missing required parameters: user_id and recipient_id'})
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
                    'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                    'body': json.dumps({'error': 'User token not found'})
                }
            access_token = item.get('access_token')
            if not access_token:
                return {
                    'statusCode': 401,
                    'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                    'body': json.dumps({'error': 'Access token not found'})
                }
        except ClientError as e:
            print(f"Error retrieving token: {e}")
            return {
                'statusCode': 500,
                'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                'body': json.dumps({'error': str(e)})
            }
        
        # Build the payload for the message based on message_type
        payload = {
            "recipient": {"id": recipient_id}
        }
        
        if message_type == "text":
            message_text = body.get('message')
            if not message_text:
                return {
                    'statusCode': 400,
                    'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                    'body': json.dumps({'error': 'Missing message text for text message'})
                }
            payload["message"] = {"text": message_text}
        elif message_type == "image":
            attachment_url = body.get('attachment_url')
            if not attachment_url:
                return {
                    'statusCode': 400,
                    'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                    'body': json.dumps({'error': 'Missing attachment_url for image message'})
                }
            payload["message"] = {
                "attachment": {
                    "type": "image",
                    "payload": {"url": attachment_url}
                }
            }
        elif message_type in ["audio", "video"]:
            attachment_url = body.get('attachment_url')
            if not attachment_url:
                return {
                    'statusCode': 400,
                    'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                    'body': json.dumps({'error': f'Missing attachment_url for {message_type} message'})
                }
            payload["message"] = {
                "attachment": {
                    "type": message_type,
                    "payload": {"url": attachment_url}
                }
            }
        elif message_type == "like_heart":
            # Sending a sticker (heart reaction) does not need additional payload.
            payload["message"] = {
                "attachment": {"type": "like_heart"}
            }
        elif message_type == "media_share":
            post_id = body.get('post_id')
            if not post_id:
                return {
                    'statusCode': 400,
                    'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                    'body': json.dumps({'error': 'Missing post_id for MEDIA_SHARE message'})
                }
            payload["message"] = {
                "attachment": {
                    "type": "MEDIA_SHARE",
                    "payload": {"id": post_id}
                }
            }
        elif body.get('sender_action'):
            # For reactions: if sender_action is provided, include it along with the optional payload.
            payload["sender_action"] = body.get("sender_action")
            if body.get("payload"):
                payload["payload"] = body.get("payload")
        else:
            return {
                'statusCode': 400,
                'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                'body': json.dumps({'error': f'Unsupported or missing message_type: {message_type}'})
            }
        
        # According to the documentation, use /me/messages endpoint.
        ig_api_url = "https://graph.instagram.com/v22.0/me/messages"
        
        # Set headers with the access token in the Authorization header.
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
        
        response = requests.post(ig_api_url, headers=headers, json=payload)
        result = response.json()
        print("Instagram API Response:", result)
        
        if response.status_code in [200, 201]:
            return {
                'statusCode': response.status_code,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({
                    'success': True,
                    'response': result
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
