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
