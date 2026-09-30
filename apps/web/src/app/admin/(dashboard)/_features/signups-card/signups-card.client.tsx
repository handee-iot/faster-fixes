"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

export function SignupsCard() {
  const trpc = useTRPC();
  const query = useQuery(trpc.admin.dashboard.getUsageOverview.queryOptions());

  return matchQueryStatus(query, {
    Loading: <SignupsCardLoading />,
    Errored: <SignupsCardError />,
    Empty: <SignupsCardLoading />,
    Success: ({ data }) => {
      const { current, previous } = data.signups;
      const delta = current - previous;

      return (
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{current}</div>
            <p className="text-xs text-muted-foreground">
              Signups in the last 30 days
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
              {delta} vs previous 30 days
            </p>
          </CardContent>
        </Card>
      );
    },
  });
}

function SignupsCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <p className="text-xs text-muted-foreground">
          Signups in the last 30 days
        </p>
        <Skeleton className="mt-1 h-4 w-20" />
      </CardContent>
    </Card>
  );
}

function SignupsCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
