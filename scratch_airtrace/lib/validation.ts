export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const THRESHOLD_OPTIONS = [
  { value: 100, label: "AQI ≥ 100 — above Moderate" },
  { value: 150, label: "AQI ≥ 150 — entering Unhealthy" },
  { value: 200, label: "AQI ≥ 200 — Unhealthy ceiling" },
  { value: 300, label: "AQI ≥ 300 — Very unhealthy" },
] as const;

export const THRESHOLDS = THRESHOLD_OPTIONS.map((t) => t.value);

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return "Email is required.";
  if (e.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(e)) return "Enter a valid email address.";
  return null;
}

export interface ValidAlert {
  email: string;
  neighborhoodId: string;
  neighborhoodName: string;
  threshold: number;
}

export function validateAlertPayload(body: unknown):
  | { ok: true; data: ValidAlert }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const emailErr = validateEmail(typeof b.email === "string" ? b.email : "");
  if (emailErr) return { ok: false, error: emailErr };

  const neighborhoodId =
    typeof b.neighborhoodId === "string" ? b.neighborhoodId.trim() : "";
  if (!neighborhoodId || neighborhoodId.length > 64) {
    return { ok: false, error: "A valid neighborhood id is required." };
  }
  const neighborhoodName =
    typeof b.neighborhoodName === "string"
      ? b.neighborhoodName.trim().slice(0, 64)
      : neighborhoodId;

  const threshold = b.threshold;
  if (typeof threshold !== "number" || !Number.isInteger(threshold)) {
    return { ok: false, error: "Threshold must be an integer AQI value." };
  }
  if (threshold < 51 || threshold > 500) {
    return { ok: false, error: "Threshold must be between 51 and 500." };
  }
  return {
    ok: true,
    data: {
      email: (b.email as string).trim().toLowerCase(),
      neighborhoodId,
      neighborhoodName,
      threshold,
    },
  };
}
