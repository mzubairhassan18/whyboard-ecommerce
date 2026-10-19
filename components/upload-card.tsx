"use client";

import { FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  onCsv: (csv: string, filename: string) => void;
  busy: boolean;
  error: string | null;
};

const MAX_BYTES = 1_500_000;

export function UploadCard({ onCsv, busy, error }: Props) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function readFile(file: File) {
    setLocalError(null);
    if (file.size > MAX_BYTES) {
      setLocalError("That file is over 1.5 MB. Export a smaller slice.");
      return;
    }
    const text = await file.text();
    onCsv(text, file.name);
  }

  async function loadSample() {
    setLocalError(null);
    setSampleLoading(true);
    try {
      const response = await fetch("/sample-orders.csv");
      if (!response.ok) throw new Error("Could not load the sample file.");
      onCsv(await response.text(), "orders.csv");
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Could not load the sample file.");
    } finally {
      setSampleLoading(false);
    }
  }

  const message = localError ?? error;

  return (
    <div className="rounded-2xl border border-line bg-panel/70 p-2 backdrop-blur">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-accent/70 bg-accent/[0.06]"
            : "border-line-soft bg-canvas/40 hover:border-line"
        }`}
      >
        <div className="grid size-11 place-items-center rounded-full border border-line bg-panel-2 text-accent">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
        </div>

        <p className="mt-4 text-[15px] text-ink">
          {busy ? "Reading your orders…" : "Drop your orders.csv here"}
        </p>
        <p className="mt-1 text-xs text-muted">One row per order. Any column names.</p>

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-canvas transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={busy || sampleLoading}
          onClick={() => void loadSample()}
          className="group inline-flex items-center justify-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08] px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/[0.14] disabled:opacity-50"
        >
          {sampleLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Try the sample: 909 orders
        </button>

        <p className="flex items-center gap-2 text-[11px] leading-relaxed text-faint sm:ml-auto">
          <FileText className="size-3.5 shrink-0" />
          Loaded in memory per request. Never stored.
        </p>
      </div>

      {message ? (
        <p className="mx-4 mb-4 rounded-lg border border-danger/25 bg-danger/[0.07] px-3 py-2 text-xs text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
