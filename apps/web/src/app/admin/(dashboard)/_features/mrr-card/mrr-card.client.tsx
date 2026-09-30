"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/utils/error/get-error-message";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { FigureUnavailable } from "../../_components/figure-unavailable";
import {
  HeadlineFigure,
  HeadlineFigureFrame,
  HeadlineFigureSkeleton,
} from "../../_components/headline-figure";

const LABEL = "MRR, excluding VAT";

const formatEur = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    value,
  );

const formatSignedEur = (value: number) =>
  `${value > 0 ? "+" : ""}${formatEur(value)}`;

export function MrrCard() {
  const trpc = useTRPC();
  const query = useQuery(trpc.admin.dashboard.getBillingMetrics.queryOptions());

  return matchQueryStatus(query, {
    Loading: <HeadlineFigureSkeleton label={LABEL} />,
    Errored: (error) => (
      <HeadlineFigureFrame label={LABEL}>
        <FigureUnavailable description={getErrorMessage(error)} />
      </HeadlineFigureFrame>
    ),
    Empty: (
      <HeadlineFigureFrame label={LABEL}>
        <FigureUnavailable description="No billing figures were returned." />
      </HeadlineFigureFrame>
    ),
    Success: ({ data }) => {
      // Rounded to the cent so float noise never shows as a tiny change.
      const delta = Math.round((data.mrr - data.previous.mrr) * 100) / 100;

      return (
        <HeadlineFigure
          label={LABEL}
          value={formatEur(data.mrr)}
          delta={delta}
          deltaLabel={formatSignedEur(delta)}
          comparison="vs 30 days ago"
          hint={`${formatEur(data.arr)} ARR`}
        >
          {data.unpricedItemCount > 0 && (
            <p className="text-xs text-destructive">
              {data.unpricedItemCount} subscription{" "}
              {data.unpricedItemCount === 1 ? "item" : "items"} without a flat
              EUR price, not counted
            </p>
          )}
        </HeadlineFigure>
      );
    },
  });
}
