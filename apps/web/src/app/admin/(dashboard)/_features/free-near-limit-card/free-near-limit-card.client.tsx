"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function FreeNearLimitCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getActivationOverview.queryOptions(),
  );

  return matchQueryStatus(query, {
    Loading: <FreeNearLimitCardLoading />,
    Errored: <FreeNearLimitCardError />,
    Empty: <FreeNearLimitCardLoading />,
    Success: ({ data }) => {
      const { count, threshold, limit } = data.freeNearLimit;

      return (
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{count}</div>
            <p className="text-xs text-muted-foreground">
              Free organizations near the Feedback limit
            </p>
            <p className="text-xs text-muted-foreground">
              At least {threshold} of {limit} Feedback
            </p>
          </CardContent>
        </Card>
      );
    },
  });
}

function FreeNearLimitCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <p className="text-xs text-muted-foreground">
          Free organizations near the Feedback limit
        </p>
        <Skeleton className="mt-1 h-4 w-32" />
      </CardContent>
    </Card>
  );
}

function FreeNearLimitCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
