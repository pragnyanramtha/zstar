/**
 * Health check endpoint for Cloud Run.
 * Cloud Run sends GET /healthz every 10 seconds to verify the container is live.
 * This must respond quickly (< 1s) and return 200.
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
