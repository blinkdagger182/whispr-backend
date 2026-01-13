type EnvValue = string | undefined;

export function requireEnv(name: string, value: EnvValue): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function optionalEnv(name: string, value: EnvValue): string | undefined {
  if (!value) {
    return undefined;
  }
  return value;
}

export function numberEnv(
  name: string,
  value: EnvValue,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}
