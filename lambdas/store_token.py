# Modified store_token Lambda function
import json
import boto3
import os
from datetime import datetime

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
token_table = dynamodb.Table('InstagramTokens')

def lambda_handler(event, context):
    try:
        print("Received Event:", json.dumps(event))
        
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        access_token = body.get('access_token')
        user_id = body.get('user_id')
        
        print(f"Parsed user_id type: {type(user_id)}, value: {user_id}")
        
        # Validate required parameters
        if not access_token or not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'error': 'Missing required parameters'})
            }
        
        # Convert user_id to string to ensure it matches the DynamoDB schema
        user_id_str = str(user_id)
        print(f"Converted user_id to string: {user_id_str}")
        
        # Store the token in DynamoDB
        current_time = datetime.now().isoformat()
        token_table.put_item(
            Item={
                'user_id': user_id_str,  # Now stored as a string
                'access_token': access_token,
                'created_at': current_time,
                'updated_at': current_time
            }
        )
        
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
                'user_id': user_id_str
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