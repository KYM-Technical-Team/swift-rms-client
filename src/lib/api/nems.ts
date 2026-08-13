import apiClient from './client';
import {
  Ambulance,
  NEMSRequest,
  CreateNEMSRequest,
  UpdateNEMSRequest,
  NEMSListQuery,
  Call,
  CreateCallRequest,
  CallListQuery,
  UpdateCallRequest,
  CallCommandRequest,
  CallEvent,
  AmbulanceRank,
  TriageDispatchRequest,
  CallCentreDashboard,
  Location,
  LogVitalsRequest,
  ApiResponse,
  PaginationMeta,
  User,
} from '@/types';

export const nemsService = {
  // Requests/Missions
  listRequests: async (query?: NEMSListQuery): Promise<{ data: NEMSRequest[]; meta?: PaginationMeta }> => {
    const response = await apiClient.get<ApiResponse<NEMSRequest[]>>('/nems/requests', { params: query });
    return { data: response.data.data || [], meta: response.data.meta };
  },

  getRequest: async (id: string): Promise<NEMSRequest> => {
    const response = await apiClient.get<ApiResponse<NEMSRequest>>(`/nems/requests/${id}`);
    return response.data.data!;
  },

  createRequest: async (data: CreateNEMSRequest): Promise<NEMSRequest> => {
    const response = await apiClient.post<ApiResponse<NEMSRequest>>('/nems/requests', data);
    return response.data.data!;
  },

  updateRequest: async (id: string, data: UpdateNEMSRequest): Promise<NEMSRequest> => {
    const response = await apiClient.patch<ApiResponse<NEMSRequest>>(`/nems/requests/${id}`, data);
    return response.data.data!;
  },

  // Ambulances
  listAmbulances: async (status?: string): Promise<Ambulance[]> => {
    const response = await apiClient.get<ApiResponse<Ambulance[]>>('/nems/ambulances', { 
      params: status ? { status } : undefined 
    });
    return response.data.data || [];
  },

  getAmbulance: async (id: string): Promise<Ambulance> => {
    const response = await apiClient.get<ApiResponse<Ambulance>>(`/nems/ambulances/${id}`);
    return response.data.data!;
  },

  getAmbulanceLocation: async (id: string): Promise<Location> => {
    const response = await apiClient.get<ApiResponse<Location>>(`/nems/ambulances/${id}/location`);
    return response.data.data!;
  },

  // Vitals logging for ambulance crew (Journey 2)
  logVitals: async (requestId: string, data: LogVitalsRequest): Promise<NEMSRequest> => {
    const response = await apiClient.post<ApiResponse<NEMSRequest>>(`/nems/requests/${requestId}/vitals`, data);
    return response.data.data!;
  },

  // Dispatch helpers
  dispatch: async (requestId: string, ambulanceId: string): Promise<NEMSRequest> => {
    return nemsService.updateRequest(requestId, { status: 'DISPATCHED', ambulanceId });
  },

  cancel: async (requestId: string, reason: string): Promise<NEMSRequest> => {
    return nemsService.updateRequest(requestId, { status: 'CANCELLED', cancelReason: reason });
  },
};

export const callCentreService = {
  listOperators: async (): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>('/call-centre/operators');
    return response.data.data || [];
  },

  listCalls: async (query?: CallListQuery): Promise<{ data: Call[]; meta?: PaginationMeta }> => {
    const response = await apiClient.get<ApiResponse<Call[]>>('/call-centre/calls', { params: query });
    return { data: response.data.data || [], meta: response.data.meta };
  },

  logCall: async (data: CreateCallRequest): Promise<Call> => {
    const response = await apiClient.post<ApiResponse<Call>>('/call-centre/calls', data);
    return response.data.data!;
  },

  getCall: async (id: string): Promise<Call> => {
    const response = await apiClient.get<ApiResponse<Call>>(`/call-centre/calls/${id}`);
    return response.data.data!;
  },

  updateCall: async (id: string, data: UpdateCallRequest): Promise<Call> => {
    const response = await apiClient.patch<ApiResponse<Call>>(`/call-centre/calls/${id}`, data);
    return response.data.data!;
  },

  listEvents: async (id: string): Promise<CallEvent[]> => {
    const response = await apiClient.get<ApiResponse<CallEvent[]>>(`/call-centre/calls/${id}/events`);
    return response.data.data || [];
  },

  rankAmbulances: async (id: string, equipment?: string[]): Promise<AmbulanceRank[]> => {
    const response = await apiClient.get<ApiResponse<AmbulanceRank[]>>(
      `/call-centre/calls/${id}/ambulance-ranking`,
      { params: equipment?.length ? { equipment } : undefined, paramsSerializer: { indexes: null } },
    );
    return response.data.data || [];
  },

  command: async (
    id: string,
    command: 'hold' | 'resume' | 'transfer' | 'conference' | 'notes' | 'complete',
    data: CallCommandRequest,
  ): Promise<Call> => {
    const response = await apiClient.post<ApiResponse<Call>>(`/call-centre/calls/${id}/${command}`, data);
    return response.data.data!;
  },

  triageAndDispatch: async (id: string, data: TriageDispatchRequest): Promise<NEMSRequest> => {
    const response = await apiClient.post<ApiResponse<NEMSRequest>>(
      `/call-centre/calls/${id}/triage-and-dispatch`,
      data,
    );
    return response.data.data!;
  },

  listMissions: async (): Promise<{ data: NEMSRequest[]; meta?: PaginationMeta }> => {
    const response = await apiClient.get<ApiResponse<NEMSRequest[]>>('/call-centre/missions');
    return { data: response.data.data || [], meta: response.data.meta };
  },

  getMission: async (id: string): Promise<NEMSRequest> => {
    const response = await apiClient.get<ApiResponse<NEMSRequest>>(`/call-centre/missions/${id}`);
    return response.data.data!;
  },

  updateMission: async (id: string, data: UpdateNEMSRequest): Promise<NEMSRequest> => {
    const response = await apiClient.patch<ApiResponse<NEMSRequest>>(`/call-centre/missions/${id}`, data);
    return response.data.data!;
  },

  getDashboard: async (): Promise<CallCentreDashboard> => {
    const response = await apiClient.get<ApiResponse<CallCentreDashboard>>('/call-centre/dashboard');
    return response.data.data!;
  },

  createInterHospitalRequest: async (data: CreateNEMSRequest): Promise<NEMSRequest> => {
    const response = await apiClient.post<ApiResponse<NEMSRequest>>('/call-centre/inter-hospital-request', data);
    return response.data.data!;
  },
};
