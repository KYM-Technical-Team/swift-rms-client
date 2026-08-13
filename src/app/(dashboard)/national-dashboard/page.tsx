'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import dynamic from 'next/dynamic';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  Ambulance as AmbulanceIcon,
  Bed,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Hospital,
  MapPin,
  Maximize2,
  Navigation,
  Radio,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { analyticsService } from '@/lib/api/analytics';
import { referralService, facilityService, readinessService, ambulanceService } from '@/lib/api';
import { DataTable } from '@/components/ui';
import type { Ambulance as AmbulanceRecord } from '@/lib/api';
import type { AnalyticsQuery, DistrictPerformanceRow, FacilityReadiness, Referral } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const NationalReferralMap = dynamic(
  () => import('@/components/maps/NationalReferralMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 360,
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

const DASHBOARD_TABS = [
  'Overview',
  'Demand & Operations',
  'Response & Performance',
  'Mission Outcomes',
  'District Performance',
  'Trends',
];

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
  type?: string;
  facilityType?: string;
};

type MapPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

type MapReferral = {
  id: string;
  code: string;
  priority: MapPriority;
  status: string;
  fromFacility: { name: string; latitude?: number; longitude?: number };
  toFacility: { name: string; latitude?: number; longitude?: number };
};

type ReferralMapSource = Omit<Referral, 'sendingFacility' | 'receivingFacility'> & {
  sendingFacility?: MapFacility;
  receivingFacility?: MapFacility;
};

type ReadinessMapSource = Omit<FacilityReadiness, 'facility'> & {
  facility?: MapFacility;
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
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          {value.toLocaleString()}{suffix || ` (${percent}%)`}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-overlay)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: 'On Target' | 'Above Target' }) {
  const good = status === 'On Target';
  return (
    <span style={{
      padding: '4px 8px',
      borderRadius: 999,
      background: good ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
      color: good ? '#16A34A' : '#DC2626',
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap'
    }}>
      {status}
    </span>
  );
}

function FleetTile({ icon: Icon, label, value, meta, tone }: {
  icon: LucideIcon;
  label: string;
  value: number;
  meta: string;
  tone: Tone;
}) {
  const color = TONE_COLORS[tone];
  return (
    <div style={{
      minHeight: 120,
      borderRadius: 'var(--radius-lg)',
      background: `${color}10`,
      border: `1px solid ${color}22`,
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <Icon size={22} color={color} />
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 24, color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{meta}</div>
      </div>
    </div>
  );
}

export default function NationalDashboardPage() {
  const [period, setPeriod] = useState<PeriodOption>('30d');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [showReferrals, setShowReferrals] = useState(true);
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [showHighReadiness, setShowHighReadiness] = useState(true);
  const [showMediumReadiness, setShowMediumReadiness] = useState(true);
  const [showLowReadiness, setShowLowReadiness] = useState(true);

  const analyticsQuery = useMemo<AnalyticsQuery>(() => {
    const now = new Date();
    const days = PERIOD_DAYS[period];
    return {
      dateFrom: format(startOfDay(subDays(now, days - 1)), 'yyyy-MM-dd'),
      dateTo: format(endOfDay(now), 'yyyy-MM-dd'),
      groupBy: PERIOD_GROUP_BY[period],
    };
  }, [period]);

  const {
    data: nationalData,
    isLoading: isLoadingNational,
    isError: isNationalError,
  } = useQuery({
    queryKey: ['analytics', 'national-dashboard', analyticsQuery],
    queryFn: () => analyticsService.getNationalDashboard(analyticsQuery),
  });

  const {
    data: districtData,
    isLoading: isLoadingDistricts,
    isError: isDistrictError,
  } = useQuery({
    queryKey: ['analytics', 'district-performance', analyticsQuery],
    queryFn: () => analyticsService.getDistrictPerformance(analyticsQuery),
  });

  const { data: activeReferrals } = useQuery({
    queryKey: ['referrals', 'active'],
    queryFn: () => referralService.list({ status: 'IN_TRANSIT', limit: 100 }),
    refetchInterval: 30000,
  });

  const { data: ambulancesData } = useQuery({
    queryKey: ['ambulances', 'all'],
    queryFn: () => ambulanceService.list({ limit: 100 }),
    refetchInterval: 30000,
  });

  const { data: readinessData } = useQuery({
    queryKey: ['readiness', 'all-current'],
    queryFn: () => readinessService.getAllCurrent(),
  });

  const { data: districtsData } = useQuery({
    queryKey: ['districts'],
    queryFn: () => facilityService.getDistricts(),
  });

  const summary = nationalData?.summary;
  const fleetStatus = nationalData?.fleetStatus;
  const readinessStatus = nationalData?.readinessStatus;
  const districtRows = districtData?.districts || [];
  const trendData = nationalData?.trends || [];
  const periodLabel = `${analyticsQuery.dateFrom} to ${analyticsQuery.dateTo}`;

  const mapReferrals = useMemo(() => {
    const referrals = (activeReferrals?.data || []) as ReferralMapSource[];
    return referrals.map((r): MapReferral => ({
      id: r.id,
      code: r.referralCode,
      priority: r.priority as MapPriority,
      status: r.status,
      fromFacility: {
        name: r.sendingFacility?.name || 'Unknown',
        latitude: r.sendingFacility?.latitude,
        longitude: r.sendingFacility?.longitude,
      },
      toFacility: {
        name: r.receivingFacility?.name || 'Unknown',
        latitude: r.receivingFacility?.latitude,
        longitude: r.receivingFacility?.longitude,
      },
    }));
  }, [activeReferrals]);

  const mapAmbulances = useMemo(() => {
    const ambulances = (ambulancesData?.data || []) as AmbulanceRecord[];
    return ambulances.map((a) => ({
      id: a.id,
      ambulanceId: a.ambulanceId,
      status: a.status,
      latitude: a.latitude,
      longitude: a.longitude,
    }));
  }, [ambulancesData]);

  const mapFacilities = useMemo(() => {
    const readiness = (readinessData || []) as ReadinessMapSource[];
    return readiness.map((r) => ({
      id: r.facilityId,
      name: r.facilityName || r.facility?.name || 'Unknown',
      latitude: r.facility?.latitude,
      longitude: r.facility?.longitude,
      readinessScore: r.overallScore,
      type: r.facility?.type,
    }));
  }, [readinessData]);

  const totalAmbulances = fleetStatus?.total || ambulancesData?.data?.length || 0;
  const availableAmbulances = fleetStatus?.available || 0;
  const operationalAmbulances = (fleetStatus?.available || 0) + (fleetStatus?.onMission || 0);
  const ambulancePercentage = totalAmbulances > 0 ? Math.round((operationalAmbulances / totalAmbulances) * 100) : 0;
  const activeCount = summary?.activeReferrals ?? activeReferrals?.data?.length ?? 0;
  const missionTotal = summary?.totalMissions || 0;
  const referralTotal = summary?.totalReferrals || 0;
  const sparklineValues = trendData.length > 1 ? trendData.slice(-12).map((point) => point.total) : [0, 1, 0];

  const colourRows = useMemo<ProgressRowData[]>(() => {
    const distribution = nationalData?.colourCodeDistribution || {};
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0) || referralTotal;
    return [
      { label: 'Red (Critical)', value: distribution.RED || 0, total, color: '#DC2626' },
      { label: 'Yellow (Urgent)', value: distribution.YELLOW || 0, total, color: '#F59E0B' },
      { label: 'Green (Non-urgent)', value: distribution.GREEN || 0, total, color: '#16A34A' },
      { label: 'Other / Info', value: Math.max(total - (distribution.RED || 0) - (distribution.YELLOW || 0) - (distribution.GREEN || 0), 0), total, color: '#64748B' },
    ];
  }, [nationalData?.colourCodeDistribution, referralTotal]);

  const priorityRows = useMemo<ProgressRowData[]>(() => {
    const distribution = nationalData?.priorityDistribution || {};
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0) || referralTotal;
    return [
      { label: 'Critical', value: distribution.CRITICAL || 0, total, color: '#DC2626' },
      { label: 'High', value: distribution.HIGH || 0, total, color: '#F97316' },
      { label: 'Medium', value: distribution.MEDIUM || 0, total, color: '#2563EB' },
      { label: 'Low', value: distribution.LOW || 0, total, color: '#16A34A' },
    ];
  }, [nationalData?.priorityDistribution, referralTotal]);

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
    { label: 'Avg Turnaround Time', value: summary?.averageTurnaroundMinutes || 0, target: 90 },
    { label: 'Avg Time to Clinician', value: summary?.averageTimeToClinicianMinutes || 0, target: 15 },
  ];

  const operationalAlerts = [
    {
      show: (summary?.abortRate || 0) > 10,
      icon: XCircle,
      color: '#DC2626',
      title: 'High abort rate',
      body: `National abort rate is ${formatPercent(summary?.abortRate)}.`,
    },
    {
      show: (summary?.averageTimeToSceneMinutes || 0) > 30,
      icon: Clock,
      color: '#F59E0B',
      title: 'Response above target',
      body: `Average time to scene is ${formatMinutes(summary?.averageTimeToSceneMinutes)}.`,
    },
    {
      show: availableAmbulances === 0,
      icon: AmbulanceIcon,
      color: '#2563EB',
      title: 'No ambulance availability',
      body: 'No available ambulances are currently reported.',
    },
    {
      show: (readinessStatus?.reportingRate || 0) < 80,
      icon: Bed,
      color: '#7C3AED',
      title: 'Facility readiness low',
      body: `Readiness reporting is ${Math.round(readinessStatus?.reportingRate || 0)}%.`,
    },
  ].filter((alert) => alert.show);

  const columnHelper = createColumnHelper<DistrictPerformanceRow>();
  const columns = useMemo(() => [
    columnHelper.accessor('districtName', {
      header: 'District',
      cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('referralCount', {
      header: 'Referrals',
      cell: info => <span style={{ fontWeight: 800 }}>{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor('missionCount', {
      header: 'Missions',
      cell: info => <span style={{ fontWeight: 800 }}>{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor('averageTimeToSceneMinutes', {
      header: 'Scene Time',
      cell: info => {
        const value = Math.round(info.getValue() || 0);
        return (
          <span style={{ color: value > 30 ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 700 }}>
            {value} min
          </span>
        );
      },
    }),
    columnHelper.accessor('successRate', {
      header: 'Success',
      cell: info => {
        const rate = info.getValue() || 0;
        const color = rate >= 85 ? 'var(--success)' : rate >= 70 ? 'var(--warning)' : 'var(--error)';
        return <span style={{ fontWeight: 800, color }}>{rate.toFixed(1)}%</span>;
      },
    }),
    columnHelper.accessor('abortRate', {
      header: 'Abort',
      cell: info => {
        const rate = info.getValue() || 0;
        const color = rate <= 10 ? 'var(--success)' : rate <= 15 ? 'var(--warning)' : 'var(--error)';
        return <span style={{ fontWeight: 800, color }}>{rate.toFixed(1)}%</span>;
      },
    }),
    columnHelper.accessor('readinessReportingRate', {
      header: 'Readiness',
      cell: info => <span style={{ fontWeight: 700 }}>{formatPercent(info.getValue())}</span>,
    }),
    columnHelper.accessor('availableAmbulances', {
      header: 'Available Amb.',
      cell: info => <span style={{ fontWeight: 800 }}>{info.getValue()}</span>,
    }),
  ], [columnHelper]);

  return (
    <>
      <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={24} />
            National Dashboard
          </h1>
          <p className="page-subtitle">
            Real-time overview of emergency medical services performance across Sierra Leone
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="btn btn-ghost btn-sm" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} />
            {periodLabel}
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)' }}>
            {PERIOD_OPTIONS.map(option => (
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

      <div className="national-tabs" aria-label="National dashboard sections">
        {DASHBOARD_TABS.map((tab, index) => (
          <button key={tab} type="button" className={`national-tab ${index === 0 ? 'active' : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      {isNationalError && (
        <div className="national-card" style={{
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-4)',
          borderColor: 'var(--error)',
          color: 'var(--error)'
        }}>
          Unable to load national analytics. Please try again.
        </div>
      )}

      <div className="national-kpi-grid">
        <KpiCard label="Total Missions" value={isLoadingNational ? '...' : formatNumber(summary?.totalMissions)} meta={`${formatNumber(summary?.totalReferrals)} referrals`} icon={Activity} tone="blue" sparkline={sparklineValues} />
        <KpiCard label="Mission Success Rate" value={isLoadingNational ? '...' : formatPercent(summary?.missionSuccessRate)} meta="Completed / non-cancelled" icon={CheckCircle2} tone="green" sparkline={sparklineValues} />
        <KpiCard label="Avg Response Time" value={isLoadingNational ? '...' : formatMinutes(summary?.averageResponseTimeMinutes)} meta="Call received to dispatch" icon={Radio} tone="amber" sparkline={sparklineValues} />
        <KpiCard label="Avg Time to Scene" value={isLoadingNational ? '...' : formatMinutes(summary?.averageTimeToSceneMinutes)} meta="Dispatch to pickup" icon={Navigation} tone="purple" sparkline={sparklineValues} />
        <KpiCard label="Avg Time to Hospital" value={isLoadingNational ? '...' : formatMinutes(summary?.averageTimeToHospitalMinutes)} meta="Pickup to dropoff" icon={Hospital} tone="cyan" sparkline={sparklineValues} />
        <KpiCard label="Abort Rate" value={isLoadingNational ? '...' : formatPercent(summary?.abortRate)} meta="Cancelled missions" icon={XCircle} tone="red" sparkline={sparklineValues} />
        <KpiCard label="Seen by Clinician" value={isLoadingNational ? '...' : formatMinutes(summary?.averageTimeToClinicianMinutes)} meta="Referral to review" icon={Stethoscope} tone="blue" sparkline={sparklineValues} />
      </div>

      <div className="national-overview-grid">
        <div className="national-card national-trend-card">
          <CardTitle icon={TrendingUp} title="Mission Volume Over Time" meta={`Grouped by ${analyticsQuery.groupBy?.toLowerCase()}`} />
          <div className="national-card-body" style={{ height: 350 }}>
            {isLoadingNational ? (
              <SectionLoading message="Loading referral trends..." />
            ) : isNationalError ? (
              <SectionState message="Unable to load trend data." />
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="red" name="Red" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.78} />
                  <Area type="monotone" dataKey="yellow" name="Yellow" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.76} />
                  <Area type="monotone" dataKey="green" name="Green" stackId="1" stroke="#16A34A" fill="#16A34A" fillOpacity={0.72} />
                  <Area type="monotone" dataKey="other" name="Other" stackId="1" stroke="#64748B" fill="#64748B" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <SectionState message="No referral trend data available for this period." />
            )}
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={CheckCircle2} title="Mission Outcomes" />
          <div className="national-card-body">
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={outcomeRows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2}>
                    {outcomeRows.map((row) => (
                      <Cell key={row.name} fill={row.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {outcomeRows.map((row) => (
                <ProgressRow key={row.name} label={row.name} value={row.value} total={Math.max(missionTotal, 1)} color={row.color} />
              ))}
            </div>
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={MapPin} title="Mission Distribution Map" />
          <div className="national-card-body" style={{ padding: 'var(--space-2)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--space-2)' }}>
              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Districts</option>
                {(districtsData || []).map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
              <select
                value={selectedPriority}
                onChange={(event) => setSelectedPriority(event.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsMapFullscreen(!isMapFullscreen)} type="button">
                <Maximize2 size={14} />
              </button>
            </div>
            <NationalReferralMap
              referrals={mapReferrals}
              ambulances={mapAmbulances}
              facilities={mapFacilities}
              height={isMapFullscreen ? 600 : 300}
              selectedDistrict={selectedDistrict}
              selectedPriority={selectedPriority}
              showReferrals={showReferrals}
              showAmbulances={showAmbulances}
              showHighReadiness={showHighReadiness}
              showMediumReadiness={showMediumReadiness}
              showLowReadiness={showLowReadiness}
            />
            <div style={{
              padding: 'var(--space-3) var(--space-2) var(--space-2)',
              display: 'flex',
              gap: 'var(--space-3)',
              fontSize: '12px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={showReferrals} onChange={(event) => setShowReferrals(event.target.checked)} />
                <span>Referrals ({activeCount})</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={showAmbulances} onChange={(event) => setShowAmbulances(event.target.checked)} />
                <span>Ambulances ({totalAmbulances})</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={showHighReadiness} onChange={(event) => setShowHighReadiness(event.target.checked)} />
                <span>High ({readinessStatus?.high || 0})</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={showMediumReadiness} onChange={(event) => setShowMediumReadiness(event.target.checked)} />
                <span>Medium ({readinessStatus?.medium || 0})</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={showLowReadiness} onChange={(event) => setShowLowReadiness(event.target.checked)} />
                <span>Low ({readinessStatus?.low || 0})</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="national-secondary-grid">
        <div className="national-card">
          <CardTitle icon={Activity} title="Demand by Colour Code" />
          <div className="national-card-body" style={{ display: 'grid', gap: 16 }}>
            {colourRows.map((row) => <ProgressRow key={row.label} {...row} />)}
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={ShieldCheck} title="Demand by Priority" />
          <div className="national-card-body" style={{ display: 'grid', gap: 16 }}>
            {priorityRows.map((row) => <ProgressRow key={row.label} {...row} />)}
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={Clock} title="Response Performance Summary" />
          <div className="national-card-body" style={{ display: 'grid', gap: 13 }}>
            {responseRows.map((row) => {
              const onTarget = row.value <= row.target;
              return (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{row.label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{formatMinutes(row.value)}</span>
                  <StatusPill status={onTarget ? 'On Target' : 'Above Target'} />
                </div>
              );
            })}
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
                No national operational alerts for this period.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="national-secondary-grid">
        <div className="national-card national-wide-card">
          <CardTitle icon={AmbulanceIcon} title="Fleet Status" meta={`${ambulancePercentage}% operational`} />
          <div className="national-card-body national-inline-grid">
            <FleetTile icon={AmbulanceIcon} label="Total Ambulances" value={fleetStatus?.total || 0} meta="Registered fleet" tone="blue" />
            <FleetTile icon={Navigation} label="On Mission" value={fleetStatus?.onMission || 0} meta={`${totalAmbulances ? Math.round(((fleetStatus?.onMission || 0) / totalAmbulances) * 100) : 0}% deployed`} tone="red" />
            <FleetTile icon={CheckCircle2} label="Available" value={fleetStatus?.available || 0} meta="Ready for dispatch" tone="green" />
            <FleetTile icon={AlertTriangle} label="Maintenance" value={fleetStatus?.maintenance || 0} meta={`${fleetStatus?.outOfService || 0} out of service`} tone="amber" />
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={Bed} title="Facility Readiness" meta={`${Math.round(readinessStatus?.reportingRate || 0)}% reporting`} />
          <div className="national-card-body" style={{ display: 'grid', gap: 16 }}>
            <ProgressRow label="Reporting Facilities" value={readinessStatus?.reportingFacilities || 0} total={Math.max(readinessStatus?.totalFacilities || 0, 1)} color="#2563EB" />
            <ProgressRow label="High Readiness" value={readinessStatus?.high || 0} total={Math.max(readinessStatus?.reportingFacilities || 0, 1)} color="#16A34A" />
            <ProgressRow label="Medium Readiness" value={readinessStatus?.medium || 0} total={Math.max(readinessStatus?.reportingFacilities || 0, 1)} color="#F59E0B" />
            <ProgressRow label="Low Readiness" value={readinessStatus?.low || 0} total={Math.max(readinessStatus?.reportingFacilities || 0, 1)} color="#DC2626" />
          </div>
        </div>

        <div className="national-card">
          <CardTitle icon={Building2} title="Top Districts by Volume" />
          <div className="national-card-body" style={{ display: 'grid', gap: 14 }}>
            {districtRows.slice(0, 5).length > 0 ? districtRows.slice(0, 5).map((district, index) => (
              <ProgressRow
                key={district.districtId}
                label={`${index + 1}. ${district.districtName}`}
                value={district.missionCount || district.referralCount}
                total={Math.max(districtRows[0]?.missionCount || districtRows[0]?.referralCount || 1, 1)}
                color="#2563EB"
                suffix=""
              />
            )) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No district volume data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="national-card">
        <CardTitle icon={Building2} title="District Performance" meta="Comparative national view" />
        {isLoadingDistricts ? (
          <SectionLoading message="Loading district performance..." />
        ) : isDistrictError ? (
          <SectionState message="Unable to load district performance." />
        ) : (
          <DataTable
            data={districtRows}
            columns={columns}
            emptyMessage="No district data available"
            emptyDescription="No districts reported referrals or missions in this period"
          />
        )}
      </div>
    </>
  );
}
