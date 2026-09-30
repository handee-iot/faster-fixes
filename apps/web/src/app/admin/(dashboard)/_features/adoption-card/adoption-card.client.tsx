"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

const ROW_LABELS = {
  tracker: "Tracker, of paying",
  slack: "Slack, of paying",
  agentToken: "Agent token, of engaged",
} as const;

const ROW_KEYS = ["tracker", "slack", "agentToken"] as const;

const formatShare = (count: number, base: number) =>
  base > 0 ? `${Math.round((count / base) * 100)}%` : "N/A";

export function AdoptionCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getActivationOverview.queryOptions(),
  );

  return matchQueryStatus(query, {
    Loading: <AdoptionCardLoading />,
    Errored: <AdoptionCardError />,
    Empty: <AdoptionCardLoading />,
    Success: ({ data }) => (
      <Card>
        <CardContent>
          <p className="text-xs text-muted-foreground">Adoption</p>
          <div className="mt-3 space-y-2">
            {ROW_KEYS.map((key) => {
              const { count, base } = data.adoption[key];
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {ROW_LABELS[key]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatShare(count, base)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({count} of {base})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    ),
  });
}

function AdoptionCardLoading() {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">Adoption</p>
        <div className="mt-3 space-y-2">
          {ROW_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {ROW_LABELS[key]}
              </span>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdoptionCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
