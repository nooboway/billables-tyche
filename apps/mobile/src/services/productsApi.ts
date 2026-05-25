import { api } from "./api";

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string | null;
  tax_pct: number;
  sku: string | null;
  photo_url: string | null;
}

export async function fetchProducts(businessId: string, q?: string): Promise<Product[]> {
  const params = new URLSearchParams({ business_id: businessId });
  if (q) params.set("q", q);
  const res = await api.get(`/products?${params}`);
  return res.data;
}

export async function createProduct(payload: Omit<Product, "id">): Promise<Product> {
  const res = await api.post("/products", payload);
  return res.data;
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
  const res = await api.put(`/products/${id}`, payload);
  return res.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
