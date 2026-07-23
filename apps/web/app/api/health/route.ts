export async function GET() {
  return Response.json({
    ok: true,
    service: "nexo-web-api",
    timestamp: new Date().toISOString(),
  });
}
