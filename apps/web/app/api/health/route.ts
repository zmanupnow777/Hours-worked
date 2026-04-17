import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();

  return Response.json({
    ok: true,
    timezone: settings.timezone,
  });
}
