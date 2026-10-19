"use client";

import {
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Columns3,
  Flag,
  ListOrdered,
  PieChart,
  Rows3,
  Sigma,
  Table2,
  Terminal,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { ExplainResult, Step, Turn } from "@/lib/types";
import { Markdown } from "./markdown";

const TOOLS: Record<string, { label: string; icon: LucideIcon }> = {
  list_tables: { label: "Scanned the tables", icon: Table2 },
  describe_table: { label: "Inspected the columns", icon: Columns3 },
  run_sql: { label: "Ran a query", icon: Terminal },
  value_counts: { label: "Counted categories", icon: ListOrdered },
  breakdown: { label: "Broke down a segment", icon: PieChart },
  trend: { label: "Checked the trend", icon: TrendingUp },
  correlate: { label: "Tested a correlation", icon: Sigma },
  sample_rows: { label: "Peeked at raw rows", icon: Rows3 },
  report_findings: { label: "Filed its findings", icon: Flag },
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "border-signal/30 bg-signal/[0.08] text-signal",
  medium: "border-accent/30 bg-accent/[0.08] text-accent",
  low: "border-line bg-panel-2 text-muted",
};

function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
}

function seconds(turn: Turn) {
  return Math.max(1, Math.round(((turn.endedAt ?? Date.now()) - turn.startedAt) / 1000));
}

function stepDetail(step: Step): string {
  const input = step.input ?? {};
  if (typeof input.purpose === "string" && input.purpose.trim()) return input.purpose;
  if (typeof input.sql === "string") return input.sql.replace(/\s+/g, " ").trim();
  if (typeof input.table === "string") return input.table;
  if (typeof input.dimension === "string") return `by ${input.dimension}`;
  return "";
}

function StepRow({ step, active }: { step: Step; active: boolean }) {
  const meta = TOOLS[step.tool] ?? { label: step.tool, icon: Terminal };
  const Icon = meta.icon;
  const detail = stepDetail(step);

  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${
          step.done
            ? "border-line bg-panel-2 text-muted"
            : "border-accent/30 bg-accent/[0.08] text-accent"
        }`}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink/90">{meta.label}</p>
          {active && !step.done ? (
            <CircleDashed className="size-3 animate-spin text-accent/70" />
          ) : null}
        </div>
        {detail ? (
          <p className="mt-0.5 truncate font-mono text-[10.5px] leading-relaxed text-faint">
            {detail}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Working({ turn }: { turn: Turn }) {
  useTicker(turn.status === "running");
  const steps = turn.steps.slice(-5);
  const lastThought = turn.thoughts[turn.thoughts.length - 1];

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-line-soft bg-canvas/50">
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
        <span className="size-1.5 animate-soft-pulse rounded-full bg-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          Detective working
        </span>
        <span className="ml-auto font-mono text-[10px] text-faint">
          {turn.steps.length} steps · {seconds(turn)}s
        </span>
      </div>

      {steps.length ? (
        <ol className="divide-y divide-line-soft/60">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} active={turn.status === "running"} />
          ))}
        </ol>
      ) : (
        <p className="px-4 py-3 text-xs text-muted">Reading the schema…</p>
      )}

      {lastThought ? (
        <p className="line-clamp-2 border-t border-line-soft/60 px-4 py-2.5 text-[11px] italic leading-relaxed text-faint">
          “{lastThought}”
        </p>
      ) : null}
    </div>
  );
}

function SqlTrail({ result }: { result: ExplainResult }) {
  const [open, setOpen] = useState(false);
  const queries = result.trace.queries;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint transition-colors hover:text-ink"
      >
        {open ? "Hide" : "Show"} the SQL trail
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ol className="mt-3 space-y-2">
          {queries.map((query, index) => (
            <li
              key={`${index}-${query.sql.slice(0, 24)}`}
              className="rounded-lg border border-line-soft bg-canvas/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-3 font-mono text-[10px] text-faint">
                <span className="text-accent/80">{String(index + 1).padStart(2, "0")}</span>
                {query.purpose ? <span className="truncate text-muted">{query.purpose}</span> : null}
                <span className="ml-auto shrink-0">
                  {query.rowCount} rows · {Math.round(query.ms)}ms
                </span>
              </div>
              <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-ink/75">
                {query.sql}
              </pre>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function Receipts({ result }: { result: ExplainResult }) {
  if (!result.findings.numbers.length && !result.findings.caveats.length) return null;

  return (
    <div className="mt-5 space-y-4">
      {result.findings.numbers.length ? (
        <div className="flex flex-wrap gap-2">
          {result.findings.numbers.map((number) => (
            <span
              key={`${number.label}-${number.value}`}
              className="inline-flex items-baseline gap-2 rounded-lg border border-line-soft bg-panel-2/60 px-3 py-1.5"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                {number.label}
              </span>
              <span className="font-mono text-xs text-ink">{number.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {result.findings.caveats.length ? (
        <div className="rounded-lg border border-line-soft bg-canvas/40 px-3.5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            What this cannot tell you
          </p>
          <ul className="mt-2 space-y-1.5">
            {result.findings.caveats.map((caveat) => (
              <li key={caveat} className="flex gap-2 text-[11.5px] leading-relaxed text-muted">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
                {caveat}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  turn: Turn;
  busy: boolean;
  onFollowUp: (question: string) => void;
};

export function TurnCard({ turn, busy, onFollowUp }: Props) {
  useTicker(turn.status === "running");
  const result = turn.result;
  const confidence = result?.confidence ?? "low";

  return (
    <article className="animate-fade-up overflow-hidden rounded-2xl border border-line bg-panel/55">
      <div className="flex items-start gap-3 px-5 pt-4">
        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line bg-panel-2 font-mono text-[10px] text-muted">
          you
        </div>
        <p className="text-sm leading-relaxed text-ink/90">{turn.question}</p>
      </div>

      <div className="px-5 pb-4 pt-4">
        {turn.status === "running" ? <Working turn={turn} /> : null}

        {result ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                CONFIDENCE_STYLE[confidence]
              }`}
            >
              {confidence} confidence
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              {result.trace.queries.length} queries · {Math.round(result.trace.durationMs / 1000)}s
            </span>
          </div>
        ) : null}

        {result?.headline ? (
          <h3 className="mt-3 text-lg font-medium leading-snug tracking-tight text-ink">
            {result.headline}
          </h3>
        ) : null}

        {turn.answer ? (
          <div className="mt-3">
            <Markdown>{turn.answer}</Markdown>
          </div>
        ) : null}

        {result ? <Receipts result={result} /> : null}

        {turn.error ? (
          <p className="mt-3 rounded-lg border border-danger/25 bg-danger/[0.07] px-3 py-2.5 text-xs leading-relaxed text-danger">
            {turn.error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-5 border-t border-line-soft pt-3.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10.5px] text-faint">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <CheckCircle2 className="size-3.5 text-signal/80" />
                {result.trace.model}
              </span>
              <span>{result.trace.usage.totalTokens ?? "—"} tokens</span>
              <span>{result.trace.steps.length} tool calls</span>
            </div>
            <SqlTrail result={result} />
          </div>
        ) : null}

        {result?.findings.suggestedNextQuestions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {result.findings.suggestedNextQuestions.map((question) => (
              <button
                key={question}
                type="button"
                disabled={busy}
                onClick={() => onFollowUp(question)}
                className="rounded-full border border-line bg-canvas/40 px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-40"
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
