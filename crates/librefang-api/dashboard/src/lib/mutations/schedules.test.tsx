import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import * as http from "../http/client";
import { useCreateSchedule, useUpdateSchedule, useDeleteSchedule, useUpdateTrigger, useDeleteTrigger } from "./schedules";
import { cronKeys, scheduleKeys, triggerKeys } from "../queries/keys";

vi.mock("../http/client", () => ({
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  updateTrigger: vi.fn(),
  deleteTrigger: vi.fn(),
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  };
}

describe("useCreateSchedule", () => {
  beforeEach(() => {
    vi.mocked(http.createSchedule).mockResolvedValue({} as any);
  });

  it("invalidates scheduleKeys.all and cronKeys.all", async () => {
    const { qc, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCreateSchedule(), { wrapper });

    result.current.mutate({ agent_id: "agent-1", cron: "0 * * * *" });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, {
      queryKey: scheduleKeys.all,
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, {
      queryKey: cronKeys.all,
    });
  });
});

describe("useUpdateSchedule", () => {
  beforeEach(() => {
    vi.mocked(http.updateSchedule).mockResolvedValue({} as any);
  });

  it("invalidates scheduleKeys.all and cronKeys.all", async () => {
    const { qc, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateSchedule(), { wrapper });

    result.current.mutate({ id: "sched-1", data: { enabled: false } });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, {
      queryKey: scheduleKeys.all,
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, {
      queryKey: cronKeys.all,
    });
  });
});

describe("useDeleteSchedule", () => {
  beforeEach(() => {
    vi.mocked(http.deleteSchedule).mockResolvedValue(undefined);
  });

  it("invalidates scheduleKeys.all and cronKeys.all", async () => {
    const { qc, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteSchedule(), { wrapper });

    result.current.mutate("sched-1");

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, {
      queryKey: scheduleKeys.all,
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, {
      queryKey: cronKeys.all,
    });
  });
});

describe("useUpdateTrigger", () => {
  beforeEach(() => {
    vi.mocked(http.updateTrigger).mockResolvedValue({} as any);
  });

  it("invalidates triggerKeys.all", async () => {
    const { qc, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateTrigger(), { wrapper });

    await result.current.mutateAsync({ id: "trig-1", data: { enabled: true } });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: triggerKeys.all,
    });
  });
});

describe("useDeleteTrigger", () => {
  beforeEach(() => {
    vi.mocked(http.deleteTrigger).mockResolvedValue({} as any);
  });

  it("invalidates triggerKeys.all", async () => {
    const { qc, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteTrigger(), { wrapper });

    await result.current.mutateAsync("trig-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: triggerKeys.all,
    });
  });
});
