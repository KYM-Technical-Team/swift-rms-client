// NEMS and Ambulance types

import { NEMSRequestStatus, AmbulanceStatus, Priority } from './common';

export interface Ambulance {
  id: string;
  code: string;
  plateNumber: string;
  type: string;
  status: AmbulanceStatus;
  district: string;
  currentLocation?: Location;
  crew?: CrewMember[];
  lastUpdated: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  phone: string;
}

export interface NEMSRequest {
  id: string;
  referralId?: string;
  referralCode?: string;
  requestType: 'EMERGENCY' | 'INTER_HOSPITAL' | 'ROUTINE';
  priority: Priority;
  status: NEMSRequestStatus;
  pickupLocation: Location;
  pickupFacility?: string;
  dropoffLocation?: Location;
  dropoffFacility?: string;
  patientName?: string;
  patientCondition?: string;
  ambulance?: Ambulance;
  dispatchedAt?: string;
  arrivedAtPickup?: string;
  leftPickup?: string;
  arrivedAtDropoff?: string;
  completedAt?: string;
  estimatedArrival?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNEMSRequest {
  referralId?: string;
  requestType: 'EMERGENCY' | 'INTER_HOSPITAL' | 'ROUTINE';
  priority: Priority;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress?: string;
  pickupFacilityId?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  dropoffAddress?: string;
  dropoffFacilityId?: string;
  patientName?: string;
  patientCondition?: string;
  notes?: string;
}

export interface UpdateNEMSRequest {
  status?: NEMSRequestStatus;
  ambulanceId?: string;
  notes?: string;
  cancelReason?: string;
}

export interface NEMSListQuery {
  status?: NEMSRequestStatus;
  priority?: Priority;
  ambulanceId?: string;
  page?: number;
  limit?: number;
}

// Call Centre types
export interface Call {
  id: string;
  callerPhone: string;
  callerName?: string;
  callerFacility?: { id?: string; name?: string; facilityCode?: string; code?: string } | string;
  operator?: { id: string; firstName: string; lastName: string };
  callType: CallType;
  emergencyNature?: EmergencyNature;
  emergencyLocation?: EmergencyLocation;
  patientInfo?: PatientInfo;
  vitalSigns?: Record<string, unknown>;
  hazardsPresent: boolean;
  languageUsed?: string;
  triageResult?: TriageResult;
  suggestedActions?: string[];
  nearestAmbulance?: AmbulanceRank;
  suggestedFacility?: Record<string, unknown>;
  callStatus: CallStatus;
  version: number;
  heldAt?: string;
  holdReason?: string;
  conferenceMembers?: string[];
  missionId?: string;
  callStartedAt: string;
  callEndedAt?: string;
  notes?: string;
  createdAt: string;
}

export type CallType =
  | 'REFERRAL_REQUEST'
  | 'AMBULANCE_REQUEST'
  | 'INQUIRY'
  | 'FOLLOW_UP'
  | 'EMERGENCY';

export type CallStatus = 'ACTIVE' | 'HELD' | 'DISPATCHED' | 'COMPLETED' | 'TRANSFERRED';

export type EmergencyNature =
  | 'OBSTETRIC'
  | 'PEDIATRIC'
  | 'TRAUMA'
  | 'CARDIAC'
  | 'RESPIRATORY'
  | 'GENERAL'
  | 'OTHER';

export interface EmergencyLocation {
  address?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  district?: string;
}

export interface PatientInfo {
  name?: string;
  age?: number;
  gender?: string;
  symptoms?: string;
  category?: string;
  consciousness?: string;
}

export interface TriageAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface TriageResult {
  protocolId: string;
  protocolName: string;
  colourCode: 'RED' | 'YELLOW' | 'GREEN';
  priority: Priority;
  answers: TriageAnswer[];
  completedAt: string;
}

export interface CreateCallRequest {
  callerPhone: string;
  callerName?: string;
  callerFacilityId?: string;
  callType: CallType;
  emergencyNature?: EmergencyNature;
  emergencyLocation?: EmergencyLocation;
  patientInfo?: PatientInfo;
  vitalSigns?: Record<string, unknown>;
  hazardsPresent: boolean;
  languageUsed?: string;
}

export interface CallListQuery {
  status?: CallStatus;
  search?: string;
  operatorId?: string;
  callType?: CallType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface UpdateCallRequest {
  callStatus?: 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED';
  triageResult?: TriageResult;
  suggestedActions?: string[];
  nearestAmbulance?: AmbulanceRank;
  suggestedFacility?: Record<string, unknown>;
  notes?: string;
}

export interface CallCommandRequest {
  version: number;
  reason?: string;
  targetOperatorId?: string;
  participant?: string;
  note?: string;
  members?: string[];
}

export interface CallEvent {
  id: string;
  eventType: string;
  summary: string;
  actorId?: string;
  actorName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface AmbulanceRank {
  ambulanceId: string;
  registryId: string;
  facilityName?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
  locationUpdatedAt?: string;
  equipment?: string[];
  crewMembers?: string[];
  eligible: boolean;
  reasons?: string[];
  score: number;
}

export interface TriageDispatchRequest {
  version: number;
  pickupFacilityId: string;
  dropoffFacilityId: string;
  ambulanceId: string;
  priority: Priority;
  colourCode: 'RED' | 'YELLOW' | 'GREEN';
  triageResult: TriageResult;
  equipmentRequired?: string[];
  patientInfo?: PatientInfo;
  notes?: string;
}

export interface CallCentreDashboard {
  activeCalls: number;
  activeMissions: number;
  ambulancesOnMission: number;
  ambulancesAvailable: number;
  todayStats: {
    totalCalls: number;
    redCodeCalls: number;
    yellowCodeCalls: number;
    greenCodeCalls: number;
    ambulancesDispatched: number;
    averageResponseTime: string;
    completedMissions: number;
  };
  pendingInterHospitalApprovals: number;
}

// Vitals Log Entry for ambulance crew (Journey 2)
export interface VitalsLogEntry {
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperature?: number;
  consciousnessLevel?: 'ALERT' | 'VERBAL' | 'PAIN' | 'UNRESPONSIVE';
  interventions?: string[];
  notes?: string;
}

export interface LogVitalsRequest {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  temperature?: number;
  consciousnessLevel?: 'ALERT' | 'VERBAL' | 'PAIN' | 'UNRESPONSIVE';
  interventions?: string[];
  notes?: string;
}
