import { queryOptions, useQuery } from "@tanstack/react-query";
import { loadDashboardSnapshot, getVersionInfo } from "../../api";
import { overviewKeys } from "./keys";

export const dashboardSnapshotQueryOptions = () =>
  queryOptions({
    queryKey: overviewKeys.snapshot(),
    queryFn: loadDashboardSnapshot,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

export const versionInfoQueryOptions = () =>
  queryOptions({
    queryKey: overviewKeys.version(),
    queryFn: getVersionInfo,
    staleTime: Infinity,
  });

export function useDashboardSnapshot() {
  return useQuery(dashboardSnapshotQueryOptions());
}

export function useVersionInfo() {
  return useQuery(versionInfoQueryOptions());
}
