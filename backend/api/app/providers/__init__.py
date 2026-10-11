from typing import Protocol

from ..config import settings


class ForecastProvider(Protocol):
    def build(self, neighborhood: dict) -> dict:
        """Return the 48-hour forecast document for one neighborhood."""
        ...


def get_provider() -> ForecastProvider:
    if settings.forecast_source == "mock":
        from .mock import MockProvider

        return MockProvider()
    raise RuntimeError(
        f"FORECAST_SOURCE={settings.forecast_source!r} is not implemented yet"
    )
