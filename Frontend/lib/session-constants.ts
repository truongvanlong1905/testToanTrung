export const SESSION_COOKIE_NAME = "tt_session_token";

const configuredJwtSecret = process.env.JWT_SECRET;

if (!configuredJwtSecret || configuredJwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters.");
}

export const JWT_SECRET = configuredJwtSecret;
