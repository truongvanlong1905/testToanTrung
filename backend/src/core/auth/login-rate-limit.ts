const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
const SHARED_IP_MAX_FAILED_ATTEMPTS = 30;
const WINDOW_MS = 15 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(
  key: string,
  customLimit?: number
): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    return { allowed: true };
  }

  const maxAllowed =
    customLimit ??
    (key.startsWith("ip:") ? SHARED_IP_MAX_FAILED_ATTEMPTS : DEFAULT_MAX_FAILED_ATTEMPTS);

  if (record.count >= maxAllowed) {
    return {
      allowed: false,
      waitMinutes: Math.ceil((record.resetAt - now) / 60000),
    };
  }

  return { allowed: true };
}

export function recordFailedLoginAttempt(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  record.count += 1;
}

export function clearLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}
