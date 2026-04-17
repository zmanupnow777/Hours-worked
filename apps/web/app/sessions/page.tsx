import Link from "next/link";

import { deleteSessionAction, saveManualSessionAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency, formatDateTime, formatMinutes, toDateTimeLocalValue } from "@/lib/format";
import { getClients, getSessions, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const [clients, sessions, settings] = await Promise.all([getClients(), getSessions(), getSettings()]);
  const defaultClient = clients[0];
  const now = new Date();
  const earlier = new Date(now.getTime() - 60 * 60 * 1000);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2>Capture manual work blocks.</h2>
          <p className="muted">Backfill missed time, adjust notes, and keep draft-linked sessions aligned before invoice finalization.</p>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Manual Entry</p>
        <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
          Add a work session
        </h3>
        {clients.length === 0 ? (
          <div className="stack">
            <p className="muted">Add a client before creating manual sessions.</p>
            <Link href="/clients" className="button">
              Open Clients
            </Link>
          </div>
        ) : (
          <form action={saveManualSessionAction} className="form-grid">
            <div className="field">
              <label htmlFor="clientId">Client</label>
              <select id="clientId" name="clientId" defaultValue={defaultClient?.id}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hourlyRate">Hourly Rate (optional)</label>
              <input id="hourlyRate" name="hourlyRate" type="number" min="0" step="0.01" placeholder="Use default rate" />
            </div>
            <div className="field">
              <label htmlFor="startedAt">Start</label>
              <input id="startedAt" name="startedAt" type="datetime-local" defaultValue={toDateTimeLocalValue(earlier.toISOString())} required />
            </div>
            <div className="field">
              <label htmlFor="endedAt">End</label>
              <input id="endedAt" name="endedAt" type="datetime-local" defaultValue={toDateTimeLocalValue(now.toISOString())} required />
            </div>
            <div className="field field--full">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" placeholder="What was this work block for?" />
            </div>
            <div className="field field--full">
              <SubmitButton pendingLabel="Saving session...">Save session</SubmitButton>
            </div>
          </form>
        )}
      </section>

      <section className="card">
        <p className="eyebrow">History</p>
        <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
          All sessions
        </h3>
        {sessions.length === 0 ? (
          <p className="muted">No sessions yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const client = clients.find((item) => item.id === session.clientId);
                  const isLocked = Boolean(session.invoiceId);

                  return (
                    <tr key={session.id}>
                      <td>{client?.name ?? "Unknown client"}</td>
                      <td>{formatDateTime(session.startedAt, settings.timezone)}</td>
                      <td>{session.endedAt ? formatMinutes(session.durationMinutes ?? 0) : "Running"}</td>
                      <td>{formatCurrency(session.hourlyRateCents, client?.currency ?? "USD")}</td>
                      <td>
                        {session.invoiceId ? (
                          <span className="pill pill--finalized">Finalized</span>
                        ) : session.draftInvoiceId ? (
                          <span className="pill pill--draft">In draft</span>
                        ) : (
                          <span className="pill">Open</span>
                        )}
                      </td>
                      <td>
                        <div className="stack">
                          <span className="tiny">{session.notes || "No notes"}</span>
                          <details className="details">
                            <summary>Edit session</summary>
                            <div className="details__body">
                              <form action={saveManualSessionAction} className="form-grid">
                                <input type="hidden" name="id" value={session.id} />
                                <div className="field">
                                  <label>Client</label>
                                  <select name="clientId" defaultValue={session.clientId} disabled={isLocked}>
                                    {clients.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Hourly Rate</label>
                                  <input
                                    name="hourlyRate"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    defaultValue={(session.hourlyRateCents / 100).toFixed(2)}
                                    disabled={isLocked}
                                  />
                                </div>
                                <div className="field">
                                  <label>Start</label>
                                  <input
                                    name="startedAt"
                                    type="datetime-local"
                                    defaultValue={toDateTimeLocalValue(session.startedAt)}
                                    disabled={isLocked}
                                  />
                                </div>
                                <div className="field">
                                  <label>End</label>
                                  <input
                                    name="endedAt"
                                    type="datetime-local"
                                    defaultValue={session.endedAt ? toDateTimeLocalValue(session.endedAt) : ""}
                                    disabled={isLocked}
                                  />
                                </div>
                                <div className="field field--full">
                                  <label>Notes</label>
                                  <textarea name="notes" defaultValue={session.notes} disabled={isLocked} />
                                </div>
                                <div className="button-row field field--full">
                                  <SubmitButton pendingLabel="Updating..." className="button secondary">
                                    Update session
                                  </SubmitButton>
                                </div>
                              </form>
                              <form action={deleteSessionAction} className="button-row" style={{ marginTop: 12 }}>
                                <input type="hidden" name="sessionId" value={session.id} />
                                <SubmitButton pendingLabel="Deleting..." className="button danger">
                                  Delete session
                                </SubmitButton>
                              </form>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
