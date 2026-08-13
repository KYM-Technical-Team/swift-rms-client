'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Baby,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  Flame,
  HeartPulse,
  History,
  Inbox,
  LayoutDashboard,
  MapPin,
  MapPinOff,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneCall,
  PhoneOff,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  X,
} from 'lucide-react';
import { callCentreService, facilityService } from '@/lib/api';
import { useToast, useUser } from '@/store';
import {
  protocolById,
  recommendColour,
  triageProtocols,
  type TriageColour,
} from '@/lib/triage-protocols';
import type {
  AmbulanceRank,
  Call,
  CallCentreDashboard,
  CallEvent,
  CallType,
  CreateCallRequest,
  PatientInfo,
  TriageResult,
} from '@/types';
import type { Facility } from '@/types/facility';
import { CallNotifications } from './CallNotifications';
import './call-centre.css';

const CallLocationMap = dynamic(() => import('./CallLocationMap'), {
  ssr: false,
  loading: () => <div className="cc-skeleton cc-skeleton--map" />,
});

const iconByProtocol = {
  obstetric: Baby,
  paediatric: Users,
  breathing: Activity,
  chest: HeartPulse,
  consciousness: CircleDot,
  trauma: ShieldAlert,
  burns: Flame,
  other: Stethoscope,
};

type QueueFilterId = 'all' | 'active' | 'held' | 'dispatched' | 'closed';

const queueFilters: { id: QueueFilterId; label: string; short: string; icon: typeof Inbox; match: (call: Call) => boolean }[] = [
  { id: 'all', label: 'All calls', short: 'All', icon: Inbox, match: () => true },
  { id: 'active', label: 'Active calls', short: 'Active', icon: PhoneCall, match: (call) => call.callStatus === 'ACTIVE' },
  { id: 'held', label: 'On hold', short: 'Hold', icon: Pause, match: (call) => call.callStatus === 'HELD' },
  { id: 'dispatched', label: 'Dispatched', short: 'Sent', icon: Radio, match: (call) => call.callStatus === 'DISPATCHED' },
  { id: 'closed', label: 'Closed', short: 'Closed', icon: History, match: (call) => call.callStatus === 'COMPLETED' || call.callStatus === 'TRANSFERRED' },
];

const navGroups = [
  {
    label: 'Operations',
    links: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Triage', href: '/triage', icon: Stethoscope },
      { label: 'Ambulances', href: '/ambulances', icon: Ambulance },
      { label: 'Facilities', href: '/facilities', icon: Building2 },
      { label: 'Drivers & Paramedics', href: '/admin/users', icon: Users },
    ],
  },
  {
    label: 'Reports',
    links: [
      { label: 'Reports', href: '/reports', icon: FileText },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Performance', href: '/district-dashboard', icon: Activity },
    ],
  },
  {
    label: 'Admin',
    links: [
      { label: 'Users', href: '/admin/users', icon: User },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

const QUEUE_STORAGE_KEY = 'cc:queue-collapsed';

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'The operation could not be completed.';
}

function elapsedSeconds(start: string | undefined, now: number, end?: string) {
  if (!start) return 0;
  return Math.max(0, Math.floor((new Date(end || now).getTime() - new Date(start).getTime()) / 1000));
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
}

function colourPriority(colour: TriageColour) {
  if (colour === 'RED') return 'CRITICAL' as const;
  if (colour === 'YELLOW') return 'HIGH' as const;
  return 'LOW' as const;
}

function facilityName(value?: Call['callerFacility']) {
  if (!value) return 'Location not linked';
  if (typeof value === 'string') return value;
  return value.name || 'Facility linked';
}

function callLabel(call: Call) {
  return call.callerName?.trim() || call.callerPhone || 'Unknown caller';
}

function callSubtitle(call: Call) {
  return (
    call.emergencyNature?.trim()
    || call.emergencyLocation?.address?.trim()
    || call.callType.replace(/_/g, ' ').toLowerCase()
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function Skeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`cc-skeleton-stack ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => <div className="cc-skeleton cc-skeleton--row" key={index} />)}
    </div>
  );
}

interface NewCallDialogProps {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCallRequest) => Promise<void>;
}

function NewCallDialog({ open, submitting, onClose, onSubmit }: NewCallDialogProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [nature, setNature] = useState('');
  const [location, setLocation] = useState('');
  const [callType, setCallType] = useState<CallType>('EMERGENCY');

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      callerPhone: phone.trim(),
      callerName: name.trim() || undefined,
      callType,
      emergencyNature: nature.trim() || undefined,
      emergencyLocation: { address: location.trim() || undefined },
      hazardsPresent: false,
      languageUsed: 'English',
    });
  };

  return (
    <div className="cc-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="new-call-title">
        <div className="cc-dialog__header">
          <div>
            <span className="cc-eyebrow">Call intake</span>
            <h2 id="new-call-title">Create an active call</h2>
          </div>
          <button className="cc-icon-button" type="button" onClick={onClose} aria-label="Close call intake">
            <X size={17} />
          </button>
        </div>
        <form onSubmit={submit} className="cc-dialog__form">
          <label>
            <span>Caller phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required autoFocus placeholder="+232 76 123 456" />
          </label>
          <label>
            <span>Caller name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name or organisation" />
          </label>
          <label>
            <span>Call type</span>
            <select value={callType} onChange={(event) => setCallType(event.target.value as CallType)}>
              <option value="EMERGENCY">Emergency</option>
              <option value="AMBULANCE_REQUEST">Ambulance request</option>
              <option value="REFERRAL_REQUEST">Referral request</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="INQUIRY">Inquiry</option>
            </select>
          </label>
          <label>
            <span>Emergency nature</span>
            <input value={nature} onChange={(event) => setNature(event.target.value)} placeholder="Heavy bleeding, road accident..." />
          </label>
          <label className="cc-dialog__wide">
            <span>Caller location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Facility, street, community or landmark" />
          </label>
          <div className="cc-dialog__actions cc-dialog__wide">
            <button type="button" className="cc-button cc-button--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="cc-button cc-button--primary" disabled={submitting || !phone.trim()}>
              {submitting ? <RefreshCw className="cc-spin" size={15} /> : <PhoneCall size={15} />}
              Start call
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function CallCentrePage() {
  const operator = useUser();
  const toast = useToast();
  const pathname = usePathname();
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string>();
  const [dashboard, setDashboard] = useState<CallCentreDashboard>();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [rankings, setRankings] = useState<AmbulanceRank[]>([]);
  const [callDetailLoading, setCallDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankingRefreshing, setRankingRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [newCallOpen, setNewCallOpen] = useState(false);
  const [submittingCall, setSubmittingCall] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();
  const [now, setNow] = useState(() => Date.now());
  const [protocolId, setProtocolId] = useState('obstetric');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedColour, setSelectedColour] = useState<TriageColour>();
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({});
  const [notes, setNotes] = useState('');
  const [pickupFacilityId, setPickupFacilityId] = useState('');
  const [dropoffFacilityId, setDropoffFacilityId] = useState('');
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
  const [conferenceOpen, setConferenceOpen] = useState(false);
  const [conferenceMember, setConferenceMember] = useState('');
  const [muted, setMuted] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilterId>('active');
  const [queueSearch, setQueueSearch] = useState('');
  const [queueCollapsed, setQueueCollapsed] = useState(false);
  const [showAllAmbulances, setShowAllAmbulances] = useState(false);

  const selectedCall = calls.find((call) => call.id === selectedCallId) || calls[0];
  const activeCallId = selectedCall?.id;
  const selectedCallRef = useRef(selectedCall);
  selectedCallRef.current = selectedCall;

  const protocol = protocolById[protocolId] || triageProtocols[0];
  const recommendation = useMemo(() => recommendColour(protocol, answers), [protocol, answers]);
  const colour = selectedColour || recommendation;
  const activeCalls = calls.filter((call) => call.callStatus === 'ACTIVE' || call.callStatus === 'HELD');

  const filterCounts = useMemo(
    () => Object.fromEntries(queueFilters.map((filter) => [filter.id, calls.filter(filter.match).length])) as Record<QueueFilterId, number>,
    [calls],
  );

  const queueCalls = useMemo(() => {
    const matcher = queueFilters.find((filter) => filter.id === queueFilter) || queueFilters[0];
    const term = queueSearch.trim().toLowerCase();
    return calls
      .filter(matcher.match)
      .filter((call) => !term || [call.callerName, call.callerPhone, call.emergencyNature, call.emergencyLocation?.address]
        .some((value) => value?.toLowerCase().includes(term)))
      .sort((a, b) => new Date(b.callStartedAt).getTime() - new Date(a.callStartedAt).getTime());
  }, [calls, queueFilter, queueSearch]);

  const loadConsole = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setLoadError(undefined);
    try {
      const [callResult, metrics, facilityResult] = await Promise.all([
        callCentreService.listCalls({ limit: 50 }),
        callCentreService.getDashboard(),
        facilityService.list({ isActive: true, limit: 100 }),
      ]);
      setCalls(callResult.data);
      setDashboard(metrics);
      setFacilities(facilityResult.data);
      setSelectedCallId((current) => current && callResult.data.some((call) => call.id === current)
        ? current
        : callResult.data.find((call) => call.callStatus === 'ACTIVE')?.id || callResult.data[0]?.id);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadConsole(); }, [loadConsole]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) setQueueCollapsed(stored === '1');
  }, []);

  const toggleQueue = () => setQueueCollapsed((value) => {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, value ? '0' : '1');
    return !value;
  });

  // Keyed on the call id only: a background refresh replaces every call object, and
  // re-running this on identity change would discard notes the operator is typing.
  useEffect(() => {
    const call = selectedCallRef.current;
    if (!call) {
      setEvents([]);
      setRankings([]);
      setNotes('');
      setPatientInfo({});
      setSelectedColour(undefined);
      setAnswers({});
      return;
    }

    setNotes(call.notes || '');
    setPatientInfo(call.patientInfo || {});
    setSelectedColour(call.triageResult?.colourCode);
    setShowAllAmbulances(false);
    setConferenceOpen(false);
    setMuted(false);
    if (call.triageResult?.protocolId) setProtocolId(call.triageResult.protocolId);
    if (call.triageResult?.answers) {
      setAnswers(Object.fromEntries(call.triageResult.answers.map((answer) => [answer.questionId, answer.answer])));
    } else {
      setAnswers({});
    }

    let cancelled = false;
    setCallDetailLoading(true);
    Promise.allSettled([
      callCentreService.listEvents(call.id),
      callCentreService.rankAmbulances(call.id),
    ]).then(([eventResult, rankResult]) => {
      if (cancelled) return;
      setEvents(eventResult.status === 'fulfilled' ? eventResult.value : []);
      setRankings(rankResult.status === 'fulfilled' ? rankResult.value : []);
      if (rankResult.status === 'fulfilled') {
        setSelectedAmbulanceId(rankResult.value.find((item) => item.eligible)?.ambulanceId || '');
      }
      setCallDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeCallId]);

  const updateSelectedCall = (updated: Call) => {
    setCalls((current) => current.map((call) => call.id === updated.id ? updated : call));
    setSelectedCallId(updated.id);
  };

  const createCall = async (payload: CreateCallRequest) => {
    setSubmittingCall(true);
    try {
      const created = await callCentreService.logCall(payload);
      setCalls((current) => [created, ...current]);
      setSelectedCallId(created.id);
      setNewCallOpen(false);
      toast.success('Call connected', 'The active call is ready for triage.');
      void loadConsole(true);
    } catch (error) {
      toast.error('Could not create call', errorMessage(error));
    } finally {
      setSubmittingCall(false);
    }
  };

  const runCommand = async (
    command: 'hold' | 'resume' | 'conference' | 'notes' | 'complete',
    payload: { reason?: string; participant?: string; note?: string } = {},
  ) => {
    if (!selectedCall) return;
    setBusyAction(command);
    try {
      const updated = await callCentreService.command(selectedCall.id, command, {
        version: selectedCall.version,
        ...payload,
      });
      updateSelectedCall(updated);
      if (command === 'conference') {
        setConferenceMember('');
        setConferenceOpen(false);
      }
      toast.success('Call updated', `${command.charAt(0).toUpperCase()}${command.slice(1)} completed.`);
      void loadConsole(true);
    } catch (error) {
      toast.error('Call action failed', errorMessage(error));
      void loadConsole(true);
    } finally {
      setBusyAction(undefined);
    }
  };

  const refreshRankings = async () => {
    if (!selectedCall) return;
    setRankingRefreshing(true);
    try {
      setRankings(await callCentreService.rankAmbulances(selectedCall.id));
    } catch (error) {
      toast.error('Ranking unavailable', errorMessage(error));
    } finally {
      setRankingRefreshing(false);
    }
  };

  const dispatch = async () => {
    if (!selectedCall || !pickupFacilityId || !dropoffFacilityId || !selectedAmbulanceId) return;
    const triageResult: TriageResult = {
      protocolId: protocol.id,
      protocolName: protocol.name,
      colourCode: colour,
      priority: colourPriority(colour),
      answers: protocol.questions.map((question) => ({
        questionId: question.id,
        question: question.text,
        answer: answers[question.id] || 'unknown',
      })),
      completedAt: new Date().toISOString(),
    };

    setBusyAction('dispatch');
    try {
      await callCentreService.triageAndDispatch(selectedCall.id, {
        version: selectedCall.version,
        pickupFacilityId,
        dropoffFacilityId,
        ambulanceId: selectedAmbulanceId,
        priority: colourPriority(colour),
        colourCode: colour,
        triageResult,
        patientInfo,
        notes,
      });
      toast.success('Ambulance dispatched', 'The mission was created and the selected ambulance was reserved.');
      await loadConsole(true);
    } catch (error) {
      toast.error('Dispatch failed', errorMessage(error));
      void loadConsole(true);
    } finally {
      setBusyAction(undefined);
    }
  };

  const operatorName = operator ? `${operator.firstName} ${operator.lastName}` : 'Call operator';
  const callerLocation = selectedCall?.emergencyLocation?.address || facilityName(selectedCall?.callerFacility);
  const answered = protocol.questions.filter((question) => answers[question.id]).length;
  const callSeconds = selectedCall ? elapsedSeconds(selectedCall.callStartedAt, now, selectedCall.callEndedAt) : 0;
  const onHold = selectedCall?.callStatus === 'HELD';
  const callClosed = selectedCall?.callStatus === 'COMPLETED' || selectedCall?.callStatus === 'TRANSFERRED';
  const coordinates = selectedCall?.emergencyLocation?.latitude != null && selectedCall?.emergencyLocation?.longitude != null
    ? { latitude: selectedCall.emergencyLocation.latitude, longitude: selectedCall.emergencyLocation.longitude }
    : undefined;
  const conferenceMembers = selectedCall?.conferenceMembers || [];
  const visibleRankings = showAllAmbulances ? rankings : rankings.slice(0, 3);

  const steps = [
    { label: 'Caller details', done: Boolean(selectedCall), target: 'cc-caller' },
    { label: 'Problem type', done: Boolean(selectedCall), target: 'cc-protocols' },
    { label: 'Triage questions', done: answered > 0 && answered === protocol.questions.length, target: 'cc-questions' },
    { label: 'Colour code', done: Boolean(selectedColour), target: 'dispatch-panel' },
  ];
  const activeStep = steps.findIndex((step) => !step.done);
  const currentStep = activeStep === -1 ? steps.length - 1 : activeStep;

  return (
    <div className="cc-shell">
      <header className="cc-topbar">
        <div className="cc-brand">
          <div className="cc-brand__mark"><ShieldAlert size={18} /></div>
          <div><strong>NEMS CALL CENTRE</strong><span>SIERRA LEONE</span></div>
        </div>
        <div className="cc-call-strip">
          <div><span>Active Call</span><strong className={`cc-live ${selectedCall && !callClosed ? '' : 'is-idle'}`}><i />{formatDuration(callSeconds)}</strong></div>
          <div><span>Call ID</span><strong>{selectedCall?.id.slice(0, 12).toUpperCase() || 'NO ACTIVE CALL'}</strong></div>
          <div><span>Date & Time</span><strong>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())}</strong></div>
          <div><span>Operator</span><strong>{operatorName}</strong></div>
          <div><span>Status</span><strong className={`cc-status cc-status--${selectedCall?.callStatus.toLowerCase() || 'idle'}`}>{selectedCall?.callStatus || 'IDLE'}</strong></div>
        </div>
        <div className="cc-operator">
          <CallNotifications />
          <div className="cc-avatar">{operator ? `${operator.firstName[0]}${operator.lastName[0]}` : 'OP'}</div>
          <div><strong>{operatorName}</strong><span>Operator</span></div>
          <ChevronDown size={14} />
        </div>
      </header>

      <aside className="cc-sidebar">
        <nav aria-label="Call centre navigation">
          <div className="cc-nav-group">
            <span className="cc-nav-label">Queue</span>
            {queueFilters.map((filter) => {
              const Icon = filter.icon;
              const count = filterCounts[filter.id] || 0;
              return (
                <button
                  type="button"
                  className={`cc-nav-link ${queueFilter === filter.id ? 'is-active' : ''}`}
                  key={filter.id}
                  onClick={() => { setQueueFilter(filter.id); setQueueCollapsed(false); }}
                  aria-pressed={queueFilter === filter.id}
                >
                  <Icon size={15} /><span>{filter.label}</span>
                  {count > 0 && <b>{count}</b>}
                </button>
              );
            })}
          </div>
          {navGroups.map((group) => (
            <div className="cc-nav-group" key={group.label}>
              <span className="cc-nav-label">{group.label}</span>
              {group.links.map((link) => {
                const Icon = link.icon;
                const active = link.href !== '/' ? pathname.startsWith(link.href) : pathname === '/';
                return (
                  <Link className={`cc-nav-link ${active ? 'is-active' : ''}`} href={link.href} key={link.label}>
                    <Icon size={15} /><span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <a className="cc-emergency-line" href="tel:112"><Phone size={16} /><span>Emergency lines<strong>112 / 117</strong></span></a>
      </aside>

      <main className={`cc-workspace ${queueCollapsed ? 'is-queue-collapsed' : ''}`}>
        {loadError && (
          <div className="cc-load-error" role="alert">
            <AlertTriangle size={17} />
            <div><strong>Live call data is unavailable</strong><span>{loadError}</span></div>
            <button onClick={() => void loadConsole()}>Try again</button>
          </div>
        )}

        <aside className="cc-queue" aria-label="Call queue">
          {queueCollapsed ? (
            <div className="cc-queue__rail">
              <button type="button" className="cc-queue__toggle" onClick={toggleQueue} aria-label="Expand call queue" aria-expanded="false">
                <ChevronRight size={13} />
              </button>
              <span className="cc-queue__rail-count">{queueCalls.length}</span>
              <span className="cc-queue__rail-label">CALL QUEUE</span>
              <div className="cc-queue__rail-dots">
                {queueCalls.slice(0, 8).map((call) => (
                  <i className={`is-${(call.triageResult?.colourCode || 'GREEN').toLowerCase()} ${call.id === activeCallId ? 'is-selected' : ''}`} key={call.id} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="cc-queue__head">
                <div>
                  <span className="cc-eyebrow">Call queue</span>
                  <strong>{queueCalls.length} {queueCalls.length === 1 ? 'call' : 'calls'}</strong>
                </div>
                <div className="cc-queue__head-actions">
                  <button type="button" className="cc-text-button" onClick={() => setNewCallOpen(true)}><Plus size={13} /> New</button>
                  <button type="button" className="cc-queue__toggle" onClick={toggleQueue} aria-label="Collapse call queue" aria-expanded="true">
                    <ChevronLeft size={13} />
                  </button>
                </div>
              </div>

              <div className="cc-queue__search">
                <Search size={12} />
                <input
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Search caller, phone, nature"
                  aria-label="Search the call queue"
                />
                {queueSearch && (
                  <button type="button" onClick={() => setQueueSearch('')} aria-label="Clear search"><X size={11} /></button>
                )}
              </div>

              <div className="cc-queue__filters" role="group" aria-label="Filter calls by status">
                {queueFilters.map((filter) => (
                  <button
                    type="button"
                    className={queueFilter === filter.id ? 'is-selected' : ''}
                    key={filter.id}
                    onClick={() => setQueueFilter(filter.id)}
                    aria-pressed={queueFilter === filter.id}
                  >
                    {filter.short}<b>{filterCounts[filter.id] || 0}</b>
                  </button>
                ))}
              </div>

              <div className="cc-queue__list">
                {loading && <Skeleton rows={4} className="cc-skeleton-stack--queue" />}

                {!loading && !queueCalls.length && (
                  <div className="cc-empty-state">
                    <Inbox size={20} />
                    <strong>{queueSearch ? 'No matching calls' : 'Queue is clear'}</strong>
                    <span>
                      {queueSearch
                        ? 'Try a different caller name, phone number or emergency nature.'
                        : `No ${queueFilter === 'all' ? '' : (queueFilters.find((filter) => filter.id === queueFilter)?.short || '').toLowerCase() + ' '}calls right now.`}
                    </span>
                    {!queueSearch && queueFilter !== 'all' && filterCounts.all > 0 && (
                      <button type="button" onClick={() => setQueueFilter('all')}>Show all {filterCounts.all} calls</button>
                    )}
                    {!queueSearch && queueFilter === 'all' && (
                      <button type="button" onClick={() => setNewCallOpen(true)}>Log a new call</button>
                    )}
                  </div>
                )}

                {!loading && queueCalls.map((call) => {
                  const itemColour = (call.triageResult?.colourCode || 'GREEN').toLowerCase();
                  const waiting = elapsedSeconds(call.callStartedAt, now, call.callEndedAt);
                  return (
                    <button
                      type="button"
                      className={`cc-queue-item ${call.id === activeCallId ? 'is-selected' : ''}`}
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      aria-current={call.id === activeCallId}
                    >
                      <i className={`cc-queue-item__flag is-${itemColour}`} aria-hidden="true" />
                      <div className="cc-queue-item__body">
                        <strong>{callLabel(call)}</strong>
                        <span>{callSubtitle(call)}</span>
                      </div>
                      <div className="cc-queue-item__meta">
                        <em className={`cc-status cc-status--${call.callStatus.toLowerCase()}`}>{call.callStatus.slice(0, 4)}</em>
                        <time dateTime={call.callStartedAt}>{formatDuration(waiting)}</time>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        <section className="cc-call-panel" aria-label="Active call controls">
          <div className="cc-section-heading">
            <div><span>Call controls</span>{loading ? <strong>Loading…</strong> : <strong>{selectedCall ? (callClosed ? 'Closed' : onHold ? 'On hold' : 'Connected') : 'No active call'}</strong>}</div>
            <button className="cc-text-button" onClick={() => setNewCallOpen(true)}><Plus size={13} /> New call</button>
          </div>

          {!loading && !selectedCall ? (
            <div className="cc-empty-state cc-empty-state--panel">
              <PhoneCall size={22} />
              <strong>No call selected</strong>
              <span>Pick a call from the queue or log a new one to begin triage.</span>
              <button type="button" onClick={() => setNewCallOpen(true)}>Log a new call</button>
            </div>
          ) : (
            <>
              <button className="cc-end-call" disabled={!selectedCall || callClosed || busyAction === 'complete'} onClick={() => void runCommand('complete', { reason: 'Call completed by operator' })}>
                {busyAction === 'complete' ? <RefreshCw size={15} className="cc-spin" /> : <PhoneOff size={15} />} End call
              </button>

              <div className="cc-control-grid">
                <button
                  type="button"
                  className={onHold ? 'is-active' : ''}
                  disabled={!selectedCall || callClosed || Boolean(busyAction)}
                  aria-pressed={onHold}
                  onClick={() => void runCommand(onHold ? 'resume' : 'hold', { reason: 'Operator call control' })}
                >
                  {busyAction === 'hold' || busyAction === 'resume' ? <RefreshCw size={14} className="cc-spin" /> : <Pause size={14} />}
                  {onHold ? 'Resume' : 'Hold'}
                </button>
                <button
                  type="button"
                  className={muted ? 'is-active' : ''}
                  disabled={!selectedCall || callClosed}
                  aria-pressed={muted}
                  onClick={() => setMuted((value) => !value)}
                >
                  {muted ? <MicOff size={14} /> : <Mic size={14} />}{muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  type="button"
                  className={conferenceOpen ? 'is-active' : ''}
                  disabled={!selectedCall || callClosed}
                  aria-expanded={conferenceOpen}
                  onClick={() => setConferenceOpen((value) => !value)}
                >
                  <Users size={14} />Conference
                </button>
              </div>

              {onHold && (
                <div className="cc-hold-banner" role="status">
                  <Pause size={13} />
                  <span>On hold · {formatDuration(elapsedSeconds(selectedCall?.heldAt, now))}</span>
                  <button type="button" disabled={Boolean(busyAction)} onClick={() => void runCommand('resume', { reason: 'Operator resumed call' })}>Resume</button>
                </div>
              )}

              {conferenceOpen && (
                <div className="cc-inline-action">
                  <input
                    value={conferenceMember}
                    onChange={(event) => setConferenceMember(event.target.value)}
                    placeholder="Clinician or facility"
                    aria-label="Conference participant"
                  />
                  <button disabled={!conferenceMember.trim() || busyAction === 'conference'} onClick={() => void runCommand('conference', { participant: conferenceMember.trim() })}>
                    {busyAction === 'conference' ? <RefreshCw size={11} className="cc-spin" /> : 'Add'}
                  </button>
                </div>
              )}

              {conferenceMembers.length > 0 && (
                <div className="cc-chip-row" aria-label="Conference participants">
                  {conferenceMembers.map((member) => <span key={member}><Users size={9} />{member}</span>)}
                </div>
              )}

              <div className="cc-panel-block" id="cc-caller">
                <div className="cc-section-heading"><span>Caller information</span></div>
                {loading ? <Skeleton rows={3} /> : (
                  <>
                    <div className="cc-caller-card">
                      <div className="cc-avatar cc-avatar--blue">{selectedCall?.callerName?.slice(0, 2).toUpperCase() || 'CL'}</div>
                      <div><strong>{selectedCall?.callerName || 'Unnamed caller'}</strong><span>{callerLocation}</span></div>
                    </div>
                    <dl className="cc-detail-list">
                      <div><dt><Phone size={12} />Phone</dt><dd>{selectedCall?.callerPhone ? <a href={`tel:${selectedCall.callerPhone}`}>{selectedCall.callerPhone}</a> : '—'}</dd></div>
                      <div><dt><MapPin size={12} />Location</dt><dd>{callerLocation}</dd></div>
                    </dl>
                  </>
                )}
              </div>

              <div className="cc-panel-block">
                <div className="cc-section-heading"><span>Patient quick info</span></div>
                <label className="cc-field"><span>Name</span><input value={patientInfo.name || ''} onChange={(event) => setPatientInfo((value) => ({ ...value, name: event.target.value }))} placeholder="Patient name" /></label>
                <div className="cc-two-fields">
                  <label className="cc-field"><span>Age</span><input inputMode="numeric" value={patientInfo.age || ''} onChange={(event) => setPatientInfo((value) => ({ ...value, age: Number(event.target.value) || undefined }))} placeholder="Age" /></label>
                  <label className="cc-field"><span>Gender</span><select value={patientInfo.gender || ''} onChange={(event) => setPatientInfo((value) => ({ ...value, gender: event.target.value }))}><option value="">Select</option><option>Female</option><option>Male</option><option>Unknown</option></select></label>
                </div>
                <div className="cc-checks">
                  <span className={answers.breathing === 'no' ? 'is-danger' : ''}><Check size={11} />Breathing</span>
                  <span className={answers.alert === 'no' ? 'is-danger' : ''}><Check size={11} />Conscious</span>
                  <span><Check size={11} />Caller nearby</span>
                </div>
              </div>

              <div className="cc-panel-block cc-notes">
                <div className="cc-section-heading">
                  <span>Call notes</span>
                  <button disabled={!selectedCall || busyAction === 'notes'} onClick={() => void runCommand('notes', { note: notes })}>
                    {busyAction === 'notes' ? 'Saving…' : 'Save note'}
                  </button>
                </div>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Document call details and actions…" />
              </div>
            </>
          )}
        </section>

        <section className="cc-triage-panel" aria-label="Guided triage">
          <div className="cc-triage-header">
            {steps.map((step, index) => (
              <div className="cc-step-wrap" key={step.label}>
                {index > 0 && <ChevronRight size={13} className="cc-step-sep" />}
                <button
                  type="button"
                  className={`cc-step ${step.done ? 'is-complete' : ''} ${index === currentStep ? 'is-active' : ''}`}
                  onClick={() => scrollToId(step.target)}
                >
                  <span>{step.done ? <Check size={12} /> : index + 1}</span>
                  <div>{index === 0 && <small>Triage steps</small>}<strong>{step.label}</strong></div>
                </button>
              </div>
            ))}
          </div>

          <div className="cc-protocols" id="cc-protocols">
            <span className="cc-eyebrow">Select problem type</span>
            <div className="cc-protocol-grid">
              {triageProtocols.slice(0, 8).map((item) => {
                const Icon = iconByProtocol[item.icon];
                return (
                  <button className={protocolId === item.id ? 'is-selected' : ''} key={item.id} onClick={() => { setProtocolId(item.id); setAnswers({}); setSelectedColour(undefined); }}>
                    <Icon size={20} /><span>{item.shortName}</span>
                  </button>
                );
              })}
            </div>
            <select className="cc-more-protocols" aria-label="All triage protocols" value={protocolId} onChange={(event) => { setProtocolId(event.target.value); setAnswers({}); setSelectedColour(undefined); }}>
              {triageProtocols.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </div>

          <div className="cc-questionnaire" id="cc-questions">
            <div className="cc-section-heading">
              <div><span>{protocol.name.toUpperCase()} TRIAGE · KEY QUESTIONS</span><strong>{answered}/{protocol.questions.length} answered</strong></div>
              {answered > 0 && <button type="button" onClick={() => { setAnswers({}); setSelectedColour(undefined); }}>Clear answers</button>}
            </div>
            <div className="cc-progress" role="progressbar" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={protocol.questions.length} aria-label="Triage questions answered">
              <i style={{ width: `${(answered / protocol.questions.length) * 100}%` }} />
            </div>
            <div className="cc-question-list">
              {protocol.questions.map((question, index) => (
                <div className={`cc-question ${answers[question.id] ? 'is-answered' : ''}`} key={question.id}>
                  <div><span>{answers[question.id] ? <Check size={10} /> : index + 1}</span><div><strong>{question.text}</strong>{question.note && <small>{question.note}</small>}</div></div>
                  <div className="cc-segmented" role="group" aria-label={question.text}>
                    {['yes', 'no', 'unknown'].map((answer) => (
                      <button className={answers[question.id] === answer ? 'is-selected' : ''} key={answer} onClick={() => setAnswers((current) => ({ ...current, [question.id]: answer }))}>{answer === 'unknown' ? 'Unknown' : answer[0].toUpperCase() + answer.slice(1)}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cc-triage-footer">
            <button
              className="cc-button cc-button--secondary"
              type="button"
              disabled={currentStep === 0}
              onClick={() => scrollToId(steps[Math.max(currentStep - 1, 0)].target)}
            >
              <ChevronLeft size={14} /> Back
            </button>
            <div className="cc-colour-picker" role="group" aria-label="Triage colour override">
              {(['GREEN', 'YELLOW', 'RED'] as TriageColour[]).map((item) => (
                <button
                  className={`${item === colour ? 'is-selected' : ''} is-${item.toLowerCase()}`}
                  key={item}
                  aria-pressed={item === colour}
                  onClick={() => setSelectedColour(item)}
                >
                  {item}
                  {item === recommendation && !selectedColour && <em>rec</em>}
                </button>
              ))}
            </div>
            <button className="cc-button cc-button--primary" onClick={() => scrollToId('dispatch-panel')}>Next: Dispatch <ChevronRight size={14} /></button>
          </div>
        </section>

        <aside className="cc-dispatch-panel" id="dispatch-panel" aria-label="Triage result and dispatch">
          <section className={`cc-triage-result is-${colour.toLowerCase()}`}>
            <span className="cc-eyebrow">Triage result</span>
            <div><AlertTriangle size={22} /><div><strong>{colour} CODE</strong><span>{colour === 'RED' ? 'LIFE-THREATENING' : colour === 'YELLOW' ? 'URGENT' : 'NON-CRITICAL'}</span></div></div>
            <p>{colour === 'RED' ? 'Immediate ambulance dispatch required' : colour === 'YELLOW' ? 'Prompt clinical response required' : 'Assess transport need and provide advice'}</p>
            {selectedColour && selectedColour !== recommendation ? (
              <button onClick={() => setSelectedColour(undefined)}>Overridden · use recommended {recommendation}</button>
            ) : (
              <button disabled>Matches the recommended result</button>
            )}
          </section>

          <section className="cc-summary-card">
            <div className="cc-section-heading"><span>Patient summary</span></div>
            <dl className="cc-summary-grid">
              <div><dt>Name</dt><dd>{patientInfo.name || 'Not recorded'}</dd></div>
              <div><dt>Age / gender</dt><dd>{patientInfo.age || '—'} / {patientInfo.gender || '—'}</dd></div>
              <div><dt>Status</dt><dd className={`cc-text-${colour.toLowerCase()}`}>● {colourPriority(colour)}</dd></div>
              <div><dt>Symptoms</dt><dd>{selectedCall?.emergencyNature || patientInfo.symptoms || 'Not recorded'}</dd></div>
            </dl>
          </section>

          <section className="cc-location-card">
            <div className="cc-section-heading">
              <span>Caller location</span>
              <strong className={coordinates ? '' : 'is-warning'}>{coordinates ? 'GPS fix' : 'No GPS'}</strong>
            </div>
            <p><strong>{callerLocation}</strong><span>{selectedCall?.emergencyLocation?.landmark || 'Location reported by caller'}</span></p>
            <div className="cc-map">
              {coordinates ? (
                <CallLocationMap
                  latitude={coordinates.latitude}
                  longitude={coordinates.longitude}
                  label={callerLocation}
                  colour={colour}
                />
              ) : (
                <div className="cc-map__empty">
                  <MapPinOff size={18} />
                  <strong>No coordinates on this call</strong>
                  <span>Ask the caller for a landmark or nearest facility.</span>
                </div>
              )}
            </div>
            {coordinates && (
              <a
                className="cc-map__link"
                href={`https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=16/${coordinates.latitude}/${coordinates.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)} · open map
              </a>
            )}
          </section>

          <section className="cc-ambulance-card">
            <div className="cc-section-heading">
              <span>Nearest ambulances</span>
              <div className="cc-heading-actions">
                {rankings.length > 3 && (
                  <button type="button" onClick={() => setShowAllAmbulances((value) => !value)}>
                    {showAllAmbulances ? 'Show top 3' : `View all ${rankings.length}`}
                  </button>
                )}
                <button type="button" onClick={() => void refreshRankings()} disabled={!selectedCall || rankingRefreshing} aria-label="Refresh ambulance ranking">
                  <RefreshCw size={11} className={rankingRefreshing ? 'cc-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="cc-ambulance-list">
              {callDetailLoading && <Skeleton rows={3} />}
              {!callDetailLoading && visibleRankings.map((item) => (
                <button className={selectedAmbulanceId === item.ambulanceId ? 'is-selected' : ''} disabled={!item.eligible} key={item.ambulanceId} onClick={() => setSelectedAmbulanceId(item.ambulanceId)}>
                  <Ambulance size={17} /><div><strong>{item.registryId}</strong><span>{item.facilityName || (item.eligible ? 'Available' : item.reasons?.[0])}</span></div><b>{item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : item.estimatedMinutes ? `${item.estimatedMinutes} min` : 'Ranked'}</b>
                </button>
              ))}
              {!callDetailLoading && !rankings.length && (
                <p className="cc-empty-copy">
                  {selectedCall ? 'No eligible ambulance ranking is available for this call.' : 'Select a call to rank nearby ambulances.'}
                </p>
              )}
            </div>
          </section>

          <section className="cc-dispatch-form">
            <div className="cc-section-heading"><span>Dispatch assignment</span></div>
            <label><span>Pickup facility</span><select value={pickupFacilityId} onChange={(event) => setPickupFacilityId(event.target.value)}><option value="">Select pickup</option>{facilities.map((facility) => <option value={facility.id} key={facility.id}>{facility.name}</option>)}</select></label>
            <label><span>Receiving facility</span><select value={dropoffFacilityId} onChange={(event) => setDropoffFacilityId(event.target.value)}><option value="">Select receiving facility</option>{facilities.filter((facility) => facility.id !== pickupFacilityId).map((facility) => <option value={facility.id} key={facility.id}>{facility.name}</option>)}</select></label>
            <button className={`cc-dispatch-button is-${colour.toLowerCase()}`} disabled={!selectedCall || !pickupFacilityId || !dropoffFacilityId || !selectedAmbulanceId || Boolean(busyAction)} onClick={() => void dispatch()}>
              {busyAction === 'dispatch' ? <RefreshCw size={16} className="cc-spin" /> : <Radio size={16} />}
              Dispatch ambulance
            </button>
            {selectedCall && !selectedAmbulanceId && <p className="cc-empty-copy">Select an ambulance above to enable dispatch.</p>}
          </section>

          <section className="cc-timeline">
            <div className="cc-section-heading"><span>Call timeline</span></div>
            {callDetailLoading && <Skeleton rows={3} />}
            {!callDetailLoading && events.slice(0, 4).map((event, index) => <div key={event.id}><i className={index === 0 ? 'is-current' : ''} /><time>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><p><strong>{event.summary}</strong><span>{event.actorName || 'System'}</span></p></div>)}
            {!callDetailLoading && !events.length && <p className="cc-empty-copy">Events will appear as the call progresses.</p>}
          </section>
        </aside>
      </main>

      <footer className="cc-statusbar">
        <div><PhoneCall size={17} /><span>Active calls<strong>{dashboard?.activeCalls ?? activeCalls.length}</strong></span></div>
        <div><Users size={17} /><span>Calls in queue<strong>{filterCounts.active + filterCounts.held}</strong></span></div>
        <div><Ambulance size={17} /><span>Ambulances available<strong>{dashboard?.ambulancesAvailable ?? 0}</strong></span></div>
        <div><Clock3 size={17} /><span>Average response time<strong>{dashboard?.todayStats?.averageResponseTime || '—'}</strong></span></div>
        <div><FileText size={17} /><span>Today’s missions<strong>{dashboard?.todayStats?.ambulancesDispatched ?? 0}</strong></span></div>
        <div><CircleDot size={17} /><span>System status<strong className={loadError ? 'is-warning' : ''}>{loadError ? 'Live data unavailable' : 'All systems operational'}</strong></span></div>
        <button onClick={() => void loadConsole(true)} disabled={refreshing} aria-label="Refresh console"><RefreshCw size={15} className={refreshing ? 'cc-spin' : ''} /></button>
      </footer>

      <NewCallDialog open={newCallOpen} submitting={submittingCall} onClose={() => setNewCallOpen(false)} onSubmit={createCall} />
    </div>
  );
}
