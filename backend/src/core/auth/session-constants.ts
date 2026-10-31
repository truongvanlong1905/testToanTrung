import { getSessionSecret } from "@/src/core/env";

export const SESSION_COOKIE_NAME = "tt_session_token";

export const JWT_SECRET = getSessionSecret();
