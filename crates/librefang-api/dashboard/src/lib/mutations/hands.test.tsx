import { describe, it, expect, vi } from "vitest";
import * as http from "../http/client";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useActivateHand,
  useDeactivateHand,
  usePauseHand,
  useResumeHand,
  useUninstallHand,
  useSetHandSecret,
  useUpdateHandSettings,
  useSendHandMessage,
} from "./hands";
import { agentKeys, handKeys, overviewKeys } from "../queries/keys";

vi.mock("../http/client", () => ({
  activateHand: vi.fn(() => Promise.resolve({})),
  deactivateHand: vi.fn(() => Promise.resolve({})),
  pauseHand: vi.fn(() => Promise.resolve({})),
  resumeHand: vi.fn(() => Promise.resolve({})),
  uninstallHand: vi.fn(() => Promise.resolve({})),
  setHandSecret: vi.fn(() => Promise.resolve({})),
  updateHandSettings: vi.fn(() => Promise.resolve({})),
  sendHandMessage: vi.fn(() => Promise.resolve({})),
}));

describe("useActivateHand", () => {
  it("invalidates handKeys.all, agentKeys.all, and overviewKeys.snapshot()", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useActivateHand(), { wrapper });

    await result.current.mutateAsync("hand-1");

    expect(spy).toHaveBeenCalledWith({
      queryKey: handKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: agentKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: overviewKeys.snapshot(),
    });
  });
});

describe("useDeactivateHand", () => {
  it("invalidates handKeys.all, agentKeys.all, and overviewKeys.snapshot()", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeactivateHand(), { wrapper });

    await result.current.mutateAsync("hand-1");

    expect(spy).toHaveBeenCalledWith({
      queryKey: handKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: agentKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: overviewKeys.snapshot(),
    });
  });
});

describe("usePauseHand", () => {
  it("invalidates handKeys.all, agentKeys.all, and overviewKeys.snapshot()", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePauseHand(), { wrapper });

    await result.current.mutateAsync("hand-1");

    expect(spy).toHaveBeenCalledWith({
      queryKey: handKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: agentKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: overviewKeys.snapshot(),
    });
  });
});

describe("useResumeHand", () => {
  it("invalidates handKeys.all, agentKeys.all, and overviewKeys.snapshot()", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useResumeHand(), { wrapper });

    await result.current.mutateAsync("hand-1");

    expect(spy).toHaveBeenCalledWith({
      queryKey: handKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: agentKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: overviewKeys.snapshot(),
    });
  });
});

describe("useUninstallHand", () => {
  it("invalidates handKeys.all, agentKeys.all, and overviewKeys.snapshot()", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUninstallHand(), { wrapper });

    await result.current.mutateAsync("hand-1");

    expect(spy).toHaveBeenCalledWith({
      queryKey: handKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: agentKeys.all,
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: overviewKeys.snapshot(),
    });
  });
});

describe.each([
  { name: "useSetHandSecret", hook: useSetHandSecret, args: { handId: "h1", key: "k", value: "v" } },
  { name: "useUpdateHandSettings", hook: useUpdateHandSettings, args: { handId: "h1", config: { foo: 1 } } },
])("$name", ({ name, hook, args }) => {
  it("invalidates handKeys.all", async () => {
    vi.mocked(http[name === "useSetHandSecret" ? "setHandSecret" : "updateHandSettings"]).mockResolvedValue({} as any);
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => hook(), { wrapper });

    await result.current.mutateAsync(args as any);

    expect(spy).toHaveBeenCalledWith({
      queryKey: handKeys.all,
    });
  });
});

describe("useSendHandMessage", () => {
  it("does not invalidate queries and calls mutationFn with correct args", async () => {
    vi.mocked(http.sendHandMessage).mockResolvedValue({} as any);
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSendHandMessage(), { wrapper });

    await result.current.mutateAsync({ instanceId: "inst-1", message: "hello" });

    expect(spy).not.toHaveBeenCalled();
    expect(http.sendHandMessage).toHaveBeenCalledWith("inst-1", "hello");
  });
});
