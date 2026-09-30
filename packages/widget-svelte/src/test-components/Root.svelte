<script lang="ts">
  import type { WidgetOptions } from "@fasterfixes/widget";
  import type { GetFeedbackReturn } from "../get-feedback.js";
  import { initFasterFixes } from "../init-faster-fixes.js";
  import Probe from "./Probe.svelte";

  let {
    options,
    probes = 1,
    onFeedback,
  }: {
    options: WidgetOptions;
    probes?: number;
    onFeedback?: (feedback: GetFeedbackReturn) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  initFasterFixes(options);
</script>

{#each Array.from({ length: probes }) as _, index (index)}
  <Probe {onFeedback} />
{/each}
