/** Shared class lists for buttons and form fields, built on the theme tokens. */
export const buttonStyles = {
  primary:
    'inline-flex items-center justify-center gap-200 rounded-md bg-primary px-300 py-200 text-300 font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center gap-200 rounded-md border border-border bg-secondary px-300 py-200 text-300 font-medium text-secondary-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  input:
    'w-full rounded-md border border-input bg-background px-300 py-200 text-300 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const;
