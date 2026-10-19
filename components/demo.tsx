"use client";

import {
  ArrowUpRight,
  ChevronDown,
  Database,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Dataset, ExplainResult, Kpi, Step, Turn } from "@/lib/types";

import { Composer } from "./composer";
import { SiteHeader } from "./site-header";
import { TurnCard } from "./turn-card";
import { UploadCard } from "./upload-card";

type Frame = { event: string; data: Record<string, unknown> };

function parseFrame(block: string): Frame | null {
  let event = "message";
  const data: string[] = [];

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }

  if (!data.length) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) as Record<string, unknown> };
  } catch {
    return null;
  }
}

function Landing({
  onCsv,
  busy,
  error,
}: {
  onCsv: (csv: string, filename: string) => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <section className="relative flex-1">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] grid-lines" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            <span className="size-1.5 rounded-full bg-accent" />
            Whyboard demo · ecommerce
          </span>

          <h1 className="mt-6 text-[2.55rem] font-medium leading-[1.05] tracking-[-0.035em] text-ink sm:text-6xl">
            Your revenue dropped.
            <br />
            Here&apos;s the actual reason.
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            Drop your orders export. Whyboard interrogates it like a detective —
            products, channels, cohorts, discounts — then writes the story behind the
            revenue move, with every number attached.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <UploadCard onCsv={onCsv} busy={busy} error={error} />

          <aside className="flex flex-col rounded-2xl border border-line bg-panel/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              Example finding
            </p>
            <p className="mt-3 text-[15px] font-medium leading-snug text-ink">
              “September didn&apos;t lose customers. It lost traffic — and one product
              did most of the damage.”
            </p>

            <ul className="mt-5 space-y-3 text-xs leading-relaxed text-muted">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent/80" />
                It interrogates, not summarizes: read-only SQL it has to show you.
              </li>
              <li className="flex gap-2.5">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent/80" />
                Confidence, numbers and caveats on every claim.
              </li>
              <li className="flex gap-2.5">
                <Database className="mt-0.5 size-3.5 shrink-0 text-accent/80" />
                Your store file lives in memory for one request, then disappears.
              </li>
            </ul>

            <p className="mt-auto border-t border-line-soft pt-4 text-[11px] text-faint">
              Not another dashboard. A story with receipts.
            </p>
          </aside>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Bring your orders",
              body: "Shopify export, Stripe dump or a spreadsheet. One row per order.",
            },
            {
              step: "02",
              title: "It runs the case",
              body: "The detective writes queries, splits by product and channel, checks timing, and refuses to answer on vibes.",
            },
            {
              step: "03",
              title: "Read the story",
              body: "A quantified narrative, a confidence level, the caveats, and every SQL statement behind it.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-line-soft bg-panel/25 px-4 py-4"
            >
              <span className="font-mono text-[10px] tracking-[0.16em] text-accent/70">
                {item.step}
              </span>
              <p className="mt-2 text-sm text-ink">{item.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DatasetCard({
  dataset,
  onReset,
  busy,
}: {
  dataset: Dataset;
  onReset: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? dataset.columns : dataset.columns.slice(0, 7);

  return (
    <div className="rounded-2xl border border-line bg-panel/50 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
        <Database className="size-3.5 text-accent/80" />
        Dataset
      </div>

      <p className="mt-3 truncate text-[13px] text-ink" title={dataset.filename}>
        {dataset.filename}
      </p>
      <p className="mt-1 font-mono text-[10.5px] text-faint">
        {dataset.rows.toLocaleString()} rows · {dataset.columns.length} columns
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {visible.map((column) => (
          <span
            key={column.name}
            className="rounded-md border border-line-soft bg-canvas/50 px-1.5 py-1 font-mono text-[9.5px] text-muted"
          >
            {column.name}
          </span>
        ))}
        {dataset.columns.length > 7 ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[9.5px] text-faint transition-colors hover:text-ink"
          >
            {open ? "less" : `+${dataset.columns.length - 7}`}
            <ChevronDown className={`size-2.5 ${open ? "rotate-180" : ""}`} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint transition-colors hover:text-ink disabled:opacity-40"
      >
        <RotateCcw className="size-3" />
        Replace file
      </button>
    </div>
  );
}

function Questions({
  questions,
  onAsk,
  busy,
}: {
  questions: string[];
  onAsk: (question: string) => void;
  busy: boolean;
}) {
  if (!questions.length) return null;

  return (
    <div>
      <p className="px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
        Ask why
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={busy}
            onClick={() => onAsk(question)}
            className="group flex items-start justify-between gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-[12px] leading-relaxed text-muted transition-colors hover:border-line hover:bg-panel/60 hover:text-ink disabled:opacity-40"
          >
            <span>{question}</span>
            <ArrowUpRight className="mt-0.5 size-3 shrink-0 text-faint transition-colors group-hover:text-accent" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Kpis({ kpis }: { kpis: Kpi[] }) {
  if (!kpis.length) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-line bg-panel/50 px-3.5 py-3"
        >
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-faint">
            {kpi.label}
          </p>
          <p className="mt-1 text-lg font-medium leading-none tracking-tight text-ink">
            {kpi.value}
          </p>
          {kpi.hint ? (
            <p className="mt-1.5 truncate font-mono text-[9.5px] text-faint">{kpi.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Demo() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const csvRef = useRef<string>("");
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const updateTurn = useCallback((id: string, patch: (turn: Turn) => Turn) => {
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? patch(turn) : turn)),
    );
  }, []);

  const applyFrame = useCallback(
    (id: string, frame: Frame) => {
      const { event, data } = frame;

      if (event === "thought") {
        const text = String(data.text ?? "");
        if (!text.trim()) return;
        updateTurn(id, (turn) => ({ ...turn, thoughts: [...turn.thoughts, text] }));
        return;
      }

      if (event === "tool") {
        const step: Step = {
          id: crypto.randomUUID(),
          tool: String(data.tool ?? "tool"),
          input: (data.input as Record<string, unknown>) ?? {},
          done: false,
        };
        updateTurn(id, (turn) => ({ ...turn, steps: [...turn.steps, step] }));
        return;
      }

      if (event === "tool-result") {
        const tool = String(data.tool ?? "");
        updateTurn(id, (turn) => {
          const steps = [...turn.steps];
          for (let index = steps.length - 1; index >= 0; index -= 1) {
            if (!steps[index].done && steps[index].tool === tool) {
              steps[index] = { ...steps[index], done: true };
              break;
            }
          }
          return { ...turn, steps };
        });
        return;
      }

      if (event === "answer-delta") {
        const text = String(data.text ?? "");
        if (!text) return;
        updateTurn(id, (turn) => ({ ...turn, answer: turn.answer + text }));
        return;
      }

      if (event === "done") {
        const result = data.result as ExplainResult | undefined;
        updateTurn(id, (turn) => ({
          ...turn,
          status: "done",
          result,
          answer: turn.answer || result?.answer || "",
          endedAt: Date.now(),
        }));
        return;
      }

      if (event === "error") {
        updateTurn(id, (turn) => ({
          ...turn,
          status: "error",
          error: String(data.message ?? "The investigation failed."),
          endedAt: Date.now(),
        }));
      }
    },
    [updateTurn],
  );

  const runQuestion = useCallback(
    async (question: string, csv: string, filename: string) => {
      if (busyRef.current) return;

      const id = crypto.randomUUID();
      const turn: Turn = {
        id,
        question,
        status: "running",
        thoughts: [],
        steps: [],
        answer: "",
        startedAt: Date.now(),
      };

      setTurns((current) => [...current, turn]);
      setBusy(true);
      busyRef.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv, filename, question }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? `Request failed (${response.status}).`);
        }

        if (!response.body) throw new Error("The server returned no stream.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const frame = parseFrame(block);
            if (frame) applyFrame(id, frame);
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (cause) {
        const aborted = controller.signal.aborted;
        updateTurn(id, (current) => ({
          ...current,
          status: "error",
          error: aborted
            ? "Stopped."
            : cause instanceof Error
              ? cause.message
              : "The investigation failed.",
          endedAt: Date.now(),
        }));
      } finally {
        busyRef.current = false;
        setBusy(false);
        abortRef.current = null;
      }
    },
    [applyFrame, updateTurn],
  );

  const loadCsv = useCallback(
    async (csv: string, filename: string) => {
      setError(null);
      setLoading(true);
      setTurns([]);
      csvRef.current = csv;

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv, filename }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { dataset?: Dataset; error?: string }
          | null;

        if (!response.ok || !payload?.dataset) {
          throw new Error(payload?.error ?? "Could not read that CSV.");
        }

        setDataset(payload.dataset);
        const first = payload.dataset.questions[0] ?? "Why am I not getting hired?";
        void runQuestion(first, csv, filename);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not read that CSV.");
      } finally {
        setLoading(false);
      }
    },
    [runQuestion],
  );

  const ask = useCallback(
    (question: string) => {
      if (!dataset) return;
      void runQuestion(question, csvRef.current, dataset.filename);
    },
    [dataset, runQuestion],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    setBusy(false);
    setDataset(null);
    setTurns([]);
    setError(null);
    csvRef.current = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!turns.length) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <>
      <SiteHeader />

      {!dataset ? (
        <Landing onCsv={loadCsv} busy={loading} error={error} />
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 sm:px-6 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-6">
                <DatasetCard dataset={dataset} onReset={reset} busy={busy} />
                <Questions questions={dataset.questions} onAsk={ask} busy={busy} />
                <p className="px-1 font-mono text-[10px] leading-relaxed text-faint">
                  {dataset.provider} · {dataset.detectiveModel}
                  <br />
                  storyteller · {dataset.storytellerModel}
                </p>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel/40 px-4 py-3 lg:hidden">
                <Database className="size-3.5 text-accent/80" />
                <span className="truncate text-xs text-ink">{dataset.filename}</span>
                <span className="font-mono text-[10px] text-faint">
                  {dataset.rows} rows
                </span>
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-faint disabled:opacity-40"
                >
                  replace
                </button>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {dataset.questions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={busy}
                    onClick={() => ask(question)}
                    className="shrink-0 rounded-full border border-line bg-panel/60 px-3 py-1.5 text-[11px] text-muted disabled:opacity-40"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <Kpis kpis={dataset.kpis} />

              <div className="space-y-4">
                {turns.map((turn) => (
                  <TurnCard
                    key={turn.id}
                    turn={turn}
                    busy={busy}
                    onFollowUp={ask}
                  />
                ))}
              </div>

              {loading ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-panel/50 px-4 py-3 text-xs text-muted">
                  <Loader2 className="size-3.5 animate-spin text-accent" />
                  Reading the file and choosing the first question…
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-3 text-xs leading-relaxed text-danger">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {error}
                </div>
              ) : null}

              <div className="mt-4">
                <Composer onSend={ask} busy={busy} />
              </div>

              <div ref={bottomRef} className="h-1" />
            </div>
          </div>
        </main>
      )}

      <footer className="border-t border-line-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[11px] text-faint sm:flex-row sm:items-center sm:px-6">
          <p>
            whyboard · read-only by design. Your CSV is loaded into memory for a
            single request and never stored.
          </p>
          <p className="sm:ml-auto">
            Built with{" "}
            <a
              href="https://github.com/mzubairhassan18/whyboard-core"
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted underline decoration-line underline-offset-4 hover:text-ink"
            >
              whyboard-core
            </a>{" "}
            · MIT
          </p>
        </div>
      </footer>
    </>
  );
}
