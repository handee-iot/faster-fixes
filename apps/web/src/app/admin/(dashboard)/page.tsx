import { DashboardPageContent } from "@/app/_components/dashboard/dashboard-page-content";
import { DashboardRow } from "./_components/dashboard-row";
import { ActiveSubscriptionsCard } from "./_features/active-subscriptions-card/active-subscriptions-card.client";
import { FeedbackOverviewCard } from "./_features/feedback-overview-card/feedback-overview-card.client";
import { MrrCard } from "./_features/mrr-card/mrr-card.client";
import { SubscriptionsChart } from "./_features/subscriptions-chart/subscriptions-chart.client";
import { UsersOverviewCard } from "./_features/users-overview-card/users-overview-card.client";

export default async function AdminDashboardPage() {
  return (
    <DashboardPageContent
      breadcrumbs={[{ label: "Dashboard", link: "/admin" }]}
    >
      <div className="space-y-6">
        <DashboardRow label="Revenue">
          <MrrCard />
          <ActiveSubscriptionsCard />
        </DashboardRow>

        <DashboardRow label="Orgs">
          <UsersOverviewCard />
        </DashboardRow>

        <DashboardRow label="Feedback">
          <FeedbackOverviewCard />
        </DashboardRow>

        <SubscriptionsChart />
      </div>
    </DashboardPageContent>
  );
}
