export async function GET() {
  return Response.json({
    status: "ok",
    dataSource: "mock",
    timestamp: new Date().toISOString(),
  });
}
