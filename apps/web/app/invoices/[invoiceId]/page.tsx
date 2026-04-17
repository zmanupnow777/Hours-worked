import Link from "next/link";
import { notFound } from "next/navigation";

import { finalizeInvoiceAction, toggleLineItemExclusionAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency, formatDateTime, formatMinutes, formatPeriodLabel } from "@/lib/format";
import { getInvoiceDetail, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  try {
    const [detail, settings] = await Promise.all([getInvoiceDetail(invoiceId), getSettings()]);

    return (
      <div className="page">
        <section className="hero">
          <div>
            <p className="eyebrow">Invoice Detail</p>
            <h2>{detail.invoice.invoiceNumber}</h2>
            <p className="muted">
              {detail.client.name} • {formatPeriodLabel(detail.invoice.periodStart, detail.invoice.periodEnd)}
            </p>
          </div>
          <div className="meta-cluster">
            <span className={detail.invoice.status === "draft" ? "pill pill--draft" : "pill pill--finalized"}>
              {detail.invoice.status}
            </span>
            <span className="meta-chip">Total {formatCurrency(detail.invoice.subtotalCents, detail.invoice.currency)}</span>
            <span className="meta-chip">Hours {formatMinutes(detail.invoice.totalMinutes)}</span>
          </div>
        </section>

        <section className="card">
          <div className="split">
            <div>
              <p className="eyebrow">Exports</p>
              <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
                Deliverables
              </h3>
            </div>
            <div className="button-row">
              <Link href={`/api/invoices/${detail.invoice.id}/pdf`} className="button subtle">
                Download PDF
              </Link>
              <Link href={`/api/invoices/${detail.invoice.id}/csv`} className="button subtle">
                Download CSV
              </Link>
            </div>
          </div>
          {detail.invoice.status === "draft" ? (
            <form action={finalizeInvoiceAction}>
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <SubmitButton pendingLabel="Finalizing..." className="button secondary">
                Finalize invoice
              </SubmitButton>
            </form>
          ) : (
            <p className="muted">This invoice is finalized. Linked sessions are locked.</p>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">Line Items</p>
          <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
            Included sessions
          </h3>
          <div className="list">
            {detail.lineItems.map((lineItem) => (
              <div key={lineItem.id} className="list-item">
                <div>
                  <strong>{lineItem.description}</strong>
                  <p className="muted tiny">
                    {formatDateTime(lineItem.startedAt, settings.timezone)} to {formatDateTime(lineItem.endedAt, settings.timezone)}
                  </p>
                  <p className="muted tiny">
                    {formatMinutes(lineItem.minutes)} at {formatCurrency(lineItem.rateCents, detail.invoice.currency)} / hour
                  </p>
                </div>
                <div className="stack">
                  <strong>{formatCurrency(lineItem.amountCents, detail.invoice.currency)}</strong>
                  {detail.invoice.status === "draft" ? (
                    <form action={toggleLineItemExclusionAction}>
                      <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                      <input type="hidden" name="lineItemId" value={lineItem.id} />
                      <SubmitButton pendingLabel="Updating..." className={lineItem.excluded ? "button secondary" : "button subtle"}>
                        {lineItem.excluded ? "Include in invoice" : "Exclude from invoice"}
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className={lineItem.excluded ? "pill pill--draft" : "pill pill--finalized"}>
                      {lineItem.excluded ? "Excluded" : "Billed"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  } catch {
    notFound();
  }
}
