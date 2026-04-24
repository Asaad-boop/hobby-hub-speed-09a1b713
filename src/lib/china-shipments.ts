import { supabase } from "@/integrations/supabase/client";

export type ChinaShipmentStatus =
  | "draft"
  | "ordered"
  | "in_transit"
  | "customs"
  | "received"
  | "cancelled";

export type ChinaShipment = {
  id: string;
  reference_no: string;
  supplier_name: string | null;
  supplier_contact: string | null;
  status: ChinaShipmentStatus;
  order_date: string | null;
  shipped_date: string | null;
  arrival_date: string | null;
  received_date: string | null;
  cny_amount: number;
  exchange_rate: number;
  product_cost_bdt: number;
  international_shipping: number;
  customs_duty: number;
  local_transport: number;
  other_costs: number;
  total_landed_cost: number;
  total_quantity: number;
  per_unit_landed_cost: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ChinaShipmentItem = {
  id: string;
  shipment_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  cny_unit_price: number;
  allocated_landed_cost: number;
  per_unit_landed_cost: number;
  notes: string | null;
  created_at: string;
};

export const STATUS_LABEL: Record<ChinaShipmentStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  in_transit: "In Transit",
  customs: "At Customs",
  received: "Received",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<ChinaShipmentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  in_transit: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  customs: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  received: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const chinaSupabase = supabase as any;

export async function listChinaShipments(): Promise<ChinaShipment[]> {
  const { data, error } = await chinaSupabase
    .from("china_shipments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChinaShipment[];
}

export async function getChinaShipment(id: string) {
  const [{ data: header, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    chinaSupabase.from("china_shipments").select("*").eq("id", id).single(),
    chinaSupabase
      .from("china_shipment_items")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    header: header as ChinaShipment,
    items: (items ?? []) as ChinaShipmentItem[],
  };
}

export type CreateShipmentInput = {
  reference_no: string;
  supplier_name?: string | null;
  supplier_contact?: string | null;
  status?: ChinaShipmentStatus;
  order_date?: string | null;
  shipped_date?: string | null;
  arrival_date?: string | null;
  cny_amount: number;
  exchange_rate: number;
  international_shipping: number;
  customs_duty: number;
  local_transport: number;
  other_costs: number;
  notes?: string | null;
};

export async function createChinaShipment(input: CreateShipmentInput) {
  const { data, error } = await chinaSupabase
    .from("china_shipments")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChinaShipment;
}

export async function updateChinaShipment(
  id: string,
  patch: Partial<CreateShipmentInput> & { status?: ChinaShipmentStatus },
) {
  const { data, error } = await chinaSupabase
    .from("china_shipments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChinaShipment;
}

export async function deleteChinaShipment(id: string) {
  const { error } = await chinaSupabase.from("china_shipments").delete().eq("id", id);
  if (error) throw error;
}

export type CreateShipmentItemInput = {
  shipment_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  product_name_snapshot: string;
  quantity: number;
  cny_unit_price: number;
  notes?: string | null;
};

export async function addShipmentItem(input: CreateShipmentItemInput) {
  const { data, error } = await chinaSupabase
    .from("china_shipment_items")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as ChinaShipmentItem;
}

export async function deleteShipmentItem(id: string) {
  const { error } = await chinaSupabase.from("china_shipment_items").delete().eq("id", id);
  if (error) throw error;
}

export function bdt(n: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
