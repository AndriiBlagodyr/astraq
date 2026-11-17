"use client";

import { ThemeProvider, ToastProvider, TooltipProvider } from "@astraq/ui";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        {/* Toasts: undo for watchlist removals and deletes, action failures. */}
        <ToastProvider>{children}</ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
