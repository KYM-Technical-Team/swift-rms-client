// Referral types

import { ReferralStatus, Priority, ReferralType, Outcome, ArrivalCondition } from './common';
import { PatientSummary } from './patient';
import { FacilitySummary } from './facility';

export interface Referral {
  id: string;
  referralCode: string;
  patient: PatientSummary;
  sendingFacility: FacilitySummary;
  receivingFacility: FacilitySummary;
  referralType: ReferralType;
  priority: Priority;
  status: ReferralStatus;
  colourCode: string;
  chiefComplaint: string;
  clinicalSummary?: string;
  dangerSigns: string[];
  dangerSignScore: number;
  vitalSigns?: VitalSigns;
  outcome?: Outcome;
  outcomeNotes?: string;
  finalDiagnosis?: string;
  notes?: string;
  attachments?: Attachment[];
  transportMethod?: string;
  bloodDonorAccompanying: boolean;
  relativeAccompanying: boolean;
  nemsRequest?: NEMSRequestSummary;
  rejectionReason?: string;
  redirectReason?: string;
  createdBy: UserSummary;
  acceptedBy?: UserSummary;
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  // ETA and timing fields
  expectedArrival?: string;
  actualArrival?: string;
  // Computed metrics (in minutes)
  responseTimeMinutes?: number;  // Time from creation to acceptance
  delayMinutes?: number;         // Difference between expected and actual (positive = late)
  totalDurationMinutes?: number; // Time from creation to completion
  // Clinician review fields (Journey 3)
  seenByClinicianAt?: string;
  clinicianUserId?: string;
  clinicianValidatedColourCode?: string;
  arrivalCondition?: ArrivalCondition;
  arrivalConditionNotes?: string;
  // Additional clinical fields from National Referral Form
  patientCategory?: string;
  assignedDepartment?: string;
  knownAllergies: boolean;
  allergyDetails?: string;
  oxygenSaturation?: number;
  onSupplementalOxygen: boolean;
  bloodGroup?: string;
  documentsDescription?: string;
  telephoneArrangement: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface NEMSRequestSummary {
  id: string;
  status: string;
  ambulanceId?: string;
  dispatchedAt?: string;
  estimatedArrival?: string;
}

export interface CreateReferralRequest {
  patientId: string;
  sendingFacilityId: string;
  receivingFacilityId: string;
  referralType: ReferralType;
  priority: Priority;
  colourCode?: string;
  chiefComplaint: string;
  clinicalSummary: string;
  vitalSigns?: VitalSigns;
  patientCategory?: string;
  transportMethod?: string;
  nemsRequired?: boolean;
  referralDocuments?: string[];
  bloodDonorAccompanying?: boolean;
  relativeAccompanying?: boolean;
  offlineRequestId?: string;
  // Additional clinical fields from National Referral Form
  knownAllergies?: boolean;
  allergyDetails?: string;
  oxygenSaturation?: number;
  onSupplementalOxygen?: boolean;
  bloodGroup?: string;
  documentsDescription?: string;
  telephoneArrangement?: boolean;
}

export interface UpdateReferralRequest {
  status?: ReferralStatus;
  priority?: Priority;
  receivingFacilityId?: string;
  rejectionReason?: string;
  redirectReason?: string;
  outcome?: Outcome;
  outcomeNotes?: string;
  finalDiagnosis?: string;
  notes?: string;
}

export interface ReferralListQuery {
  status?: ReferralStatus;
  priority?: Priority;
  referralType?: ReferralType;
  sendingFacilityId?: string;
  receivingFacilityId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReferralSummary {
  id: string;
  referralCode: string;
  patientName: string;
  priority: Priority;
  status: ReferralStatus;
  referralType: ReferralType;
  chiefComplaint: string;
  sendingFacility: string;
  receivingFacility: string;
  createdAt: string;
}

export interface TimelineEntry {
  action: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface AddNoteRequest {
  notes: string;
}

export interface CreateReferralResponse {
  id: string;
  referralCode: string;
  status: ReferralStatus;
  dangerSigns: string[];
  dangerSignScore: number;
  colourCode: string;
  priority: Priority;
  createdAt: string;
}

// Clinician review request for Journey 3
export interface ClinicianReviewRequest {
  validatedColourCode: 'RED' | 'YELLOW' | 'GREEN';
  arrivalCondition: ArrivalCondition;
  arrivalConditionNotes?: string;
  notes?: string;
}

// Ambulance assignment request
export interface AssignAmbulanceRequest {
  ambulanceId: string;
  crewLeadName?: string;
  crewLeadPhone?: string;
  estimatedArrival?: string;
  notes?: string;
}

// Ambulance assignment response
export interface AssignAmbulanceResponse {
  referral: Referral;
  nemsRequest: NEMSRequestSummary;
  ambulance: AmbulanceSummary;
  message: string;
}

// Ambulance summary for response
export interface AmbulanceSummary {
  id: string;
  ambulanceId: string;
  status: string;
  facility?: FacilitySummary;
  createdAt: string;
  updatedAt: string;
}
