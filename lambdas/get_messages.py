import json
import boto3
import requests
from botocore.exceptions import ClientError
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize DynamoDB resource and tables
dynamodb = boto3.resource('dynamodb')
token_table = dynamodb.Table('InstagramTokens')
messages_table = dynamodb.Table('InstagramMessages')

def lambda_handler(event, context):
    try:
        print("Received Event:", json.dumps(event))
        
        # Parse query parameters from the event
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
        
        # Determine endpoint and fields based on the presence of conversation_id.
        # - If conversation_id is provided: get messages in that conversation.
        # - Otherwise, list conversations.
        if conversation_id:
            ig_api_url = f"https://graph.instagram.com/v22.0/{conversation_id}"
            fields = "messages"
        else:
            ig_api_url = "https://graph.instagram.com/v22.0/me/conversations"
            fields = "id,updated_time"
        
        params = {
            'fields': fields,
            'access_token': access_token
        }
        if not conversation_id:
            params['platform'] = 'instagram'
        
        api_response = requests.get(ig_api_url, params=params)
        if api_response.text:
            result = api_response.json()
        else:
            result = {}
        print("Instagram API Response (truncated):", json.dumps(result)[:500])
        
        if api_response.status_code == 200:
            # If conversation_id is provided, fetch full details for each message.
            if conversation_id and 'messages' in result and 'data' in result['messages']:
                full_messages = fetch_full_messages(result['messages']['data'], access_token)
                # Optionally, store these full messages in DynamoDB.
                store_messages(full_messages, user_id, conversation_id)
                response_body = {"messages": full_messages, "conversation_id": conversation_id}
            else:
                # No conversation_id means we are listing conversations.
                response_body = result
            
            return {
                'statusCode': 200,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS"
                },
                'body': json.dumps(response_body)
            }
        else:
            error_details = result.get('error', {})
            return {
                'statusCode': api_response.status_code,
                'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
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
            'headers': {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            'body': json.dumps({'error': str(e)})
        }

def get_message_details(message_id, access_token):
    """Retrieve full details for a given message_id."""
    msg_url = f"https://graph.instagram.com/v22.0/{message_id}"
    params = {
        "fields": "id,created_time,from,to,message",
        "access_token": access_token
    }
    response = requests.get(msg_url, params=params)
    if response.status_code == 200 and response.text:
        return response.json()
    else:
        print(f"Failed to retrieve details for {message_id}: {response.status_code}")
        return None

def fetch_full_messages(message_list, access_token):
    """Fetch full details for each message concurrently."""
    full_messages = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_msg_id = {
            executor.submit(get_message_details, msg['id'], access_token): msg['id']
            for msg in message_list if 'id' in msg
        }
        for future in as_completed(future_to_msg_id):
            msg_id = future_to_msg_id[future]
            try:
                details = future.result()
                if details:
                    full_messages.append(details)
            except Exception as e:
                print(f"Error fetching details for message {msg_id}: {e}")
    return full_messages

def store_messages(messages, user_id, conversation_id):
    """Store detailed messages in DynamoDB for historical record."""
    try:
        for message_details in messages:
            if not message_details or 'id' not in message_details:
                continue
            
            item = {
                'message_id': message_details.get('id'),
                'conversation_id': conversation_id,
                'user_id': user_id,
                'created_time': message_details.get('created_time', ''),
                'timestamp': int(datetime.now().timestamp())
            }
            if 'message' in message_details:
                item['message'] = message_details.get('message', '')
            if 'from' in message_details and 'id' in message_details['from']:
                item['sender_id'] = message_details['from']['id']
            if 'to' in message_details and 'data' in message_details['to'] and len(message_details['to']['data']) > 0:
                item['recipient_id'] = message_details['to']['data'][0].get('id')
            
            messages_table.put_item(Item=item)
    except Exception as e:
        print(f"Error storing messages: {str(e)}")
