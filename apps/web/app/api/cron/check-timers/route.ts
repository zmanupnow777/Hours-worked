import { checkLongRunningTimers, getCurrentCronSecret } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expectedSecret = await getCurrentCronSecret();
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token || token !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkLongRunningTimers();

  return Response.json(result);
}
