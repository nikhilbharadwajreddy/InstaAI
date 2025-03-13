import json
import requests
import os

CLIENT_ID = "2388890974807228"
CLIENT_SECRET = os.getenv("INSTAGRAM_CLIENT_SECRET")  # Make sure this is set correctly
REDIRECT_URI = "https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html"

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        code = body.get("code")
        if not code:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": "Missing authorization code"})
            }
        token_url = "https://api.instagram.com/oauth/access_token"
        payload = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
            "code": code
        }
        response = requests.post(token_url, data=payload)
        token_data = response.json()
        # Log the response for debugging:
        print("Instagram API Response:", response.text)
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps(token_data)
        }
    except Exception as e:
        print("Lambda Error:", str(e))
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": str(e)})
        }
