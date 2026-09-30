"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function ResolvedFeedbackCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getFeedbackOverview.queryOptions(),
  );

  return matchQueryStatus(query, {
    Loading: <ResolvedFeedbackCardLoading />,
    Errored: <ResolvedFeedbackCardError />,
    Empty: <ResolvedFeedbackCardLoading />,
    Success: ({ data }) => (
      <Card>
        <CardContent>
          <div className="text-2xl font-bold">{data.resolved}</div>
          <p className="mb-4 text-xs text-muted-foreground">
            Resolved feedback
          </p>

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-xs text-muted-foreground">Archived</span>
            <span className="text-sm font-semibold">{data.archived}</span>
          </div>
        </CardContent>
      </Card>
    ),
  });
}

function ResolvedFeedbackCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <p className="mb-4 text-xs text-muted-foreground">Resolved feedback</p>

        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground">Archived</span>
          <Skeleton className="h-5 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResolvedFeedbackCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
