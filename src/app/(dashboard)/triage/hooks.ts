'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { referralService } from '@/lib/api';
import type { ClinicianReviewRequest, Priority, Referral } from '@/types';

export const triageKeys = {
  pending: (scope: 'facility' | 'global' = 'facility') => ['referrals', 'pending', scope] as const,
  arrived: () => ['referrals', 'arrived'] as const,
  timeline: (id?: string) => ['referrals', id ?? 'none', 'timeline'] as const,
};

/** The pre-arrival worklist. Polled so a referral triaged elsewhere leaves this queue. */
export function usePendingReferrals(scope: 'facility' | 'global' = 'facility') {
  return useQuery({
    queryKey: triageKeys.pending(scope),
    queryFn: async () => {
      if (scope === 'global') {
        const result = await referralService.list({ status: 'PENDING', limit: 100 });
        return result.data;
      }
      return referralService.listPending();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
}

/** Arrived patients awaiting the clinician's colour-code validation (Journey 3). */
export function useArrivedReferrals() {
  return useQuery({
    queryKey: triageKeys.arrived(),
    queryFn: async () => {
      const result = await referralService.list({ status: 'ARRIVED', limit: 50 });
      return result.data;
    },
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
    void queryClient.invalidateQueries({ queryKey: ['referrals', 'pending'] });
    void queryClient.invalidateQueries({ queryKey: triageKeys.arrived() });
    void queryClient.invalidateQueries({ queryKey: ['referrals', 'dashboard'] });
    if (referralId) void queryClient.invalidateQueries({ queryKey: triageKeys.timeline(referralId) });
  };
}

function patchQueue(queryClient: ReturnType<typeof useQueryClient>, updated: Referral) {
  const patch = (current?: Referral[]) => current?.map((referral) => referral.id === updated.id ? updated : referral);
  queryClient.setQueriesData<Referral[]>({ queryKey: ['referrals', 'pending'] }, patch);
  queryClient.setQueryData<Referral[]>(triageKeys.arrived(), patch);
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

/**
 * Journey 3: the receiving clinician validates the triage colour once the patient
 * is physically here. Only valid for ARRIVED referrals — the arrival condition is
 * observed, not predicted, so this is never sent for a still-pending referral.
 */
export function useClinicianReview() {
  const queryClient = useQueryClient();
  const invalidate = useReferralInvalidation();
  return useMutation({
    mutationFn: ({ referralId, review }: { referralId: string; review: ClinicianReviewRequest }) =>
      referralService.clinicianReview(referralId, review),
    onSuccess: (updated) => { patchQueue(queryClient, updated); invalidate(updated.id); },
  });
}
