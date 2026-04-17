import { z } from "zod";

export const clientInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  contactName: z.string().trim().max(80).default(""),
  defaultHourlyRate: z.coerce.number().min(0),
  currency: z.string().trim().length(3).default("USD"),
  color: z.string().trim().min(4).max(20).default("#db5c33"),
  active: z.coerce.boolean().default(true),
});

export const manualSessionInputSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
  notes: z.string().trim().max(240).default(""),
  hourlyRate: z.coerce.number().min(0).optional(),
});

export const invoiceGenerationInputSchema = z.object({
  clientId: z.string().min(1),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const settingsInputSchema = z.object({
  timezone: z.string().trim().min(3),
  monthlyCloseDay: z.coerce.number().int().min(1).max(28),
  monthlyCloseHour: z.coerce.number().int().min(0).max(23),
  autoDraftEnabled: z.coerce.boolean().default(false),
  cronSecret: z.string().trim().min(8),
});
