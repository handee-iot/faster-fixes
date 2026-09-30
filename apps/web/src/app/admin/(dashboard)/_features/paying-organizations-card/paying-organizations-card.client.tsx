"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

const getShare = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0;

export function PayingOrganizationsCard() {
  const trpc = useTRPC();
  const query = useQuery(trpc.admin.dashboard.getBillingMetrics.queryOptions());

  return matchQueryStatus(query, {
    Loading: <PayingOrganizationsCardLoading />,
    Errored: <PayingOrganizationsCardError />,
    Empty: <PayingOrganizationsCardLoading />,
    Success: ({ data }) => {
      const { total, pro, agency, pastDue } = data.payingOrganizations;
      const delta = total - data.previous.payingOrganizationCount;

      return (
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              Paying organizations
            </p>
            <p
              className={cn(
                "text-xs font-medium",
                delta > 0 && "text-success",
                delta < 0 && "text-destructive",
                delta === 0 && "text-muted-foreground",
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta} vs 30 days ago
            </p>
            {pastDue > 0 && (
              <p className="text-xs text-destructive">{pastDue} past due</p>
            )}

            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pro</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{pro}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getShare(pro, total)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Agency</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{agency}</span>
                  <span className="text-xs text-muted-foreground">
                    ({getShare(agency, total)}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    },
  });
}

function PayingOrganizationsCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <p className="text-xs text-muted-foreground">Paying organizations</p>

        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pro</span>
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Agency</span>
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PayingOrganizationsCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
