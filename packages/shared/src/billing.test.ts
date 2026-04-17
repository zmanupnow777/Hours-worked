import assert from "node:assert/strict";
import test from "node:test";

import {
  amountForMinutes,
  calculateInvoiceTotals,
  calculateSessionMinutes,
  formatInvoiceNumber,
  getPreviousCalendarMonthPeriod,
  getScheduledPreviousMonthPeriod,
  isDateWithinPeriod,
} from "./index";

test("calculateSessionMinutes rounds to nearest minute and never returns zero", () => {
  assert.equal(calculateSessionMinutes("2026-03-23T10:00:00.000Z", "2026-03-23T10:00:20.000Z"), 1);
  assert.equal(calculateSessionMinutes("2026-03-23T10:00:00.000Z", "2026-03-23T11:29:29.000Z"), 89);
});

test("amountForMinutes converts hourly rate cents into billable amount", () => {
  assert.equal(amountForMinutes(6000, 90), 9000);
});

test("calculateInvoiceTotals ignores excluded line items", () => {
  const totals = calculateInvoiceTotals([
    {
      id: "1",
      invoiceId: "inv",
      sessionId: "a",
      description: "Included",
      startedAt: "2026-03-23T10:00:00.000Z",
      endedAt: "2026-03-23T11:00:00.000Z",
      minutes: 60,
      rateCents: 6000,
      amountCents: 6000,
      excluded: false,
      createdAt: "2026-03-23T11:00:00.000Z",
    },
    {
      id: "2",
      invoiceId: "inv",
      sessionId: "b",
      description: "Excluded",
      startedAt: "2026-03-23T11:00:00.000Z",
      endedAt: "2026-03-23T12:00:00.000Z",
      minutes: 60,
      rateCents: 6000,
      amountCents: 6000,
      excluded: true,
      createdAt: "2026-03-23T12:00:00.000Z",
    },
  ]);

  assert.deepEqual(totals, { subtotalCents: 6000, totalMinutes: 60 });
});

test("billing period helpers use previous month and schedule gate", () => {
  const period = getPreviousCalendarMonthPeriod(new Date("2026-03-23T12:00:00.000Z"));
  assert.equal(period.start, "2026-02-01");
  assert.equal(period.end, "2026-02-28");

  assert.equal(getScheduledPreviousMonthPeriod(new Date("2026-03-01T08:30:00.000Z"), 1, 9), null);
  assert.equal(getScheduledPreviousMonthPeriod(new Date("2026-03-01T09:05:00.000Z"), 1, 9)?.start, "2026-02-01");
});

test("invoice number uses stable prefix", () => {
  assert.equal(formatInvoiceNumber("client-alpha", "2026-02-01"), "INV-202602-CLIENT-01");
});

test("isDateWithinPeriod uses timezone to avoid UTC midnight boundary errors", () => {
  // 2026-03-31T23:00:00Z is 2026-03-31 in America/La_Paz (UTC-4) but the raw UTC slice is 2026-03-31 too.
  // Use a stronger case: 2026-04-01T02:00:00Z = 2026-03-31 22:00 local in UTC-4.
  const lateNightSession = "2026-04-01T02:00:00.000Z";
  // Without timezone: UTC date is 2026-04-01, outside the March period.
  assert.equal(isDateWithinPeriod(lateNightSession, "2026-03-01", "2026-03-31"), false, "raw UTC slice excludes the session");
  // With timezone: local date in America/La_Paz is 2026-03-31, inside the March period.
  assert.equal(isDateWithinPeriod(lateNightSession, "2026-03-01", "2026-03-31", "America/La_Paz"), true, "timezone-aware check includes it");
});
