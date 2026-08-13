// Common types used across the application

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Status types
export type ReferralStatus = 
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'CLINICIAN_REVIEWED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type UserType =
  | 'PHU_STAFF'
  | 'HOSPITAL_DESK'
  | 'SPECIALIST'
  | 'AMBULANCE_DISPATCH'
  | 'AMBULANCE_CREW'
  | 'REFERRAL_COORDINATOR'
  | 'DISTRICT_HEALTH'
  | 'NATIONAL_USER'
  | 'SYSTEM_ADMIN'
  | 'NEMS';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type FacilityType = 
  | 'PHU'
  | 'DISTRICT_HOSPITAL'
  | 'REGIONAL_HOSPITAL'
  | 'TERTIARY_HOSPITAL';

export type ReferralType =
  | 'EMERGENCY'
  | 'URGENT'
  | 'ROUTINE'
  | 'SPECIALIST_CONSULTATION';

export type Outcome =
  | 'DISCHARGED'
  | 'ADMITTED'
  | 'REFERRED_FURTHER'
  | 'DECEASED'
  | 'LEFT_AGAINST_ADVICE';

// Arrival condition after clinician review (Journey 3)
export type ArrivalCondition = 'IMPROVED' | 'SAME' | 'DETERIORATED';

export type ReadinessLevel = 'CRITICAL' | 'LOW' | 'ADEQUATE';

export type NEMSRequestStatus =
  | 'REQUESTED'
  | 'DISPATCHED'
  | 'DEPARTED_STANDBY'
  | 'EN_ROUTE_PICKUP'
  | 'AT_PICKUP'
  | 'PATIENT_LOADED'
  | 'EN_ROUTE_DROPOFF'
  | 'AT_DROPOFF'
  | 'HANDED_OVER'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED_STANDBY';

export type AmbulanceStatus = 'AVAILABLE' | 'EN_ROUTE' | 'ON_MISSION' | 'OFFLINE' | 'MAINTENANCE';
