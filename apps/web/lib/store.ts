import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  amountForMinutes,
  buildLineItemDescription,
  calculateInvoiceTotals,
  calculateSessionMinutes,
  clientInputSchema,
  formatInvoiceNumber,
  getPreviousCalendarMonthPeriod,
  getScheduledPreviousMonthPeriod,
  invoiceGenerationInputSchema,
  isDateWithinPeriod,
  manualSessionInputSchema,
  settingsInputSchema,
  type AppData,
  type AppSettings,
  type Invoice,
  type InvoiceDetail,
  type InvoiceLineItem,
} from "@hours-worked/shared";

// Default resolves relative to cwd (assumed to be apps/web when running `pnpm dev`).
// Override with HOURS_DATA_FILE env var for testing or alternate deployments.
function getDataFilePath() {
  return process.env.HOURS_DATA_FILE ?? path.resolve(process.cwd(), "..", "..", "data", "hours-worked.json");
}

function nowIso() {
  return new Date().toISOString();
}

function createDefaultData(): AppData {
  const now = nowIso();
  return {
    clients: [],
    workSessions: [],
    invoicePeriods: [],
    invoices: [],
    invoiceLineItems: [],
    settings: {
      id: "default",
      timezone: "America/La_Paz",
      monthlyCloseDay: 1,
      monthlyCloseHour: 9,
      autoDraftEnabled: true,
      cronSecret: "change-me-before-hosting",
      createdAt: now,
      updatedAt: now,
    },
  };
}

async function ensureDataFile() {
  const file = getDataFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(createDefaultData(), null, 2), "utf8");
  }
}

async function readData(): Promise<AppData> {
  await ensureDataFile();
  const raw = await fs.readFile(getDataFilePath(), "utf8");
  const parsed = JSON.parse(raw) as AppData;
  return {
    clients: parsed.clients ?? [],
    workSessions: parsed.workSessions ?? [],
    invoicePeriods: parsed.invoicePeriods ?? [],
    invoices: parsed.invoices ?? [],
    invoiceLineItems: parsed.invoiceLineItems ?? [],
    settings: parsed.settings ?? createDefaultData().settings,
  };
}

async function writeData(data: AppData) {
  await fs.writeFile(getDataFilePath(), JSON.stringify(data, null, 2), "utf8");
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function toBoolean(value: FormDataEntryValue | undefined) {
  return value === "true" || value === "on";
}

function getClient(data: AppData, clientId: string) {
  const client = data.clients.find((item) => item.id === clientId);
  if (!client) {
    throw new Error("Client not found");
  }
  return client;
}

function getInvoice(data: AppData, invoiceId: string) {
  const invoice = data.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  return invoice;
}

function getInvoicePeriod(data: AppData, periodId: string) {
  const period = data.invoicePeriods.find((item) => item.id === periodId);
  if (!period) {
    throw new Error("Invoice period not found");
  }
  return period;
}

function getCurrentMonthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

function invoiceLineItemsFor(data: AppData, invoiceId: string) {
  return data.invoiceLineItems.filter((item) => item.invoiceId === invoiceId);
}

function syncInvoiceTotals(data: AppData, invoiceId: string) {
  const invoice = getInvoice(data, invoiceId);
  const totals = calculateInvoiceTotals(invoiceLineItemsFor(data, invoiceId));
  invoice.subtotalCents = totals.subtotalCents;
  invoice.totalMinutes = totals.totalMinutes;
  invoice.updatedAt = nowIso();
}

function clearDraftLineItems(data: AppData, invoiceId: string) {
  data.invoiceLineItems = data.invoiceLineItems.filter((lineItem) => lineItem.invoiceId !== invoiceId);

  for (const session of data.workSessions) {
    if (session.draftInvoiceId === invoiceId) {
      session.draftInvoiceId = null;
      session.updatedAt = nowIso();
    }
  }
}

function composeInvoiceDetail(data: AppData, invoice: Invoice): InvoiceDetail {
  return {
    invoice,
    client: getClient(data, invoice.clientId),
    lineItems: invoiceLineItemsFor(data, invoice.id).sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
  };
}

export async function getAppSnapshot() {
  const data = await readData();
  const currentMonthPrefix = getCurrentMonthPrefix();
  const previousMonthPeriod = getPreviousCalendarMonthPeriod(new Date());
  const activeSessions = data.workSessions
    .filter((session) => !session.endedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const recentSessions = [...data.workSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20);
  const recentInvoices = [...data.invoices].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)).slice(0, 12);

  const clients = data.clients
    .filter((client) => client.active)
    .map((client) => {
      const clientSessions = data.workSessions.filter((session) => session.clientId === client.id);
      const currentMonthSessions = clientSessions.filter(
        (session) => session.endedAt && session.startedAt.startsWith(currentMonthPrefix),
      );
      const activeSession = activeSessions.find((session) => session.clientId === client.id) ?? null;
      const currentMonthMinutes = currentMonthSessions.reduce(
        (sum, session) =>
          sum + (session.durationMinutes ?? calculateSessionMinutes(session.startedAt, session.endedAt!)),
        0,
      );
      const currentMonthRevenueCents = currentMonthSessions.reduce(
        (sum, session) =>
          sum +
          amountForMinutes(
            session.hourlyRateCents,
            session.durationMinutes ?? calculateSessionMinutes(session.startedAt, session.endedAt!),
          ),
        0,
      );

      return {
        ...client,
        activeSession,
        currentMonthMinutes,
        currentMonthRevenueCents,
      };
    });

  return {
    clients,
    workSessions: data.workSessions,
    recentSessions,
    recentInvoices,
    settings: data.settings,
    previousMonthPeriod,
  };
}

export async function getClients() {
  const data = await readData();
  return [...data.clients].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSessions() {
  const data = await readData();
  return [...data.workSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getInvoices() {
  const data = await readData();
  return [...data.invoices]
    .map((invoice) => composeInvoiceDetail(data, invoice))
    .sort((a, b) => b.invoice.periodEnd.localeCompare(a.invoice.periodEnd));
}

export async function getInvoiceDetail(invoiceId: string) {
  const data = await readData();
  const invoice = getInvoice(data, invoiceId);
  return composeInvoiceDetail(data, invoice);
}

export async function getSettings() {
  const data = await readData();
  return data.settings;
}

export async function startTimer(clientId: string) {
  const data = await readData();
  const client = getClient(data, clientId);
  const activeSameClient = data.workSessions.find((session) => session.clientId === clientId && !session.endedAt);

  if (activeSameClient) {
    throw new Error("This client already has an active timer.");
  }

  const now = nowIso();
  data.workSessions.push({
    id: randomUUID(),
    clientId,
    startedAt: now,
    endedAt: null,
    durationMinutes: null,
    notes: "",
    source: "timer",
    hourlyRateCents: client.defaultHourlyRateCents,
    invoiceId: null,
    draftInvoiceId: null,
    createdAt: now,
    updatedAt: now,
  });

  await writeData(data);
}

export async function stopTimer(clientId: string) {
  const data = await readData();
  const session = data.workSessions.find((item) => item.clientId === clientId && !item.endedAt);
  if (!session) {
    return;
  }

  const endedAt = nowIso();
  session.endedAt = endedAt;
  session.durationMinutes = calculateSessionMinutes(session.startedAt, endedAt);
  session.updatedAt = endedAt;

  await writeData(data);
}

export async function saveClient(input: {
  id?: string;
  name: string;
  contactName?: string;
  defaultHourlyRate: number;
  currency?: string;
  color?: string;
  active?: boolean;
}) {
  const data = await readData();
  const parsed = clientInputSchema.parse(input);
  const now = nowIso();

  if (parsed.id) {
    const client = getClient(data, parsed.id);
    client.name = parsed.name;
    client.contactName = parsed.contactName;
    client.defaultHourlyRateCents = toCents(parsed.defaultHourlyRate);
    client.currency = parsed.currency.toUpperCase();
    client.color = parsed.color;
    client.active = parsed.active;
    client.updatedAt = now;
  } else {
    data.clients.push({
      id: randomUUID(),
      name: parsed.name,
      contactName: parsed.contactName,
      defaultHourlyRateCents: toCents(parsed.defaultHourlyRate),
      currency: parsed.currency.toUpperCase(),
      color: parsed.color,
      active: parsed.active,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeData(data);
}

export async function saveManualSession(input: {
  id?: string;
  clientId: string;
  startedAt: string;
  endedAt: string;
  notes?: string;
  hourlyRate?: number;
}) {
  const data = await readData();
  const parsed = manualSessionInputSchema.parse(input);
  const client = getClient(data, parsed.clientId);
  const startedAt = new Date(parsed.startedAt).toISOString();
  const endedAt = new Date(parsed.endedAt).toISOString();

  if (endedAt <= startedAt) {
    throw new Error("Session end must be after the start time.");
  }

  const minutes = calculateSessionMinutes(startedAt, endedAt);
  const now = nowIso();
  const hourlyRateCents = toCents(parsed.hourlyRate ?? client.defaultHourlyRateCents / 100);

  if (parsed.id) {
    const session = data.workSessions.find((item) => item.id === parsed.id);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.invoiceId) {
      throw new Error("Finalized sessions cannot be edited.");
    }

    if (session.draftInvoiceId) {
      const draftInvoice = getInvoice(data, session.draftInvoiceId);
      if (draftInvoice.status !== "draft") {
        throw new Error("Linked invoice is not editable.");
      }
      if (draftInvoice.clientId !== parsed.clientId) {
        throw new Error("Draft-linked sessions cannot change client.");
      }
      if (!isDateWithinPeriod(startedAt, draftInvoice.periodStart, draftInvoice.periodEnd, data.settings.timezone)) {
        throw new Error("Draft-linked sessions must stay within the invoice period.");
      }
    }

    session.clientId = parsed.clientId;
    session.startedAt = startedAt;
    session.endedAt = endedAt;
    session.durationMinutes = minutes;
    session.notes = parsed.notes;
    session.hourlyRateCents = hourlyRateCents;
    session.updatedAt = now;

    if (session.draftInvoiceId) {
      const lineItem = data.invoiceLineItems.find((item) => item.sessionId === session.id);
      if (lineItem) {
        lineItem.startedAt = startedAt;
        lineItem.endedAt = endedAt;
        lineItem.minutes = minutes;
        lineItem.rateCents = hourlyRateCents;
        lineItem.amountCents = amountForMinutes(hourlyRateCents, minutes);
        lineItem.description = buildLineItemDescription(client, session);
      }
      syncInvoiceTotals(data, session.draftInvoiceId);
    }
  } else {
    data.workSessions.push({
      id: randomUUID(),
      clientId: parsed.clientId,
      startedAt,
      endedAt,
      durationMinutes: minutes,
      notes: parsed.notes,
      source: "manual",
      hourlyRateCents,
      invoiceId: null,
      draftInvoiceId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeData(data);
}

export async function deleteSession(sessionId: string) {
  const data = await readData();
  const session = data.workSessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }

  if (session.invoiceId) {
    throw new Error("Finalized sessions cannot be deleted.");
  }

  if (session.draftInvoiceId) {
    data.invoiceLineItems = data.invoiceLineItems.filter((lineItem) => lineItem.sessionId !== sessionId);
    syncInvoiceTotals(data, session.draftInvoiceId);
  }

  data.workSessions = data.workSessions.filter((item) => item.id !== sessionId);
  await writeData(data);
}

function getOrCreateInvoicePeriod(data: AppData, clientId: string, periodStart: string, periodEnd: string) {
  let period = data.invoicePeriods.find(
    (item) => item.clientId === clientId && item.periodStart === periodStart && item.periodEnd === periodEnd,
  );

  if (!period) {
    period = {
      id: randomUUID(),
      clientId,
      periodStart,
      periodEnd,
      status: "open",
      lastDraftedAt: null,
      closedAt: null,
    };
    data.invoicePeriods.push(period);
  }

  return period;
}

export async function generateDraftInvoice(input: { clientId: string; periodStart: string; periodEnd: string }) {
  const data = await readData();
  const parsed = invoiceGenerationInputSchema.parse(input);
  const client = getClient(data, parsed.clientId);
  const period = getOrCreateInvoicePeriod(data, parsed.clientId, parsed.periodStart, parsed.periodEnd);

  let invoice = data.invoices.find(
    (item) =>
      item.clientId === parsed.clientId &&
      item.periodStart === parsed.periodStart &&
      item.periodEnd === parsed.periodEnd,
  );

  if (invoice?.status === "finalized") {
    return invoice;
  }

  const now = nowIso();

  if (!invoice) {
    invoice = {
      id: randomUUID(),
      clientId: parsed.clientId,
      periodId: period.id,
      invoiceNumber: formatInvoiceNumber(parsed.clientId, parsed.periodStart),
      status: "draft",
      issueDate: now.slice(0, 10),
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      currency: client.currency,
      subtotalCents: 0,
      totalMinutes: 0,
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    data.invoices.push(invoice);
  } else {
    clearDraftLineItems(data, invoice.id);
    invoice.updatedAt = now;
    invoice.status = "draft";
  }

  const eligibleSessions = data.workSessions
    .filter(
      (session) =>
        session.clientId === parsed.clientId &&
        !!session.endedAt &&
        !session.invoiceId &&
        isDateWithinPeriod(session.startedAt, parsed.periodStart, parsed.periodEnd, data.settings.timezone),
    )
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  for (const session of eligibleSessions) {
    const minutes = session.durationMinutes ?? calculateSessionMinutes(session.startedAt, session.endedAt!);
    const lineItem: InvoiceLineItem = {
      id: randomUUID(),
      invoiceId: invoice.id,
      sessionId: session.id,
      description: buildLineItemDescription(client, session),
      startedAt: session.startedAt,
      endedAt: session.endedAt!,
      minutes,
      rateCents: session.hourlyRateCents,
      amountCents: amountForMinutes(session.hourlyRateCents, minutes),
      excluded: false,
      createdAt: now,
    };
    data.invoiceLineItems.push(lineItem);
    session.draftInvoiceId = invoice.id;
    session.updatedAt = now;
  }

  period.status = "drafted";
  period.lastDraftedAt = now;
  syncInvoiceTotals(data, invoice.id);
  await writeData(data);
  return invoice;
}

export async function toggleLineItemExclusion(invoiceId: string, lineItemId: string) {
  const data = await readData();
  const invoice = getInvoice(data, invoiceId);
  if (invoice.status !== "draft") {
    throw new Error("Only draft invoices can be changed.");
  }

  const lineItem = data.invoiceLineItems.find((item) => item.id === lineItemId && item.invoiceId === invoiceId);
  if (!lineItem) {
    throw new Error("Line item not found.");
  }

  lineItem.excluded = !lineItem.excluded;
  syncInvoiceTotals(data, invoiceId);
  await writeData(data);
}

export async function finalizeInvoice(invoiceId: string) {
  const data = await readData();
  const invoice = getInvoice(data, invoiceId);
  if (invoice.status === "finalized") {
    return invoice;
  }

  const includedSessionIds = new Set(
    data.invoiceLineItems
      .filter((lineItem) => lineItem.invoiceId === invoiceId && !lineItem.excluded)
      .map((lineItem) => lineItem.sessionId),
  );

  for (const session of data.workSessions) {
    if (session.draftInvoiceId === invoiceId) {
      session.draftInvoiceId = null;
      if (includedSessionIds.has(session.id)) {
        session.invoiceId = invoiceId;
      }
      session.updatedAt = nowIso();
    }
  }

  invoice.status = "finalized";
  invoice.issueDate = nowIso().slice(0, 10);
  invoice.updatedAt = nowIso();
  syncInvoiceTotals(data, invoiceId);

  const period = getInvoicePeriod(data, invoice.periodId);
  period.status = "finalized";
  period.closedAt = nowIso();

  await writeData(data);
  return invoice;
}

export async function saveSettings(input: {
  timezone: string;
  monthlyCloseDay: number;
  monthlyCloseHour: number;
  autoDraftEnabled: boolean;
  cronSecret: string;
}) {
  const data = await readData();
  const parsed = settingsInputSchema.parse(input);
  const now = nowIso();

  data.settings = {
    ...data.settings,
    timezone: parsed.timezone,
    monthlyCloseDay: parsed.monthlyCloseDay,
    monthlyCloseHour: parsed.monthlyCloseHour,
    autoDraftEnabled: parsed.autoDraftEnabled,
    cronSecret: parsed.cronSecret,
    updatedAt: now,
  };

  await writeData(data);
}

export async function runMonthlyAutomation(reference = new Date()) {
  const data = await readData();
  const settings = data.settings as AppSettings;

  if (!settings.autoDraftEnabled) {
    return [];
  }

  if (settings.cronSecret === "change-me-before-hosting") {
    throw new Error("cronSecret must be changed from the default value before running automation.");
  }

  const scheduledPeriod = getScheduledPreviousMonthPeriod(reference, settings.monthlyCloseDay, settings.monthlyCloseHour);
  if (!scheduledPeriod) {
    return [];
  }

  const invoices: Invoice[] = [];

  for (const client of data.clients.filter((item) => item.active)) {
    const invoice = await generateDraftInvoice({
      clientId: client.id,
      periodStart: scheduledPeriod.start,
      periodEnd: scheduledPeriod.end,
    });
    invoices.push(invoice);
  }

  return invoices;
}

export async function getCurrentCronSecret() {
  const data = await readData();
  return data.settings.cronSecret;
}

// Checkbox forms here post the field twice: a hidden "false" so an unchecked box
// still submits something, then the checkbox itself as "true" when ticked.
// FormData.get() returns the FIRST entry — always the hidden "false" — so a
// ticked box reads as false. Always take the LAST entry instead.
function checkboxValue(formData: FormData, name: string): boolean {
  const entries = formData.getAll(name);
  return toBoolean(entries[entries.length - 1] ?? "false");
}

export function formDataToClientInput(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    defaultHourlyRate: Number(formData.get("defaultHourlyRate") ?? "0"),
    currency: String(formData.get("currency") ?? "USD"),
    color: String(formData.get("color") ?? "#db5c33"),
    active: checkboxValue(formData, "active"),
  };
}

export function formDataToSessionInput(formData: FormData) {
  const hourlyRateRaw = String(formData.get("hourlyRate") ?? "").trim();
  return {
    id: String(formData.get("id") ?? "") || undefined,
    clientId: String(formData.get("clientId") ?? ""),
    startedAt: String(formData.get("startedAt") ?? ""),
    endedAt: String(formData.get("endedAt") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    hourlyRate: hourlyRateRaw ? Number(hourlyRateRaw) : undefined,
  };
}

export function formDataToInvoiceInput(formData: FormData) {
  return {
    clientId: String(formData.get("clientId") ?? ""),
    periodStart: String(formData.get("periodStart") ?? ""),
    periodEnd: String(formData.get("periodEnd") ?? ""),
  };
}

export function formDataToSettingsInput(formData: FormData) {
  return {
    timezone: String(formData.get("timezone") ?? ""),
    monthlyCloseDay: Number(formData.get("monthlyCloseDay") ?? "1"),
    monthlyCloseHour: Number(formData.get("monthlyCloseHour") ?? "9"),
    autoDraftEnabled: checkboxValue(formData, "autoDraftEnabled"),
    cronSecret: String(formData.get("cronSecret") ?? ""),
  };
}
