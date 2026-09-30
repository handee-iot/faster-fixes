import { adminProcedure, router } from "@/server/trpc/trpc";
import { getBillingMetrics } from "./_services/get-billing-metrics";
import { getFeedbackOverview } from "./_services/get-feedback-overview";
import { getMonthlyStats } from "./_services/get-monthly-stats";
import { GetMonthlyStatsSchema } from "./_services/get-monthly-stats.schema";
import { getLifetimeRevenue } from "./_services/get-lifetime-revenue";
import { getUsersOverview } from "./_services/get-users-overview";

// The admin role check stays on `adminProcedure`: it is answerable from the
// context alone, so no dashboard service repeats it.
export const dashboardRouter = router({
  getUsersOverview: adminProcedure.query(() => getUsersOverview()),
  getBillingMetrics: adminProcedure.query(() =>
    getBillingMetrics({ now: new Date() }),
  ),
  getLifetimeRevenue: adminProcedure.query(() => getLifetimeRevenue()),
  getFeedbackOverview: adminProcedure.query(() => getFeedbackOverview()),
  getMonthlyStats: adminProcedure
    .input(GetMonthlyStatsSchema)
    .query(({ input }) => getMonthlyStats({ from: input.from, to: input.to })),
});
