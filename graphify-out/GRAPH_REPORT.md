# Graph Report - swift-rms-client  (2026-08-11)

## Corpus Check
- 110 files · ~71,784 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 571 nodes · 739 edges · 50 communities (34 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d333eaed`
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
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 17 edges
2. `useUIStore` - 10 edges
3. `Referral` - 8 edges
4. `ReadinessDetailModal()` - 6 edges
5. `SingleFacilityView()` - 6 edges
6. `FacilitySummary` - 5 edges
7. `getScoreColor()` - 4 edges
8. `getStatusColor()` - 4 edges
9. `getStatusBg()` - 4 edges
10. `calculateScore()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `DistrictDashboardPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(dashboard)/district-dashboard/page.tsx → src/store/authStore.ts
- `LoginForm()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(auth)/login/page.tsx → src/store/authStore.ts
- `DashboardPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(dashboard)/page.tsx → src/store/authStore.ts
- `ReferralDetailPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(dashboard)/referrals/[id]/page.tsx → src/store/authStore.ts
- `ProfilePage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(dashboard)/profile/page.tsx → src/store/authStore.ts

## Communities (50 total, 16 thin omitted)

### Community 0 - "Authentication & API Client"
Cohesion: 0.05
Nodes (44): ReferralDetailPage(), canModifyReferral(), FacilityTransferVisualizer(), FacilityTransferVisualizerProps, InterventionsCard(), InterventionsCardProps, NEMSTransportCard(), NEMSTransportCardProps (+36 more)

### Community 1 - "Core Type Definitions"
Cohesion: 0.05
Nodes (31): RouteGuard(), RouteGuardProps, CounterReferralsPage(), Referral, DashboardPage(), Referral, NavItem, NavSection (+23 more)

### Community 2 - "Route Guards & Counter Referrals"
Cohesion: 0.05
Nodes (20): Ambulance, referralService, FacilitiesMap, facilityTypes, ForgotPasswordFormData, forgotPasswordSchema, Props, Referral (+12 more)

### Community 3 - "Referral Authentication & Authorization"
Cohesion: 0.05
Nodes (17): COLORS, analyticsService, COLORS, DistrictDashboardPage(), FacilityPerformance, FacilityReadinessMap, DistrictPerformance, NationalReferralMap (+9 more)

### Community 4 - "Dashboard & Facility Management"
Cohesion: 0.09
Nodes (19): AmbulanceFormData, AmbulanceMap, ambulanceSchema, CrewCandidate, EditAmbulanceFormData, editAmbulanceSchema, AmbulanceListQuery, ambulanceService (+11 more)

### Community 5 - "Clinician Workflow & Triage"
Cohesion: 0.09
Nodes (21): ABCStatus, BODY_REGIONS, BodyRegion, CreatePatientReportRequest, INTERVENTIONS, LocationType, MissionTimeline, NON_TRAUMATIC_CONDITIONS (+13 more)

### Community 6 - "Ambulance Management & Dispatch"
Cohesion: 0.14
Nodes (17): getNotifications(), getUnreadCount(), markAllAsRead(), markAsRead(), Notification, NotificationListResponse, subscribeDevice(), SubscribeDeviceRequest (+9 more)

### Community 7 - "Patient Care Reports & Pre-hospital Vitals"
Cohesion: 0.15
Nodes (13): ThemeProvider(), Toast, UIState, useIsLoading(), useMobileSidebarOpen(), useSidebarCollapsed(), useTheme(), useToast() (+5 more)

### Community 8 - "Notification Service & Bell Dropdown"
Cohesion: 0.12
Nodes (15): AnalyticsQuery, DHIS2DataValue, DHIS2Export, FacilityAnalytics, FacilityOutcome, FacilityResponseTime, GenerateReportRequest, HeatmapData (+7 more)

### Community 9 - "Analytics Dashboard & Visualizations"
Cohesion: 0.12
Nodes (15): AmbulanceStatus, NEMSRequestStatus, Priority, Ambulance, Call, CallCentreDashboard, CreateCallRequest, CreateNEMSRequest (+7 more)

### Community 11 - "DHIS2 & System Analytics Models"
Cohesion: 0.17
Nodes (11): callCentreService, nemsService, patientReportService, PatientReportPage(), STEP_ICONS, defaultFormData, defaultTimeline, FORM_STEPS (+3 more)

### Community 12 - "Referral React Query Hooks"
Cohesion: 0.16
Nodes (8): authService, apiClient, clearTokens(), originalRequest, refreshSubscribers, refreshToken, setTokens(), token

### Community 13 - "Facility Readiness & Bed Capacity Models"
Cohesion: 0.17
Nodes (10): ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, LoginResponse, RefreshRequest, RefreshResponse, RegisterRequest, ResetPasswordRequest (+2 more)

### Community 14 - "Facility Readiness Scoring & UI"
Cohesion: 0.15
Nodes (12): BedMonitoring, BedsByWard, BloodBankStatus, BloodUnit, BloodUnits, CreateReadinessRequest, CreateReminderRequest, EquipmentStatus (+4 more)

### Community 15 - "Call Centre & Dispatch Operations"
Cohesion: 0.17
Nodes (11): BulkUploadError, BulkUploadFacilityItem, BulkUploadResult, CreateFacilityRequest, DistrictSummary, Facility, FacilityListQuery, FacilityStats (+3 more)

### Community 16 - "Live Ambulance Tracking Map"
Cohesion: 0.18
Nodes (10): ApiError, ApiResponse, ArrivalCondition, DateRange, FacilityType, Outcome, Pagination, PaginationMeta (+2 more)

### Community 17 - "District & Facility Administrative Services"
Cohesion: 0.53
Nodes (9): calculateScore(), FacilityReadinessCard(), getScoreColor(), getStatusBg(), getStatusColor(), getTotalBloodUnits(), ReadinessDetailModal(), SingleFacilityView() (+1 more)

### Community 18 - "Skeleton Loading Components"
Cohesion: 0.25
Nodes (5): Call, CallCentrePage(), formatDuration(), LogCallModalProps, mockCalls

### Community 19 - "Facility Readiness Map Component"
Cohesion: 0.22
Nodes (5): ActiveReferral, Ambulance, Facility, NationalReferralMapProps, PRIORITY_COLORS

### Community 20 - "Priority Badge Components"
Cohesion: 0.22
Nodes (4): facilityService, patientService, readinessService, userService

### Community 21 - "Phone Number Validation Utilities"
Cohesion: 0.25
Nodes (5): District, districtService, defaultColumnMappings, FacilityFormData, facilitySchema

### Community 22 - "Facilities Mapping Utilities"
Cohesion: 0.29
Nodes (4): CreateUserRequest, User, UserFormData, userSchema

### Community 23 - "Firebase Service Worker & Push Messaging"
Cohesion: 0.29
Nodes (6): UserStatus, UserType, FacilitySummary, UpdateProfileRequest, UpdateUserRequest, UserListQuery

### Community 26 - "Admin Settings Module"
Cohesion: 0.33
Nodes (4): defaultConfig, Priority, PriorityBadgeProps, priorityConfig

### Community 29 - "Searchable Select UI Component"
Cohesion: 0.33
Nodes (4): defaultIcon, FacilitiesMapProps, hospitalIcon, phuIcon

### Community 30 - "Status Badge UI Component"
Cohesion: 0.4
Nodes (3): firebaseConfig, options, payload

### Community 32 - "Stat Card Component"
Cohesion: 0.4
Nodes (3): statusConfig, StatusIndicatorProps, StatusType

### Community 34 - "ESLint Configuration"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 37 - "User Settings Page"
Cohesion: 0.67
Nodes (3): createFacilityIcon(), SingleFacilityMap(), SingleFacilityMapProps

## Knowledge Gaps
- **260 isolated node(s):** `eslintConfig`, `nextConfig`, `firebaseConfig`, `payload`, `options` (+255 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Core Type Definitions` to `Authentication & API Client`, `Referral Authentication & Authorization`, `Ambulance Management & Dispatch`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `useUIStore` connect `Patient Care Reports & Pre-hospital Vitals` to `Core Type Definitions`, `Ambulance Management & Dispatch`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Header()` connect `Ambulance Management & Dispatch` to `Core Type Definitions`, `Patient Care Reports & Pre-hospital Vitals`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `useAuthStore` (e.g. with `LoginForm()` and `DashboardPage()`) actually correct?**
  _`useAuthStore` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `useUIStore` (e.g. with `ThemeProvider()` and `ToastContainer()`) actually correct?**
  _`useUIStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `firebaseConfig` to the rest of the system?**
  _260 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Authentication & API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._