import { DashboardPageContent } from "@/app/_components/dashboard/dashboard-page-content";
import { DashboardRow } from "./_components/dashboard-row";
import { EngagedOrganizationsCard } from "./_features/engaged-organizations-card/engaged-organizations-card.client";
import { ChurnCard } from "./_features/churn-card/churn-card.client";
import { FeedbackOverviewCard } from "./_features/feedback-overview-card/feedback-overview-card.client";
import { CollectedRevenueCard } from "./_features/collected-revenue-card/collected-revenue-card.client";
import { MrrCard } from "./_features/mrr-card/mrr-card.client";
import { PayingOrganizationsCard } from "./_features/paying-organizations-card/paying-organizations-card.client";
import { SignupsCard } from "./_features/signups-card/signups-card.client";
import { SubscriptionsChart } from "./_features/subscriptions-chart/subscriptions-chart.client";

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
        </DashboardRow>

        <DashboardRow label="Feedback">
          <FeedbackOverviewCard />
        </DashboardRow>

        <SubscriptionsChart />
      </div>
    </DashboardPageContent>
  );
}
