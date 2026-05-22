export function readPositiveNumberFromEnv(
  name: string,
  fallback: number,
): number {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}
