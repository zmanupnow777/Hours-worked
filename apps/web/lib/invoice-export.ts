import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceDetail } from "@hours-worked/shared";

import { formatCurrency, formatDate, formatMinutes } from "./format";

export function buildInvoiceCsv(detail: InvoiceDetail) {
  const rows = [
    ["Invoice Number", detail.invoice.invoiceNumber],
    ["Client", detail.client.name],
    ["Status", detail.invoice.status],
    ["Issue Date", detail.invoice.issueDate],
    ["Period Start", detail.invoice.periodStart],
    ["Period End", detail.invoice.periodEnd],
    [],
    ["Description", "Started", "Ended", "Minutes", "Rate", "Amount", "Excluded"],
    ...detail.lineItems.map((lineItem) => [
      lineItem.description,
      lineItem.startedAt,
      lineItem.endedAt,
      String(lineItem.minutes),
      formatCurrency(lineItem.rateCents, detail.invoice.currency),
      formatCurrency(lineItem.amountCents, detail.invoice.currency),
      lineItem.excluded ? "yes" : "no",
    ]),
    [],
    ["Billable Minutes", String(detail.invoice.totalMinutes)],
    ["Subtotal", formatCurrency(detail.invoice.subtotalCents, detail.invoice.currency)],
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll(`"`, `""`)}"`)
        .join(","),
    )
    .join("\n");
}

export async function buildInvoicePdf(detail: InvoiceDetail) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const accent = rgb(0.86, 0.35, 0.2);
  let cursorY = 748;

  page.drawText("Hours Worked Invoice", {
    x: 48,
    y: cursorY,
    size: 24,
    font: titleFont,
    color: accent,
  });

  cursorY -= 32;

  const headerLines = [
    `Invoice: ${detail.invoice.invoiceNumber}`,
    `Client: ${detail.client.name}`,
    `Issue date: ${formatDate(detail.invoice.issueDate)}`,
    `Billing period: ${formatDate(detail.invoice.periodStart)} to ${formatDate(detail.invoice.periodEnd)}`,
    `Status: ${detail.invoice.status}`,
  ];

  for (const line of headerLines) {
    page.drawText(line, { x: 48, y: cursorY, size: 11, font: bodyFont, color: rgb(0.14, 0.14, 0.14) });
    cursorY -= 18;
  }

  cursorY -= 8;
  page.drawText("Line items", { x: 48, y: cursorY, size: 13, font: titleFont, color: rgb(0.12, 0.12, 0.12) });
  cursorY -= 20;

  for (const lineItem of detail.lineItems) {
    const text = `${formatDate(lineItem.startedAt)}  |  ${formatMinutes(lineItem.minutes)}  |  ${formatCurrency(lineItem.amountCents, detail.invoice.currency)}${lineItem.excluded ? "  |  excluded" : ""}`;
    page.drawText(text, { x: 48, y: cursorY, size: 10, font: bodyFont, color: rgb(0.17, 0.17, 0.17) });
    cursorY -= 14;

    const description = lineItem.description.slice(0, 100);
    page.drawText(description, { x: 64, y: cursorY, size: 9, font: bodyFont, color: rgb(0.33, 0.33, 0.33) });
    cursorY -= 18;

    if (cursorY < 88) {
      break;
    }
  }

  cursorY -= 12;
  page.drawLine({
    start: { x: 48, y: cursorY },
    end: { x: 564, y: cursorY },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  cursorY -= 24;

  page.drawText(`Billable time: ${formatMinutes(detail.invoice.totalMinutes)}`, {
    x: 48,
    y: cursorY,
    size: 11,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 18;
  page.drawText(`Subtotal: ${formatCurrency(detail.invoice.subtotalCents, detail.invoice.currency)}`, {
    x: 48,
    y: cursorY,
    size: 14,
    font: titleFont,
    color: accent,
  });

  return pdf.save();
}
