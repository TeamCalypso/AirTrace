from typing import Protocol

from ..config import settings


class AlertStore(Protocol):
    def add(
        self, email: str, neighborhood_id: str, neighborhood_name: str, threshold: int
    ) -> bool:
        """Persist a subscription. Returns True if new, False if it already existed."""
        ...


_store: AlertStore | None = None


def get_store() -> AlertStore:
    global _store
    if _store is None:
        if settings.subscriptions_table:
            from .dynamo import DynamoAlertStore

            _store = DynamoAlertStore(settings.subscriptions_table, settings.aws_region)
        else:
            from .memory import MemoryAlertStore

            _store = MemoryAlertStore()
    return _store
