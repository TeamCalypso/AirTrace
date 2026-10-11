"""PM2.5 -> AQI conversion and category lookup, using India's CPCB NAQI."""

import math

AQI_CATEGORIES = [
    {"max": 50, "name": "Good", "short": "GOOD", "color": "#00B050"},
    {"max": 100, "name": "Satisfactory", "short": "SATISFACTORY", "color": "#92D050"},
    {"max": 200, "name": "Moderate", "short": "MODERATE", "color": "#FFD400"},
    {"max": 300, "name": "Poor", "short": "POOR", "color": "#FF9900"},
    {"max": 400, "name": "Very Poor", "short": "VERY POOR", "color": "#FF0000"},
    {"max": 500, "name": "Severe", "short": "SEVERE", "color": "#C00000"},
]

# India CPCB National AQI, PM2.5 sub-index: (pm_lo, pm_hi, aqi_lo, aqi_hi)
_PM_BREAKPOINTS = [
    (0, 30, 0, 50),
    (31, 60, 51, 100),
    (61, 90, 101, 200),
    (91, 120, 201, 300),
    (121, 250, 301, 400),
    (251, 380, 401, 500),
]


def js_round(x: float) -> int:
    """Round half up, matching JavaScript's Math.round."""
    return math.floor(x + 0.5)


def pm25_to_aqi(pm: float) -> int:
    v = max(0.0, pm)
    if v >= 380:
        return 500
    # Values in the gap between bands (e.g. 30.5) fall into the next band.
    for lo, hi, alo, ahi in _PM_BREAKPOINTS:
        if v <= hi:
            return js_round(alo + (max(v - lo, 0) / (hi - lo)) * (ahi - alo))
    return 500


def category_for(aqi: int) -> dict:
    for c in AQI_CATEGORIES:
        if aqi <= c["max"]:
            return c
    return AQI_CATEGORIES[-1]
