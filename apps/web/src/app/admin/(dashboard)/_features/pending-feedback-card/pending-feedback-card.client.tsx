"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function PendingFeedbackCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getFeedbackOverview.queryOptions(),
  );

  return matchQueryStatus(query, {
    Loading: <PendingFeedbackCardLoading />,
    Errored: <PendingFeedbackCardError />,
    Empty: <PendingFeedbackCardLoading />,
    Success: ({ data }) => (
      <Card>
        <CardContent>
          <div className="text-2xl font-bold">{data.pending}</div>
          <p className="text-xs text-muted-foreground">Pending feedback</p>
        </CardContent>
      </Card>
    ),
  });
}

function PendingFeedbackCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <p className="text-xs text-muted-foreground">Pending feedback</p>
      </CardContent>
    </Card>
  );
}

function PendingFeedbackCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
