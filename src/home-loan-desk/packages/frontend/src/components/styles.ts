/** Shared class lists for buttons and form fields, built on the theme tokens. */
export const buttonStyles = {
  primary:
    'inline-flex h-9 items-center justify-center gap-200 whitespace-nowrap rounded-lg bg-primary px-400 text-300 font-medium text-primary-foreground shadow-[0_1px_2px_rgb(16_24_40/0.1)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
  secondary:
    'inline-flex h-9 items-center justify-center gap-200 whitespace-nowrap rounded-lg border border-input bg-secondary px-300 text-300 font-medium text-secondary-foreground shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  input:
    'h-9 w-full rounded-lg border border-input bg-card px-300 py-0 text-300 text-foreground transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-60',
  textarea:
    'min-h-20 w-full resize-y rounded-lg border border-input bg-card px-300 py-200 text-300 text-foreground transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-60',
  select:
    'h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card py-0 pr-800 pl-300 font-[inherit] text-300 text-foreground shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-colors hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60',
} as const;
