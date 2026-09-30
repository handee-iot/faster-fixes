import { stripeApi } from "@/server/stripe";

// All-time figures kept until the collected revenue card (#240) replaces them.
export async function getLifetimeRevenue() {
  // Gross = money charged to customers; net = what lands after Stripe fees and
  // refunds. Both must be gated to revenue-bearing transaction types: a payout
  // to the bank is itself a balance transaction with negative `net`, so summing
  // every type cancelled each charge against its later payout and net collapsed
  // to roughly the un-paid-out (recent) balance. `txn.net` already nets the
  // Stripe fee out of a charge, so summing net over these types yields true net
  // revenue without double-counting fees. `limit: 100` is the page size; the
  // `for await` auto-paginates the full history rather than capping at 100.
  const grossTypes = new Set(["charge", "payment"]);
  const netRevenueTypes = new Set([
    "charge",
    "payment",
    "refund",
    "payment_refund",
    "payment_failure_refund",
    "adjustment", // disputes / chargebacks
  ]);
  let grossRevenueCents = 0;
  let netRevenueCents = 0;
  for await (const txn of stripeApi.balanceTransactions.list({ limit: 100 })) {
    if (grossTypes.has(txn.type)) {
      grossRevenueCents += txn.amount;
    }
    if (netRevenueTypes.has(txn.type)) {
      netRevenueCents += txn.net;
    }
  }

  return {
    grossRevenue: grossRevenueCents / 100,
    netRevenue: netRevenueCents / 100,
  };
}

export type GetLifetimeRevenueOutput = Awaited<
  ReturnType<typeof getLifetimeRevenue>
>;
