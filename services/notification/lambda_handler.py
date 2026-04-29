"""
Lambda handler for the Notification Service.

Receives SQS events (batches of match.created messages),
processes each one using the existing notification logic.
"""
import json
import asyncio
from consumer import handle_match_created


def handler(event, context):
    """AWS Lambda entry point — triggered by SQS."""
    for record in event.get("Records", []):
        try:
            body = json.loads(record["body"])
            asyncio.get_event_loop().run_until_complete(
                handle_match_created(body)
            )
        except Exception as err:
            print(f"Failed to process record: {err}")
            raise  # Let Lambda retry via SQS visibility timeout

    return {"statusCode": 200, "body": "OK"}
