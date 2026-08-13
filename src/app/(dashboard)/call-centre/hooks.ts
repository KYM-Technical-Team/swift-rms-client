'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ambulanceService,
  callCentreService,
  facilityService,
  readinessService,
} from '@/lib/api';
import type {
  Call,
  CallCommandRequest,
  CreateCallRequest,
  TriageDispatchRequest,
} from '@/types';

export const callKeys = {
  root: ['call-centre'] as const,
  calls: () => [...callKeys.root, 'calls'] as const,
  dashboard: () => [...callKeys.root, 'dashboard'] as const,
  call: (id?: string) => [...callKeys.root, 'call', id ?? 'none'] as const,
  events: (id?: string) => [...callKeys.call(id), 'events'] as const,
  ranking: (id?: string) => [...callKeys.call(id), 'ranking'] as const,
};

export const facilityKeys = {
  active: ['facilities', 'active'] as const,
  readiness: (id?: string) => ['facilities', id ?? 'none', 'readiness'] as const,
};

export const ambulanceKeys = {
  fleet: ['ambulances', 'live-fleet'] as const,
};

export type CallCommand = 'hold' | 'resume' | 'transfer' | 'conference' | 'notes' | 'complete';

/** Live call list. Polled so a second operator's actions show up without a manual refresh. */
export function useCalls() {
  return useQuery({
    queryKey: callKeys.calls(),
    queryFn: () => callCentreService.listCalls({ limit: 50 }),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}

export function useCallCentreDashboard() {
  return useQuery({
    queryKey: callKeys.dashboard(),
    queryFn: () => callCentreService.getDashboard(),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

/** Facilities change rarely — cache hard so the dispatch selects never flicker. */
export function useActiveFacilities() {
  return useQuery({
    queryKey: facilityKeys.active,
    queryFn: () => facilityService.list({ isActive: true, limit: 500 }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** The same live fleet used by the Ambulances workspace. */
export function useAmbulanceFleet() {
  return useQuery({
    queryKey: ambulanceKeys.fleet,
    queryFn: () => ambulanceService.list({ limit: 500 }),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
}

export function useCallEvents(callId?: string) {
  return useQuery({
    queryKey: callKeys.events(callId),
    queryFn: () => callCentreService.listEvents(callId!),
    enabled: Boolean(callId),
    refetchInterval: 20000,
  });
}

export function useAmbulanceRanking(callId?: string) {
  return useQuery({
    queryKey: callKeys.ranking(callId),
    queryFn: () => callCentreService.rankAmbulances(callId!),
    enabled: Boolean(callId),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useFacilityReadiness(facilityId?: string) {
  return useQuery({
    queryKey: facilityKeys.readiness(facilityId),
    queryFn: () => readinessService.getLatest(facilityId!),
    enabled: Boolean(facilityId),
    retry: false,
    staleTime: 60000,
  });
}

/** Only fetched when the operator opens the transfer control. */
export function useNemsOperators(enabled: boolean, excludeId?: string) {
  return useQuery({
    queryKey: [...callKeys.root, 'operators', excludeId ?? 'none'],
    queryFn: async () => {
      const operators = await callCentreService.listOperators();
      return operators.filter((item) => item.id !== excludeId);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

function useCallInvalidation() {
  const queryClient = useQueryClient();
  return (callId?: string) => {
    void queryClient.invalidateQueries({ queryKey: callKeys.calls() });
    void queryClient.invalidateQueries({ queryKey: callKeys.dashboard() });
    if (callId) void queryClient.invalidateQueries({ queryKey: callKeys.call(callId) });
  };
}

export function useLogCall() {
  const queryClient = useQueryClient();
  const invalidate = useCallInvalidation();
  return useMutation({
    mutationFn: (payload: CreateCallRequest) => callCentreService.logCall(payload),
    onSuccess: (created) => {
      // Seed the list so the new call is selectable before the refetch lands.
      queryClient.setQueryData<{ data: Call[] }>(callKeys.calls(), (current) =>
        current ? { ...current, data: [created, ...current.data] } : current);
      invalidate(created.id);
    },
  });
}

export function useCallCommand() {
  const queryClient = useQueryClient();
  const invalidate = useCallInvalidation();
  return useMutation({
    mutationFn: ({ callId, command, payload }: { callId: string; command: CallCommand; payload: CallCommandRequest }) =>
      callCentreService.command(callId, command, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<{ data: Call[] }>(callKeys.calls(), (current) =>
        current ? { ...current, data: current.data.map((call) => call.id === updated.id ? updated : call) } : current);
      invalidate(updated.id);
    },
  });
}

export function useTriageAndDispatch() {
  const invalidate = useCallInvalidation();
  return useMutation({
    mutationFn: ({ callId, payload }: { callId: string; payload: TriageDispatchRequest }) =>
      callCentreService.triageAndDispatch(callId, payload),
    onSuccess: (_result, variables) => invalidate(variables.callId),
  });
}
