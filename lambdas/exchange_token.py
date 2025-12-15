import json
import requests
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Instagram App credentials
CLIENT_ID = "2388890974807228"
CLIENT_SECRET = os.getenv("INSTAGRAM_CLIENT_SECRET")  # Ensure this is set correctly in your environment
REDIRECT_URI = "http://localhost:8000/auth-callback.html"

def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        body = json.loads(event.get("body", "{}"))
        code = body.get("code")
        
        if not code:
            logger.error("Missing authorization code")
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": "Missing authorization code"})
            }

        # STEP 1: Exchange authorization code for short-lived access token
        logger.info("Step 1: Exchanging authorization code for short-lived token")
        token_url = "https://api.instagram.com/oauth/access_token"
        payload = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
            "code": code
        }
        
        response = requests.post(token_url, data=payload)
        logger.info(f"Initial token exchange response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Error in initial token exchange: {response.text}")
            return {
                "statusCode": response.status_code,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": "Failed to exchange authorization code", "details": response.text})
            }
        
        token_data = response.json()
        logger.info("Successfully obtained short-lived token")
        
        # Validate token data
        if "access_token" not in token_data or "user_id" not in token_data:
            logger.error(f"Invalid token response: {token_data}")
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": "Invalid token response", "details": token_data})
            }
        
        user_id = token_data["user_id"]
        short_lived_token = token_data["access_token"]
        
        # STEP 2: Exchange short-lived token for long-lived user access token
        logger.info("Step 2: Exchanging for long-lived user access token")
        long_lived_url = "https://graph.instagram.com/access_token"
        long_lived_params = {
            "grant_type": "ig_exchange_token",
            "client_secret": CLIENT_SECRET,
            "access_token": short_lived_token
        }
        
        long_lived_response = requests.get(long_lived_url, params=long_lived_params)
        logger.info(f"Long-lived token exchange response status: {long_lived_response.status_code}")
        
        if long_lived_response.status_code != 200:
            logger.error(f"Error getting long-lived token: {long_lived_response.text}")
            # Return the short-lived token as a fallback
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "access_token": short_lived_token,
                    "user_id": user_id,
                    "token_type": "short_lived",
                    "warning": "Could not obtain long-lived token"
                })
            }
        
        long_lived_data = long_lived_response.json()
        if "access_token" not in long_lived_data:
            logger.error(f"Invalid long-lived token response: {long_lived_data}")
            # Return the short-lived token as a fallback
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "access_token": short_lived_token,
                    "user_id": user_id,
                    "token_type": "short_lived",
                    "warning": "Invalid long-lived token response"
                })
            }
        
        long_lived_token = long_lived_data["access_token"]
        logger.info("Successfully obtained long-lived user token")
        
        # Final response with the long-lived token
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "access_token": long_lived_token,
                "user_id": user_id,
                "token_type": "long_lived"
            })
        }
    
    except Exception as e:
        logger.exception(f"Lambda Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }
