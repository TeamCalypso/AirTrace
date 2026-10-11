class MemoryAlertStore:
    """Process-local store for local development and tests."""

    def __init__(self) -> None:
        self._seen: set[tuple[str, str, int]] = set()

    def add(
        self, email: str, neighborhood_id: str, neighborhood_name: str, threshold: int
    ) -> bool:
        key = (email, neighborhood_id, threshold)
        if key in self._seen:
            return False
        self._seen.add(key)
        return True
