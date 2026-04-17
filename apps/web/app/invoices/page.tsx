import Link from "next/link";

import { getPreviousCalendarMonthPeriod } from "@hours-worked/shared";

import { generateDraftInvoiceAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency, formatDate, formatPeriodLabel } from "@/lib/format";
import { getClients, getInvoices } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [clients, invoices] = await Promise.all([getClients(), getInvoices()]);
  const activeClients = clients.filter((client) => client.active);
  const previousPeriod = getPreviousCalendarMonthPeriod(new Date());

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Invoices</p>
          <h2>Generate, review, export.</h2>
          <p className="muted">Draft invoices are rebuildable until you finalize them. Finalized invoices lock billable sessions in place.</p>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Generate Draft</p>
        <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
          Build an invoice from billable sessions
        </h3>
        {activeClients.length === 0 ? (
          <div className="stack">
            <p className="muted">Add an active client before generating invoices.</p>
            <Link href="/clients" className="button">
              Open Clients
            </Link>
          </div>
        ) : (
          <form action={generateDraftInvoiceAction} className="form-grid">
            <div className="field">
              <label htmlFor="clientId">Client</label>
              <select id="clientId" name="clientId" defaultValue={activeClients[0]?.id}>
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="periodStart">Period Start</label>
              <input id="periodStart" name="periodStart" type="date" defaultValue={previousPeriod.start} required />
            </div>
            <div className="field">
              <label htmlFor="periodEnd">Period End</label>
              <input id="periodEnd" name="periodEnd" type="date" defaultValue={previousPeriod.end} required />
            </div>
            <div className="field">
              <label>Suggested Window</label>
              <div className="meta-chip">{previousPeriod.label}</div>
            </div>
            <div className="field field--full">
              <SubmitButton pendingLabel="Generating invoice...">Generate draft invoice</SubmitButton>
            </div>
          </form>
        )}
      </section>

      <section className="card">
        <p className="eyebrow">Invoice List</p>
        <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
          Drafts and finalized records
        </h3>
        <div className="list">
          {invoices.length === 0 ? (
            <p className="muted">No invoices yet.</p>
          ) : (
            invoices.map(({ invoice, client, lineItems }) => (
              <div key={invoice.id} className="list-item">
                <div>
                  <strong>{invoice.invoiceNumber}</strong>
                  <p className="muted tiny">
                    {client.name} - {formatPeriodLabel(invoice.periodStart, invoice.periodEnd)}
                  </p>
                  <p className="muted tiny">
                    {lineItems.length} line items - Issued {formatDate(invoice.issueDate)}
                  </p>
                </div>
                <div className="stack">
                  <span className={invoice.status === "draft" ? "pill pill--draft" : "pill pill--finalized"}>
                    {invoice.status}
                  </span>
                  <strong>{formatCurrency(invoice.subtotalCents, invoice.currency)}</strong>
                  <Link href={`/invoices/${invoice.id}`} className="button subtle">
                    Open invoice
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
