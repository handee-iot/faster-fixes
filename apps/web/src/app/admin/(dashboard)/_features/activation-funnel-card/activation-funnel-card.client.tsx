"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

const STEP_LABELS = [
  "Created",
  "With a Project",
  "Received Feedback",
  "Paying",
];

const getShare = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0;

export function ActivationFunnelCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getActivationOverview.queryOptions(),
  );

  return matchQueryStatus(query, {
    Loading: <ActivationFunnelCardLoading />,
    Errored: <ActivationFunnelCardError />,
    Empty: <ActivationFunnelCardLoading />,
    Success: ({ data }) => {
      const { created, withProject, withFeedback, paying } = data.funnel;
      const counts = [created, withProject, withFeedback, paying];

      return (
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Funnel, organizations created in the last 90 days
            </p>
            <div className="mt-3 space-y-2">
              {STEP_LABELS.map((label, index) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {counts[index]}
                    </span>
                    {index > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({getShare(counts[index] ?? 0, created)}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    },
  });
}

function ActivationFunnelCardLoading() {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Funnel, organizations created in the last 90 days
        </p>
        <div className="mt-3 space-y-2">
          {STEP_LABELS.map((label) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivationFunnelCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
