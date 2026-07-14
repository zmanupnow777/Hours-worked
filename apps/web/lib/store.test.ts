import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const testDataFile = path.join(os.tmpdir(), `hours-store-test-${Date.now()}.json`);
process.env.HOURS_DATA_FILE = testDataFile;

import {
  deleteSession,
  finalizeInvoice,
  formDataToClientInput,
  generateDraftInvoice,
  getAppSnapshot,
  runMonthlyAutomation,
  saveClient,
  saveManualSession,
  saveSettings,
  startTimer,
  stopTimer,
} from "./store";

const TEST_CLIENT_NAME = "Alpha Test Client";
const MARCH_START = "2026-03-01";
const MARCH_END = "2026-03-31";

async function resetData() {
  await rm(testDataFile, { force: true });
}

async function createClient() {
  await saveClient({
    name: TEST_CLIENT_NAME,
    contactName: "Primary Contact",
    defaultHourlyRate: 45,
    currency: "USD",
    color: "#db5c33",
    active: true,
  });

  const snapshot = await getAppSnapshot();
  const client = snapshot.clients.find((item) => item.name === TEST_CLIENT_NAME);
  assert.ok(client, "expected seeded test client");
  return client.id;
}

function manualSession(clientId: string, overrides: Partial<Parameters<typeof saveManualSession>[0]> = {}) {
  return saveManualSession({
    clientId,
    startedAt: "2026-03-10T10:00:00.000Z",
    endedAt: "2026-03-10T11:00:00.000Z",
    ...overrides,
  });
}

// The client form posts a hidden active="false" followed by the checkbox's
// active="true". Reading the first entry instead of the last saves every client
// as inactive, and the dashboard hides inactive clients — which makes it
// impossible to start any timer at all.
test("a checked Active box saves the client as active", () => {
  const formData = new FormData();
  formData.append("name", "Checked Client");
  formData.append("defaultHourlyRate", "0");
  formData.append("active", "false"); // hidden fallback
  formData.append("active", "true"); // the checked checkbox

  assert.equal(formDataToClientInput(formData).active, true);
});

test("an unchecked Active box saves the client as inactive", () => {
  const formData = new FormData();
  formData.append("name", "Unchecked Client");
  formData.append("defaultHourlyRate", "0");
  formData.append("active", "false"); // hidden fallback only

  assert.equal(formDataToClientInput(formData).active, false);
});

test("fresh data file starts with no seeded clients", async () => {
  await resetData();
  const snapshot = await getAppSnapshot();
  assert.equal(snapshot.clients.length, 0);
});

test("startTimer creates an active session for the client", async () => {
  await resetData();
  const clientId = await createClient();
  await startTimer(clientId);
  const snapshot = await getAppSnapshot();
  const client = snapshot.clients.find((item) => item.id === clientId)!;
  assert.ok(client.activeSession, "expected an active session");
  assert.equal(client.activeSession!.clientId, clientId);
  assert.equal(client.activeSession!.endedAt, null);
});

test("startTimer throws when client already has an active timer", async () => {
  await resetData();
  const clientId = await createClient();
  await startTimer(clientId);
  await assert.rejects(() => startTimer(clientId), /already has an active timer/i);
});

test("stopTimer ends the active session", async () => {
  await resetData();
  const clientId = await createClient();
  await startTimer(clientId);
  await stopTimer(clientId);
  const snapshot = await getAppSnapshot();
  const client = snapshot.clients.find((item) => item.id === clientId)!;
  assert.equal(client.activeSession, null);
  const lastSession = snapshot.recentSessions[0];
  assert.ok(lastSession.endedAt, "session should have an end time");
  assert.ok(lastSession.durationMinutes !== null && lastSession.durationMinutes >= 1);
});

async function createFinalizedSession(clientId: string) {
  await manualSession(clientId);
  const draft = await generateDraftInvoice({ clientId, periodStart: MARCH_START, periodEnd: MARCH_END });
  await finalizeInvoice(draft.id);
  const snapshot = await getAppSnapshot();
  return snapshot.workSessions.find((session) => session.invoiceId === draft.id)!;
}

test("deleteSession throws for finalized sessions", async () => {
  await resetData();
  const clientId = await createClient();
  const session = await createFinalizedSession(clientId);
  await assert.rejects(() => deleteSession(session.id), /finalized sessions cannot be deleted/i);
});

test("saveManualSession throws when editing a finalized session", async () => {
  await resetData();
  const clientId = await createClient();
  const session = await createFinalizedSession(clientId);
  await assert.rejects(
    () =>
      saveManualSession({
        id: session.id,
        clientId,
        startedAt: "2026-03-10T10:00:00.000Z",
        endedAt: "2026-03-10T12:00:00.000Z",
      }),
    /finalized sessions cannot be edited/i,
  );
});

test("generateDraftInvoice creates one line item per eligible session", async () => {
  await resetData();
  const clientId = await createClient();
  await manualSession(clientId, { startedAt: "2026-03-10T10:00:00.000Z", endedAt: "2026-03-10T11:00:00.000Z" });
  await manualSession(clientId, { startedAt: "2026-03-11T10:00:00.000Z", endedAt: "2026-03-11T11:30:00.000Z" });
  const draft = await generateDraftInvoice({ clientId, periodStart: MARCH_START, periodEnd: MARCH_END });
  const snapshot = await getAppSnapshot();
  const lineItems = snapshot.workSessions.filter((session) => session.draftInvoiceId === draft.id);
  assert.equal(lineItems.length, 2);
});

test("generateDraftInvoice rebuilds line items on re-run without duplicating", async () => {
  await resetData();
  const clientId = await createClient();
  await manualSession(clientId, { startedAt: "2026-03-10T10:00:00.000Z", endedAt: "2026-03-10T11:00:00.000Z" });
  await manualSession(clientId, { startedAt: "2026-03-11T10:00:00.000Z", endedAt: "2026-03-11T11:30:00.000Z" });

  const first = await generateDraftInvoice({ clientId, periodStart: MARCH_START, periodEnd: MARCH_END });
  const second = await generateDraftInvoice({ clientId, periodStart: MARCH_START, periodEnd: MARCH_END });
  assert.equal(first.id, second.id, "should return the same invoice");
  const snapshot = await getAppSnapshot();
  const lineItems = snapshot.workSessions.filter((session) => session.draftInvoiceId === second.id);
  assert.equal(lineItems.length, 2, "re-run must not duplicate line items");
});

test("generateDraftInvoice returns finalized invoice without rebuilding it", async () => {
  await resetData();
  const clientId = await createClient();
  await manualSession(clientId, { startedAt: "2026-03-10T10:00:00.000Z", endedAt: "2026-03-10T11:00:00.000Z" });
  const draft = await generateDraftInvoice({ clientId, periodStart: MARCH_START, periodEnd: MARCH_END });
  await finalizeInvoice(draft.id);

  await manualSession(clientId, { startedAt: "2026-03-15T10:00:00.000Z", endedAt: "2026-03-15T11:00:00.000Z" });
  const result = await generateDraftInvoice({ clientId, periodStart: MARCH_START, periodEnd: MARCH_END });

  assert.equal(result.id, draft.id, "should return the finalized invoice unchanged");
  assert.equal(result.status, "finalized");
  const snapshot = await getAppSnapshot();
  const unbilled = snapshot.workSessions.filter(
    (session) => !session.invoiceId && !session.draftInvoiceId && session.clientId === clientId,
  );
  assert.equal(unbilled.length, 1, "new session should remain unbilled");
});

test("runMonthlyAutomation throws on default cronSecret", async () => {
  await resetData();
  const afterClose = new Date("2026-04-01T10:00:00.000Z");
  await assert.rejects(() => runMonthlyAutomation(afterClose), /cronSecret must be changed/i);
});

test("runMonthlyAutomation succeeds after cronSecret is updated", async () => {
  await resetData();
  await saveSettings({
    timezone: "America/La_Paz",
    monthlyCloseDay: 1,
    monthlyCloseHour: 9,
    autoDraftEnabled: true,
    cronSecret: "a-valid-secret-123",
  });
  const afterClose = new Date("2026-04-01T10:00:00.000Z");
  const result = await runMonthlyAutomation(afterClose);
  assert.ok(Array.isArray(result));
});
