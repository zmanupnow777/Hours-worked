import { buildInvoicePdf } from "@/lib/invoice-export";
import { getInvoiceDetail } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await context.params;
  const detail = await getInvoiceDetail(invoiceId);
  const pdfBytes = await buildInvoicePdf(detail);
  const body = Buffer.from(pdfBytes);

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${detail.invoice.invoiceNumber}.pdf"`,
    },
  });
}
