// BrandOMS Fraud Engine
// Heuristic scoring 0-100 with explainable reasons.

import type { Customer, Order, PaymentMethod } from "./mock-data";

export type FraudInput = {
  phone: string;
  orderHour?: number; // 0-23
  orderValue?: number;
  paymentMethod?: PaymentMethod;
};

export type FraudResult = {
  score: number; // 0-100
  reasons: string[];
  label: "SAFE" | "MODERATE RISK" | "HIGH RISK" | "BLACKLISTED";
};

export function calculateFraudScore(
  input: FraudInput,
  customer: Customer | null,
  history: Order[] = [],
): FraudResult {
  let score = 0;
  const reasons: string[] = [];

  if (customer?.isBlacklisted) {
    return {
      score: 100,
      reasons: ["Customer is blacklisted by admin"],
      label: "BLACKLISTED",
    };
  }

  const cancelled = customer?.cancelled ?? history.filter((o) => o.status === "Cancelled").length;
  if (cancelled > 2) {
    score += 30;
    reasons.push(`${cancelled} previous cancellations`);
  }

  const accountAge = customer?.accountAgeDays ?? 0;
  if (customer && accountAge < 7) {
    score += 25;
    reasons.push(`Phone registered ${accountAge} day(s) ago`);
  }

  // Multiple names with same phone
  const distinctNames = new Set(history.map((o) => o.customerName));
  if (distinctNames.size >= 3) {
    score += 20;
    reasons.push("Same phone used with 3+ different names");
  }

  if (input.orderHour !== undefined && (input.orderHour >= 0 && input.orderHour < 5)) {
    score += 15;
    reasons.push("Order placed between 12am–5am");
  }

  if (input.paymentMethod === "COD" && (input.orderValue ?? 0) > 3000) {
    score += 15;
    reasons.push("COD order over ৳3000");
  }

  const totalOrders = customer?.totalOrders ?? history.length;
  if (totalOrders === 0) {
    score += 10;
    reasons.push("First-ever order");
  }

  const delivered = customer?.delivered ?? history.filter((o) => o.status === "Delivered").length;
  if (delivered >= 5) {
    score -= 20;
    reasons.push("5+ successful deliveries (trust boost)");
  }

  if (accountAge > 180) {
    score -= 10;
    reasons.push("Account age > 6 months (trust boost)");
  }

  score = Math.max(0, Math.min(100, score));

  let label: FraudResult["label"];
  if (score > 85) label = "BLACKLISTED";
  else if (score >= 70) label = "HIGH RISK";
  else if (score >= 30) label = "MODERATE RISK";
  else label = "SAFE";

  return { score, reasons, label };
}
