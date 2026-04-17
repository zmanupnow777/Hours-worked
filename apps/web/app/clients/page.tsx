import { getClients } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { saveClientAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Clients</p>
          <h2>Rates and billing identities.</h2>
          <p className="muted">Each client gets an independent rate, color, and timer lane. Add more clients later without changing the model.</p>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Add Client</p>
        <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
          Create another billing profile
        </h3>
        <form action={saveClientAction} className="form-grid">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" placeholder="Client name" required />
          </div>
          <div className="field">
            <label htmlFor="contactName">Contact</label>
            <input id="contactName" name="contactName" placeholder="Primary contact" />
          </div>
          <div className="field">
            <label htmlFor="defaultHourlyRate">Hourly rate</label>
            <input id="defaultHourlyRate" name="defaultHourlyRate" type="number" min="0" step="0.01" required />
          </div>
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <input id="currency" name="currency" defaultValue="USD" maxLength={3} required />
          </div>
          <div className="field">
            <label htmlFor="color">Accent color</label>
            <input id="color" name="color" defaultValue="#db5c33" required />
          </div>
          <div className="field">
            <label htmlFor="activeFlag">Active</label>
            <div className="button-row">
              <input type="hidden" name="active" value="false" />
              <input id="activeFlag" name="active" type="checkbox" value="true" defaultChecked />
            </div>
          </div>
          <div className="field field--full">
            <SubmitButton pendingLabel="Saving client...">Save client</SubmitButton>
          </div>
        </form>
      </section>

      <section className="grid grid--clients">
        {clients.map((client) => (
          <article key={client.id} className="card client-card" style={{ ["--client-color" as string]: client.color }}>
            <div className="split">
              <div>
                <p className="eyebrow">{client.name}</p>
                <h3 className="section-title" style={{ fontSize: "1.4rem" }}>
                  {formatCurrency(client.defaultHourlyRateCents, client.currency)}
                </h3>
              </div>
              <span className={client.active ? "pill pill--finalized" : "pill"}>{client.active ? "Active" : "Paused"}</span>
            </div>

            <form action={saveClientAction} className="form-grid">
              <input type="hidden" name="id" value={client.id} />
              <div className="field">
                <label>Name</label>
                <input name="name" defaultValue={client.name} required />
              </div>
              <div className="field">
                <label>Contact</label>
                <input name="contactName" defaultValue={client.contactName} />
              </div>
              <div className="field">
                <label>Hourly rate</label>
                <input name="defaultHourlyRate" type="number" min="0" step="0.01" defaultValue={(client.defaultHourlyRateCents / 100).toFixed(2)} required />
              </div>
              <div className="field">
                <label>Currency</label>
                <input name="currency" maxLength={3} defaultValue={client.currency} required />
              </div>
              <div className="field">
                <label>Accent color</label>
                <input name="color" defaultValue={client.color} required />
              </div>
              <div className="field">
                <label>Active</label>
                <div className="button-row">
                  <input type="hidden" name="active" value="false" />
                  <input name="active" type="checkbox" value="true" defaultChecked={client.active} />
                </div>
              </div>
              <div className="field field--full">
                <SubmitButton pendingLabel="Updating..." className="button secondary">
                  Update client
                </SubmitButton>
              </div>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
