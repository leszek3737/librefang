import { queryOptions, useQuery } from "@tanstack/react-query";
import { listProviders, getStatus } from "../../api";
import { providerKeys, runtimeKeys } from "./keys";

export const providersQueryOptions = () =>
  queryOptions({
    queryKey: providerKeys.list(),
    queryFn: listProviders,
    staleTime: 60_000,
  });

export const statusQueryOptions = () =>
  queryOptions({
    queryKey: runtimeKeys.status(),
    queryFn: getStatus,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

export function useProviders() {
  return useQuery(providersQueryOptions());
}

export function useProviderStatus() {
  return useQuery(statusQueryOptions());
}
