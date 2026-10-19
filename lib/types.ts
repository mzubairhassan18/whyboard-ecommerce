import type { ExplainEvent, ExplainResult } from "whyboard-core";

export type { ExplainEvent, ExplainResult };

export type ColumnPreview = { name: string; type: string };

export type Kpi = { label: string; value: string; hint?: string };

export type Dataset = {
  filename: string;
  table: string;
  rows: number;
  columns: ColumnPreview[];
  questions: string[];
  kpis: Kpi[];
  provider: string;
  detectiveModel: string;
  storytellerModel: string;
};

export type Step = {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  done: boolean;
};

export type Turn = {
  id: string;
  question: string;
  status: "running" | "done" | "error";
  thoughts: string[];
  steps: Step[];
  answer: string;
  result?: ExplainResult;
  error?: string;
  startedAt: number;
  endedAt?: number;
};
