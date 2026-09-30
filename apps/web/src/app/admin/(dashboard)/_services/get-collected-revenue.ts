import { stripeApi } from "@/server/stripe";
import type Stripe from "stripe";

const DAY_SECONDS = 24 * 60 * 60;
const WINDOW_SECONDS = 30 * DAY_SECONDS;
const BILLING_CURRENCY = "eur";

// Money in and out of a customer payment. Their `fee` is the processing fee.
const PAYMENT_TYPES = new Set<Stripe.BalanceTransaction.Type>([
  "charge",
  "payment",
  "refund",
  "payment_refund",
  "payment_failure_refund",
]);

// Stripe fees billed as their own transactions (Billing, Tax, currency
// conversion), not deducted from a charge. Their `amount` is negative.
const STRIPE_FEE_TYPES = new Set<Stripe.BalanceTransaction.Type>([
  "stripe_fee",
  "tax_fee",
  "stripe_fx_fee",
]);

type VatShareResolver = (paymentIntentId: string) => Promise<number>;

// Share of a payment that is VAT, read from the Invoice it paid. The default
// tax rate is exclusive, so the collected amount includes the tax on top of
// the price. A payment without an Invoice carries no VAT we know of.
function createVatShareResolver(stripe: Stripe): VatShareResolver {
  const cache = new Map<string, Promise<number>>();
  return (paymentIntentId) => {
    let pending = cache.get(paymentIntentId);
    if (!pending) {
      pending = stripe.invoicePayments
        .list({
          payment: { type: "payment_intent", payment_intent: paymentIntentId },
          expand: ["data.invoice"],
          limit: 1,
        })
        .then(({ data }) => {
          const invoice = data[0]?.invoice;
          if (typeof invoice !== "object" || invoice.deleted) return 0;
          if (!invoice.total) return 0;
          const taxCents = (invoice.total_taxes ?? []).reduce(
            (sum, tax) => sum + tax.amount,
            0,
          );
          return taxCents / invoice.total;
        });
      cache.set(paymentIntentId, pending);
    }
    return pending;
  };
}

function getPaymentIntentId(transaction: Stripe.BalanceTransaction) {
  const source = transaction.source;
  if (typeof source !== "object" || source == null) return null;
  if (!("payment_intent" in source)) return null;
  const paymentIntent = source.payment_intent;
  if (paymentIntent == null) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

// Net cents one transaction adds to collected revenue: charges minus refunds,
// excluding VAT, minus processing and separately billed Stripe fees.
async function getCollectedNetCents(
  transaction: Stripe.BalanceTransaction,
  resolveVatShare: VatShareResolver,
) {
  if (STRIPE_FEE_TYPES.has(transaction.type)) return transaction.amount;
  if (!PAYMENT_TYPES.has(transaction.type)) return 0;

  const paymentIntentId = getPaymentIntentId(transaction);
  const vatShare = paymentIntentId ? await resolveVatShare(paymentIntentId) : 0;
  return transaction.amount * (1 - vatShare) - transaction.fee;
}

// Collected net revenue excluding VAT over the last 30 days, and over the 30
// days before. Each window includes its start and excludes its end.
export async function getCollectedRevenue(
  { now }: { now: Date },
  stripe: Stripe = stripeApi,
) {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const currentStart = nowSeconds - WINDOW_SECONDS;
  const previousStart = currentStart - WINDOW_SECONDS;
  const resolveVatShare = createVatShareResolver(stripe);

  let currentCents = 0;
  let previousCents = 0;
  // Amounts in another currency are counted, never summed with EUR.
  let nonEurTransactionCount = 0;

  for await (const transaction of stripe.balanceTransactions.list({
    created: { gte: previousStart, lt: nowSeconds },
    expand: ["data.source"],
    limit: 100,
  })) {
    if (transaction.created < previousStart) continue;
    if (transaction.created >= nowSeconds) continue;

    const isCounted =
      PAYMENT_TYPES.has(transaction.type) ||
      STRIPE_FEE_TYPES.has(transaction.type);
    if (!isCounted) continue;
    if (transaction.currency !== BILLING_CURRENCY) {
      nonEurTransactionCount += 1;
      continue;
    }

    const cents = await getCollectedNetCents(transaction, resolveVatShare);
    if (transaction.created >= currentStart) {
      currentCents += cents;
    } else {
      previousCents += cents;
    }
  }

  return {
    current: Math.round(currentCents) / 100,
    previous: Math.round(previousCents) / 100,
    nonEurTransactionCount,
  };
}

export type GetCollectedRevenueOutput = Awaited<
  ReturnType<typeof getCollectedRevenue>
>;
