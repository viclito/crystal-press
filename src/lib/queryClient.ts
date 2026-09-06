import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,     // 5 minutes fresh window for retail items
        gcTime: 30 * 60 * 1000,        // 30 minutes in garbage collection cache
        refetchOnWindowFocus: false,   // Prevent jitter during rapid billing
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });
}
