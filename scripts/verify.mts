/**
 * Smoke test for the demo pipeline: the same `openWorkspace` helper the route
 * handlers use, driven by mock models so it runs without an API key.
 *
 *   npx tsx scripts/verify.mts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { MockLanguageModelV4 } from "ai/test";

import { checkCsv, describeWorkspace, openWorkspace } from "../lib/whyboard";

const csv = await readFile(
  new URL("../public/sample-orders.csv", import.meta.url),
  "utf8",
);

function usage(input: number, output: number) {
  return {
    inputTokens: { total: input, noCache: input, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: output, text: output, reasoning: 0 },
  };
}

type Part = Record<string, unknown>;

function streamOf(parts: Part[], finishReason: "stop" | "tool-calls", inTokens: number, outTokens: number) {
  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] });
        for (const part of parts) controller.enqueue(part);
        controller.enqueue({
          type: "finish",
          finishReason: {
            unified: finishReason === "stop" ? "stop" : "tool-calls",
            raw: finishReason === "stop" ? "stop" : "tool_calls",
          },
          usage: usage(inTokens, outTokens),
        });
        controller.close();
      },
    }),
  };
}

function toolStream(name: string, input: unknown) {
  return streamOf(
    [
      {
        type: "tool-call",
        toolCallId: `call-${name}`,
        toolName: name,
        input: JSON.stringify(input),
      },
    ],
    "tool-calls",
    100,
    20,
  );
}

function textStream(text: string) {
  return streamOf(
    [
      { type: "text-start", id: "text-1" },
      { type: "text-delta", id: "text-1", delta: text },
      { type: "text-end", id: "text-1" },
    ],
    "stop",
    200,
    100,
  );
}

const check = checkCsv(csv);
assert.ok(check.ok, "sample CSV should pass validation");

const detective = new MockLanguageModelV4({
  modelId: "mock-detective",
  doStream: [
    toolStream("breakdown", { table: "orders", dimension: "channel", limit: 10 }),
    toolStream("report_findings", {
      headline: "September lost traffic, not customers",
      answer:
        "Revenue fell 30% from $48.2k in August to $33.6k in September. Orders dropped 38% while average order value rose 12%, so the loss was volume — paid social orders collapsed from 59 to 16.",
      confidence: "high",
      drivers: [
        {
          label: "Paid social volume",
          detail: "The channel lost 73% of its orders after the summer promo ended.",
          impact: "Most of the order decline",
          evidence: "59 orders in August, 16 in September",
        },
        {
          label: "Aurora Lounge Chair",
          detail: "The flagship chair's price rose and its units fell by two thirds.",
          impact: "67% of the revenue drop",
          evidence: "$17.1k in August, $7.2k in September",
        },
      ],
      numbers: [
        { label: "August revenue", value: "$48.2k" },
        { label: "September revenue", value: "$33.6k" },
        { label: "Orders", value: "168 → 104" },
      ],
      caveats: ["Revenue includes orders that were later returned."],
      suggestedNextQuestions: ["Would the September revenue have held without the price increase?"],
    }),
  ],
});

const storyteller = new MockLanguageModelV4({
  modelId: "mock-storyteller",
  doStream: [
    textStream(
      "**September lost traffic, not customers**\n\nRevenue fell 30% from $48.2k in August to $33.6k in September. Orders dropped 38% while average order value rose 12%, so the loss was volume — paid social orders collapsed from 59 to 16.\n\n### The numbers\n\n- August revenue: $48.2k\n- September revenue: $33.6k\n- Orders: 168 → 104",
    ),
  ],
});

const workspace = await openWorkspace(check.csv, "orders.csv", {
  detective,
  storyteller,
});

try {
  const dataset = await describeWorkspace(workspace, "orders.csv");

  assert.equal(dataset.rows, 909);
  assert.equal(dataset.columns.length, 14);
  assert.equal(dataset.table, "orders");
  assert.equal(dataset.questions[0], "Why did sales drop last month?");
  assert.equal(dataset.kpis.length, 4);
  assert.equal(dataset.kpis[0].label, "Revenue");
  assert.equal(dataset.kpis[0].value, "$271.1k");
  assert.equal(dataset.kpis[1].value, "882");
  assert.match(dataset.kpis[3].value, /^\d+%$/);

  const events: string[] = [];
  let answer = "";
  let result;

  for await (const event of workspace.explainStream(dataset.questions[0])) {
    events.push(event.type);
    if (event.type === "answer-delta") answer += event.text;
    if (event.type === "done") result = event.result;
  }

  assert.ok(result, "stream should end with a done event");
  assert.ok(events.includes("tool"), "stream should report tool calls");
  assert.ok(events.includes("answer-delta"), "stream should stream answer text");
  assert.match(answer, /lost traffic, not customers/);
  assert.equal(result.trace.queries.length, 2);
  assert.equal(result.trace.modelCalls.length, 2);
  assert.equal(result.confidence, "high");
  assert.match(result.trace.queries[0].sql.toLowerCase(), /^select/);

  console.log("ok — demo pipeline");
  console.log(`   table      ${dataset.table}`);
  console.log(`   rows       ${dataset.rows}`);
  console.log(`   columns    ${dataset.columns.map((column) => column.name).join(", ")}`);
  console.log(`   events     ${events.join(" → ")}`);
  console.log(`   queries    ${result.trace.queries.length}`);
  console.log(`   answer     ${result.answer.split("\n")[0]}`);
} finally {
  await workspace.close();
}
