import json
import boto3
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
events_table = dynamodb.Table('InstagramWebhookEvents')

def lambda_handler(event, context):
    try:
        print("Received Event:", json.dumps(event))
        
        # Parse the request
        query_params = event.get('queryStringParameters', {}) or {}
        user_id = query_params.get('user_id')
        last_minutes = int(query_params.get('last_minutes', '5'))
        
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
        
        # Calculate timestamp for filtering events
        filter_time = datetime.now() - timedelta(minutes=last_minutes)
        filter_timestamp_ms = int(filter_time.timestamp() * 1000)  # Convert to milliseconds
        
        # Scan for recent events related to this user
        # Note: In a production environment, you should use a GSI with user_id
        # and timestamp for more efficient querying
        response = events_table.scan(
            FilterExpression='#ts >= :ts AND contains(#data, :user_id)',
            ExpressionAttributeNames={
                '#ts': 'timestamp',
                '#data': 'event_data'
            },
            ExpressionAttributeValues={
                ':ts': filter_timestamp_ms,
                ':user_id': user_id
            }
        )
        
        # Get matching items
        items = response.get('Items', [])
        
        # Process events
        events = []
        for item in items:
            try:
                # Parse event_data JSON string
                event_data = json.loads(item.get('event_data', '{}'))
                
                # Add to events list
                events.append(event_data)
            except Exception as e:
                print(f"Error parsing event data: {str(e)}")
                # Skip invalid events
                continue
        
        # Return events
        return {
            'statusCode': 200,
            'headers': {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS"
            },
            'body': json.dumps({
                'events': events,
                'count': len(events)
            }, default=handle_decimal)
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

# Helper for DynamoDB Decimal serialization
def handle_decimal(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError