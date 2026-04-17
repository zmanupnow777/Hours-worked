import assert from "node:assert/strict";
import test from "node:test";

import { buildInvoiceCsv, buildInvoicePdf } from "./invoice-export";
import type { InvoiceDetail } from "@hours-worked/shared";

const detail: InvoiceDetail = {
  invoice: {
    id: "inv-1",
    clientId: "client-alpha",
    periodId: "period-1",
    invoiceNumber: "INV-202603-CLIENT-01",
    status: "finalized",
    issueDate: "2026-04-01",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    currency: "USD",
    subtotalCents: 9000,
    totalMinutes: 120,
    notes: "",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  client: {
    id: "client-alpha",
    name: 'Client "Alpha"',
    contactName: "Primary Contact",
    defaultHourlyRateCents: 4500,
    currency: "USD",
    color: "#db5c33",
    active: true,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  lineItems: [
    {
      id: "li-1",
      invoiceId: "inv-1",
      sessionId: "sess-1",
      description: 'Work on "feature", version 1.0',
      startedAt: "2026-03-10T10:00:00.000Z",
      endedAt: "2026-03-10T11:00:00.000Z",
      minutes: 60,
      rateCents: 4500,
      amountCents: 4500,
      excluded: false,
      createdAt: "2026-03-10T11:00:00.000Z",
    },
    {
      id: "li-2",
      invoiceId: "inv-1",
      sessionId: "sess-2",
      description: "Regular session",
      startedAt: "2026-03-11T10:00:00.000Z",
      endedAt: "2026-03-11T11:00:00.000Z",
      minutes: 60,
      rateCents: 4500,
      amountCents: 4500,
      excluded: true,
      createdAt: "2026-03-11T11:00:00.000Z",
    },
  ],
};

// ── CSV ───────────────────────────────────────────────────────────────────────

test("buildInvoiceCsv escapes double quotes in field values", () => {
  const csv = buildInvoiceCsv(detail);
  // Description contains `"feature"` — double quotes must be doubled per RFC 4180.
  assert.ok(csv.includes(`"Work on ""feature"", version 1.0"`), "embedded quotes should be doubled");
});

test("buildInvoiceCsv includes line item column headers", () => {
  const csv = buildInvoiceCsv(detail);
  assert.ok(csv.includes("Description"), "should include Description header");
  assert.ok(csv.includes("Minutes"), "should include Minutes header");
  assert.ok(csv.includes("Amount"), "should include Amount header");
  assert.ok(csv.includes("Excluded"), "should include Excluded header");
});

test("buildInvoiceCsv marks excluded line items", () => {
  const csv = buildInvoiceCsv(detail);
  assert.ok(csv.includes('"yes"'), "excluded item should appear as yes");
  assert.ok(csv.includes('"no"'), "included item should appear as no");
});

// ── PDF ───────────────────────────────────────────────────────────────────────

test("buildInvoicePdf returns a valid PDF buffer", async () => {
  const bytes = await buildInvoicePdf(detail);
  const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
  assert.equal(header, "%PDF-", "PDF must start with %PDF- magic bytes");
  assert.ok(bytes.length > 1000, "PDF should have meaningful content");
});
