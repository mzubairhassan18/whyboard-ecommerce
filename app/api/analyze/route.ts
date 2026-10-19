import { checkCsv, describeWorkspace, openWorkspace } from "@/lib/whyboard";

export async function POST(request: Request) {
  let body: { csv?: unknown; filename?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const check = checkCsv(body.csv);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 400 });
  }

  const filename =
    typeof body.filename === "string" && body.filename.trim()
      ? body.filename.trim().slice(0, 120)
      : "applications.csv";

  let workspace;
  try {
    workspace = await openWorkspace(check.csv, filename);
    const dataset = await describeWorkspace(workspace, filename);
    return Response.json({ dataset });
  } catch (error) {
    console.error("[analyze]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not read that CSV.";
    return Response.json({ error: message }, { status: 422 });
  } finally {
    await workspace?.close();
  }
}
