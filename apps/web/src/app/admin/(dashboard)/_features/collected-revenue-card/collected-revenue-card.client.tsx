"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

const formatEur = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    value,
  );

const formatSignedEur = (value: number) =>
  `${value > 0 ? "+" : ""}${formatEur(value)}`;

export function CollectedRevenueCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getCollectedRevenue.queryOptions(),
  );

  return matchQueryStatus(query, {
    Loading: <CollectedRevenueCardLoading />,
    Errored: <CollectedRevenueCardError />,
    Empty: <CollectedRevenueCardLoading />,
    Success: ({ data }) => {
      const delta = data.current - data.previous;

      return (
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{formatEur(data.current)}</div>
            <p className="text-xs text-muted-foreground">
              Collected in the last 30 days, net, excluding VAT
            </p>
            <p
              className={cn(
                "text-xs font-medium",
                delta > 0 && "text-success",
                delta < 0 && "text-destructive",
                delta === 0 && "text-muted-foreground",
              )}
            >
              {formatSignedEur(delta)} vs previous 30 days
            </p>
            {data.nonEurTransactionCount > 0 && (
              <p className="mt-2 text-xs text-destructive">
                {data.nonEurTransactionCount}{" "}
                {data.nonEurTransactionCount === 1
                  ? "transaction"
                  : "transactions"}{" "}
                in a currency other than EUR, not counted
              </p>
            )}
          </CardContent>
        </Card>
      );
    },
  });
}

function CollectedRevenueCardLoading() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <p className="text-xs text-muted-foreground">
          Collected in the last 30 days, net, excluding VAT
        </p>
        <Skeleton className="mt-1 h-4 w-20" />
      </CardContent>
    </Card>
  );
}

function CollectedRevenueCardError() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <p className="text-sm text-destructive">Failed to load statistics</p>
      </CardContent>
    </Card>
  );
}
