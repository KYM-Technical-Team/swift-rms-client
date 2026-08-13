'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { referralService } from '@/lib/api';
import type { Priority, Referral } from '@/types';

export const triageKeys = {
  pending: () => ['referrals', 'pending'] as const,
  timeline: (id?: string) => ['referrals', id ?? 'none', 'timeline'] as const,
};

/** The triage worklist. Polled so a referral triaged elsewhere leaves this queue. */
export function usePendingReferrals() {
  return useQuery({
    queryKey: triageKeys.pending(),
    queryFn: () => referralService.listPending(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
}

export function useReferralTimeline(referralId?: string) {
  return useQuery({
    queryKey: triageKeys.timeline(referralId),
    queryFn: () => referralService.getTimeline(referralId!),
    enabled: Boolean(referralId),
    staleTime: 20000,
  });
}

function useReferralInvalidation() {
  const queryClient = useQueryClient();
  return (referralId?: string) => {
    void queryClient.invalidateQueries({ queryKey: triageKeys.pending() });
    void queryClient.invalidateQueries({ queryKey: ['referrals', 'dashboard'] });
    if (referralId) void queryClient.invalidateQueries({ queryKey: triageKeys.timeline(referralId) });
  };
}

function patchQueue(queryClient: ReturnType<typeof useQueryClient>, updated: Referral) {
  queryClient.setQueryData<Referral[]>(triageKeys.pending(), (current) =>
    current?.map((referral) => referral.id === updated.id ? updated : referral));
}

export function useAcceptReferral() {
  const queryClient = useQueryClient();
  const invalidate = useReferralInvalidation();
  return useMutation({
    mutationFn: (referralId: string) => referralService.accept(referralId),
    onSuccess: (updated) => { patchQueue(queryClient, updated); invalidate(updated.id); },
  });
}

export function useRejectReferral() {
  const queryClient = useQueryClient();
  const invalidate = useReferralInvalidation();
  return useMutation({
    mutationFn: ({ referralId, reason }: { referralId: string; reason: string }) =>
      referralService.reject(referralId, reason),
    onSuccess: (updated) => { patchQueue(queryClient, updated); invalidate(updated.id); },
  });
}

/** Writes the assessed colour back as the referral's priority. */
export function useSetReferralPriority() {
  const queryClient = useQueryClient();
  const invalidate = useReferralInvalidation();
  return useMutation({
    mutationFn: ({ referralId, priority }: { referralId: string; priority: Priority }) =>
      referralService.update(referralId, { priority }),
    onSuccess: (updated) => { patchQueue(queryClient, updated); invalidate(updated.id); },
  });
}

export function useAddReferralNote() {
  const invalidate = useReferralInvalidation();
  return useMutation({
    mutationFn: ({ referralId, notes }: { referralId: string; notes: string }) =>
      referralService.addNote(referralId, { notes }),
    onSuccess: (_result, variables) => invalidate(variables.referralId),
  });
}
