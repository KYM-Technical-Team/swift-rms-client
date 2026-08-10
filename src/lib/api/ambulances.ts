import apiClient from './client';
import { ApiResponse, PaginationMeta } from '@/types';

export type AmbulanceStatus = 'AVAILABLE' | 'ON_MISSION' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export interface CrewMember {
  id: string;
  firstName: string;
  lastName: string;
  userType: string;
  crewRole?: string;
}

export interface Ambulance {
  id: string;
  ambulanceId: string;
  facility?: {
    id: string;
    name: string;
    facilityCode: string;
    facilityType?: string;
  };
  status: AmbulanceStatus;
  phone?: string;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string;
  equipment?: string[];
  crew?: CrewMember[];
  createdAt: string;
  updatedAt: string;
}

export interface AmbulanceStats {
  total: number;
  available: number;
  onMission: number;
  maintenance: number;
  outOfService: number;
  byFacility?: Record<string, number>;
}

export interface CreateAmbulanceRequest {
  ambulanceId: string;
  facilityId?: string;
  status?: AmbulanceStatus;
  phone?: string;
  latitude?: number;
  longitude?: number;
  equipment?: string[];
  crewMemberIds?: string[];
}

export interface UpdateAmbulanceRequest {
  facilityId?: string;
  status?: AmbulanceStatus;
  phone?: string;
  latitude?: number;
  longitude?: number;
  equipment?: string[];
  crewMemberIds?: string[];
}

export interface AmbulanceListQuery {
  status?: AmbulanceStatus;
  facilityId?: string;
  page?: number;
  limit?: number;
}

export const ambulanceService = {
  list: async (query?: AmbulanceListQuery): Promise<{ data: Ambulance[]; meta?: PaginationMeta }> => {
    const response = await apiClient.get<ApiResponse<Ambulance[]>>('/ambulances', { params: query });
    return { data: response.data.data || [], meta: response.data.meta };
  },

  get: async (id: string): Promise<Ambulance> => {
    const response = await apiClient.get<ApiResponse<Ambulance>>(`/ambulances/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateAmbulanceRequest): Promise<Ambulance> => {
    const response = await apiClient.post<ApiResponse<Ambulance>>('/ambulances', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateAmbulanceRequest): Promise<Ambulance> => {
    const response = await apiClient.put<ApiResponse<Ambulance>>(`/ambulances/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/ambulances/${id}`);
  },

  getStats: async (): Promise<AmbulanceStats> => {
    const response = await apiClient.get<ApiResponse<AmbulanceStats>>('/ambulances/stats');
    return response.data.data!;
  },
};
