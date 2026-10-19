/**
 * Deterministic generator for public/sample-orders.csv.
 * Six months of store orders with a deliberate September slowdown:
 * the summer promo ends, paid-social volume halves, and the flagship
 * chair gets a price increase.
 *
 *   node scripts/generate-sample.mjs
 */
import { writeFile } from "node:fs/promises";

function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260919);

function pick(items, weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return items[index];
  }
  return items[items.length - 1];
}

const products = [
  { name: "Aurora Lounge Chair", category: "Seating", price: 279 },
  { name: "Halo Floor Lamp", category: "Lighting", price: 189 },
  { name: "Drift Standing Desk", category: "Desks", price: 549 },
  { name: "Fold Wall Shelf", category: "Storage", price: 129 },
  { name: "Cove Side Table", category: "Seating", price: 219 },
  { name: "Nimbus Pendant", category: "Lighting", price: 149 },
];

const months = [
  { key: "2026-04", orders: 148, promo: 0, chair: 0.3, channel: [0.33, 0.26, 0.29, 0.12] },
  { key: "2026-05", orders: 156, promo: 0.05, chair: 0.3, channel: [0.34, 0.26, 0.28, 0.12] },
  { key: "2026-06", orders: 161, promo: 0.05, chair: 0.3, channel: [0.33, 0.27, 0.28, 0.12] },
  { key: "2026-07", orders: 172, promo: 0.2, chair: 0.32, channel: [0.36, 0.25, 0.27, 0.12] },
  { key: "2026-08", orders: 168, promo: 0.15, chair: 0.36, channel: [0.38, 0.24, 0.26, 0.12] },
  { key: "2026-09", orders: 104, promo: 0, chair: 0.2, channel: [0.18, 0.28, 0.42, 0.12] },
];

const channels = ["Paid social", "Email", "Organic", "Referral"];
const countries = ["US", "UK", "DE", "CA", "AU"];
const countryWeights = [0.46, 0.18, 0.16, 0.12, 0.08];
const devices = ["mobile", "desktop"];
const deviceWeights = [0.63, 0.37];

// A pool of customers; repeat orders reuse an earlier id so retention questions work.
const customers = Array.from({ length: 460 }, (_, index) => `C-${String(1000 + index)}`);

const rows = [];
let orderId = 10001;
let customerCursor = 0;

for (const month of months) {
  const [year, monthNumber] = month.key.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  for (let index = 0; index < month.orders; index += 1) {
    const day = 1 + Math.floor(random() * daysInMonth);
    const orderedAt = `${month.key}-${String(day).padStart(2, "0")}`;

    const product = pick(products, [month.chair, 0.17, 0.15, 0.14, 0.14, 0.1]);
    const channel = pick(channels, month.channel);
    const country = pick(countries, countryWeights);
    const device = pick(devices, deviceWeights);

    let unitPrice = product.price;
    if (product.name === "Aurora Lounge Chair" && month.key === "2026-09") {
      unitPrice = 329; // the September price increase
    }

    let discount = 0;
    if (month.promo && random() < 0.62) {
      discount = Math.round(month.promo * 100);
    } else if (random() < 0.12) {
      discount = 5;
    }

    const units = random() < 0.22 ? 2 : 1;
    const revenue = Math.round(units * unitPrice * (1 - discount / 100));

    const statusRoll = random();
    const status =
      statusRoll < 0.92 ? "delivered" : statusRoll < 0.97 ? "returned" : "cancelled";

    // Keep the customer pool fresh for the first order, then reuse often.
    let customerId;
    if (customerCursor < customers.length && random() < 0.62) {
      customerId = customers[customerCursor];
      customerCursor += 1;
    } else {
      customerId = customers[Math.floor(random() * Math.max(1, customerCursor))];
    }

    rows.push({
      order_id: orderId,
      ordered_at: orderedAt,
      customer_id: customerId,
      channel,
      product: product.name,
      category: product.category,
      units,
      unit_price: unitPrice,
      discount_pct: discount,
      revenue,
      country,
      device,
      status,
      shipping_days: 2 + Math.floor(random() * 8),
    });

    orderId += 1;
  }
}

const header = [
  "order_id",
  "ordered_at",
  "customer_id",
  "channel",
  "product",
  "category",
  "units",
  "unit_price",
  "discount_pct",
  "revenue",
  "country",
  "device",
  "status",
  "shipping_days",
];

const csv = [
  header.join(","),
  ...rows.map((row) => header.map((key) => row[key]).join(",")),
].join("\n");

await writeFile(new URL("../public/sample-orders.csv", import.meta.url), `${csv}\n`);

const byMonth = {};
for (const row of rows) {
  const month = row.ordered_at.slice(0, 7);
  byMonth[month] ??= { orders: 0, revenue: 0 };
  byMonth[month].orders += 1;
  byMonth[month].revenue += row.revenue;
}

console.log(`wrote ${rows.length} orders`);
for (const [month, value] of Object.entries(byMonth)) {
  console.log(
    `${month}  orders ${String(value.orders).padStart(4)}  revenue $${value.revenue.toLocaleString()}  aov $${Math.round(value.revenue / value.orders)}`,
  );
}
