import { DashboardPageContent } from "@/app/_components/dashboard/dashboard-page-content";
import { DashboardRow } from "./_components/dashboard-row";
import { ActivationFunnelCard } from "./_features/activation-funnel-card/activation-funnel-card.client";
import { AdoptionCard } from "./_features/adoption-card/adoption-card.client";
import { FreeNearLimitCard } from "./_features/free-near-limit-card/free-near-limit-card.client";
import { EngagedOrganizationsCard } from "./_features/engaged-organizations-card/engaged-organizations-card.client";
import { ChurnCard } from "./_features/churn-card/churn-card.client";
import { FeedbackReceivedCard } from "./_features/feedback-received-card/feedback-received-card.client";
import { CollectedRevenueCard } from "./_features/collected-revenue-card/collected-revenue-card.client";
import { MrrCard } from "./_features/mrr-card/mrr-card.client";
import { PendingFeedbackCard } from "./_features/pending-feedback-card/pending-feedback-card.client";
import { PayingOrganizationsCard } from "./_features/paying-organizations-card/paying-organizations-card.client";
import { ResolvedFeedbackCard } from "./_features/resolved-feedback-card/resolved-feedback-card.client";
import { SignupsCard } from "./_features/signups-card/signups-card.client";
import { MonthlyGrowthChart } from "./_features/monthly-growth-chart/monthly-growth-chart.client";

export default async function AdminDashboardPage() {
  return (
    <DashboardPageContent
      breadcrumbs={[{ label: "Dashboard", link: "/admin" }]}
    >
      <div className="space-y-6">
        <DashboardRow label="Revenue">
          <MrrCard />
          <CollectedRevenueCard />
          <PayingOrganizationsCard />
          <ChurnCard />
        </DashboardRow>

        <DashboardRow label="Orgs">
          <SignupsCard />
          <EngagedOrganizationsCard />
          <ActivationFunnelCard />
          <AdoptionCard />
          <FreeNearLimitCard />
        </DashboardRow>

        <DashboardRow label="Feedback">
          <FeedbackReceivedCard />
          <PendingFeedbackCard />
          <ResolvedFeedbackCard />
        </DashboardRow>

        <MonthlyGrowthChart />
      </div>
    </DashboardPageContent>
  );
}
