export type InvoiceStatus = "draft" | "finalized";
export type InvoicePeriodStatus = "open" | "drafted" | "finalized";
export type SessionSource = "timer" | "manual";

export interface Client {
  id: string;
  name: string;
  contactName: string;
  defaultHourlyRateCents: number;
  currency: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  clientId: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  notes: string;
  source: SessionSource;
  hourlyRateCents: number;
  invoiceId: string | null;
  draftInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePeriod {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  status: InvoicePeriodStatus;
  lastDraftedAt: string | null;
  closedAt: string | null;
}

export interface Invoice {
  id: string;
  clientId: string;
  periodId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  subtotalCents: number;
  totalMinutes: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  sessionId: string;
  description: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  rateCents: number;
  amountCents: number;
  excluded: boolean;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  timezone: string;
  monthlyCloseDay: number;
  monthlyCloseHour: number;
  autoDraftEnabled: boolean;
  cronSecret: string;
  telegramBotToken: string;
  telegramChatId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  clients: Client[];
  workSessions: WorkSession[];
  invoicePeriods: InvoicePeriod[];
  invoices: Invoice[];
  invoiceLineItems: InvoiceLineItem[];
  settings: AppSettings;
}

export interface InvoiceTotals {
  subtotalCents: number;
  totalMinutes: number;
}

export interface BillingPeriod {
  start: string;
  end: string;
  label: string;
}

export interface InvoiceDetail {
  invoice: Invoice;
  client: Client;
  lineItems: InvoiceLineItem[];
}
