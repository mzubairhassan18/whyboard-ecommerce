import type { ExplainEvent } from "whyboard-core";

import { checkCsv, openWorkspace } from "@/lib/whyboard";

export const maxDuration = 120;

const encoder = new TextEncoder();

function frame(type: ExplainEvent["type"] | "open", payload: unknown): Uint8Array {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function hasModelCredentials(): boolean {
  return Boolean(
    process.env.XAI_API_KEY ||
      process.env.AI_GATEWAY_API_KEY ||
      process.env.OPENAI_API_KEY,
  );
}

export async function POST(request: Request) {
  let body: { csv?: unknown; filename?: unknown; question?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const check = checkCsv(body.csv);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (question.length < 4) {
    return Response.json({ error: "Ask a longer question." }, { status: 400 });
  }

  if (!hasModelCredentials()) {
    return Response.json(
      {
        code: "missing_key",
        error:
          "This demo has no model credentials yet. Set XAI_API_KEY (or OPENAI_API_KEY / AI_GATEWAY_API_KEY) in the environment and try again.",
      },
      { status: 503 },
    );
  }

  const filename =
    typeof body.filename === "string" && body.filename.trim()
      ? body.filename.trim().slice(0, 120)
      : "applications.csv";

  const workspace = await openWorkspace(check.csv, filename);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (type: ExplainEvent["type"] | "open", payload: unknown) => {
        try {
          controller.enqueue(frame(type, payload));
        } catch {
          // The client went away; the loop below still needs to finish cleanly.
        }
      };

      send("open", { question });
      try {
        for await (const event of workspace.explainStream(question)) {
          send(event.type, event);
        }
      } catch (error) {
        console.error("[chat]", error);
        send("error", {
          message:
            error instanceof Error && error.message
              ? error.message
              : "The investigation failed.",
        });
      } finally {
        await workspace.close().catch(() => undefined);
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
