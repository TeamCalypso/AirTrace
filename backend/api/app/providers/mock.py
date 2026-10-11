"""Deterministic illustrative scenario engine.

Port of the web app's scenario generator, so the API returns exactly what the
UI shows today. The same neighborhood id always yields the same 48 hours.
Replaced by model output once the forecast pipeline is writing to S3.
"""

import math

from ..aqi import category_for, js_round, pm25_to_aqi

SCENARIO_START_HOUR = 14
HOURS = 48
_M32 = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    return ((a & _M32) * (b & _M32)) & _M32


def hash_seed(s: str) -> int:
    h = 2166136261
    # UTF-16 code units, matching JavaScript's charCodeAt.
    for unit in memoryview(s.encode("utf-16-le")).cast("H"):
        h ^= unit
        h = _imul(h, 16777619)
    return h & _M32


def mulberry32(seed: int):
    a = seed & _M32

    def rng() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & _M32
        t = _imul(a ^ (a >> 15), 1 | a)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) & _M32) ^ t
        return ((t ^ (t >> 14)) & _M32) / 4294967296

    return rng


class MockProvider:
    def build(self, nb: dict) -> dict:
        seed = hash_seed(nb["id"])
        rng = mulberry32(seed)

        base = 46 + nb["bias"] * 112 + rng() * 24
        plume_roll = rng()
        has_plume = plume_roll > 0.42
        plume_start = 4 + math.floor(rng() * 16)
        plume_dur = 10 + math.floor(rng() * 9)
        plume_amp = 20 + (plume_roll - 0.42) * 110 if has_plume else 0
        syn_phase = rng() * math.pi * 2

        points = []
        for i in range(HOURS):
            hour = (SCENARIO_START_HOUR + i) % 24
            diurnal = (
                1
                + 0.24 * math.exp(-((hour - 7.5) ** 2) / 7)
                + 0.17 * math.exp(-((hour - 19) ** 2) / 6)
                - 0.13 * math.exp(-((hour - 3) ** 2) / 5)
            )
            plume = 0.0
            if plume_amp > 0:
                d = i - plume_start
                if 0 <= d < plume_dur:
                    plume = math.sin((d / plume_dur) * math.pi)
            synoptic = 1 + 0.07 * math.sin((i / HOURS) * math.pi * 2 + syn_phase)
            noise = 1 + (rng() - 0.5) * 0.11
            pm = max(4, base * diurnal * synoptic * noise + plume_amp * plume)
            aqi = pm25_to_aqi(pm)
            points.append(
                {
                    "i": i,
                    "label": "NOW" if i == 0 else f"+{i}H",
                    "aqi": aqi,
                    "pm": js_round(pm * 10) / 10,
                    "category": category_for(aqi),
                }
            )

        peak_idx = 0
        for p in points:
            if p["aqi"] > points[peak_idx]["aqi"]:
                peak_idx = p["i"]

        confidence = js_round(55 + rng() * 36)
        label = "high" if confidence >= 78 else "medium" if confidence >= 66 else "low"
        first, peak = points[0], points[peak_idx]

        return {
            "neighborhood": nb,
            "seedHex": format(seed, "X").rjust(8, "0"),
            "startClock": f"{SCENARIO_START_HOUR:02d}:00 scenario clock",
            "scale": "India NAQI, PM2.5 sub-index (illustrative)",
            "status": "illustrative",
            "points": points,
            "current": {"aqi": first["aqi"], "pm": first["pm"], "category": first["category"]},
            "peak": {
                "index": peak_idx,
                "label": peak["label"],
                "aqi": peak["aqi"],
                "pm": peak["pm"],
                "category": peak["category"],
            },
            "confidence": {"value": confidence, "label": label},
            "disclaimer": (
                "Deterministic illustrative scenario. Not a live AQI reading, "
                "not an official forecast, and not a public-health warning."
            ),
        }
