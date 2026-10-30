const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    return { allowed: true };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      waitMinutes: Math.ceil((record.resetAt - now) / 60000),
    };
  }

  return { allowed: true };
}

export function recordFailedLoginAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  record.count += 1;
}

export function clearLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}
