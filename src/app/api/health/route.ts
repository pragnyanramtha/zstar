/**
 * Cloud Run health check endpoint.
 *
 * CLOUD RUN: Configure liveness probe to hit GET /api/health.
 * Without a passing health check, Cloud Run will kill the container and
 * restart it — causing dropped SSE connections and in-flight calls to fail.
 *
 * SECURITY: This endpoint intentionally has NO auth, NO DB access, and NO
 * side-effects. It must respond in < 1s at all times; adding any async logic
 * here risks false-positive health check failures under DB load.
 *
 * Configuration:
 *   Health check path:  /api/health
 *   Initial delay:      10s
 *   Period:             10s
 *   Timeout:            5s
 *   Failure threshold:  3
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
