"use client";

import { buildScriptEmbedSnippet } from "@/app/_domains/project/_helpers/install-snippets";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { getErrorMessage } from "@/utils/error/get-error-message";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { CopyButton } from "@workspace/ui/components/copy-button";
import { Skeleton } from "@workspace/ui/components/skeleton";

type EmbedSnippetProps = {
  projectId: string;
};

export function EmbedSnippet({ projectId }: EmbedSnippetProps) {
  const trpc = useTRPC();
  const projectQuery = useQuery(
    trpc.authenticated.projects.get.queryOptions({ projectId }),
  );

  return matchQueryStatus(projectQuery, {
    Loading: (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    ),
    // The snippet is the point of the card, and a placeholder Project ID would
    // be copied as if it were real, so the failure replaces the whole card.
    Errored: (error) => (
      <Alert variant="destructive">
        <AlertTitle>Failed to load the embed snippet</AlertTitle>
        <AlertDescription>{getErrorMessage(error)}</AlertDescription>
      </Alert>
    ),
    // The service throws when the Project is missing, so this branch only
    // narrows the loaded data for the snippet below.
    Empty: (
      <p className="text-sm text-muted-foreground">
        This project is unavailable.
      </p>
    ),
    Success: ({ data: project }) => {
      const snippet = buildScriptEmbedSnippet(project.publicId);

      return (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Paste this snippet into your site, before the closing body tag. It
            loads the feedback widget and connects it to this project.
          </p>

          <div className="relative rounded-md border bg-muted p-3">
            <pre className="pr-10 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
              <code>{snippet}</code>
            </pre>
            <CopyButton
              content={snippet}
              variant="ghost"
              size="icon-xs"
              className="absolute top-2 right-2"
            />
          </div>
        </div>
      );
    },
  });
}
