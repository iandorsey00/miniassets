import { NextResponse } from "next/server";

import { exportWorkspaceData } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") || undefined;
  const payload = await exportWorkspaceData(workspaceId);

  if (!payload) {
    return NextResponse.json({ error: "No accessible workspace." }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename=\"miniassets-${payload.workspace.slug}-export.json\"`,
    },
  });
}
