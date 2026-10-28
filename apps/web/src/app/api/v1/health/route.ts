export async function GET() {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  let backendHealthy = false;
  try {
    const res = await fetch(`${apiUrl}/campaigns?limit=1`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    backendHealthy = res.ok;
  } catch {}

  return Response.json({
    status: backendHealthy ? "ok" : "degraded",
    dataSource: "postgresql",
    backendApi: apiUrl,
    timestamp: new Date().toISOString(),
  });
}
