import { buildInvoiceCsv } from "@/lib/invoice-export";
import { getInvoiceDetail } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await context.params;
  const detail = await getInvoiceDetail(invoiceId);
  const csv = buildInvoiceCsv(detail);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${detail.invoice.invoiceNumber}.csv"`,
    },
  });
}
