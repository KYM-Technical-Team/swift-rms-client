'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import dynamic from 'next/dynamic';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Activity,
  Ambulance as AmbulanceIcon,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Hospital,
  MapPin,
  Maximize2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { analyticsService } from '@/lib/api/analytics';
import { referralService, facilityService, readinessService, ambulanceService } from '@/lib/api';
import { StatCard, DataTable } from '@/components/ui';
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
} from 'recharts';

const NationalReferralMap = dynamic(
  () => import('@/components/maps/NationalReferralMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-overlay)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div className="spinner" />
      </div>
    )
  }
);

type PeriodOption = '7d' | '30d' | '90d' | '1y';

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

const formatMinutes = (value?: number) => `${Math.round(value || 0)} min`;
const formatPercent = (value?: number) => `${(value || 0).toFixed(1)}%`;

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
        <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: entry.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Number(entry.value || 0).toLocaleString()}</span>
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

  const periodLabel = `${analyticsQuery.dateFrom} to ${analyticsQuery.dateTo}`;

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

  const readinessCounts = {
    high: readinessStatus?.high || 0,
    medium: readinessStatus?.medium || 0,
    low: readinessStatus?.low || 0,
  };

  const columnHelper = createColumnHelper<DistrictPerformanceRow>();
  const columns = useMemo(() => [
    columnHelper.accessor('districtName', {
      header: 'District',
      cell: info => <span style={{ fontWeight: 500 }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('referralCount', {
      header: 'Referrals',
      cell: info => <span style={{ fontWeight: 600 }}>{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor('missionCount', {
      header: 'Missions',
      cell: info => <span style={{ fontWeight: 600 }}>{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor('averageTimeToSceneMinutes', {
      header: 'Scene Time',
      cell: info => {
        const value = Math.round(info.getValue() || 0);
        return (
          <span style={{ color: value > 30 ? 'var(--warning)' : 'var(--text-secondary)' }}>
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
        return <span style={{ fontWeight: 600, color }}>{rate.toFixed(1)}%</span>;
      },
    }),
    columnHelper.accessor('abortRate', {
      header: 'Abort',
      cell: info => {
        const rate = info.getValue() || 0;
        const color = rate <= 10 ? 'var(--success)' : rate <= 15 ? 'var(--warning)' : 'var(--error)';
        return <span style={{ fontWeight: 600, color }}>{rate.toFixed(1)}%</span>;
      },
    }),
    columnHelper.accessor('readinessReportingRate', {
      header: 'Readiness',
      cell: info => <span>{formatPercent(info.getValue())}</span>,
    }),
    columnHelper.accessor('availableAmbulances', {
      header: 'Amb.',
      cell: info => <span>{info.getValue()}</span>,
    }),
  ], [columnHelper]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={24} />
            National Dashboard
          </h1>
          <p className="page-subtitle">
            Real-time overview of emergency referral and ambulance performance across Sierra Leone
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              className={`btn btn-sm ${period === option.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isNationalError && (
        <div className="card" style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-4)',
          borderColor: 'var(--error)',
          color: 'var(--error)'
        }}>
          Unable to load national analytics. Please try again.
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          label="Total Missions"
          value={summary?.totalMissions || 0}
          icon={Activity}
          trend=""
          trendType="neutral"
          description={periodLabel}
        />
        <StatCard
          label="Mission Success"
          value={formatPercent(summary?.missionSuccessRate)}
          icon={CheckCircle2}
          variant={(summary?.missionSuccessRate || 0) >= 85 ? 'success' : 'warning'}
          description={`${summary?.totalReferrals || 0} referrals`}
        />
        <StatCard
          label="Avg Time to Scene"
          value={formatMinutes(summary?.averageTimeToSceneMinutes)}
          icon={Clock}
          variant={(summary?.averageTimeToSceneMinutes || 0) > 30 ? 'warning' : 'info'}
          description="Dispatch to pickup"
        />
        <StatCard
          label="Avg Time to Hospital"
          value={formatMinutes(summary?.averageTimeToHospitalMinutes)}
          icon={Hospital}
          variant={(summary?.averageTimeToHospitalMinutes || 0) > 60 ? 'warning' : 'default'}
          description="Depart pickup to dropoff"
        />
        <StatCard
          label="Abort Rate"
          value={formatPercent(summary?.abortRate)}
          icon={XCircle}
          variant={(summary?.abortRate || 0) > 15 ? 'error' : 'default'}
          description="Cancelled NEMS missions"
        />
        <StatCard
          label="Seen by Clinician"
          value={formatMinutes(summary?.averageTimeToClinicianMinutes)}
          icon={TrendingUp}
          variant="info"
          description="Referral creation to review"
        />
      </div>

      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          label="Active Referrals"
          value={activeCount}
          icon={TrendingUp}
          variant="info"
          description="Open national load"
        />
        <StatCard
          label="Ambulances"
          value={`${operationalAmbulances}/${totalAmbulances}`}
          icon={AmbulanceIcon}
          trend={`${ambulancePercentage}% operational`}
          trendType={ambulancePercentage >= 80 ? 'up' : 'down'}
          variant={ambulancePercentage >= 80 ? 'success' : 'warning'}
          description={`${availableAmbulances} available`}
        />
        <StatCard
          label="Facilities Reporting"
          value={`${readinessStatus?.reportingFacilities || 0}/${readinessStatus?.totalFacilities || 0}`}
          icon={Building2}
          trend={`${Math.round(readinessStatus?.reportingRate || 0)}% reporting`}
          trendType={(readinessStatus?.reportingRate || 0) >= 90 ? 'up' : 'neutral'}
          description="Latest readiness in period"
        />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)'
        }}>
          <h3 className="card-title">
            <MapPin size={16} />
            Live Operational Map
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
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
              {(districtsData || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
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
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIsMapFullscreen(!isMapFullscreen)}
              type="button"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        <div style={{ padding: 'var(--space-2)' }}>
          <NationalReferralMap
            referrals={mapReferrals}
            ambulances={mapAmbulances}
            facilities={mapFacilities}
            height={isMapFullscreen ? 600 : 400}
            selectedDistrict={selectedDistrict}
            selectedPriority={selectedPriority}
            showReferrals={showReferrals}
            showAmbulances={showAmbulances}
            showHighReadiness={showHighReadiness}
            showMediumReadiness={showMediumReadiness}
            showLowReadiness={showLowReadiness}
          />
        </div>
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 'var(--space-4)',
          fontSize: '12px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showReferrals} onChange={(e) => setShowReferrals(e.target.checked)} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#DC2626', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            <span>Active Referrals ({activeCount})</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showAmbulances} onChange={(e) => setShowAmbulances(e.target.checked)} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#8B5CF6', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            <span>Ambulances ({totalAmbulances})</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showHighReadiness} onChange={(e) => setShowHighReadiness(e.target.checked)} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
            <span>High Readiness ({readinessCounts.high})</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showMediumReadiness} onChange={(e) => setShowMediumReadiness(e.target.checked)} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
            <span>Medium Readiness ({readinessCounts.medium})</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showLowReadiness} onChange={(e) => setShowLowReadiness(e.target.checked)} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626' }} />
            <span>Low Readiness ({readinessCounts.low})</span>
          </label>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="col-6">
          <div className="card" style={{ height: '100%' }}>
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="card-title">
                <Building2 size={16} />
                District Performance
              </h3>
            </div>
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
        </div>

        <div className="col-6">
          <div className="card" style={{ height: '100%' }}>
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <h3 className="card-title">
                <Calendar size={16} />
                Referral Volume Trend
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Grouped by {analyticsQuery.groupBy?.toLowerCase()}
              </span>
            </div>
            <div style={{ height: 320, padding: 'var(--space-4)' }}>
              {isLoadingNational ? (
                <SectionLoading message="Loading referral trends..." />
              ) : isNationalError ? (
                <SectionState message="Unable to load trend data." />
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis
                      dataKey="period"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="red" name="Red" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.72} />
                    <Area type="monotone" dataKey="yellow" name="Yellow" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.72} />
                    <Area type="monotone" dataKey="green" name="Green" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.72} />
                    <Area type="monotone" dataKey="other" name="Other" stackId="1" stroke="#64748B" fill="#64748B" fillOpacity={0.55} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <SectionState message="No referral trend data available for this period." />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
