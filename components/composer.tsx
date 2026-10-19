"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  onSend: (question: string) => void;
  busy: boolean;
};

export function Composer({ onSend, busy }: Props) {
  const [value, setValue] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const question = value.trim();
    if (!question || busy) return;
    onSend(question);
    setValue("");
    if (textarea.current) textarea.current.style.height = "auto";
  }

  return (
    <div className="rounded-2xl border border-line bg-panel/70 p-2 backdrop-blur">
      <div className="flex items-end gap-2">
        <textarea
          ref={textarea}
          rows={1}
          value={value}
          disabled={busy}
          placeholder={busy ? "The detective is still working…" : "Ask another why…"}
          onChange={(event) => {
            setValue(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-[180px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          aria-label="Ask whyboard"
          className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-canvas transition-opacity hover:opacity-90 disabled:bg-line disabled:text-faint"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
      <div className="flex items-center gap-3 px-3 pb-1 pt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
        <span>Enter to send</span>
        <span className="text-line">/</span>
        <span>shift + enter for a new line</span>
        <span className="ml-auto hidden sm:inline">read-only queries only</span>
      </div>
    </div>
  );
}
