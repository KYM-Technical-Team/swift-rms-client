// Facility types

import { FacilityType } from './common';

export interface FacilitySummary {
  id: string;
  name: string;
  code: string;
  type: FacilityType;
  facilityCode?: string;
  facilityType?: FacilityType;
  districtId?: string;
  district?: DistrictSummary;
}

export interface Facility {
  id: string;
  name: string;
  facilityCode: string;
  type: FacilityType;
  facilityType?: FacilityType; // Backend returns this
  level: number;
  address?: string;
  district: DistrictSummary;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  hasEmergencyServices?: boolean;
  services?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DistrictSummary {
  id: string;
  name: string;
  code: string;
  region?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface CreateFacilityRequest {
  name: string;
  facilityCode: string;
  facilityType: FacilityType;
  level: number;
  districtId: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  services?: string[];
  operatingHours?: Record<string, string>;
}

export interface UpdateFacilityRequest {
  name?: string;
  type?: FacilityType;
  level?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  isActive?: boolean;
  hasEmergencyServices?: boolean;
  services?: string[];
}

export interface FacilityListQuery {
  facilityType?: string;
  districtId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NearbyQuery {
  latitude: number;
  longitude: number;
  radius?: number; // in km
}

export interface FacilityWithDistance extends Facility {
  distance: number; // in km
}

// Bulk upload types
export interface BulkUploadFacilityItem {
  name: string;
  facilityCode: string;
  facilityType: string;
  level?: number;
  districtName?: string;
  districtCode?: string;
  region?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  isActive?: boolean;
  ownership?: string;
  status?: string;
  functional?: string;
  managerName?: string;
  services?: string[];
}

export interface BulkUploadError {
  row: number;
  name?: string;
  code?: string;
  message: string;
}

export interface BulkUploadResult {
  totalProcessed: number;
  successful: number;
  skipped: number;
  failed: number;
  errors?: BulkUploadError[];
  created?: Facility[];
}

export interface FacilityStats {
  totalFacilities: number;
  totalDistricts: number;
  byType: Record<string, number>;
  byDistrict: Record<string, number>;
}
