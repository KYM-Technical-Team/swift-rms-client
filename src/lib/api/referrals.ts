import apiClient from './client';
import {
  Referral,
  CreateReferralRequest,
  CreateReferralResponse,
  UpdateReferralRequest,
  ReferralListQuery,
  TimelineEntry,
  AddNoteRequest,
  ClinicianReviewRequest,
  AssignAmbulanceRequest,
  AssignAmbulanceResponse,
  ApiResponse,
  PaginationMeta,
} from '@/types';

export const referralService = {
  list: async (query?: ReferralListQuery): Promise<{ data: Referral[]; meta?: PaginationMeta }> => {
    const response = await apiClient.get<ApiResponse<Referral[]>>('/referrals', { params: query });
    return { data: response.data.data || [], meta: response.data.meta };
  },

  listIncoming: async (query?: ReferralListQuery): Promise<{ data: Referral[]; meta?: PaginationMeta }> => {
    const response = await apiClient.get<ApiResponse<Referral[]>>('/referrals/incoming', { params: query });
    return { data: response.data.data || [], meta: response.data.meta };
  },

  listOutgoing: async (query?: ReferralListQuery): Promise<{ data: Referral[]; meta?: PaginationMeta }> => {
    const response = await apiClient.get<ApiResponse<Referral[]>>('/referrals/outgoing', { params: query });
    return { data: response.data.data || [], meta: response.data.meta };
  },

  listPending: async (): Promise<Referral[]> => {
    const response = await apiClient.get<ApiResponse<Referral[]>>('/referrals/pending');
    return response.data.data || [];
  },

  listByPatient: async (patientId: string): Promise<Referral[]> => {
    const response = await apiClient.get<ApiResponse<Referral[]>>(`/patients/${patientId}/referrals`);
    return response.data.data || [];
  },

  get: async (id: string): Promise<Referral> => {
    const response = await apiClient.get<ApiResponse<Referral>>(`/referrals/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateReferralRequest): Promise<CreateReferralResponse> => {
    const response = await apiClient.post<ApiResponse<CreateReferralResponse>>('/referrals', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateReferralRequest): Promise<Referral> => {
    const response = await apiClient.patch<ApiResponse<Referral>>(`/referrals/${id}`, data);
    return response.data.data!;
  },

  getTimeline: async (id: string): Promise<TimelineEntry[]> => {
    const response = await apiClient.get<ApiResponse<TimelineEntry[]>>(`/referrals/${id}/timeline`);
    return response.data.data || [];
  },

  addNote: async (id: string, data: AddNoteRequest): Promise<void> => {
    await apiClient.post(`/referrals/${id}/notes`, data);
  },

  // Status update helpers
  accept: async (id: string): Promise<Referral> => {
    return referralService.update(id, { status: 'ACCEPTED' });
  },

  reject: async (id: string, reason: string): Promise<Referral> => {
    return referralService.update(id, { status: 'REJECTED', rejectionReason: reason });
  },

  redirect: async (id: string, newFacilityId: string, reason: string): Promise<Referral> => {
    return referralService.update(id, { 
      action: 'REDIRECT',
      newReceivingFacilityId: newFacilityId,
      redirectReason: reason 
    });
  },

  markArrived: async (id: string): Promise<Referral> => {
    return referralService.update(id, { status: 'ARRIVED' });
  },

  complete: async (id: string, outcome: string, notes?: string): Promise<Referral> => {
    return referralService.update(id, { 
      status: 'COMPLETED', 
      outcome: outcome as 'DISCHARGED' | 'ADMITTED' | 'REFERRED_FURTHER' | 'DECEASED' | 'LEFT_AGAINST_ADVICE',
      outcomeNotes: notes 
    });
  },

  // Clinician review for Journey 3
  clinicianReview: async (id: string, data: ClinicianReviewRequest): Promise<Referral> => {
    const response = await apiClient.post<ApiResponse<Referral>>(`/referrals/${id}/clinician-review`, data);
    return response.data.data!;
  },

  // Assign ambulance to pending referral
  assignAmbulance: async (id: string, data: AssignAmbulanceRequest): Promise<AssignAmbulanceResponse> => {
    const response = await apiClient.post<ApiResponse<AssignAmbulanceResponse>>(`/referrals/${id}/assign-ambulance`, data);
    return response.data.data!;
  },
};
