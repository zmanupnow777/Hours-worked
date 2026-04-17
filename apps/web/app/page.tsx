import Link from "next/link";

import { generateDraftInvoiceAction, startTimerAction, stopTimerAction } from "@/app/actions";
import { LiveDuration } from "@/components/live-duration";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency, formatDateTime, formatMinutes, formatPeriodLabel } from "@/lib/format";
import { getAppSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getAppSnapshot();
  const activeTimers = snapshot.clients.filter((client) => client.activeSession).length;
  const monthMinutes = snapshot.clients.reduce((sum, client) => sum + client.currentMonthMinutes, 0);
  const monthRevenue = snapshot.clients.reduce((sum, client) => sum + client.currentMonthRevenueCents, 0);
  const latestInvoice = snapshot.recentInvoices[0];

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Track work while it happens.</h2>
          <p className="muted">
            Parallel client timers are supported. Each session stays separate, billable, and ready for invoice closeout.
          </p>
        </div>
        <div className="meta-cluster">
          <span className="meta-chip">
            Default close: day {snapshot.settings.monthlyCloseDay} at {String(snapshot.settings.monthlyCloseHour).padStart(2, "0")}:00
          </span>
          <span className="meta-chip">Time zone: {snapshot.settings.timezone}</span>
          <span className="meta-chip">
            Last billing window: {formatPeriodLabel(snapshot.previousMonthPeriod.start, snapshot.previousMonthPeriod.end)}
          </span>
        </div>
      </section>

      <section className="grid grid--stats">
        <article className="card">
          <p className="muted tiny">Active timers</p>
          <p className="stat-value">{activeTimers}</p>
          <p className="muted tiny">One timer per client, simultaneous clients allowed.</p>
        </article>
        <article className="card">
          <p className="muted tiny">Month-to-date hours</p>
          <p className="stat-value">{formatMinutes(monthMinutes)}</p>
          <p className="muted tiny">Current month completed work across all clients.</p>
        </article>
        <article className="card">
          <p className="muted tiny">Month-to-date revenue</p>
          <p className="stat-value">{formatCurrency(monthRevenue)}</p>
          <p className="muted tiny">Projected from completed sessions only.</p>
        </article>
        <article className="card">
          <p className="muted tiny">Latest invoice</p>
          <p className="stat-value">{latestInvoice ? latestInvoice.invoiceNumber : "None"}</p>
          <p className="muted tiny">
            {latestInvoice
              ? `${snapshot.clients.find((client) => client.id === latestInvoice.clientId)?.name ?? "Client"} - ${latestInvoice.status}`
              : "Generate the first draft invoice from the window below."}
          </p>
        </article>
      </section>

      <section className="grid grid--clients">
        {snapshot.clients.length === 0 ? (
          <article className="card">
            <p className="eyebrow">No Clients Yet</p>
            <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
              Start by creating your first billing profile.
            </h3>
            <p className="muted">The dashboard stays empty until at least one active client exists.</p>
            <Link href="/clients" className="button">
              Open Clients
            </Link>
          </article>
        ) : (
          snapshot.clients.map((client) => (
            <article key={client.id} className="card client-card" style={{ ["--client-color" as string]: client.color }}>
              <div className="split">
                <div>
                  <p className="eyebrow">{client.name}</p>
                  <h3 className="section-title" style={{ fontSize: "1.4rem" }}>
                    {formatCurrency(client.defaultHourlyRateCents)}
                    <span className="muted tiny"> / hour</span>
                  </h3>
                </div>
                {client.activeSession ? <span className="pill pill--draft">Timer live</span> : <span className="pill">Ready</span>}
              </div>

              <div className="stack">
                <div className="split">
                  <span className="muted tiny">Current month</span>
                  <strong>{formatMinutes(client.currentMonthMinutes)}</strong>
                </div>
                <div className="split">
                  <span className="muted tiny">Projected</span>
                  <strong>{formatCurrency(client.currentMonthRevenueCents)}</strong>
                </div>
                <div className="split">
                  <span className="muted tiny">Status</span>
                  <strong>
                    {client.activeSession ? (
                      <>
                        Started {formatDateTime(client.activeSession.startedAt, snapshot.settings.timezone)} -{" "}
                        <LiveDuration startedAt={client.activeSession.startedAt} />
                      </>
                    ) : (
                      "No active timer"
                    )}
                  </strong>
                </div>
              </div>

              <div className="button-row">
                {client.activeSession ? (
                  <form action={stopTimerAction}>
                    <input type="hidden" name="clientId" value={client.id} />
                    <SubmitButton className="button secondary" pendingLabel="Stopping...">
                      Stop timer
                    </SubmitButton>
                  </form>
                ) : (
                  <form action={startTimerAction}>
                    <input type="hidden" name="clientId" value={client.id} />
                    <SubmitButton pendingLabel="Starting...">Start timer</SubmitButton>
                  </form>
                )}

                <form action={generateDraftInvoiceAction}>
                  <input type="hidden" name="clientId" value={client.id} />
                  <input type="hidden" name="periodStart" value={snapshot.previousMonthPeriod.start} />
                  <input type="hidden" name="periodEnd" value={snapshot.previousMonthPeriod.end} />
                  <SubmitButton className="button subtle" pendingLabel="Generating...">
                    Draft last month invoice
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="grid grid--two">
        <article className="card">
          <p className="eyebrow">Recent Sessions</p>
          <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
            Latest work blocks
          </h3>
          <div className="list">
            {snapshot.recentSessions.length === 0 ? (
              <p className="muted">No sessions yet. Start a timer or add a manual entry from the Sessions page.</p>
            ) : (
              snapshot.recentSessions.slice(0, 8).map((session) => {
                const client = snapshot.clients.find((item) => item.id === session.clientId);
                return (
                  <div key={session.id} className="list-item">
                    <div>
                      <strong>{client?.name ?? "Unknown client"}</strong>
                      <p className="muted tiny">{formatDateTime(session.startedAt, snapshot.settings.timezone)}</p>
                    </div>
                    <div>
                      <strong>
                        {session.endedAt ? formatMinutes(session.durationMinutes ?? 0) : <LiveDuration startedAt={session.startedAt} />}
                      </strong>
                      <p className="muted tiny">{session.source}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="card">
          <p className="eyebrow">Invoice Queue</p>
          <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
            Drafts and finals
          </h3>
          <div className="list">
            {snapshot.recentInvoices.length === 0 ? (
              <p className="muted">No invoices generated yet.</p>
            ) : (
              snapshot.recentInvoices.slice(0, 6).map((invoice) => (
                <div key={invoice.id} className="list-item">
                  <div>
                    <strong>{invoice.invoiceNumber}</strong>
                    <p className="muted tiny">
                      {snapshot.clients.find((item) => item.id === invoice.clientId)?.name ?? "Client"} -{" "}
                      {formatPeriodLabel(invoice.periodStart, invoice.periodEnd)}
                    </p>
                  </div>
                  <div>
                    <span className={invoice.status === "draft" ? "pill pill--draft" : "pill pill--finalized"}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
