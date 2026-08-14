# Graph Report - swift-rms-client  (2026-08-14)

## Corpus Check
- 117 files · ~88,474 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 765 nodes · 1051 edges · 57 communities (37 shown, 20 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d82799e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Authentication & API Client|Authentication & API Client]]
- [[_COMMUNITY_Core Type Definitions|Core Type Definitions]]
- [[_COMMUNITY_Route Guards & Counter Referrals|Route Guards & Counter Referrals]]
- [[_COMMUNITY_Referral Authentication & Authorization|Referral Authentication & Authorization]]
- [[_COMMUNITY_Dashboard & Facility Management|Dashboard & Facility Management]]
- [[_COMMUNITY_Clinician Workflow & Triage|Clinician Workflow & Triage]]
- [[_COMMUNITY_Ambulance Management & Dispatch|Ambulance Management & Dispatch]]
- [[_COMMUNITY_Patient Care Reports & Pre-hospital Vitals|Patient Care Reports & Pre-hospital Vitals]]
- [[_COMMUNITY_Notification Service & Bell Dropdown|Notification Service & Bell Dropdown]]
- [[_COMMUNITY_Analytics Dashboard & Visualizations|Analytics Dashboard & Visualizations]]
- [[_COMMUNITY_UI Theme & Toast Messaging|UI Theme & Toast Messaging]]
- [[_COMMUNITY_DHIS2 & System Analytics Models|DHIS2 & System Analytics Models]]
- [[_COMMUNITY_Referral React Query Hooks|Referral React Query Hooks]]
- [[_COMMUNITY_Facility Readiness & Bed Capacity Models|Facility Readiness & Bed Capacity Models]]
- [[_COMMUNITY_Facility Readiness Scoring & UI|Facility Readiness Scoring & UI]]
- [[_COMMUNITY_Call Centre & Dispatch Operations|Call Centre & Dispatch Operations]]
- [[_COMMUNITY_Live Ambulance Tracking Map|Live Ambulance Tracking Map]]
- [[_COMMUNITY_District & Facility Administrative Services|District & Facility Administrative Services]]
- [[_COMMUNITY_Skeleton Loading Components|Skeleton Loading Components]]
- [[_COMMUNITY_Facility Readiness Map Component|Facility Readiness Map Component]]
- [[_COMMUNITY_Priority Badge Components|Priority Badge Components]]
- [[_COMMUNITY_Phone Number Validation Utilities|Phone Number Validation Utilities]]
- [[_COMMUNITY_Facilities Mapping Utilities|Facilities Mapping Utilities]]
- [[_COMMUNITY_Firebase Service Worker & Push Messaging|Firebase Service Worker & Push Messaging]]
- [[_COMMUNITY_Page Transitions & Animations|Page Transitions & Animations]]
- [[_COMMUNITY_Status Indicator Components|Status Indicator Components]]
- [[_COMMUNITY_Admin Settings Module|Admin Settings Module]]
- [[_COMMUNITY_App Root Layout & Providers|App Root Layout & Providers]]
- [[_COMMUNITY_Single Facility Map View|Single Facility Map View]]
- [[_COMMUNITY_Searchable Select UI Component|Searchable Select UI Component]]
- [[_COMMUNITY_Status Badge UI Component|Status Badge UI Component]]
- [[_COMMUNITY_Empty State UI Component|Empty State UI Component]]
- [[_COMMUNITY_Stat Card Component|Stat Card Component]]
- [[_COMMUNITY_Data Table Component|Data Table Component]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Next.js Build Configuration|Next.js Build Configuration]]
- [[_COMMUNITY_Auth Pages Layout|Auth Pages Layout]]
- [[_COMMUNITY_User Settings Page|User Settings Page]]
- [[_COMMUNITY_React Query Provider|React Query Provider]]
- [[_COMMUNITY_Next.js TypeScript Declaration|Next.js TypeScript Declaration]]
- [[_COMMUNITY_UI Components Index Export|UI Components Index Export]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]

## God Nodes (most connected - your core abstractions)
1. `CallCentrePage()` - 26 edges
2. `TriagePage()` - 17 edges
3. `useAuthStore` - 17 edges
4. `useUIStore` - 10 edges
5. `Register` - 9 edges
6. `Referral` - 8 edges
7. `Product` - 8 edges
8. `ReferralDetailPage()` - 7 edges
9. `useReferralInvalidation()` - 6 edges
10. `ReadinessDetailModal()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `ForgotPasswordPage()` --calls--> `Register`  [INFERRED]
  src/app/(auth)/forgot-password/page.tsx → PRODUCT.md
- `ResetPasswordPage()` --calls--> `Register`  [INFERRED]
  src/app/(auth)/reset-password/page.tsx → PRODUCT.md
- `LoginForm()` --calls--> `Register`  [INFERRED]
  src/app/(auth)/login/page.tsx → PRODUCT.md
- `NewPatientPage()` --calls--> `Register`  [INFERRED]
  src/app/(dashboard)/patients/new/page.tsx → PRODUCT.md
- `NewReferralPage()` --calls--> `Register`  [INFERRED]
  src/app/(dashboard)/referrals/new/page.tsx → PRODUCT.md

## Communities (57 total, 20 thin omitted)

### Community 0 - "Authentication & API Client"
Cohesion: 0.05
Nodes (43): getNotifications(), getUnreadCount(), markAllAsRead(), markAsRead(), Notification, NotificationListResponse, subscribeDevice(), SubscribeDeviceRequest (+35 more)

### Community 1 - "Core Type Definitions"
Cohesion: 0.05
Nodes (32): authService, apiClient, clearTokens(), originalRequest, refreshSubscribers, refreshToken, setTokens(), token (+24 more)

### Community 2 - "Route Guards & Counter Referrals"
Cohesion: 0.07
Nodes (40): CallLocationMap(), CallLocationMapProps, createPin(), pinColour, protocolById, ProtocolQuestion, recommendColour(), TriageColour (+32 more)

### Community 3 - "Referral Authentication & Authorization"
Cohesion: 0.08
Nodes (37): ambulanceKeys, CallCommand, callKeys, facilityKeys, useActiveFacilities(), useAmbulanceFleet(), useAmbulanceRanking(), useCallCentreDashboard() (+29 more)

### Community 4 - "Dashboard & Facility Management"
Cohesion: 0.09
Nodes (26): actionButtonStyle, colourFromReferral(), detailCardStyle, formatDateTime(), formatTime(), PriorityBadge(), readable(), ReferralDetailPage() (+18 more)

### Community 5 - "Clinician Workflow & Triage"
Cohesion: 0.05
Nodes (30): AmbulancesPage(), FacilitiesPage(), ForgotPasswordFormData, ForgotPasswordPage(), forgotPasswordSchema, dangerSignOptions, NewPatientPage(), NewReferralPage() (+22 more)

### Community 6 - "Ambulance Management & Dispatch"
Cohesion: 0.07
Nodes (25): AmbulanceFormData, AmbulanceMap, ambulanceSchema, CrewCandidate, EditAmbulanceFormData, editAmbulanceSchema, Ambulance, AmbulanceListQuery (+17 more)

### Community 7 - "Patient Care Reports & Pre-hospital Vitals"
Cohesion: 0.07
Nodes (22): ChartPayloadEntry, ChartTooltipProps, DASHBOARD_TABS, DistrictPerformance, formatMinutes(), formatNumber(), formatPercent(), MapFacility (+14 more)

### Community 8 - "Notification Service & Bell Dropdown"
Cohesion: 0.07
Nodes (27): AmbulanceStatus, NEMSRequestStatus, Ambulance, AmbulanceRank, Call, CallCentreDashboard, CallCommandRequest, CallEvent (+19 more)

### Community 9 - "Analytics Dashboard & Visualizations"
Cohesion: 0.08
Nodes (17): ChartPayloadEntry, ChartTooltipProps, COLORS, FacilityPerformance, FacilityReadinessMap, FacilityWithDistrict, MapFacility, OutcomeRow (+9 more)

### Community 10 - "UI Theme & Toast Messaging"
Cohesion: 0.09
Nodes (22): AnalyticsQuery, AnalyticsTrendPoint, DHIS2DataValue, DHIS2Export, DistrictPerformanceResponse, DistrictPerformanceRow, FacilityAnalytics, FacilityOutcome (+14 more)

### Community 11 - "DHIS2 & System Analytics Models"
Cohesion: 0.1
Nodes (21): getStageIndex(), ReferralLifecycleStepper(), ReferralLifecycleStepperProps, STAGES, ReferralStatus, AddNoteRequest, AmbulanceSummary, AssignAmbulanceRequest (+13 more)

### Community 12 - "Referral React Query Hooks"
Cohesion: 0.09
Nodes (21): ABCStatus, BODY_REGIONS, BodyRegion, CreatePatientReportRequest, INTERVENTIONS, LocationType, MissionTimeline, NON_TRAUMATIC_CONDITIONS (+13 more)

### Community 13 - "Facility Readiness & Bed Capacity Models"
Cohesion: 0.12
Nodes (17): ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, LoginResponse, RefreshRequest, RefreshResponse, RegisterRequest, ResetPasswordRequest (+9 more)

### Community 14 - "Facility Readiness Scoring & UI"
Cohesion: 0.12
Nodes (11): ACTIVE_MISSION_STATUSES, elapsed(), EN_ROUTE_STATUSES, KpiProps, MissionsMap, missionStatusLabel, NemsCallCentreDashboard(), bucketColour() (+3 more)

### Community 15 - "Call Centre & Dispatch Operations"
Cohesion: 0.15
Nodes (13): ThemeProvider(), Toast, UIState, useIsLoading(), useMobileSidebarOpen(), useSidebarCollapsed(), useTheme(), useToast() (+5 more)

### Community 17 - "District & Facility Administrative Services"
Cohesion: 0.14
Nodes (13): ReadinessLevel, BedMonitoring, BedsByWard, BloodBankStatus, BloodUnit, BloodUnits, CreateReadinessRequest, CreateReminderRequest (+5 more)

### Community 18 - "Skeleton Loading Components"
Cohesion: 0.17
Nodes (11): FacilityType, BulkUploadError, BulkUploadFacilityItem, BulkUploadResult, CreateFacilityRequest, Facility, FacilityListQuery, FacilityStats (+3 more)

### Community 19 - "Facility Readiness Map Component"
Cohesion: 0.2
Nodes (5): Props, Referral, SingleFacilityMap, PatientFormData, patientSchema

### Community 20 - "Priority Badge Components"
Cohesion: 0.2
Nodes (9): ApiError, ApiResponse, ArrivalCondition, DateRange, Outcome, Pagination, PaginationMeta, Priority (+1 more)

### Community 21 - "Phone Number Validation Utilities"
Cohesion: 0.53
Nodes (9): calculateScore(), FacilityReadinessCard(), getScoreColor(), getStatusBg(), getStatusColor(), getTotalBloodUnits(), ReadinessDetailModal(), SingleFacilityView() (+1 more)

### Community 23 - "Firebase Service Worker & Push Messaging"
Cohesion: 0.22
Nodes (5): ActiveReferral, Ambulance, Facility, NationalReferralMapProps, PRIORITY_COLORS

### Community 24 - "Page Transitions & Animations"
Cohesion: 0.25
Nodes (4): RecentDownload, recentDownloads, Report, reports

### Community 25 - "Status Indicator Components"
Cohesion: 0.29
Nodes (6): CreatePatientRequest, Patient, PatientListQuery, PatientSearchQuery, PatientSummary, UpdatePatientRequest

### Community 26 - "Admin Settings Module"
Cohesion: 0.29
Nodes (5): bloodTypes, BloodUnit, staffingStatusOptions, statusOptions, WardBed

### Community 31 - "Empty State UI Component"
Cohesion: 0.33
Nodes (4): defaultConfig, Priority, PriorityBadgeProps, priorityConfig

### Community 33 - "Data Table Component"
Cohesion: 0.4
Nodes (3): firebaseConfig, options, payload

### Community 37 - "User Settings Page"
Cohesion: 0.4
Nodes (3): statusConfig, StatusIndicatorProps, StatusType

### Community 38 - "React Query Provider"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (4): DistrictDashboardPage(), formatMinutes(), formatNumber(), formatPercent()

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (3): createFacilityIcon(), SingleFacilityMap(), SingleFacilityMapProps

## Knowledge Gaps
- **346 isolated node(s):** `eslintConfig`, `nextConfig`, `firebaseConfig`, `payload`, `options` (+341 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Register` connect `Clinician Workflow & Triage` to `Authentication & API Client`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Authentication & API Client` to `Community 42`, `Dashboard & Facility Management`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CallCentrePage()` (e.g. with `useUser()` and `useToast()`) actually correct?**
  _`CallCentrePage()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `TriagePage()` (e.g. with `useUser()` and `useToast()`) actually correct?**
  _`TriagePage()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `useAuthStore` (e.g. with `LoginForm()` and `DashboardPage()`) actually correct?**
  _`useAuthStore` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useUIStore` (e.g. with `ThemeProvider()` and `ToastContainer()`) actually correct?**
  _`useUIStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `Register` (e.g. with `ForgotPasswordPage()` and `ResetPasswordPage()`) actually correct?**
  _`Register` has 8 INFERRED edges - model-reasoned connections that need verification._