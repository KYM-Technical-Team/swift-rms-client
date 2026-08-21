// Analytics types

export interface ReferralSummaryStats {
  totalReferrals: number;
  completed: number;
  pending: number;
  rejected: number;
  cancelled: number;
  averageResponseTimeMinutes?: number;
  averageCompletionTimeHours?: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface ReferralAnalytics {
  summary: ReferralSummaryStats;
  byPriority: Record<string, number>;
  byColourCode: Record<string, number>;
  byOutcome: Record<string, number>;
  trend?: TrendPoint[];
}

export interface FacilityAnalytics {
  facilityId: string;
  facilityName: string;
  totalReferralsReceived: number;
  totalReferralsSent: number;
  acceptanceRate: number;
  averageResponseTimeMinutes: number;
  rejectionRate: number;
  topRejectionReason?: string;
}

export interface FacilityResponseTime {
  facilityId: string;
  facilityName: string;
  averageMinutes: number;
  totalReferrals: number;
}

export interface ResponseTimeAnalytics {
  averageMinutes: number;
  medianMinutes: number;
  byPriority: Record<string, number>;
  byFacility: FacilityResponseTime[];
  trend?: TrendPoint[];
}

export interface FacilityOutcome {
  facilityId: string;
  facilityName: string;
  outcomes: Record<string, number>;
}

export interface OutcomeAnalytics {
  totalCompleted: number;
  byOutcome: Record<string, number>;
  byFacility: FacilityOutcome[];
  trend?: TrendPoint[];
}

export interface RCPerformanceEntry {
  userId: string;
  name: string;
  facilityName: string;
  referralsCoordinated: number;
  averageResponseTimeMinutes: number;
  feedbackGiven: number;
  feedbackRate: number;
  bedReportsSubmitted: number;
  bedReportComplianceRate: number;
}

export interface RCPerformanceResponse {
  coordinators: RCPerformanceEntry[];
}

export interface HeatmapData {
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  count: number;
}

export interface DHIS2Export {
  period: string;
  orgUnit: string;
  dataValues: DHIS2DataValue[];
}

export interface DHIS2DataValue {
  dataElement: string;
  value: number;
  comment?: string;
}

export interface AnalyticsQuery {
  dateFrom?: string;
  dateTo?: string;
  facilityId?: string;
  districtId?: string;
  groupBy?: 'DAY' | 'WEEK' | 'MONTH';
}

export interface MonthlyReportQuery {
  year?: number;
  month?: number;
  facilityId?: string;
  districtId?: string;
}

export interface MonthlyReportPeriod {
  year: number;
  month: number;
  label: string;
  dateFrom: string;
  dateTo: string;
}

export interface MonthlyReportKPIs {
  totalCalls: number;
  totalReferrals: number;
  totalMissions: number;
  nemsRequiredReferrals: number;
  completedMissions: number;
  cancelledMissions: number;
  missionSuccessRate: number;
  abortRate: number;
  averageResponseTimeMinutes: number;
  averageTimeToSceneMinutes: number;
  averageTimeToHospitalMinutes: number;
  averageTurnaroundMinutes: number;
  readinessReportingRate: number;
  totalAmbulances: number;
  availableAmbulances: number;
}

export interface MonthlyReportCallSection {
  total: number;
  completed: number;
  transferred: number;
  averageCallDurationMinutes: number;
  byCallType: Record<string, number>;
  byEmergencyNature: Record<string, number>;
  byStatus: Record<string, number>;
  byDistrict: Record<string, number>;
  byHour: Record<string, number>;
}

export interface MonthlyReportMissionSection {
  total: number;
  completed: number;
  cancelled: number;
  successRate: number;
  abortRate: number;
  averageResponseTimeMinutes: number;
  averageTimeToSceneMinutes: number;
  averageTimeToHospitalMinutes: number;
  averageTurnaroundMinutes: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byColourCode: Record<string, number>;
  byPickupDistrict: Record<string, number>;
  byDropoffDistrict: Record<string, number>;
  byHour: Record<string, number>;
  transportDecisionDistribution: Record<string, number>;
}

export interface MonthlyReportReferralSection {
  total: number;
  incomingToScope: number;
  outgoingFromScope: number;
  nemsRequired: number;
  bloodDonorAccompanying: number;
  relativeAccompanying: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byColourCode: Record<string, number>;
  byOutcome: Record<string, number>;
  byPatientCategory: Record<string, number>;
  byTransportMethod: Record<string, number>;
  bySendingDistrict: Record<string, number>;
  byReceivingDistrict: Record<string, number>;
  rcTrackerOutcomes: Record<string, number>;
  freeHealthCareDistribution: Record<string, number>;
  arrivalMethodDistribution: Record<string, number>;
}

export interface MonthlyReportFacilityCapacity {
  totalActiveFacilities: number;
  reportingFacilities: number;
  reportingRate: number;
  bedCapacityTotal: number;
  bedCapacityAvailable: number;
  icuBedsTotal: number;
  icuBedsAvailable: number;
  operatingRoomsAvailable: number;
  readinessHigh: number;
  readinessMedium: number;
  readinessLow: number;
  byFacilityType: Record<string, number>;
}

export interface MonthlyReportAmbulanceUtilization {
  total: number;
  available: number;
  onMission: number;
  maintenance: number;
  outOfService: number;
  linkedToFacilities: number;
  unlinked: number;
  byDistrict: Record<string, number>;
}

export interface MonthlyReportSpecialOperations {
  sampleTransportDataAvailable: boolean;
  sampleTransports: number;
  covidTransportDataAvailable: boolean;
  covidTransports: number;
  kilometresDataAvailable: boolean;
  kilometresTravelled: number;
}

export interface MonthlyReportDataQualityIndicator {
  key: string;
  status: string;
  message: string;
  severity: string;
}

export interface MonthlyOperationalReportResponse {
  period: MonthlyReportPeriod;
  generatedAt: string;
  definitionsVersion: string;
  kpis: MonthlyReportKPIs;
  calls: MonthlyReportCallSection;
  missions: MonthlyReportMissionSection;
  referrals: MonthlyReportReferralSection;
  facilityCapacity: MonthlyReportFacilityCapacity;
  ambulanceUtilization: MonthlyReportAmbulanceUtilization;
  specialOperations: MonthlyReportSpecialOperations;
  dataQuality: MonthlyReportDataQualityIndicator[];
}

export interface AnalyticsTrendPoint {
  period: string;
  red: number;
  yellow: number;
  green: number;
  other: number;
  total: number;
}

export interface FleetStatusSummary {
  total: number;
  available: number;
  onMission: number;
  maintenance: number;
  outOfService: number;
}

export interface ReadinessStatusSummary {
  totalFacilities: number;
  reportingFacilities: number;
  reportingRate: number;
  high: number;
  medium: number;
  low: number;
}

export interface NationalDashboardSummary {
  totalReferrals: number;
  totalMissions: number;
  activeReferrals: number;
  missionSuccessRate: number;
  averageResponseTimeMinutes: number;
  averageTimeToSceneMinutes: number;
  averageTimeToHospitalMinutes: number;
  averageTurnaroundMinutes: number;
  abortRate: number;
  averageTimeToClinicianMinutes: number;
}

export interface NationalDashboardResponse {
  summary: NationalDashboardSummary;
  trends: AnalyticsTrendPoint[];
  priorityDistribution: Record<string, number>;
  colourCodeDistribution: Record<string, number>;
  fleetStatus: FleetStatusSummary;
  readinessStatus: ReadinessStatusSummary;
}

export interface DistrictPerformanceRow {
  districtId: string;
  districtName: string;
  referralCount: number;
  missionCount: number;
  averageResponseTimeMinutes: number;
  averageTimeToSceneMinutes: number;
  averageTimeToHospitalMinutes: number;
  successRate: number;
  abortRate: number;
  readinessReportingRate: number;
  availableAmbulances: number;
}

export interface DistrictPerformanceResponse {
  districts: DistrictPerformanceRow[];
}

export interface GenerateReportRequest {
  reportType: 'referrals' | 'facilities' | 'outcomes' | 'performance';
  format: 'pdf' | 'csv' | 'excel';
  dateFrom: string;
  dateTo: string;
  facilityId?: string;
  districtId?: string;
}
