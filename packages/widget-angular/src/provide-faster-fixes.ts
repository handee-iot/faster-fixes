import {
  InjectionToken,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from "@angular/core";
import type { EnvironmentProviders } from "@angular/core";
import { init } from "@fasterfixes/widget";
import type { WidgetOptions } from "@fasterfixes/widget";
import { FEEDBACK_SLOT } from "./feedback-slot.js";

export const FASTER_FIXES_OPTIONS = new InjectionToken<WidgetOptions>(
  "fasterfixes.options",
);

/**
 * Environment providers that mount the Widget. The options are the Widget's
 * own, forwarded unchanged to `init`, and read once for the lifetime of the
 * application.
 */
export function provideFasterFixes(
  options: WidgetOptions,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FASTER_FIXES_OPTIONS, useValue: options },
    provideEnvironmentInitializer(() => {
      inject(FEEDBACK_SLOT).attach(init(options));
    }),
  ]);
}
