import json
import boto3
import uuid
import os
from datetime import datetime

# Store verification token in environment variables
VERIFY_TOKEN = os.environ.get("VERIFY_TOKEN", "InstaAI_Webhook_Verify_1234")
EVENTS_TABLE_NAME = os.environ.get("EVENTS_TABLE_NAME", "InstaAI-WebhookEvents")

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
events_table = dynamodb.Table(EVENTS_TABLE_NAME)

def lambda_handler(event, context):
    try:
        print("Received Event:", json.dumps(event))
        
        # Ensure 'httpMethod' exists
        method = event.get('httpMethod', '')
        
        # Handle Instagram Webhook Verification (GET request)
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            mode = params.get('hub.mode', '')
            token = params.get('hub.verify_token', '')
            challenge = params.get('hub.challenge', '')
            
            print(f"mode: {mode}, token: {token}, challenge: {challenge}")
            
            if mode == 'subscribe' and token == VERIFY_TOKEN:
                print(f"Returning Challenge: {challenge}")
                return {
                    'statusCode': 200,
                    'headers': {
                        "Content-Type": "text/plain",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST"
                    },
                    'body': challenge
                }
            else:
                print("Verification failed")
                return {
                    'statusCode': 403,
                    'body': 'Verification failed'
                }
        
        # Handle Instagram Webhook Event (POST request)
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            event_id = str(uuid.uuid4())
            timestamp = int(datetime.now().timestamp() * 1000)  # milliseconds
            
            # Extract user_id if present for more efficient querying
            user_id = extract_user_id(body)
            
            # Save to DynamoDB
            item = {
                'event_id': event_id,
                'event_data': json.dumps(body),
                'timestamp': timestamp
            }
            
            # Add user_id if found
            if user_id:
                item['user_id'] = user_id
            
            events_table.put_item(Item=item)
            
            return {
                'statusCode': 200,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST"
                },
                'body': json.dumps({
                    'status': 'received', 
                    'event_id': event_id,
                    'timestamp': timestamp
                })
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid request method'})
            }
    except Exception as e:
        print(f"Lambda Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST"
            },
            'body': json.dumps({'error': str(e)})
        }

def extract_user_id(event_data):
    """Extract Instagram user ID from webhook event if possible"""
    try:
        # Check entry array
        if 'entry' in event_data and len(event_data['entry']) > 0:
            entry = event_data['entry'][0]
            
            # Look for messaging events
            if 'messaging' in entry and len(entry['messaging']) > 0:
                messaging = entry['messaging'][0]
                
                # Check recipient (the page/business receiving the message)
                if 'recipient' in messaging and 'id' in messaging['recipient']:
                    return messaging['recipient']['id']
            
            # Look for changes array for other event types
            if 'changes' in entry and len(entry['changes']) > 0:
                changes = entry['changes'][0]
                
                # Check value object
                if 'value' in changes and 'from' in changes['value']:
                    from_data = changes['value']['from']
                    if 'id' in from_data:
                        return from_data['id']
    except Exception as e:
        print(f"Error extracting user_id: {str(e)}")
    
    return None