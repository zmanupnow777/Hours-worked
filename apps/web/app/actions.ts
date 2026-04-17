"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteSession,
  finalizeInvoice,
  formDataToClientInput,
  formDataToInvoiceInput,
  formDataToSessionInput,
  formDataToSettingsInput,
  generateDraftInvoice,
  runMonthlyAutomation,
  saveClient,
  saveManualSession,
  saveSettings,
  startTimer,
  stopTimer,
  toggleLineItemExclusion,
} from "@/lib/store";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/clients");
  revalidatePath("/invoices");
  revalidatePath("/settings");
}

export async function startTimerAction(formData: FormData) {
  await startTimer(String(formData.get("clientId") ?? ""));
  revalidateAll();
}

export async function stopTimerAction(formData: FormData) {
  await stopTimer(String(formData.get("clientId") ?? ""));
  revalidateAll();
}

export async function saveClientAction(formData: FormData) {
  await saveClient(formDataToClientInput(formData));
  revalidateAll();
}

export async function saveManualSessionAction(formData: FormData) {
  await saveManualSession(formDataToSessionInput(formData));
  revalidateAll();
}

export async function deleteSessionAction(formData: FormData) {
  await deleteSession(String(formData.get("sessionId") ?? ""));
  revalidateAll();
}

export async function generateDraftInvoiceAction(formData: FormData) {
  const invoice = await generateDraftInvoice(formDataToInvoiceInput(formData));
  revalidateAll();
  redirect(`/invoices/${invoice.id}`);
}

export async function finalizeInvoiceAction(formData: FormData) {
  const invoice = await finalizeInvoice(String(formData.get("invoiceId") ?? ""));
  revalidateAll();
  redirect(`/invoices/${invoice.id}`);
}

export async function toggleLineItemExclusionAction(formData: FormData) {
  await toggleLineItemExclusion(
    String(formData.get("invoiceId") ?? ""),
    String(formData.get("lineItemId") ?? ""),
  );
  revalidateAll();
}

export async function saveSettingsAction(formData: FormData) {
  await saveSettings(formDataToSettingsInput(formData));
  revalidateAll();
}

export async function runMonthlyAutomationAction() {
  await runMonthlyAutomation();
  revalidateAll();
  redirect("/invoices");
}
