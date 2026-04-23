import { supabase } from "@/integrations/supabase/client";
import { createTransaction, type CashAccount } from "./finance";

export type PendingShipment = {
  id: string;
  order_id: string;
  tracking_id: string | null;
  consignment_id: string | null;
  status: string;
  delivered_at: string | null;
  cod_amount_expected: number;
  cod_amount_received: number;
  actual_delivery_charge: number;
  actual_cod_charge: number;
  provider: string;
  order_total?: number | null;
  customer_name?: string | null;
};

/** Shipments delivered (or partial) where COD has not yet been settled. */
export async function fetchPendingCodShipments(): Promise<PendingShipment[]> {
  const { data, error } = await supabase
    .from("courier_shipments")
    .select(
      "id, order_id, tracking_id, consignment_id, status, delivered_at, cod_amount_expected, cod_amount_received, actual_delivery_charge, actual_cod_charge, provider, cod_settlement_date, orders:order_id(total, shipping_name)"
    )
    .in("status", ["delivered", "partial_delivered"])
    .is("cod_settlement_date", null)
    .order("delivered_at", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    tracking_id: r.tracking_id,
    consignment_id: r.consignment_id,
    status: r.status,
    delivered_at: r.delivered_at,
    cod_amount_expected: Number(r.cod_amount_expected ?? 0),
    cod_amount_received: Number(r.cod_amount_received ?? 0),
    actual_delivery_charge: Number(r.actual_delivery_charge ?? 0),
    actual_cod_charge: Number(r.actual_cod_charge ?? 0),
    provider: r.provider,
    order_total: r.orders?.total ?? null,
    customer_name: r.orders?.shipping_name ?? null,
  }));
}

export type SettlementInput = {
  shipmentIds: string[];
  fromAccountId: string;        // typically Pathao Pending COD
  toAccountId: string;          // bKash / Bank
  amountReceived: number;       // actual amount Pathao deposited
  expectedAmount: number;       // sum of (expected - charges) for selected
  settlementDate: string;       // YYYY-MM-DD
  reference?: string;           // batch reference / payout id
  notes?: string;
};

/**
 * Record a Pathao COD settlement batch.
 * - Creates paired transfer_out / transfer_in transactions on the ledger.
 * - If amountReceived < expected, also records the shortfall as an expense
 *   against the source account (category=courier_cod_charge) so balances reconcile.
 * - Marks every selected shipment with the settlement date + batch id.
 */
export async function recordCodSettlement(input: SettlementInput): Promise<string> {
  if (input.shipmentIds.length === 0) throw new Error("Select at least one shipment");
  if (input.fromAccountId === input.toAccountId) throw new Error("From and To accounts must differ");
  if (input.amountReceived <= 0) throw new Error("Amount received must be positive");

  const batchId = crypto.randomUUID();
  const ref = input.reference?.trim() || batchId.slice(0, 8);
  const desc = `Pathao COD settlement #${ref} (${input.shipmentIds.length} shipments)`;

  // 1. Out from Pathao Pending
  await createTransaction({
    account_id: input.fromAccountId,
    type: "cod_settlement",
    category: "product_sale",
    direction: "out",
    amount: input.amountReceived,
    description: desc,
    reference_type: "settlement",
    reference_id: null,
    transaction_date: new Date(`${input.settlementDate}T12:00:00`).toISOString(),
  });

  // 2. In to destination (bKash / Bank)
  await createTransaction({
    account_id: input.toAccountId,
    type: "cod_settlement",
    category: "product_sale",
    direction: "in",
    amount: input.amountReceived,
    description: desc,
    reference_type: "settlement",
    reference_id: null,
    transaction_date: new Date(`${input.settlementDate}T12:00:00`).toISOString(),
  });

  // 3. Reconciliation shortfall (if any) — keeps Pathao Pending honest
  const shortfall = +(input.expectedAmount - input.amountReceived).toFixed(2);
  if (shortfall > 0.01) {
    await createTransaction({
      account_id: input.fromAccountId,
      type: "adjustment",
      category: "courier_cod_charge",
      direction: "out",
      amount: shortfall,
      description: `Settlement adjustment for #${ref} (shortfall vs expected)`,
      reference_type: "settlement",
      reference_id: null,
      transaction_date: new Date(`${input.settlementDate}T12:00:00`).toISOString(),
    });
  } else if (shortfall < -0.01) {
    await createTransaction({
      account_id: input.fromAccountId,
      type: "adjustment",
      category: "other",
      direction: "in",
      amount: Math.abs(shortfall),
      description: `Settlement surplus for #${ref}`,
      reference_type: "settlement",
      reference_id: null,
      transaction_date: new Date(`${input.settlementDate}T12:00:00`).toISOString(),
    });
  }

  // 4. Mark shipments + per-order received amount (pro-rata by expected)
  const totalExpected = input.expectedAmount || 1;
  const { data: shipments } = await supabase
    .from("courier_shipments")
    .select("id, order_id, cod_amount_expected, actual_delivery_charge, actual_cod_charge")
    .in("id", input.shipmentIds);

  for (const s of shipments ?? []) {
    const net = Math.max(
      0,
      Number(s.cod_amount_expected ?? 0) -
        Number(s.actual_delivery_charge ?? 0) -
        Number(s.actual_cod_charge ?? 0)
    );
    const share = +(input.amountReceived * (net / totalExpected)).toFixed(2);
    await supabase
      .from("courier_shipments")
      .update({
        cod_settlement_date: input.settlementDate,
        cod_settlement_batch_id: batchId,
        cod_amount_received: share,
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id);

    // Update per-order P&L finalization
    await supabase
      .from("order_financials")
      .update({
        cod_amount_received: share,
        finalization_status: "settled",
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: input.notes ?? null,
      })
      .eq("order_id", s.order_id);
  }

  return batchId;
}

export function findDefaultAccount(accounts: CashAccount[], type: string): CashAccount | undefined {
  return accounts.find((a) => a.type === (type as CashAccount["type"]) && a.is_active);
}
