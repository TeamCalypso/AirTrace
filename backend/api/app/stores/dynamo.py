import hashlib
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError


class DynamoAlertStore:
    """Subscriptions in DynamoDB.

    Table key: subscription_id (S). The id is a hash of
    (email, neighborhood, threshold) so a repeated signup hits the same item
    and the conditional put makes the operation idempotent.
    GSI `by_neighborhood` (PK neighborhood_id) is used by the alert dispatcher.
    """

    def __init__(self, table_name: str, region: str) -> None:
        self._table = boto3.resource("dynamodb", region_name=region).Table(table_name)

    def add(
        self, email: str, neighborhood_id: str, neighborhood_name: str, threshold: int
    ) -> bool:
        digest = hashlib.sha256(f"{email}|{neighborhood_id}|{threshold}".encode()).hexdigest()
        try:
            self._table.put_item(
                Item={
                    "subscription_id": digest,
                    "email": email,
                    "neighborhood_id": neighborhood_id,
                    "neighborhood_name": neighborhood_name,
                    "threshold": threshold,
                    "status": "active",
                    "unsubscribe_token": uuid.uuid4().hex,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                ConditionExpression="attribute_not_exists(subscription_id)",
            )
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            raise
