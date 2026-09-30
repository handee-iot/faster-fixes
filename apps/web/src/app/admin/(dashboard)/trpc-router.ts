import { adminProcedure, router } from "@/server/trpc/trpc";
import { getBillingMetrics } from "./_services/get-billing-metrics";
import { getFeedbackOverview } from "./_services/get-feedback-overview";
import { getMonthlyStats } from "./_services/get-monthly-stats";
import { GetMonthlyStatsSchema } from "./_services/get-monthly-stats.schema";
import { getCollectedRevenue } from "./_services/get-collected-revenue";
import { getUsageOverview } from "./_services/get-usage-overview";

// The admin role check stays on `adminProcedure`: it is answerable from the
// context alone, so no dashboard service repeats it.
export const dashboardRouter = router({
  getUsageOverview: adminProcedure.query(() =>
    getUsageOverview({ now: new Date() }),
  ),
  getBillingMetrics: adminProcedure.query(() =>
    getBillingMetrics({ now: new Date() }),
  ),
  getCollectedRevenue: adminProcedure.query(() =>
    getCollectedRevenue({ now: new Date() }),
  ),
  getFeedbackOverview: adminProcedure.query(() =>
    getFeedbackOverview({ now: new Date() }),
  ),
  getMonthlyStats: adminProcedure
    .input(GetMonthlyStatsSchema)
    .query(({ input }) => getMonthlyStats({ from: input.from, to: input.to })),
});
