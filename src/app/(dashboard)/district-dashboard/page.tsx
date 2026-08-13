'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuthStore } from '@/store';
import { analyticsService } from '@/lib/api/analytics';
import { readinessService } from '@/lib/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import dynamic from 'next/dynamic';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Hospital,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Target,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { DataTable } from '@/components/ui';
import type { AnalyticsQuery, FacilityAnalytics, FacilityReadiness } from '@/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const FacilityReadinessMap = dynamic(
  () => import('@/components/maps/FacilityReadinessMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-overlay)',
        borderRadius: 'var(--radius-md)'
      }}>
        <div className="spinner" />
      </div>
    )
  }
);

type PeriodOption = '7d' | '30d' | '90d' | '1y';
type Tone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'slate';

type FacilityWithDistrict = {
  districtId?: string;
  district?: {
    id?: string;
    name?: string;
  };
};

type UserWithDistrict = {
  districtId?: string;
  district?: {
    id?: string;
    name?: string;
  };
};

type ChartPayloadEntry = {
  dataKey?: string;
  color?: string;
  name?: string;
  value?: number | string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string;
};

type MapFacility = {
  name?: string;
  latitude?: number;
  longitude?: number;
};

type ReadinessMapSource = Omit<FacilityReadiness, 'facility'> & {
  facility?: MapFacility;
};

type FacilityPerformance = {
  id: string;
  facilityName: string;
  referralCount: number;
  receivedCount: number;
  sentCount: number;
  acceptanceRate: number;
  rejectionRate: number;
  averageResponseTime: number;
  readinessScore: number;
};

type ProgressRowData = {
  label: string;
  value: number;
  total: number;
  color: string;
  suffix?: string;
};

type OutcomeRow = {
  name: string;
  value: number;
  color: string;
};

const PERIOD_OPTIONS: Array<{ value: PeriodOption; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
];

const PERIOD_DAYS: Record<PeriodOption, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const PERIOD_GROUP_BY: Record<PeriodOption, AnalyticsQuery['groupBy']> = {
  '7d': 'DAY',
  '30d': 'DAY',
  '90d': 'WEEK',
  '1y': 'MONTH',
};

const TONE_COLORS: Record<Tone, string> = {
  blue: '#2563EB',
  green: '#16A34A',
  amber: '#F59E0B',
  red: '#DC2626',
  purple: '#7C3AED',
  cyan: '#0891B2',
  slate: '#64748B',
};

const formatMinutes = (value?: number) => `${Math.round(value || 0)} min`;
const formatPercent = (value?: number) => `${(value || 0).toFixed(1)}%`;
const formatNumber = (value?: number) => (value || 0).toLocaleString();

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        fontSize: '12px'
      }}>
        <p style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey || entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: entry.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Number(entry.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function SectionState({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: 220,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-tertiary)',
      fontSize: '14px',
      textAlign: 'center',
      padding: 'var(--space-6)'
    }}>
      {message}
    </div>
  );
}

function SectionLoading({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: 220,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-3)',
      color: 'var(--text-secondary)',
      fontSize: '14px'
    }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
      {message}
    </div>
  );
}

function CardTitle({ icon: Icon, title, meta }: { icon: LucideIcon; title: string; meta?: string }) {
  return (
    <div className="national-card-header">
      <h3 className="card-title" style={{ margin: 0 }}>
        <Icon size={16} />
        {title}
      </h3>
      {meta && (
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 600 }}>
          {meta}
        </span>
      )}
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div style={{ height: 28 }} />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 26 - ((value - min) / range) * 22;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: '100%', height: 28, marginTop: 8 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  meta,
  icon: Icon,
  tone,
  sparkline,
}: {
  label: string;
  value: string | number;
  meta: string;
  icon: LucideIcon;
  tone: Tone;
  sparkline: number[];
}) {
  const color = TONE_COLORS[tone];
  return (
    <div className="national-card national-kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div style={{ minWidth: 0 }}>
          <div className="national-kpi-label">{label}</div>
          <div className="national-kpi-value">{value}</div>
        </div>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${color}18`,
          color,
          flex: '0 0 auto'
        }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="national-kpi-meta">{meta}</div>
      <Sparkline values={sparkline} color={color} />
    </div>
  );
}

function ProgressRow({ label, value, total, color, suffix }: ProgressRowData) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, marginBottom: 7 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
          {value.toLocaleString()}{suffix ?? ` (${percent}%)`}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-overlay)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function MiniMetricCard({ label, value, target, icon: Icon, tone }: {
  label: string;
  value: string;
  target: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const color = TONE_COLORS[tone];
  return (
    <div style={{
      minHeight: 142,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-default)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minWidth: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>{target}</div>
      </div>
    </div>
  );
}

export default function DistrictDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState<PeriodOption>('30d');

  const userDistrict = user as UserWithDistrict | null;
  const userFacility = user?.facility as FacilityWithDistrict | undefined;
  const districtId = userDistrict?.districtId || userDistrict?.district?.id || userFacility?.districtId || userFacility?.district?.id || '';
  const districtName = userDistrict?.district?.name || userFacility?.district?.name || 'Your District';

  const analyticsQuery = useMemo<AnalyticsQuery>(() => {
    const now = new Date();
    const days = PERIOD_DAYS[period];
    return {
      dateFrom: format(startOfDay(subDays(now, days - 1)), 'yyyy-MM-dd'),
      dateTo: format(endOfDay(now), 'yyyy-MM-dd'),
      districtId,
      groupBy: PERIOD_GROUP_BY[period],
    };
  }, [period, districtId]);

  const {
    data: districtAnalytics,
    isLoading: isLoadingAnalytics,
    isError: isAnalyticsError,
  } = useQuery({
    queryKey: ['analytics', 'district-dashboard', analyticsQuery],
    queryFn: () => analyticsService.getNationalDashboard(analyticsQuery),
    enabled: !!districtId,
  });

  const { data: facilityData, isLoading: isLoadingFacilities } = useQuery({
    queryKey: ['analytics', 'facilities', 'district', analyticsQuery],
    queryFn: () => analyticsService.getFacilityAnalytics(analyticsQuery),
    enabled: !!districtId,
  });

  const { data: readinessData } = useQuery({
    queryKey: ['readiness', 'all-current', districtId],
    queryFn: () => readinessService.getAllCurrent(districtId),
    enabled: !!districtId,
  });

  const summary = districtAnalytics?.summary;
  const readinessStatus = districtAnalytics?.readinessStatus;
  const fleetStatus = districtAnalytics?.fleetStatus;
  const trendData = districtAnalytics?.trends || [];
  const missionTotal = summary?.totalMissions || 0;
  const referralTotal = summary?.totalReferrals || 0;
  const sparklineValues = trendData.length > 1 ? trendData.slice(-12).map((point) => point.total) : [0, 1, 0];

  const readinessByFacility = useMemo(() => {
    const map = new Map<string, FacilityReadiness>();
    (readinessData || []).forEach((readiness) => map.set(readiness.facilityId, readiness));
    return map;
  }, [readinessData]);

  const facilityTableData = useMemo<FacilityPerformance[]>(() => {
    return (facilityData || []).map((facility: FacilityAnalytics) => {
      const readiness = readinessByFacility.get(facility.facilityId);
      const receivedCount = facility.totalReferralsReceived || 0;
      const sentCount = facility.totalReferralsSent || 0;
      return {
        id: facility.facilityId,
        facilityName: facility.facilityName,
        referralCount: receivedCount + sentCount,
        receivedCount,
        sentCount,
        acceptanceRate: facility.acceptanceRate || 0,
        rejectionRate: facility.rejectionRate || 0,
        averageResponseTime: facility.averageResponseTimeMinutes || 0,
        readinessScore: readiness?.overallScore || 0,
      };
    }).sort((a, b) => b.referralCount - a.referralCount);
  }, [facilityData, readinessByFacility]);

  const mapFacilities = useMemo(() => {
    const readiness = (readinessData || []) as ReadinessMapSource[];
    return readiness.map((report) => ({
      id: report.facilityId,
      name: report.facilityName || report.facility?.name || 'Unknown',
      latitude: report.facility?.latitude,
      longitude: report.facility?.longitude,
      readinessScore: report.overallScore,
      bedAvailability: report.bedCapacityAvailable,
    }));
  }, [readinessData]);

  const colourRows = useMemo<ProgressRowData[]>(() => {
    const distribution = districtAnalytics?.colourCodeDistribution || {};
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0) || referralTotal;
    return [
      { label: 'Red (Critical)', value: distribution.RED || 0, total, color: '#DC2626' },
      { label: 'Yellow (Urgent)', value: distribution.YELLOW || 0, total, color: '#F59E0B' },
      { label: 'Green (Non-urgent)', value: distribution.GREEN || 0, total, color: '#16A34A' },
      { label: 'Other / Info', value: Math.max(total - (distribution.RED || 0) - (distribution.YELLOW || 0) - (distribution.GREEN || 0), 0), total, color: '#64748B' },
    ];
  }, [districtAnalytics?.colourCodeDistribution, referralTotal]);

  const priorityRows = useMemo<ProgressRowData[]>(() => {
    const distribution = districtAnalytics?.priorityDistribution || {};
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0) || referralTotal;
    return [
      { label: 'Critical', value: distribution.CRITICAL || 0, total, color: '#DC2626' },
      { label: 'High', value: distribution.HIGH || 0, total, color: '#F97316' },
      { label: 'Medium', value: distribution.MEDIUM || 0, total, color: '#2563EB' },
      { label: 'Low', value: distribution.LOW || 0, total, color: '#16A34A' },
    ];
  }, [districtAnalytics?.priorityDistribution, referralTotal]);

  const outcomeRows = useMemo<OutcomeRow[]>(() => {
    const cancelled = Math.round(missionTotal * ((summary?.abortRate || 0) / 100));
    const nonCancelled = Math.max(missionTotal - cancelled, 0);
    const completed = Math.round(nonCancelled * ((summary?.missionSuccessRate || 0) / 100));
    const other = Math.max(missionTotal - completed - cancelled, 0);
    return [
      { name: 'Completed', value: completed, color: '#16A34A' },
      { name: 'Cancelled', value: cancelled, color: '#DC2626' },
      { name: 'Other Active', value: other, color: '#64748B' },
    ].filter((row) => row.value > 0 || missionTotal === 0);
  }, [missionTotal, summary?.abortRate, summary?.missionSuccessRate]);

  const responseRows = [
    { label: 'Avg Response Time', value: summary?.averageResponseTimeMinutes || 0, target: 15 },
    { label: 'Avg Time to Scene', value: summary?.averageTimeToSceneMinutes || 0, target: 30 },
    { label: 'Avg Time to Hospital', value: summary?.averageTimeToHospitalMinutes || 0, target: 60 },
    { label: 'Turnaround Time', value: summary?.averageTurnaroundMinutes || 0, target: 90 },
    { label: 'Call to Clinician', value: summary?.averageTimeToClinicianMinutes || 0, target: 15 },
  ];

  const operationalAlerts = [
    {
      show: (summary?.abortRate || 0) > 10,
      icon: XCircle,
      color: '#DC2626',
      title: 'High abort rate detected',
      body: `Abort rate is ${formatPercent(summary?.abortRate)} against the district target of 10%.`,
    },
    {
      show: (summary?.averageTimeToSceneMinutes || 0) > 30,
      icon: Clock,
      color: '#F59E0B',
      title: 'Response time above target',
      body: `Average time to scene is ${formatMinutes(summary?.averageTimeToSceneMinutes)}.`,
    },
    {
      show: (fleetStatus?.available || 0) === 0,
      icon: Ambulance,
      color: '#2563EB',
      title: 'Ambulance unavailable',
      body: 'No available ambulance is currently linked to this district.',
    },
    {
      show: (readinessStatus?.low || 0) > 0,
      icon: Bed,
      color: '#7C3AED',
      title: 'Facility readiness low',
      body: `${readinessStatus?.low || 0} facilities are reporting low readiness.`,
    },
  ].filter((alert) => alert.show);

  const handleExportCSV = () => {
    const headers = ['Facility', 'Referrals', 'Received', 'Sent', 'Acceptance Rate', 'Rejection Rate', 'Avg Response', 'Readiness'];
    const rows = facilityTableData.map((facility) => [
      facility.facilityName,
      facility.referralCount,
      facility.receivedCount,
      facility.sentCount,
      facility.acceptanceRate.toFixed(1),
      facility.rejectionRate.toFixed(1),
      facility.averageResponseTime.toFixed(1),
      facility.readinessScore.toFixed(1),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `district-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columnHelper = createColumnHelper<FacilityPerformance>();
  const columns = useMemo(() => [
    columnHelper.accessor('facilityName', {
      header: 'Facility',
      cell: info => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Building2 size={16} style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ fontWeight: 600 }}>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('referralCount', {
      header: 'Referrals',
      cell: info => <span style={{ fontWeight: 800 }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('receivedCount', {
      header: 'Received',
      cell: info => <span>{info.getValue()}</span>,
    }),
    columnHelper.accessor('sentCount', {
      header: 'Sent',
      cell: info => <span>{info.getValue()}</span>,
    }),
    columnHelper.accessor('acceptanceRate', {
      header: 'Acceptance',
      cell: info => <span style={{ color: 'var(--success)', fontWeight: 800 }}>{formatPercent(info.getValue())}</span>,
    }),
    columnHelper.accessor('averageResponseTime', {
      header: 'Avg Response',
      cell: info => <span style={{ fontWeight: 700 }}>{formatMinutes(info.getValue())}</span>,
    }),
    columnHelper.accessor('readinessScore', {
      header: 'Readiness',
      cell: info => {
        const score = info.getValue();
        const color = score >= 8 ? 'var(--success)' : score >= 5 ? 'var(--warning)' : 'var(--error)';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, color }}>{score.toFixed(1)}</span>
            {score > 0 && score < 6 && <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />}
          </div>
        );
      },
    }),
  ], [columnHelper]);

  if (!districtId) {
    return <SectionState message="No district is linked to your account yet." />;
  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={24} style={{ color: 'var(--accent)' }} />
            {districtName} District Dashboard
          </h1>
          <p className="page-subtitle">
            Real-time overview of emergency referral and ambulance performance in the district
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="btn btn-ghost btn-sm" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} />
            {analyticsQuery.dateFrom} to {analyticsQuery.dateTo}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} type="button">
            <Download size={14} />
            Export CSV
          </button>
          <div style={{ display: 'flex', gap: 4, padding: 4, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)' }}>
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`btn btn-sm ${period === option.value ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod(option.value)}
                style={{ minWidth: 68 }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="national-tabs" aria-label="District dashboard sections">
        {['Overview', 'Demand', 'Response', 'Resources', 'Exceptions'].map((tab, index) => (
          <button key={tab} type="button" className={`national-tab ${index === 0 ? 'active' : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      {isAnalyticsError && (
        <div className="national-card" style={{
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-4)',
          borderColor: 'var(--error)',
          color: 'var(--error)'
        }}>
          Unable to load district analytics. Please try again.
        </div>
      )}

      <div className="national-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <KpiCard label="Total Missions" value={isLoadingAnalytics ? '...' : formatNumber(summary?.totalMissions)} meta={`${formatNumber(summary?.totalReferrals)} referrals`} icon={Activity} tone="blue" sparkline={sparklineValues} />
        <KpiCard label="Mission Success Rate" value={isLoadingAnalytics ? '...' : formatPercent(summary?.missionSuccessRate)} meta="Completed / non-cancelled" icon={CheckCircle2} tone="green" sparkline={sparklineValues} />
        <KpiCard label="Avg Time to Scene" value={isLoadingAnalytics ? '...' : formatMinutes(summary?.averageTimeToSceneMinutes)} meta="Target: <= 30 min" icon={Clock} tone="purple" sparkline={sparklineValues} />
        <KpiCard label="Avg Time to Hospital" value={isLoadingAnalytics ? '...' : formatMinutes(summary?.averageTimeToHospitalMinutes)} meta="Target: <= 60 min" icon={Hospital} tone="amber" sparkline={sparklineValues} />
        <KpiCard label="Abort Rate" value={isLoadingAnalytics ? '...' : formatPercent(summary?.abortRate)} meta="Target: <= 10%" icon={XCircle} tone="red" sparkline={sparklineValues} />
        <KpiCard label="Seen by Clinician" value={isLoadingAnalytics ? '...' : formatMinutes(summary?.averageTimeToClinicianMinutes)} meta="Referral to review" icon={Stethoscope} tone="cyan" sparkline={sparklineValues} />
      </div>

      <div className="national-overview-grid" style={{ gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(0, 1.35fr) minmax(300px, 1fr)' }}>
        <div className="national-card">
          <CardTitle icon={ShieldCheck} title="Missions by Priority" />
          <div className="national-card-body">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={colourRows} dataKey="value" nameKey="label" innerRadius={58} outerRadius={86} paddingAngle={2}>
                    {colourRows.map((row) => (
                      <Cell key={row.label} fill={row.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {colourRows.map((row) => <ProgressRow key={row.label} {...row} />)}
            </div>
          </div>
        </div>

        <div className="national-card national-trend-card">
          <CardTitle icon={TrendingUp} title="Missions Over Time" meta={`Grouped by ${analyticsQuery.groupBy?.toLowerCase()}`} />
          <div className="national-card-body" style={{ height: 360 }}>
            {isLoadingAnalytics ? (
              <SectionLoading message="Loading district trends..." />
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 22, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="red" name="Red" stroke="#DC2626" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="yellow" name="Yellow" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="green" name="Green" stroke="#16A34A" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="other" name="Other" stroke="#64748B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <SectionState message="No trend data available for this period." />
            )}
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={CheckCircle2} title="Missions by Outcome" />
          <div className="national-card-body" style={{ display: 'grid', gap: 16 }}>
            {outcomeRows.map((row) => <ProgressRow key={row.name} label={row.name} value={row.value} total={Math.max(missionTotal, 1)} color={row.color} />)}
          </div>
        </div>
      </div>

      <div className="national-overview-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(300px, 1fr)' }}>
        <div className="national-card">
          <CardTitle icon={AlertTriangle} title="Demand by Priority" />
          <div className="national-card-body" style={{ height: 305 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityRows} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-subtle)" />
                <XAxis type="number" hide />
                <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Count" radius={[0, 5, 5, 0]} barSize={24}>
                  {priorityRows.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={Building2} title="Facility Readiness Map" />
          <div className="national-card-body" style={{ padding: 'var(--space-2)' }}>
            <FacilityReadinessMap facilities={mapFacilities} height={300} />
            <div style={{ padding: 'var(--space-3) var(--space-2) var(--space-2)', display: 'flex', gap: 'var(--space-4)', fontSize: 12, flexWrap: 'wrap' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16A34A', marginRight: 6 }} />High</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', marginRight: 6 }} />Medium</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#DC2626', marginRight: 6 }} />Low</span>
            </div>
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={AlertTriangle} title="Alerts & Notifications" />
          <div className="national-card-body" style={{ display: 'grid', gap: 14 }}>
            {operationalAlerts.length > 0 ? operationalAlerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div key={alert.title} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 12, alignItems: 'start' }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: `${alert.color}14`,
                    color: alert.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>{alert.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{alert.body}</div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                No district operational alerts for this period.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="national-secondary-grid">
        <div className="national-card national-wide-card">
          <CardTitle icon={Target} title="Response Performance Summary" />
          <div className="national-card-body national-inline-grid">
            {responseRows.slice(0, 4).map((row, index) => (
              <MiniMetricCard
                key={row.label}
                label={row.label}
                value={formatMinutes(row.value)}
                target={`Target: <= ${row.target} min`}
                icon={[Clock, Ambulance, Hospital, Activity][index]}
                tone={row.value > row.target ? 'red' : 'green'}
              />
            ))}
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={Bed} title="Readiness Summary" meta={`${Math.round(readinessStatus?.reportingRate || 0)}% reporting`} />
          <div className="national-card-body" style={{ display: 'grid', gap: 16 }}>
            <ProgressRow label="Reporting Facilities" value={readinessStatus?.reportingFacilities || 0} total={Math.max(readinessStatus?.totalFacilities || 0, 1)} color="#2563EB" />
            <ProgressRow label="High Readiness" value={readinessStatus?.high || 0} total={Math.max(readinessStatus?.reportingFacilities || 0, 1)} color="#16A34A" />
            <ProgressRow label="Medium Readiness" value={readinessStatus?.medium || 0} total={Math.max(readinessStatus?.reportingFacilities || 0, 1)} color="#F59E0B" />
            <ProgressRow label="Low Readiness" value={readinessStatus?.low || 0} total={Math.max(readinessStatus?.reportingFacilities || 0, 1)} color="#DC2626" />
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={Building2} title="Top Facilities by Referrals" />
          <div className="national-card-body" style={{ display: 'grid', gap: 14 }}>
            {facilityTableData.slice(0, 5).length > 0 ? facilityTableData.slice(0, 5).map((facility, index) => (
              <ProgressRow
                key={facility.id}
                label={`${index + 1}. ${facility.facilityName}`}
                value={facility.referralCount}
                total={Math.max(facilityTableData[0]?.referralCount || 1, 1)}
                color="#2563EB"
                suffix=""
              />
            )) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No facility data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="national-card" style={{ marginTop: 'var(--space-4)' }}>
        <CardTitle icon={Building2} title="Facility Performance" meta="District facility comparison" />
        {isLoadingFacilities ? (
          <SectionLoading message="Loading facility performance..." />
        ) : (
          <DataTable
            data={facilityTableData}
            columns={columns}
            emptyMessage="No facility data available"
          />
        )}
      </div>
    </>
  );
}
