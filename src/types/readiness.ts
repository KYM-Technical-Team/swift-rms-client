// Readiness types

import { ReadinessLevel } from './common';
import { FacilitySummary } from './facility';

export interface FacilityReadiness {
  id: string;
  facilityId: string;
  facilityName?: string;
  facilityCode?: string;
  facility?: FacilitySummary;
  reportDate: string;
  reportedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  // Score from server if available
  overallScore?: number;
  readinessScore?: number;
  score?: number;
  // Bed capacity - matching backend naming
  bedCapacityTotal: number;
  bedCapacityAvailable: number;
  icuBedsTotal: number;
  icuBedsAvailable: number;
  // Legacy aliases for backwards compatibility
  bedsAvailable?: number;
  bedsTotal?: number;
  bedsByWard?: BedsByWard[];
  // Blood bank
  bloodBankStatus: ReadinessLevel;
  bloodUnitsAPositive: number;
  bloodUnitsANegative: number;
  bloodUnitsBPositive: number;
  bloodUnitsBNegative: number;
  bloodUnitsOPositive: number;
  bloodUnitsONegative: number;
  bloodUnitsABPositive: number;
  bloodUnitsABNegative: number;
  bloodBank?: BloodBankStatus;
  // Resources
  oxygenStatus: ReadinessLevel;
  oxygenCylinders: number;
  staffingStatus: ReadinessLevel;
  doctorsOnDuty: number;
  nursesOnDuty: number;
  specialistsAvailable?: string[];
  equipmentStatus?: EquipmentStatus[];
  emergencySuppliesStatus: ReadinessLevel;
  emergencySupplies?: string[];
  theatreStatus?: string;
  theatreAvailable?: boolean;
  operatingRoomsAvailable: number;
  diagnosticsStatus?: {
    ctScan?: string;
    laboratory?: string;
    ultrasound?: string;
    xray?: string;
  } | Record<string, string>;
  notes?: string;
  version?: number;
  updatedAt?: string;
  createdAt: string;
}

export interface BedsByWard {
  wardName: string;
  total: number;
  available: number;
  occupancy: number;
}

export interface BloodBankStatus {
  status: ReadinessLevel;
  units: BloodUnit[];
}

export interface BloodUnit {
  type: string;
  units: number;
  status: ReadinessLevel;
}

export interface EquipmentStatus {
  name: string;
  total: number;
  working: number;
}

// Backend DTO - matches internal/dto/readiness_dto.go CreateReadinessRequest
export interface BloodUnits {
  aPositive: number;
  aNegative: number;
  bPositive: number;
  bNegative: number;
  oPositive: number;
  oNegative: number;
  abPositive: number;
  abNegative: number;
}

export interface CreateReadinessRequest {
  reportDate: string; // YYYY-MM-DD format
  bedCapacityTotal: number;
  bedCapacityAvailable: number;
  icuBedsTotal?: number;
  icuBedsAvailable?: number;
  oxygenStatus: 'ADEQUATE' | 'LOW' | 'CRITICAL' | 'UNAVAILABLE';
  oxygenCylinders?: number;
  bloodBankStatus: 'ADEQUATE' | 'LOW' | 'CRITICAL' | 'UNAVAILABLE';
  bloodUnits?: BloodUnits;
  staffingStatus: 'FULLY_STAFFED' | 'ADEQUATE' | 'UNDERSTAFFED' | 'CRITICAL';
  doctorsOnDuty?: number;
  nursesOnDuty?: number;
  specialistsAvailable?: string[];
  equipmentStatus?: Record<string, { total: number; working: number }>;
  emergencySuppliesStatus: 'ADEQUATE' | 'LOW' | 'CRITICAL' | 'UNAVAILABLE';
  operatingRoomsAvailable?: number;
  theatreStatus?: string;
  notes?: string;
}

export interface BedMonitoring {
  facilities: FacilityBedStatus[];
  totalBeds: number;
  availableBeds: number;
  occupancyRate: number;
}

export interface FacilityBedStatus {
  facilityId: string;
  facilityName: string;
  totalBeds: number;
  availableBeds: number;
  occupancyRate: number;
  lastUpdated: string;
}

// Readiness Reminder types (Journey 4)
export interface ReadinessReminder {
  id: string;
  facilityId: string;
  facilityName?: string;
  reminderType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  time: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  isActive: boolean;
  notifyVia: ('email' | 'sms' | 'push')[];
  recipients: string[]; // User IDs
  lastSentAt?: string;
  createdAt: string;
}

export interface CreateReminderRequest {
  facilityId: string;
  reminderType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  notifyVia: ('email' | 'sms' | 'push')[];
  recipientUserIds?: string[];
}

export interface UpdateReminderRequest {
  isActive?: boolean;
  time?: string;
  notifyVia?: ('email' | 'sms' | 'push')[];
}
