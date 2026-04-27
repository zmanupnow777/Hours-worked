import { runMonthlyAutomationAction, saveSettingsAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Automation and runtime controls.</h2>
          <p className="muted">This page controls the monthly close schedule and the bearer secret used by your cron endpoint.</p>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Invoice Automation</p>
        <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
          Monthly close settings
        </h3>
        <form action={saveSettingsAction} className="form-grid">
          <div className="field">
            <label htmlFor="timezone">Time zone</label>
            <input id="timezone" name="timezone" defaultValue={settings.timezone} required />
          </div>
          <div className="field">
            <label htmlFor="monthlyCloseDay">Close day</label>
            <input id="monthlyCloseDay" name="monthlyCloseDay" type="number" min="1" max="28" defaultValue={settings.monthlyCloseDay} required />
          </div>
          <div className="field">
            <label htmlFor="monthlyCloseHour">Close hour</label>
            <input id="monthlyCloseHour" name="monthlyCloseHour" type="number" min="0" max="23" defaultValue={settings.monthlyCloseHour} required />
          </div>
          <div className="field">
            <label htmlFor="cronSecret">Cron secret</label>
            <input id="cronSecret" name="cronSecret" defaultValue={settings.cronSecret} required />
          </div>
          <div className="field">
            <label htmlFor="autoDraftEnabled">Enable automation</label>
            <div className="button-row">
              <input type="hidden" name="autoDraftEnabled" value="false" />
              <input id="autoDraftEnabled" name="autoDraftEnabled" type="checkbox" value="true" defaultChecked={settings.autoDraftEnabled} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="telegramBotToken">Telegram bot token</label>
            <input id="telegramBotToken" name="telegramBotToken" defaultValue={settings.telegramBotToken} placeholder="123456:ABC-DEF..." />
          </div>
          <div className="field">
            <label htmlFor="telegramChatId">Telegram chat ID</label>
            <input id="telegramChatId" name="telegramChatId" defaultValue={settings.telegramChatId} placeholder="Your numeric chat ID" />
          </div>
          <div className="field field--full button-row">
            <SubmitButton pendingLabel="Saving settings...">Save settings</SubmitButton>
          </div>
        </form>
      </section>

      <section className="card">
        <p className="eyebrow">Manual Trigger</p>
        <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
          Run monthly close right now
        </h3>
        <p className="muted">
          Endpoint path: <span className="code">POST /api/cron/monthly-close</span> with bearer auth set to your cron secret.
        </p>
        <form action={runMonthlyAutomationAction}>
          <SubmitButton pendingLabel="Running close..." className="button secondary">
            Run monthly automation now
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
