/**
 * Tailwind config for email templates.
 *
 * Email clients don't support CSS variables, so we duplicate the theme
 * colors from globals.css as static hex values. Keep these in sync when
 * the app theme changes.
 */
export const emailTailwindConfig = {
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#0d0c22",
        card: "#ffffff",
        "card-foreground": "#0d0c22",
        primary: "#0d0c22",
        "primary-foreground": "#ffffff",
        secondary: "#f4f4f6",
        "secondary-foreground": "#0d0c22",
        muted: "#f4f4f6",
        "muted-foreground": "#4c4b58",
        border: "#e3e3e8",
        // The brand's red, used for the accent rule and emphasis.
        accent: "#ff0047",
      },
    },
  },
} as const;
