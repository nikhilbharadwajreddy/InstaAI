#!/usr/bin/env python3
"""
Script to update Lambda functions to use InstaAI prefixed table names
"""

import os
import re

PREFIX = "InstaAI"

# Table name mappings
TABLE_MAPPINGS = {
    "InstagramTokens": f"{PREFIX}-Tokens",
    "InstagramWebhookEvents": f"{PREFIX}-WebhookEvents",
    "InstagramMessages": f"{PREFIX}-Messages"
}

def update_lambda_file(filepath):
    """Update table names in a Lambda function file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Replace hardcoded table names with environment variable approach
    for old_name, new_name in TABLE_MAPPINGS.items():
        # Pattern 1: Table('InstagramTokens')
        pattern1 = f"Table\\(['\"]{old_name}['\"]\\)"
        replacement1 = f"Table(os.environ.get('DYNAMODB_TABLE_{old_name.upper().replace('INSTAGRAM', '')}', '{new_name}'))"
        content = re.sub(pattern1, replacement1, content)
        
        # Pattern 2: Table('InstagramTokens') with variable assignment
        pattern2 = f"= dynamodb\\.Table\\(['\"]{old_name}['\"]\\)"
        replacement2 = f"= dynamodb.Table(os.environ.get('DYNAMODB_TABLE_{old_name.upper().replace('INSTAGRAM', '')}', '{new_name}'))"
        content = re.sub(pattern2, replacement2, content)
    
    # Add os import if not present
    if 'import os' not in content and 'from os import' not in content:
        # Find the first import line and add os after it
        import_match = re.search(r'^(import |from )', content, re.MULTILINE)
        if import_match:
            pos = import_match.start()
            # Find the end of the first import block
            next_line = content.find('\n', pos)
            content = content[:next_line] + '\nimport os' + content[next_line:]
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
        return True
    else:
        print(f"No changes needed for {filepath}")
        return False

# Update all Lambda files
lambda_files = [
    "lambdas/store_token.py",
    "lambdas/get_conversations.py",
    "lambdas/get_messages.py",
    "lambdas/send_message.py",
    "lambdas/get_events.py",
    "lambdas/delete_user.py",
]

for filepath in lambda_files:
    if os.path.exists(filepath):
        update_lambda_file(filepath)

print("\nAll Lambda functions updated!")

