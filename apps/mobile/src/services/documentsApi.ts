import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api } from "./api";

export type DocType = "INVOICE" | "ESTIMATE" | "PROFORMA" | "DELIVERY_NOTE" | "PURCHASE_ORDER";
export type DocStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Document {
  id: string;
  business_id: string;
  client_id: string | null;
  client?: { id: string; name: string } | null;
  type: DocType;
  status: DocStatus;
  document_number: string;
  reference: string | null;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  payment_method: string | null;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  items?: DocumentItem[];
}

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_pct: number;
  line_total: number;
  product_service_id: string | null;
  product_service?: { id: string; name: string; sku: string | null; photo_url: string | null } | null;
}

export async function fetchDocuments(
  businessId: string,
  type?: DocType,
  status?: DocStatus
): Promise<Document[]> {
  const params = new URLSearchParams({ business_id: businessId });
  if (type) params.set("type", type);
  if (status) params.set("status", status);
  const res = await api.get(`/documents?${params}`);
  return res.data;
}

export async function fetchDocument(id: string): Promise<Document> {
  const res = await api.get(`/documents/${id}`);
  return res.data;
}

export async function createDocument(payload: Partial<Document> & { items?: any[] }): Promise<Document> {
  const res = await api.post("/documents", payload);
  return res.data;
}

export async function updateDocument(id: string, payload: Partial<Document> & { items?: any[] }): Promise<Document> {
  const res = await api.put(`/documents/${id}`, payload);
  return res.data;
}

export async function updateDocumentStatus(id: string, status: DocStatus): Promise<Document> {
  const res = await api.patch(`/documents/${id}/status`, { status });
  return res.data;
}

export async function downloadPdf(id: string, documentNumber: string): Promise<void> {
  const BASE = api.defaults.baseURL ?? "";
  const uri = `${BASE}/documents/${id}/pdf`;
  const localUri = `${FileSystem.cacheDirectory}${documentNumber}.pdf`;
  await FileSystem.downloadAsync(uri, localUri);
  await Sharing.shareAsync(localUri, { mimeType: "application/pdf" });
}
