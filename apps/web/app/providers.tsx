"use client";

import { ThemeProvider, ToastProvider, TooltipProvider } from "@astraq/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <TooltipProvider>
        {/* Toasts: undo for watchlist removals and deletes, action failures. */}
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
