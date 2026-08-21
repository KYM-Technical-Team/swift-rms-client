'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Ambulance as AmbulanceIcon,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  Megaphone,
  PhoneCall,
  PhoneIncoming,
  Timer,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ambulanceService, callCentreService } from '@/lib/api';
import type { Call, NEMSRequest, NEMSRequestStatus } from '@/types';
import type { MissionCluster } from './NemsMissionsMap';
import './nems-dashboard.css';

const MissionsMap = dynamic(() => import('./NemsMissionsMap'), {
  ssr: false,
  loading: () => <div className="nems-map__placeholder">Loading map…</div>,
});

const COLOUR_RED = '#ef4444';
const COLOUR_YELLOW = '#f59e0b';
const COLOUR_GREEN = '#10b981';
const COLOUR_INFO = '#6366f1';

const EN_ROUTE_STATUSES: NEMSRequestStatus[] = ['DISPATCHED', 'EN_ROUTE_PICKUP'];
const ACTIVE_MISSION_STATUSES: NEMSRequestStatus[] = [
  'DISPATCHED',
  'EN_ROUTE_PICKUP',
  'AT_PICKUP',
  'EN_ROUTE_DROP',
  'AT_DROP',
];

const missionStatusLabel: Record<NEMSRequestStatus, string> = {
  REQUESTED: 'Requested',
  DISPATCHED: 'Dispatched',
  EN_ROUTE_PICKUP: 'En Route',
  AT_PICKUP: 'At Scene',
  EN_ROUTE_DROP: 'On Mission',
  AT_DROP: 'At Hospital',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function elapsed(from: string | undefined, now: number) {
  if (!from) return '--:--';
  const seconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function priorityTone(priority?: string) {
  if (priority === 'CRITICAL') return 'red';
  if (priority === 'HIGH') return 'yellow';
  return 'green';
}

function callColour(call: Call) {
  return call.triageResult?.colourCode || 'GREEN';
}

function facilityText(value: NEMSRequest['pickupFacility']) {
  return typeof value === 'string' && value.trim() ? value : 'Unknown location';
}

function splitByPriority(missions: NEMSRequest[]) {
  return {
    red: missions.filter((mission) => mission.priority === 'CRITICAL').length,
    yellow: missions.filter((mission) => mission.priority === 'HIGH').length,
    green: missions.filter((mission) => mission.priority !== 'CRITICAL' && mission.priority !== 'HIGH').length,
  };
}

interface KpiProps {
  label: string;
  value: string | number;
  hint?: string;
  hintTone?: 'up' | 'down' | 'muted';
  icon: typeof PhoneCall;
  tone: 'blue' | 'red' | 'amber' | 'violet' | 'teal' | 'green';
}

function Kpi({ label, value, hint, hintTone = 'muted', icon: Icon, tone }: KpiProps) {
  return (
    <div className={`nems-kpi nems-kpi--${tone}`}>
      <div>
        <span className="nems-kpi__label">{label}</span>
        <strong className="nems-kpi__value">{value}</strong>
        {hint && <span className={`nems-kpi__hint is-${hintTone}`}>{hint}</span>}
      </div>
      <span className="nems-kpi__icon"><Icon size={18} strokeWidth={1.9} /></span>
    </div>
  );
}

export default function NemsCallCentreDashboard() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: metrics } = useQuery({
    queryKey: ['call-centre', 'dashboard'],
    queryFn: () => callCentreService.getDashboard(),
    refetchInterval: 30000,
  });

  const { data: callsResult, isLoading: callsLoading } = useQuery({
    queryKey: ['call-centre', 'calls', 'dashboard'],
    queryFn: () => callCentreService.listCalls({ limit: 100 }),
    refetchInterval: 30000,
  });

  const { data: missionsResult, isLoading: missionsLoading } = useQuery({
    queryKey: ['call-centre', 'missions', 'dashboard'],
    queryFn: () => callCentreService.listMissions(),
    refetchInterval: 30000,
  });

  const { data: ambulanceStats } = useQuery({
    queryKey: ['ambulances', 'stats'],
    queryFn: () => ambulanceService.getStats(),
    refetchInterval: 60000,
  });

  const calls = useMemo(() => callsResult?.data ?? [], [callsResult]);
  const missions = useMemo(() => missionsResult?.data ?? [], [missionsResult]);

  const activeCalls = calls.filter((call) => call.callStatus === 'ACTIVE');
  const queuedCalls = calls.filter((call) => call.callStatus === 'HELD');
  const oldestQueued = queuedCalls
    .map((call) => call.callStartedAt)
    .sort()[0];

  const activeMissions = missions.filter((mission) => ACTIVE_MISSION_STATUSES.includes(mission.status));
  const enRouteMissions = missions.filter((mission) => EN_ROUTE_STATUSES.includes(mission.status));
  const atHospitalMissions = missions.filter((mission) => mission.status === 'AT_DROP');

  const today = metrics?.todayStats;
  const totalToday = today?.totalCalls ?? 0;
  const codedCalls = (today?.redCodeCalls ?? 0) + (today?.yellowCodeCalls ?? 0) + (today?.greenCodeCalls ?? 0);

  const volumeData = [
    { name: 'Red (Critical)', value: today?.redCodeCalls ?? 0, fill: COLOUR_RED },
    { name: 'Yellow (Urgent)', value: today?.yellowCodeCalls ?? 0, fill: COLOUR_YELLOW },
    { name: 'Green (Non-urgent)', value: today?.greenCodeCalls ?? 0, fill: COLOUR_GREEN },
    { name: 'Others / Info', value: Math.max(0, totalToday - codedCalls), fill: COLOUR_INFO },
  ];
  const volumeTotal = volumeData.reduce((sum, slice) => sum + slice.value, 0);

  // Hourly buckets from the calls we already hold — no separate time-series endpoint exists.
  const trendData = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const currentHour = new Date(now).getHours();
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${hour.toString().padStart(2, '0')}:00`, calls: 0 }));
    calls.forEach((call) => {
      const started = new Date(call.callStartedAt);
      if (started < startOfToday) return;
      const bucket = buckets[started.getHours()];
      if (bucket) bucket.calls += 1;
    });
    return buckets.slice(0, currentHour + 1);
  }, [calls, now]);

  const missionClusters = useMemo<MissionCluster[]>(() => {
    const groups = new Map<string, MissionCluster>();
    activeMissions.forEach((mission) => {
      const { latitude, longitude } = mission.pickupLocation || {};
      if (latitude == null || longitude == null) return;
      const key = `${latitude.toFixed(1)},${longitude.toFixed(1)}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        existing.label = `${existing.count} active missions`;
      } else {
        groups.set(key, {
          key,
          latitude,
          longitude,
          count: 1,
          label: facilityText(mission.pickupFacility),
        });
      }
    });
    return [...groups.values()];
  }, [activeMissions]);

  const ambulanceRows = [
    { label: 'On Mission', missions: activeMissions, tone: 'red' as const },
    { label: 'En Route (To Scene)', missions: enRouteMissions, tone: 'amber' as const },
    { label: 'At Hospital', missions: atHospitalMissions, tone: 'violet' as const },
  ];
  const totalAmbulances = ambulanceStats?.total ?? 0;
  const availableAmbulances = ambulanceStats?.available ?? metrics?.ambulancesAvailable ?? 0;

  const recentMissions = [...missions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="nems-dash">
      {/* KPI row --------------------------------------------------------- */}
      <div className="nems-kpi-row">
        <Kpi label="Total Calls Today" value={totalToday} hint="Logged since midnight" icon={PhoneCall} tone="blue" />
        <Kpi label="Active Calls" value={metrics?.activeCalls ?? activeCalls.length} hint="In progress" icon={Headphones} tone="red" />
        <Kpi
          label="Calls in Queue"
          value={queuedCalls.length}
          hint={oldestQueued ? `Oldest: ${elapsed(oldestQueued, now)}` : 'Queue is clear'}
          icon={Users}
          tone="amber"
        />
        <Kpi
          label="Ambulances on Mission"
          value={metrics?.ambulancesOnMission ?? activeMissions.length}
          hint={totalAmbulances ? `of ${totalAmbulances} in service` : 'Fleet size unavailable'}
          icon={AmbulanceIcon}
          tone="violet"
        />
        <Kpi
          label="Average Response Time"
          value={today?.averageResponseTime || '—'}
          hint="Target: < 45 min"
          icon={Timer}
          tone="teal"
        />
        <Kpi
          label="Missions Completed Today"
          value={today?.completedMissions ?? 0}
          hint={`${today?.ambulancesDispatched ?? 0} dispatched`}
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      {/* Charts + map ----------------------------------------------------- */}
      <div className="nems-grid nems-grid--charts">
        <section className="card nems-card">
          <div className="nems-card__head">
            <h2>Call Volume <em>(Today)</em></h2>
          </div>
          <div className="nems-card__body nems-volume">
            <div className="nems-donut">
              <ResponsiveContainer width="100%" height={168}>
                <PieChart>
                  <Pie data={volumeData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                    {volumeData.map((slice) => <Cell key={slice.name} fill={slice.fill} />)}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="nems-donut__centre">
                <strong>{volumeTotal}</strong>
                <span>Total Calls</span>
              </div>
            </div>
            <ul className="nems-legend">
              {volumeData.map((slice) => (
                <li key={slice.name}>
                  <i style={{ background: slice.fill }} />
                  <span>{slice.name}</span>
                  <b>{slice.value}</b>
                  <em>{volumeTotal ? `${Math.round((slice.value / volumeTotal) * 100)}%` : '0%'}</em>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card nems-card">
          <div className="nems-card__head">
            <h2>Calls Over Time</h2>
            <span className="nems-card__meta">Today, by hour</span>
          </div>
          <div className="nems-card__body">
            {callsLoading ? (
              <div className="nems-chart-placeholder">Loading call trend…</div>
            ) : (
              <ResponsiveContainer width="100%" height={196}>
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                  />
                  <Line type="monotone" dataKey="calls" stroke={COLOUR_INFO} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card nems-card">
          <div className="nems-card__head">
            <h2>Active Missions Map</h2>
            <Link href="/ambulances" className="nems-card__link">View Full Map <ChevronRight size={13} /></Link>
          </div>
          <div className="nems-card__body nems-card__body--flush">
            <div className="nems-map">
              {missionsLoading ? (
                <div className="nems-map__placeholder">Loading missions…</div>
              ) : missionClusters.length ? (
                <MissionsMap clusters={missionClusters} />
              ) : (
                <div className="nems-map__placeholder">No active missions with location data.</div>
              )}
            </div>
            <div className="nems-map__legend">
              <span><i style={{ background: COLOUR_GREEN }} />1–2 missions</span>
              <span><i style={{ background: COLOUR_YELLOW }} />3–4 missions</span>
              <span><i style={{ background: COLOUR_RED }} />5+ missions</span>
            </div>
          </div>
        </section>
      </div>

      {/* Lists ------------------------------------------------------------ */}
      <div className="nems-grid nems-grid--lists">
        <section className="card nems-card">
          <div className="nems-card__head">
            <h2>Active Calls <b>{activeCalls.length}</b></h2>
            <Link href="/call-centre" className="nems-card__link">View All <ChevronRight size={13} /></Link>
          </div>
          <div className="nems-card__body">
            {activeCalls.length ? (
              <ul className="nems-call-list">
                {activeCalls.slice(0, 4).map((call) => (
                  <li key={call.id}>
                    <span className={`nems-call-list__mark is-${callColour(call).toLowerCase()}`}>
                      <PhoneIncoming size={15} />
                      <time>{elapsed(call.callStartedAt, now)}</time>
                    </span>
                    <div>
                      <strong>
                        {call.emergencyNature || call.callType.replace(/_/g, ' ').toLowerCase()}
                        <em className={`nems-tag is-${callColour(call).toLowerCase()}`}>{callColour(call)}</em>
                      </strong>
                      <span>{call.emergencyLocation?.address || (typeof call.callerFacility === 'object' ? call.callerFacility?.name : call.callerFacility) || 'Location not linked'}</span>
                      <span className="nems-call-list__meta">
                        Caller: {call.callerName || call.callerPhone}
                        {call.patientInfo?.name ? ` · Patient: ${call.patientInfo.name}` : ''}
                      </span>
                    </div>
                    <Link href="/call-centre" className="nems-open-call">Open Call</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nems-empty">{callsLoading ? 'Loading active calls…' : 'No calls are active right now.'}</p>
            )}
            <Link href="/call-centre" className="nems-footer-link">View All Active Calls <ArrowRight size={13} /></Link>
          </div>
        </section>

        <section className="card nems-card">
          <div className="nems-card__head">
            <h2>Ambulances at a Glance</h2>
            <Link href="/ambulances" className="nems-card__link">View All <ChevronRight size={13} /></Link>
          </div>
          <div className="nems-card__body">
            <ul className="nems-fleet">
              {ambulanceRows.map((row) => {
                const split = splitByPriority(row.missions);
                const share = totalAmbulances ? Math.round((row.missions.length / totalAmbulances) * 100) : 0;
                return (
                  <li key={row.label}>
                    <span className={`nems-fleet__icon is-${row.tone}`}><AmbulanceIcon size={16} /></span>
                    <div>
                      <strong>{row.label}<b>{row.missions.length}</b></strong>
                      <span>
                        <em className="is-red">{split.red} Red</em> ·
                        <em className="is-yellow"> {split.yellow} Yellow</em> ·
                        <em className="is-green"> {split.green} Green</em>
                      </span>
                    </div>
                    <b className="nems-fleet__share">{share}%</b>
                  </li>
                );
              })}
              <li>
                <span className="nems-fleet__icon is-green"><CheckCircle2 size={16} /></span>
                <div>
                  <strong>Available / Standby<b>{availableAmbulances}</b></strong>
                  <span>Ready for dispatch</span>
                </div>
                <b className="nems-fleet__share">
                  {totalAmbulances ? `${Math.round((availableAmbulances / totalAmbulances) * 100)}%` : '—'}
                </b>
              </li>
            </ul>
            <div className="nems-fleet__total">
              <span>Total Ambulances</span>
              <strong>{totalAmbulances || '—'}</strong>
            </div>
          </div>
        </section>

        <section className="card nems-card">
          <div className="nems-card__head">
            <h2>Recent Missions</h2>
            <Link href="/ambulances" className="nems-card__link">View All <ChevronRight size={13} /></Link>
          </div>
          <div className="nems-card__body">
            {recentMissions.length ? (
              <ul className="nems-mission-list">
                {recentMissions.map((mission) => (
                  <li key={mission.id}>
                    <i className={`is-${priorityTone(mission.priority)}`} />
                    <div>
                      <strong>{mission.referralCode || `#${mission.id.slice(0, 8).toUpperCase()}`}</strong>
                      <span>{mission.patientCondition || mission.requestType.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="nems-mission-list__route">
                        {facilityText(mission.pickupFacility)} → {facilityText(mission.dropoffFacility)}
                      </span>
                    </div>
                    <div className="nems-mission-list__meta">
                      <em className={`nems-tag is-${priorityTone(mission.priority)}`}>{missionStatusLabel[mission.status]}</em>
                      <time>{new Date(mission.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nems-empty">{missionsLoading ? 'Loading missions…' : 'No missions recorded yet.'}</p>
            )}
            <Link href="/ambulances" className="nems-footer-link">View All Missions <ArrowRight size={13} /></Link>
          </div>
        </section>
      </div>

      {/* Standing operational notices -------------------------------------- */}
      <section className="card nems-announce">
        <div className="nems-announce__title"><Megaphone size={15} /> System Reminders</div>
        <p><Activity size={13} /> Keep caller information confidential. Follow the NEMS communication SOP on every call.</p>
        <p><Clock size={13} /> Log call notes before ending a call — the timeline is the clinical handover record.</p>
        <span>Live data refreshes every 30s · Updated {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </section>
    </div>
  );
}
