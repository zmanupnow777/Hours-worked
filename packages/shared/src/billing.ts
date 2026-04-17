import type { BillingPeriod, Client, InvoiceLineItem, InvoiceTotals, WorkSession } from "./types";

export function calculateSessionMinutes(startedAt: string, endedAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.max(1, Math.round((end - start) / 60000));
}

export function amountForMinutes(rateCents: number, minutes: number) {
  return Math.round((rateCents * minutes) / 60);
}

export function calculateInvoiceTotals(lineItems: InvoiceLineItem[]): InvoiceTotals {
  return lineItems.reduce<InvoiceTotals>(
    (totals, lineItem) => {
      if (lineItem.excluded) {
        return totals;
      }

      totals.subtotalCents += lineItem.amountCents;
      totals.totalMinutes += lineItem.minutes;
      return totals;
    },
    { subtotalCents: 0, totalMinutes: 0 },
  );
}

export function buildLineItemDescription(client: Client, session: WorkSession) {
  const start = new Date(session.startedAt);
  const end = new Date(session.endedAt ?? session.startedAt);
  const date = start.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${client.name} work session on ${date}, ${startTime} - ${endTime}${session.notes ? ` (${session.notes})` : ""}`;
}

export function formatInvoiceNumber(clientId: string, periodStart: string, sequence = 1) {
  const stamp = periodStart.slice(0, 7).replace("-", "");
  const suffix = clientId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "CLIENT";
  return `INV-${stamp}-${suffix}-${String(sequence).padStart(2, "0")}`;
}

export function getPreviousCalendarMonthPeriod(reference: Date): BillingPeriod {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

export function getScheduledPreviousMonthPeriod(reference: Date, monthlyCloseDay: number, monthlyCloseHour: number) {
  const currentMonthClose = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    monthlyCloseDay,
    monthlyCloseHour,
    0,
    0,
  );

  if (reference.getTime() < currentMonthClose) {
    return null;
  }

  return getPreviousCalendarMonthPeriod(reference);
}

export function isDateWithinPeriod(isoDateTime: string, periodStart: string, periodEnd: string, timezone?: string) {
  const dateOnly = timezone
    ? new Date(isoDateTime).toLocaleDateString("en-CA", { timeZone: timezone })
    : isoDateTime.slice(0, 10);
  return dateOnly >= periodStart && dateOnly <= periodEnd;
}

export function groupUnbilledMinutesByClient(workSessions: WorkSession[], period: BillingPeriod) {
  const totals = new Map<string, number>();

  for (const session of workSessions) {
    if (!session.endedAt || session.invoiceId) {
      continue;
    }

    if (!isDateWithinPeriod(session.startedAt, period.start, period.end)) {
      continue;
    }

    const minutes = session.durationMinutes ?? calculateSessionMinutes(session.startedAt, session.endedAt);
    totals.set(session.clientId, (totals.get(session.clientId) ?? 0) + minutes);
  }

  return totals;
}
