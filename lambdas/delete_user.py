import json
import boto3
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DynamoDB client and table
dynamodb = boto3.resource('dynamodb')
TOKEN_TABLE_NAME = os.environ.get('TOKEN_TABLE_NAME', 'InstaAI-Tokens')
token_table = dynamodb.Table(TOKEN_TABLE_NAME)

def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('user_id')
        
        # Default is_deleted to true if not specified
        is_deleted = body.get('is_deleted', True)
        
        # Validate required parameters
        if not user_id:
            return build_response(400, {'error': 'Missing user_id parameter'})
        
        # Get item from the table
        response = token_table.get_item(Key={'user_id': user_id})
        
        # Check if user exists
        item = response.get('Item')
        if not item:
            return build_response(404, {'error': 'User not found'})
        
        # Update the item with is_deleted flag
        update_response = token_table.update_item(
            Key={'user_id': user_id},
            UpdateExpression="set is_deleted = :d, updated_at = :u",
            ExpressionAttributeValues={
                ':d': is_deleted,
                ':u': datetime.now().isoformat()
            },
            ReturnValues="UPDATED_NEW"
        )
        
        logger.info(f"Update response: {update_response}")
        
        return build_response(200, {
            'success': True,
            'message': 'User marked as deleted' if is_deleted else 'User deletion status updated'
        })
        
    except Exception as e:
        logger.exception(f"Error in delete_user: {str(e)}")
        return build_response(500, {'error': str(e)})

def build_response(status_code, body):
    """Build a proper API response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps(body)
    }