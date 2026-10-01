import { timingSafeEqual } from "node:crypto";

export function validAgentKey(key: string) {
  const expected = process.env.AGENT_KEY;
  if (!expected) return false;
  const a = Buffer.from(key),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function appOrigin() {
  return (
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}
