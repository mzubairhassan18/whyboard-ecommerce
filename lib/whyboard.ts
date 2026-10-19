import { csvAdapter, Whyboard } from "whyboard-core";
import type { LanguageModel } from "ai";

import type { Dataset, Kpi } from "./types";

/** 1.5 MB of CSV is plenty for a store export and keeps the request snappy. */
export const MAX_CSV_CHARS = 1_500_000;

/** Hard stop so a pathological file cannot exhaust memory inside a serverless function. */
export const MAX_IMPORT_ROWS = 25_000;

export type { Dataset };

export type CsvCheck = { ok: true; csv: string } | { ok: false; error: string };

export function checkCsv(input: unknown): CsvCheck {
  if (typeof input !== "string") {
    return { ok: false, error: "Send the CSV as a `csv` string." };
  }
  const csv = input.trim();
  if (csv.length < 12) {
    return { ok: false, error: "That file looks empty." };
  }
  if (csv.length > MAX_CSV_CHARS) {
    return {
      ok: false,
      error: `That file is larger than ${Math.round(MAX_CSV_CHARS / 1_000_000)} MB. Try a smaller export.`,
    };
  }
  const firstLine = csv.slice(0, csv.indexOf("\n") === -1 ? csv.length : csv.indexOf("\n"));
  if (!firstLine.includes(",") && !firstLine.includes(";") && !firstLine.includes("\t")) {
    return { ok: false, error: "The first row does not look like a CSV header." };
  }
  const lines = csv.split(/\r?\n/).filter(Boolean).length;
  if (lines < 3) {
    return { ok: false, error: "A CSV needs a header and at least two rows." };
  }
  return { ok: true, csv };
}

export function tableNameFrom(filename?: string): string {
  const base = (filename || "data").replace(/\.[^.]+$/, "").toLowerCase();
  const slug = base
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!slug) return "t_data";
  return /^[a-z]/.test(slug) ? slug : `t_${slug}`;
}

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

function money(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

function monthLabel(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 7) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

async function loadKpis(
  workspace: Whyboard,
  table: string,
  columns: { name: string; type: string }[],
): Promise<Kpi[]> {
  const revenueColumn = columns.find((column) =>
    /^(revenue|net_revenue|gmv|total|amount)$/i.test(column.name),
  );
  if (!revenueColumn) return [];

  const dateColumn = columns.find(
    (column) => column.type === "date" || column.type === "datetime",
  );
  const statusColumn = columns.find((column) => column.name.toLowerCase() === "status");
  const customerColumn = columns.find((column) => /customer.*id|^customer$/i.test(column.name));

  const where = statusColumn
    ? ` where lower(${quote(statusColumn.name)}) not in ('cancelled', 'canceled')`
    : "";
  const revenue = quote(revenueColumn.name);

  try {
    const summary = await workspace.adapter.query(
      `select count(*) as orders,
              sum(${revenue}) as revenue,
              avg(${revenue}) as aov,
              ${dateColumn ? `min(${quote(dateColumn.name)}) as first_date, max(${quote(dateColumn.name)}) as last_date` : "null as first_date, null as last_date"}
         from ${quote(table)}${where}`,
    );

    const row = summary.rows[0] ?? {};
    const orders = Number(row.orders ?? 0);
    const total = Number(row.revenue ?? 0);
    const aov = Number(row.aov ?? 0);

    const first = monthLabel(row.first_date);
    const last = monthLabel(row.last_date);
    const period = first && last ? (first === last ? first : `${first} – ${last}`) : undefined;

    const kpis: Kpi[] = [
      { label: "Revenue", value: money(total), hint: period },
      { label: "Orders", value: orders.toLocaleString("en-US") },
      { label: "Avg order", value: money(aov) },
    ];

    if (customerColumn) {
      const repeat = await workspace.adapter.query(
        `select count(*) as buyers,
                sum(case when orders > 1 then 1 else 0 end) as repeat
           from (select ${quote(customerColumn.name)} as buyer, count(*) as orders
                   from ${quote(table)}${where}
                  group by 1)`,
      );
      const buyers = Number(repeat.rows[0]?.buyers ?? 0);
      const repeatBuyers = Number(repeat.rows[0]?.repeat ?? 0);
      if (buyers > 0) {
        kpis.push({
          label: "Repeat rate",
          value: `${Math.round((repeatBuyers / buyers) * 100)}%`,
          hint: `${repeatBuyers} of ${buyers} customers`,
        });
      }
    }

    return kpis;
  } catch (error) {
    console.error("[kpis]", error);
    return [];
  }
}

/**
 * Every request gets its own in-memory database. The CSV is never written to
 * disk, never stored in a bucket, and dies with the response.
 */
export async function openWorkspace(
  csv: string,
  filename?: string,
  models?: { detective?: LanguageModel; storyteller?: LanguageModel },
): Promise<Whyboard> {
  const adapter = await csvAdapter({
    source: csv,
    tableName: tableNameFrom(filename),
    importLimit: MAX_IMPORT_ROWS,
  });

  return new Whyboard({
    adapter,
    template: "ecommerce",
    maxSteps: 10,
    models,
  });
}

export async function describeWorkspace(
  workspace: Whyboard,
  filename: string,
): Promise<Dataset> {
  const schema = await workspace.schema();
  const table = schema[0];
  const questions = await workspace.questions(5);
  const info = workspace.info();
  const columns = (table?.columns ?? []).map((column) => ({
    name: column.name,
    type: column.type,
  }));

  return {
    filename,
    table: table?.name ?? tableNameFrom(filename),
    rows: table?.rowCount ?? 0,
    columns,
    questions,
    kpis: table ? await loadKpis(workspace, table.name, columns) : [],
    provider: info.provider,
    detectiveModel: info.detectiveModel,
    storytellerModel: info.storytellerModel,
  };
}
