'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  ArrowRight,
  Baby,
  Bell,
  Car,
  Check,
  ChevronLeft,
  Clock,
  Droplet,
  Flame,
  HeartPulse,
  MapPin,
  MapPinOff,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { useToast, useUser } from '@/store';
import {
  protocolById,
  recommendColour,
  triageProtocols,
  type TriageColour,
} from '@/lib/triage-protocols';
import type {
  Call,
  CallType,
  CreateCallRequest,
  PatientInfo,
  TriageResult,
} from '@/types';
import {
  useActiveFacilities,
  useAmbulanceRanking,
  useCallCentreDashboard,
  useCallCommand,
  useCallEvents,
  useCalls,
  useFacilityReadiness,
  useLogCall,
  useNemsOperators,
  useTriageAndDispatch,
} from './hooks';
import './call-centre.css';

const CallLocationMap = dynamic(() => import('./CallLocationMap'), {
  ssr: false,
  loading: () => <div className="cc-skeleton cc-skeleton--map" />,
});

const problemTiles: { id: string; icon: typeof Baby }[] = [
  { id: 'obstetric', icon: Baby },
  { id: 'paediatric', icon: Users },
  { id: 'breathing', icon: Wind },
  { id: 'chest-pain', icon: HeartPulse },
  { id: 'consciousness', icon: Activity },
  { id: 'road-accident', icon: Car },
  { id: 'bleeding', icon: Droplet },
  { id: 'burns', icon: Flame },
  { id: 'seizures', icon: Zap },
];

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
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
}

function formatClock(value?: string) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function colourPriority(colour: TriageColour) {
  if (colour === 'RED') return 'CRITICAL' as const;
  if (colour === 'YELLOW') return 'HIGH' as const;
  return 'LOW' as const;
}

function colourHeadline(colour: TriageColour) {
  if (colour === 'RED') return { title: 'Life-threatening', copy: 'Immediate ambulance dispatch required.' };
  if (colour === 'YELLOW') return { title: 'Urgent', copy: 'Prompt clinical response required.' };
  return { title: 'Non-critical', copy: 'Assess transport need and give advice.' };
}

function facilityLabel(value?: Call['callerFacility']) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.name;
}

function facilityCode(value?: Call['callerFacility']) {
  if (!value || typeof value === 'string') return undefined;
  return value.facilityCode;
}

/** A question with no colour mapping captures data rather than branching the protocol. */
function isFreeText(question: { yesColour?: TriageColour; noColour?: TriageColour }) {
  return !question.yesColour && !question.noColour;
}

function parseNotes(notes?: string) {
  if (!notes?.trim()) return [];
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[?(\d{1,2}:\d{2})\]?\s*[-–—]?\s*(.*)$/);
      return match ? { time: match[1], text: match[2] } : { time: undefined, text: line };
    });
}

const vitalFields: { keys: string[]; label: string; unit: string; abnormal?: (value: number) => boolean }[] = [
  { keys: ['pulse', 'heartRate'], label: 'Pulse', unit: 'bpm', abnormal: (value) => value < 50 || value > 110 },
  { keys: ['respiratoryRate', 'respRate'], label: 'Resp. rate', unit: '/min', abnormal: (value) => value < 10 || value > 24 },
  { keys: ['oxygenSaturation', 'spo2', 'SpO2'], label: 'SpO₂', unit: '%', abnormal: (value) => value < 94 },
  { keys: ['temperature', 'temp'], label: 'Temp.', unit: '°C', abnormal: (value) => value < 35.5 || value > 37.8 },
];

function readVital(vitals: Record<string, unknown> | undefined, keys: string[]) {
  if (!vitals) return undefined;
  for (const key of keys) {
    const value = vitals[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function bloodPressure(vitals?: Record<string, unknown>) {
  const direct = readVital(vitals, ['bloodPressure', 'bp']);
  if (typeof direct === 'string' && direct.trim()) return direct;
  const systolic = readVital(vitals, ['bloodPressureSystolic', 'systolic']);
  const diastolic = readVital(vitals, ['bloodPressureDiastolic', 'diastolic']);
  return systolic && diastolic ? `${systolic}/${diastolic}` : undefined;
}

function bpAbnormal(value: string) {
  const systolic = Number(value.split('/')[0]);
  return Number.isFinite(systolic) && (systolic < 90 || systolic > 160);
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="cc-skeleton-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => <div className="cc-skeleton cc-skeleton--row" key={index} />)}
    </div>
  );
}

interface NewCallDialogProps {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCallRequest) => void;
}

function NewCallDialog({ open, submitting, onClose, onSubmit }: NewCallDialogProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [nature, setNature] = useState('');
  const [location, setLocation] = useState('');
  const [callType, setCallType] = useState<CallType>('EMERGENCY');

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
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
            <h2 id="new-call-title">Start a new call</h2>
          </div>
          <button className="btn btn-ghost cc-icon-button" type="button" onClick={onClose} aria-label="Close call intake"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="cc-dialog__form">
          <label className="cc-field">
            <span>Caller phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required autoFocus placeholder="+232 76 123 456" />
          </label>
          <label className="cc-field">
            <span>Caller name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name or organisation" />
          </label>
          <label className="cc-field">
            <span>Call type</span>
            <select value={callType} onChange={(event) => setCallType(event.target.value as CallType)}>
              <option value="EMERGENCY">Emergency</option>
              <option value="AMBULANCE_REQUEST">Ambulance request</option>
              <option value="REFERRAL_REQUEST">Referral request</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="INQUIRY">Inquiry</option>
            </select>
          </label>
          <label className="cc-field">
            <span>Emergency nature</span>
            <input value={nature} onChange={(event) => setNature(event.target.value)} placeholder="Heavy bleeding, road accident…" />
          </label>
          <label className="cc-field cc-dialog__wide">
            <span>Caller location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Facility, street, community or landmark" />
          </label>
          <div className="cc-dialog__actions cc-dialog__wide">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !phone.trim()}>
              {submitting ? <RefreshCw className="cc-spin" size={16} /> : <PhoneCall size={16} />} Start call
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

  // ---- server state -----------------------------------------------------
  const callsQuery = useCalls();
  const dashboardQuery = useCallCentreDashboard();
  const facilitiesQuery = useActiveFacilities();
  const logCall = useLogCall();
  const command = useCallCommand();
  const triageAndDispatch = useTriageAndDispatch();

  const calls = useMemo(() => callsQuery.data?.data ?? [], [callsQuery.data]);
  const facilities = useMemo(() => facilitiesQuery.data?.data ?? [], [facilitiesQuery.data]);
  const dashboard = dashboardQuery.data;

  // ---- local state ------------------------------------------------------
  const [selectedCallId, setSelectedCallId] = useState<string>();
  const [now, setNow] = useState(() => Date.now());
  const [protocolId, setProtocolId] = useState('obstetric');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedColour, setSelectedColour] = useState<TriageColour>();
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({});
  const [pickupFacilityId, setPickupFacilityId] = useState('');
  const [dropoffFacilityId, setDropoffFacilityId] = useState('');
  const [ambulanceChoice, setAmbulanceChoice] = useState('');
  const [newCallOpen, setNewCallOpen] = useState(false);
  const [conferenceOpen, setConferenceOpen] = useState(false);
  const [conferenceMember, setConferenceMember] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [muted, setMuted] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [showAllAmbulances, setShowAllAmbulances] = useState(false);
  const [showAllProtocols, setShowAllProtocols] = useState(false);
  const [patientFormOpen, setPatientFormOpen] = useState(false);

  const selectedCall = calls.find((call) => call.id === selectedCallId)
    || calls.find((call) => call.callStatus === 'ACTIVE')
    || calls[0];
  const activeCallId = selectedCall?.id;

  // Reset the working form only when a *different* call is opened. Polling replaces
  // every call object each cycle, so keying this on identity would wipe live edits.
  const [loadedCallId, setLoadedCallId] = useState(activeCallId);
  if (activeCallId !== loadedCallId) {
    setLoadedCallId(activeCallId);
    setNoteDraft('');
    setNoteOpen(false);
    setCriteriaOpen(false);
    setPatientFormOpen(false);
    setShowAllAmbulances(false);
    setConferenceOpen(false);
    setTransferOpen(false);
    setMuted(false);
    setAmbulanceChoice('');
    setPatientInfo(selectedCall?.patientInfo || {});
    setSelectedColour(selectedCall?.triageResult?.colourCode);
    if (selectedCall?.triageResult?.protocolId) setProtocolId(selectedCall.triageResult.protocolId);
    setAnswers(selectedCall?.triageResult?.answers
      ? Object.fromEntries(selectedCall.triageResult.answers.map((answer) => [answer.questionId, answer.answer]))
      : {});
  }

  const eventsQuery = useCallEvents(activeCallId);
  const rankingQuery = useAmbulanceRanking(activeCallId);
  const readinessQuery = useFacilityReadiness(dropoffFacilityId || undefined);
  const operatorsQuery = useNemsOperators(transferOpen, operator?.id);

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const rankings = useMemo(() => rankingQuery.data ?? [], [rankingQuery.data]);
  const readiness = readinessQuery.data;

  // The best eligible ambulance is the default; an explicit pick wins while it stays eligible.
  const selectedAmbulanceId = ambulanceChoice && rankings.some((item) => item.ambulanceId === ambulanceChoice && item.eligible)
    ? ambulanceChoice
    : rankings.find((item) => item.eligible)?.ambulanceId || '';

  const protocol = protocolById[protocolId] || triageProtocols[0];
  const recommendation = useMemo(() => recommendColour(protocol, answers), [protocol, answers]);
  const colour = selectedColour || recommendation;
  const activeCalls = calls.filter((call) => call.callStatus === 'ACTIVE');
  const queuedCalls = calls.filter((call) => call.callStatus === 'HELD');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const runCommand = (
    action: 'hold' | 'resume' | 'transfer' | 'conference' | 'notes' | 'complete',
    payload: { reason?: string; participant?: string; note?: string; targetOperatorId?: string } = {},
  ) => {
    if (!selectedCall) return;
    command.mutate(
      { callId: selectedCall.id, command: action, payload: { version: selectedCall.version, ...payload } },
      {
        onSuccess: () => {
          if (action === 'conference') { setConferenceMember(''); setConferenceOpen(false); }
          if (action === 'transfer') { setTransferTarget(''); setTransferOpen(false); }
          if (action === 'notes') { setNoteDraft(''); setNoteOpen(false); }
          toast.success('Call updated', `${action.charAt(0).toUpperCase()}${action.slice(1)} completed.`);
        },
        onError: (error) => toast.error('Call action failed', errorMessage(error)),
      },
    );
  };

  const createCall = (payload: CreateCallRequest) => {
    logCall.mutate(payload, {
      onSuccess: (created) => {
        setSelectedCallId(created.id);
        setNewCallOpen(false);
        toast.success('Call connected', 'The active call is ready for triage.');
      },
      onError: (error) => toast.error('Could not create call', errorMessage(error)),
    });
  };

  const dispatch = () => {
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

    triageAndDispatch.mutate(
      {
        callId: selectedCall.id,
        payload: {
          version: selectedCall.version,
          pickupFacilityId,
          dropoffFacilityId,
          ambulanceId: selectedAmbulanceId,
          priority: colourPriority(colour),
          colourCode: colour,
          triageResult,
          patientInfo,
          notes: selectedCall.notes,
        },
      },
      {
        onSuccess: () => toast.success('Ambulance dispatched', 'The mission was created and the ambulance reserved.'),
        onError: (error) => toast.error('Dispatch failed', errorMessage(error)),
      },
    );
  };

  // ---- derived ----------------------------------------------------------
  const operatorName = operator ? `${operator.firstName} ${operator.lastName}` : 'Call operator';
  const callerFacilityName = facilityLabel(selectedCall?.callerFacility);
  const callerAddress = selectedCall?.emergencyLocation?.address;
  const callerLocation = callerAddress || callerFacilityName || 'Location not linked';
  const answered = protocol.questions.filter((question) => answers[question.id]).length;
  const totalQuestions = protocol.questions.length;
  const callSeconds = selectedCall ? elapsedSeconds(selectedCall.callStartedAt, now, selectedCall.callEndedAt) : 0;
  const onHold = selectedCall?.callStatus === 'HELD';
  const callClosed = selectedCall?.callStatus === 'COMPLETED' || selectedCall?.callStatus === 'TRANSFERRED';
  const dispatched = selectedCall?.callStatus === 'DISPATCHED' || Boolean(selectedCall?.missionId);
  const coordinates = selectedCall?.emergencyLocation?.latitude != null && selectedCall?.emergencyLocation?.longitude != null
    ? { latitude: selectedCall.emergencyLocation.latitude, longitude: selectedCall.emergencyLocation.longitude }
    : undefined;
  const conferenceMembers = selectedCall?.conferenceMembers || [];
  const visibleRankings = showAllAmbulances ? rankings : rankings.slice(0, 3);
  const noteEntries = parseNotes(selectedCall?.notes);
  const headline = colourHeadline(colour);
  const receivingFacility = facilities.find((facility) => facility.id === dropoffFacilityId);
  const vitals = selectedCall?.vitalSigns;
  const bp = bloodPressure(vitals);
  const bloodGroup = readVital(vitals, ['bloodGroup', 'bloodType']);
  const allergies = readVital(vitals, ['allergies']);
  const isOtherProtocol = !problemTiles.some((tile) => tile.id === protocolId);
  const commandBusy = command.isPending ? command.variables?.command : undefined;
  const loadError = callsQuery.isError ? errorMessage(callsQuery.error) : undefined;

  const status = !selectedCall ? { label: 'No active call', tone: 'idle' }
    : onHold ? { label: 'On hold', tone: 'held' }
    : selectedCall.callStatus === 'DISPATCHED' ? { label: 'Dispatched', tone: 'dispatched' }
    : callClosed ? { label: selectedCall.callStatus === 'COMPLETED' ? 'Completed' : 'Transferred', tone: 'closed' }
    : answered > 0 ? { label: 'Triage in progress', tone: 'active' }
    : { label: 'Call connected', tone: 'active' };

  const steps = [
    { label: 'Caller details', done: Boolean(selectedCall) },
    { label: 'Problem type', done: Boolean(selectedCall) },
    { label: 'Triage questions', done: answered > 0 && answered === totalQuestions },
    { label: 'Colour code', done: Boolean(selectedColour) },
  ];
  const firstIncomplete = steps.findIndex((step) => !step.done);
  const currentStep = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;

  const dispatchChecklist = [
    { label: 'Confirm colour code', done: Boolean(selectedColour), hint: `Currently ${colour.toLowerCase()}` },
    { label: 'Select an ambulance', done: Boolean(selectedAmbulanceId), hint: rankings.length ? `${rankings.filter((item) => item.eligible).length} eligible nearby` : 'Awaiting ranking' },
    { label: 'Set pickup facility', done: Boolean(pickupFacilityId), hint: 'Where the ambulance collects' },
    { label: 'Set receiving facility', done: Boolean(dropoffFacilityId), hint: 'Where the patient is taken' },
  ];
  const checklistDone = dispatchChecklist.filter((item) => item.done).length;
  const canDispatch = Boolean(selectedCall) && checklistDone === dispatchChecklist.length && !triageAndDispatch.isPending;

  const readinessTiles = readiness ? [
    { label: 'Beds', value: `${readiness.bedCapacityAvailable ?? 0}`, ok: (readiness.bedCapacityAvailable ?? 0) > 0, note: (readiness.bedCapacityAvailable ?? 0) > 0 ? 'Available' : 'Full' },
    { label: `Blood${bloodGroup ? ` (${bloodGroup})` : ''}`, value: `${readiness.bloodUnitsOPositive ?? 0}`, ok: readiness.bloodBankStatus === 'ADEQUATE', note: readiness.bloodBankStatus === 'ADEQUATE' ? 'Adequate' : 'Low' },
    { label: 'Oxygen', value: `${readiness.oxygenCylinders ?? 0}`, ok: readiness.oxygenStatus === 'ADEQUATE', note: readiness.oxygenStatus === 'ADEQUATE' ? 'Adequate' : 'Low' },
    { label: 'Theatre', value: `${readiness.operatingRoomsAvailable ?? 0}`, ok: Boolean(readiness.theatreAvailable) || (readiness.operatingRoomsAvailable ?? 0) > 0, note: readiness.theatreAvailable ? 'Open' : 'Closed' },
    { label: 'Doctors', value: `${readiness.doctorsOnDuty ?? 0}`, ok: (readiness.doctorsOnDuty ?? 0) > 0, note: (readiness.doctorsOnDuty ?? 0) > 0 ? 'On duty' : 'None' },
  ] : [];

  const refreshAll = () => {
    void callsQuery.refetch();
    void dashboardQuery.refetch();
    if (activeCallId) { void eventsQuery.refetch(); void rankingQuery.refetch(); }
  };

  return (
    <div className="cc-page">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="cc-page__header">
        <div>
          <h1>Call Centre</h1>
          <p>Triage emergency calls and dispatch ambulances across Sierra Leone</p>
        </div>
        <div className="cc-page__actions">
          <button className="btn btn-secondary" onClick={refreshAll} disabled={callsQuery.isFetching}>
            <RefreshCw size={16} className={callsQuery.isFetching ? 'cc-spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setNewCallOpen(true)}>
            <Plus size={16} /> New Call
          </button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <div className="stats-grid cc-stats">
        <div className="stat-card">
          <div className="stat-header"><div className="stat-icon stat-icon-error"><PhoneCall size={20} /></div></div>
          <div className="stat-label">Active Calls</div>
          <div className="stat-value">{dashboard?.activeCalls ?? activeCalls.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><div className="stat-icon stat-icon-warning"><Users size={20} /></div></div>
          <div className="stat-label">Calls in Queue</div>
          <div className="stat-value">{queuedCalls.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><div className="stat-icon stat-icon-success"><Ambulance size={20} /></div></div>
          <div className="stat-label">Ambulances Available</div>
          <div className="stat-value">{dashboard ? `${dashboard.ambulancesAvailable} / ${dashboard.ambulancesAvailable + dashboard.ambulancesOnMission}` : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><div className="stat-icon stat-icon-info"><Clock size={20} /></div></div>
          <div className="stat-label">Average Response</div>
          <div className="stat-value">{dashboard?.todayStats?.averageResponseTime || '—'}</div>
        </div>
      </div>

      {/* ── Live call bar ───────────────────────────────────────────── */}
      <div className="card cc-callbar">
        <div className="cc-callbar__item">
          <span>Active call</span>
          <strong className={`cc-live ${selectedCall && !callClosed ? '' : 'is-idle'}`}><i />{formatDuration(callSeconds)}</strong>
        </div>
        <div className="cc-callbar__item">
          <span>Call ID</span>
          <strong>{selectedCall ? `#${selectedCall.id.slice(0, 10).toUpperCase()}` : '—'}</strong>
        </div>
        <div className="cc-callbar__item">
          <span>Operator</span>
          <strong>{operatorName}</strong>
        </div>
        <div className="cc-callbar__item">
          <span>Status</span>
          <strong><em className={`cc-status is-${status.tone}`}>{status.label}</em></strong>
        </div>
        <div className="cc-callbar__item">
          <span>Today’s missions</span>
          <strong>{dashboard?.todayStats?.completedMissions ?? 0}</strong>
        </div>
      </div>

      {loadError && (
        <div className="cc-alert" role="alert">
          <AlertTriangle size={18} />
          <div><strong>Live call data is unavailable</strong><span>{loadError}</span></div>
          <button className="btn btn-secondary btn-sm" onClick={() => void callsQuery.refetch()}>Try again</button>
        </div>
      )}

      {/* ── Console ─────────────────────────────────────────────────── */}
      <div className="cc-console">
        {/* Column 1 — the call */}
        <div className="cc-col">
          <section className="card cc-card">
            <div className="cc-card__head"><h2>Call controls</h2></div>
            <div className="cc-card__body">
              <button className="cc-end-call" disabled={!selectedCall || callClosed || commandBusy === 'complete'} onClick={() => runCommand('complete', { reason: 'Call completed by operator' })}>
                {commandBusy === 'complete' ? <RefreshCw size={17} className="cc-spin" /> : <PhoneOff size={17} />} End call
              </button>

              <div className="cc-control-grid">
                <button
                  type="button"
                  className={onHold ? 'is-active' : ''}
                  disabled={!selectedCall || callClosed || command.isPending}
                  aria-pressed={onHold}
                  onClick={() => runCommand(onHold ? 'resume' : 'hold', { reason: 'Operator call control' })}
                >
                  {commandBusy === 'hold' || commandBusy === 'resume' ? <RefreshCw size={18} className="cc-spin" /> : <Pause size={18} />}
                  {onHold ? 'Resume' : 'Hold'}
                </button>
                <button type="button" className={muted ? 'is-active' : ''} disabled={!selectedCall || callClosed} aria-pressed={muted} onClick={() => setMuted((value) => !value)}>
                  {muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? 'Unmute' : 'Mute'}
                </button>
                <button type="button" className={transferOpen ? 'is-active' : ''} disabled={!selectedCall || callClosed} aria-expanded={transferOpen} onClick={() => setTransferOpen((value) => !value)}>
                  <PhoneForwarded size={18} />Transfer
                </button>
              </div>

              {transferOpen && (
                <div className="cc-inline-action">
                  <select value={transferTarget} onChange={(event) => setTransferTarget(event.target.value)} aria-label="Transfer to operator">
                    <option value="">{operatorsQuery.isLoading ? 'Loading operators…' : 'Select operator'}</option>
                    {(operatorsQuery.data ?? []).map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}
                  </select>
                  <button className="btn btn-secondary btn-sm" disabled={!transferTarget || commandBusy === 'transfer'} onClick={() => runCommand('transfer', { targetOperatorId: transferTarget, reason: 'Operator transfer' })}>
                    {commandBusy === 'transfer' ? <RefreshCw size={13} className="cc-spin" /> : 'Send'}
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`cc-control-wide ${conferenceOpen ? 'is-active' : ''}`}
                disabled={!selectedCall || callClosed}
                aria-expanded={conferenceOpen}
                onClick={() => setConferenceOpen((value) => !value)}
              >
                <Users size={16} /> Create conference
              </button>

              {conferenceOpen && (
                <div className="cc-inline-action">
                  <input value={conferenceMember} onChange={(event) => setConferenceMember(event.target.value)} placeholder="Clinician or facility" aria-label="Conference participant" />
                  <button className="btn btn-secondary btn-sm" disabled={!conferenceMember.trim() || commandBusy === 'conference'} onClick={() => runCommand('conference', { participant: conferenceMember.trim() })}>
                    {commandBusy === 'conference' ? <RefreshCw size={13} className="cc-spin" /> : 'Add'}
                  </button>
                </div>
              )}

              {conferenceMembers.length > 0 && (
                <div className="cc-chip-row" aria-label="Conference participants">
                  {conferenceMembers.map((member) => <span key={member}><Users size={12} />{member}</span>)}
                </div>
              )}

              {onHold && (
                <div className="cc-hold-banner" role="status">
                  <Pause size={15} /><span>On hold · {formatDuration(elapsedSeconds(selectedCall?.heldAt, now))}</span>
                </div>
              )}
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head"><h2>Caller information</h2></div>
            <div className="cc-card__body">
              {callsQuery.isLoading ? <Skeleton rows={3} /> : !selectedCall ? (
                <div className="cc-empty-state">
                  <PhoneCall size={26} />
                  <strong>No call selected</strong>
                  <span>Start a new call to begin triage.</span>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => setNewCallOpen(true)}>Start a new call</button>
                </div>
              ) : (
                <>
                  <div className="cc-person">
                    <div className="cc-avatar cc-avatar--caller">{(selectedCall.callerName || 'CL').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <strong>{selectedCall.callerName || 'Unnamed caller'}</strong>
                      <span>{callerFacilityName || selectedCall.callType.replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                  </div>
                  {callerFacilityName && <span className="cc-verified"><ShieldCheck size={13} /> Verified caller</span>}
                  <dl className="cc-detail-list">
                    <div>
                      <dt><Phone size={15} /></dt>
                      <dd>{selectedCall.callerPhone ? <a href={`tel:${selectedCall.callerPhone}`}>{selectedCall.callerPhone}</a> : '—'}</dd>
                    </div>
                    <div>
                      <dt><MapPin size={15} /></dt>
                      <dd>
                        <strong>{callerFacilityName || callerLocation}</strong>
                        {callerFacilityName && callerAddress && <span>{callerAddress}</span>}
                        {selectedCall.emergencyLocation?.landmark && <span>{selectedCall.emergencyLocation.landmark}</span>}
                      </dd>
                    </div>
                  </dl>
                  <div className="cc-meta-row">
                    <span>PHU code<strong>{facilityCode(selectedCall.callerFacility) || '—'}</strong></span>
                    <span>Type<strong>{callerFacilityName ? 'Facility' : 'Community'}</strong></span>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head">
              <h2>Patient</h2>
              <button className="cc-text-button" type="button" onClick={() => setPatientFormOpen((value) => !value)} aria-expanded={patientFormOpen}>
                {patientFormOpen ? 'Done' : 'Edit'}
              </button>
            </div>
            <div className="cc-card__body">
              <div className="cc-person">
                <div className="cc-avatar cc-avatar--patient">{(patientInfo.name || 'PT').slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{patientInfo.name || 'Patient not identified'}</strong>
                  <span>{[patientInfo.gender, patientInfo.age ? `${patientInfo.age} years` : undefined].filter(Boolean).join(' · ') || 'Age and gender not recorded'}</span>
                </div>
              </div>

              <div className="cc-checks">
                <span className={answers.alert === 'no' ? 'is-danger' : answers.alert ? 'is-ok' : ''}>
                  {answers.alert === 'no' ? <X size={14} /> : <Check size={14} />}Conscious
                </span>
                <span className={answers.breathing === 'no' ? 'is-danger' : answers.breathing ? 'is-ok' : ''}>
                  {answers.breathing === 'no' ? <X size={14} /> : <Check size={14} />}Breathing
                </span>
                <span className={answers.contact === 'no' ? 'is-danger' : answers.contact ? 'is-ok' : ''}>
                  {answers.contact === 'no' ? <X size={14} /> : <Check size={14} />}Caller with patient
                </span>
              </div>

              {patientFormOpen && (
                <div className="cc-patient-form">
                  <label className="cc-field"><span>Name</span><input value={patientInfo.name || ''} onChange={(event) => setPatientInfo((value) => ({ ...value, name: event.target.value }))} placeholder="Patient name" /></label>
                  <div className="cc-two-fields">
                    <label className="cc-field"><span>Age</span><input inputMode="numeric" value={patientInfo.age || ''} onChange={(event) => setPatientInfo((value) => ({ ...value, age: Number(event.target.value) || undefined }))} placeholder="Age" /></label>
                    <label className="cc-field"><span>Gender</span><select value={patientInfo.gender || ''} onChange={(event) => setPatientInfo((value) => ({ ...value, gender: event.target.value }))}><option value="">Select</option><option>Female</option><option>Male</option><option>Unknown</option></select></label>
                  </div>
                  <label className="cc-field"><span>Symptoms</span><input value={patientInfo.symptoms || ''} onChange={(event) => setPatientInfo((value) => ({ ...value, symptoms: event.target.value }))} placeholder="Presenting complaint" /></label>
                </div>
              )}
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head">
              <h2>Call notes</h2>
              <button className="cc-text-button" type="button" disabled={!selectedCall || callClosed} onClick={() => setNoteOpen((value) => !value)}>
                <Plus size={14} /> Add note
              </button>
            </div>
            <div className="cc-card__body">
              {noteOpen && (
                <div className="cc-note-compose">
                  <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Document call details and actions…" autoFocus />
                  <div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setNoteOpen(false); setNoteDraft(''); }}>Cancel</button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={!noteDraft.trim() || commandBusy === 'notes'} onClick={() => runCommand('notes', { note: noteDraft.trim() })}>
                      {commandBusy === 'notes' && <RefreshCw size={14} className="cc-spin" />} Save note
                    </button>
                  </div>
                </div>
              )}
              {noteEntries.length ? (
                <ul className="cc-note-list">
                  {noteEntries.map((entry, index) => (
                    <li key={`${entry.text}-${index}`}>
                      {entry.time && <time>{entry.time}</time>}
                      <p>{entry.text}</p>
                    </li>
                  ))}
                </ul>
              ) : !noteOpen && <p className="cc-empty-copy">No notes recorded for this call yet.</p>}
            </div>
          </section>
        </div>

        {/* Column 2 — triage */}
        <div className="cc-col">
          <section className="card cc-card">
            <div className="cc-steps">
              {steps.map((step, index) => (
                <div className={`cc-step ${step.done ? 'is-complete' : ''} ${index === currentStep ? 'is-active' : ''}`} key={step.label}>
                  <span>{step.done ? <Check size={13} /> : index + 1}</span>
                  <strong>{step.label}</strong>
                </div>
              ))}
            </div>

            <div className="cc-protocols">
              <div className="cc-subhead">
                <h3>Select problem type</h3>
                {isOtherProtocol && <span>{protocol.name}</span>}
              </div>
              <div className="cc-protocol-grid">
                {problemTiles.map((tile) => {
                  const item = protocolById[tile.id];
                  if (!item) return null;
                  const Icon = tile.icon;
                  return (
                    <button
                      className={protocolId === item.id ? 'is-selected' : ''}
                      key={item.id}
                      onClick={() => { setProtocolId(item.id); setAnswers({}); setSelectedColour(undefined); setShowAllProtocols(false); }}
                    >
                      <Icon size={22} /><span>{item.name}</span>
                    </button>
                  );
                })}
                <button className={isOtherProtocol ? 'is-selected' : ''} onClick={() => setShowAllProtocols((value) => !value)} aria-expanded={showAllProtocols}>
                  <MoreHorizontal size={22} /><span>Other / unknown</span>
                </button>
              </div>
              {(showAllProtocols || isOtherProtocol) && (
                <select
                  className="cc-more-protocols"
                  aria-label="All triage protocols"
                  value={protocolId}
                  onChange={(event) => { setProtocolId(event.target.value); setAnswers({}); setSelectedColour(undefined); }}
                >
                  {triageProtocols.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              )}
            </div>

            <div className="cc-questionnaire">
              <div className="cc-question-bar">
                <div>
                  <h3>{protocol.name} triage — key questions</h3>
                  <span>{answered} of {totalQuestions} answered</span>
                </div>
                <div className="cc-question-bar__right">
                  <span className={`cc-recommend is-${recommendation.toLowerCase()}`}>Recommends {recommendation}</span>
                  {answered > 0 && <button className="cc-text-button" type="button" onClick={() => { setAnswers({}); setSelectedColour(undefined); }}>Clear</button>}
                </div>
              </div>
              <div className="cc-progress" role="progressbar" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={totalQuestions} aria-label="Triage questions answered">
                <i style={{ width: `${totalQuestions ? (answered / totalQuestions) * 100 : 0}%` }} />
              </div>

              <div className="cc-question-list">
                {protocol.questions.map((question, index) => (
                  <div className={`cc-question ${answers[question.id] ? 'is-answered' : ''}`} key={question.id}>
                    <div className="cc-question__text">
                      <span className="cc-question__index">{answers[question.id] ? <Check size={13} /> : index + 1}</span>
                      <div>
                        <strong>{question.text}</strong>
                        {question.note && <small>{question.note}</small>}
                      </div>
                    </div>
                    {isFreeText(question) ? (
                      <input
                        className="cc-question-input"
                        value={answers[question.id] || ''}
                        onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                        placeholder="Record answer"
                        aria-label={question.text}
                      />
                    ) : (
                      <div className="cc-segmented" role="group" aria-label={question.text}>
                        {(['yes', 'no', 'unknown'] as const).map((answer) => (
                          <button
                            className={`${answers[question.id] === answer ? 'is-selected' : ''} is-${answer}`}
                            key={answer}
                            aria-pressed={answers[question.id] === answer}
                            onClick={() => setAnswers((current) => ({ ...current, [question.id]: answer }))}
                          >
                            {answer[0].toUpperCase() + answer.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="cc-triage-footer">
              <button className="btn btn-secondary" type="button" disabled={answered === 0} onClick={() => { setAnswers({}); setSelectedColour(undefined); }}>
                <ChevronLeft size={16} /> Start over
              </button>
              <button
                className={`cc-confirm is-${colour.toLowerCase()}`}
                type="button"
                disabled={!selectedCall}
                onClick={() => { setSelectedColour(colour); setCriteriaOpen(true); }}
              >
                {selectedColour ? `${colour} code confirmed` : `Confirm ${colour} code`} <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </div>

        {/* Column 3 — result, dispatch, context */}
        <div className="cc-col">
          <section className="card cc-card">
            <div className="cc-card__head"><h2>Triage result</h2></div>
            <div className="cc-card__body">
              <div className={`cc-result is-${colour.toLowerCase()}`}>
                <div className="cc-result__mark"><Bell size={22} /></div>
                <div className="cc-result__text">
                  <strong>{colour} code</strong>
                  <span>{headline.title}</span>
                </div>
                <p>{headline.copy}</p>
                <button type="button" onClick={() => setCriteriaOpen((value) => !value)} aria-expanded={criteriaOpen}>
                  {criteriaOpen ? 'Hide criteria' : 'View criteria'}
                </button>
              </div>

              {criteriaOpen && (
                <ul className="cc-criteria">
                  {protocol.criteria[colour].map((line) => <li key={line}><i />{line}</li>)}
                </ul>
              )}

              <div className="cc-colour-picker" role="group" aria-label="Override triage colour">
                {(['GREEN', 'YELLOW', 'RED'] as TriageColour[]).map((item) => (
                  <button
                    className={`${item === colour ? 'is-selected' : ''} is-${item.toLowerCase()}`}
                    key={item}
                    aria-pressed={item === colour}
                    onClick={() => setSelectedColour(item)}
                  >
                    {item}{item === recommendation && <em>rec</em>}
                  </button>
                ))}
              </div>

              <div className="cc-meta-grid">
                <span>Category<strong>{protocol.name}</strong></span>
                <span>Confirmed by<strong>{selectedColour ? operatorName : 'Pending'}</strong></span>
                <span>Confirmed at<strong>{selectedCall?.triageResult?.completedAt ? formatClock(selectedCall.triageResult.completedAt) : selectedColour ? formatClock(new Date(now).toISOString()) : '--:--'}</strong></span>
              </div>
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head">
              <h2>Caller location</h2>
              <span className={`badge ${coordinates ? 'badge-success' : 'badge-warning'}`}>{coordinates ? 'GPS fix' : 'No GPS'}</span>
            </div>
            <div className="cc-card__body">
              <p className="cc-location-text">
                <strong>{callerFacilityName || callerLocation}{facilityCode(selectedCall?.callerFacility) ? ` (${facilityCode(selectedCall?.callerFacility)})` : ''}</strong>
                <span>{callerAddress || selectedCall?.emergencyLocation?.landmark || 'Location reported by caller'}</span>
              </p>
              <div className="cc-map">
                {coordinates ? (
                  <CallLocationMap latitude={coordinates.latitude} longitude={coordinates.longitude} label={callerLocation} colour={colour} />
                ) : (
                  <div className="cc-map__empty">
                    <MapPinOff size={22} />
                    <strong>No coordinates on this call</strong>
                    <span>Ask the caller for a landmark or nearest facility.</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head">
              <h2>Nearest ambulances</h2>
              <div className="cc-heading-actions">
                {rankings.length > 3 && (
                  <button className="cc-text-button" type="button" onClick={() => setShowAllAmbulances((value) => !value)}>
                    {showAllAmbulances ? 'Top 3' : `All ${rankings.length}`}
                  </button>
                )}
                <button className="cc-text-button" type="button" onClick={() => void rankingQuery.refetch()} disabled={!selectedCall || rankingQuery.isFetching} aria-label="Refresh ambulance ranking">
                  <RefreshCw size={14} className={rankingQuery.isFetching ? 'cc-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="cc-card__body">
              <div className="cc-ambulance-list">
                {rankingQuery.isLoading && <Skeleton rows={3} />}
                {!rankingQuery.isLoading && visibleRankings.map((item) => (
                  <button
                    className={selectedAmbulanceId === item.ambulanceId ? 'is-selected' : ''}
                    disabled={!item.eligible}
                    key={item.ambulanceId}
                    aria-pressed={selectedAmbulanceId === item.ambulanceId}
                    onClick={() => setAmbulanceChoice(item.ambulanceId)}
                  >
                    <span className="cc-ambulance-list__mark"><Ambulance size={19} /></span>
                    <div>
                      <strong>{item.registryId}</strong>
                      <span>{item.facilityName || 'Unassigned base'}</span>
                      <em className={item.eligible ? 'is-ok' : 'is-busy'}>{item.eligible ? 'Available' : item.reasons?.[0] || 'On mission'}</em>
                    </div>
                    <div className="cc-ambulance-list__metrics">
                      <b>{item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : '—'}</b>
                      <span>{item.estimatedMinutes != null ? `ETA ${item.estimatedMinutes} min` : 'ETA n/a'}</span>
                    </div>
                  </button>
                ))}
                {!rankingQuery.isLoading && !rankings.length && (
                  <p className="cc-empty-copy">
                    {selectedCall ? 'No eligible ambulance ranking is available for this call.' : 'Select a call to rank nearby ambulances.'}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head">
              <h2>Facilities</h2>
              {receivingFacility && (
                <span className={`badge ${readiness ? 'badge-success' : 'badge-neutral'}`}>{readiness ? 'Readiness reported' : 'No report'}</span>
              )}
            </div>
            <div className="cc-card__body">
              <label className="cc-field"><span>Pickup facility</span>
                <select value={pickupFacilityId} onChange={(event) => setPickupFacilityId(event.target.value)} disabled={facilitiesQuery.isLoading}>
                  <option value="">{facilitiesQuery.isLoading ? 'Loading facilities…' : 'Select pickup'}</option>
                  {facilities.map((facility) => <option value={facility.id} key={facility.id}>{facility.name}</option>)}
                </select>
              </label>
              <label className="cc-field"><span>Receiving facility</span>
                <select value={dropoffFacilityId} onChange={(event) => setDropoffFacilityId(event.target.value)} disabled={facilitiesQuery.isLoading}>
                  <option value="">{facilitiesQuery.isLoading ? 'Loading facilities…' : 'Select receiving facility'}</option>
                  {facilities.filter((facility) => facility.id !== pickupFacilityId).map((facility) => <option value={facility.id} key={facility.id}>{facility.name}</option>)}
                </select>
              </label>

              {receivingFacility && (readinessTiles.length ? (
                <div className="cc-readiness">
                  {readinessTiles.map((tile) => (
                    <div className={tile.ok ? '' : 'is-low'} key={tile.label}>
                      <strong>{tile.value}</strong>
                      <span>{tile.label}</span>
                      <em>{tile.note}</em>
                    </div>
                  ))}
                </div>
              ) : <p className="cc-empty-copy">{readinessQuery.isLoading ? 'Checking facility readiness…' : 'No readiness report submitted by this facility.'}</p>)}

              {receivingFacility?.phone && (
                <a className="btn btn-secondary cc-full-button" href={`tel:${receivingFacility.phone}`}><Phone size={15} /> Call receiving facility</a>
              )}
            </div>
          </section>

          <section className={`card cc-card cc-card--dispatch ${canDispatch ? 'is-ready' : ''}`}>
            <div className="cc-card__head">
              <h2>Dispatch</h2>
              <span className="cc-card__meta">{checklistDone} of {dispatchChecklist.length} ready</span>
            </div>
            <div className="cc-card__body">
              {dispatched ? (
                <div className="cc-dispatched" role="status">
                  <Check size={18} />
                  <div><strong>Ambulance dispatched</strong><span>The mission is live — track it under Ambulances.</span></div>
                </div>
              ) : (
                <ol className="cc-checklist">
                  {dispatchChecklist.map((item) => (
                    <li className={item.done ? 'is-done' : ''} key={item.label}>
                      <i>{item.done ? <Check size={13} /> : null}</i>
                      <div><strong>{item.label}</strong><span>{item.hint}</span></div>
                    </li>
                  ))}
                </ol>
              )}

              <button className={`cc-dispatch-button is-${colour.toLowerCase()}`} disabled={!canDispatch || dispatched} onClick={dispatch}>
                {triageAndDispatch.isPending ? <RefreshCw size={17} className="cc-spin" /> : <Radio size={17} />}
                {dispatched ? 'Already dispatched' : 'Dispatch ambulance'}
              </button>
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head"><h2>Patient summary</h2></div>
            <div className="cc-card__body">
              <dl className="cc-summary-list">
                <div><dt>Name</dt><dd>{patientInfo.name || 'Not recorded'}</dd></div>
                <div><dt>Age / gender</dt><dd>{patientInfo.age ? `${patientInfo.age} years` : '—'} / {patientInfo.gender || '—'}</dd></div>
                <div><dt>Status</dt><dd className={`cc-text-${colour.toLowerCase()}`}>● {colourPriority(colour) === 'CRITICAL' ? 'Critical' : colourPriority(colour) === 'HIGH' ? 'Urgent' : 'Stable'}</dd></div>
                <div><dt>Symptoms</dt><dd className="cc-wrap">{selectedCall?.emergencyNature || patientInfo.symptoms || 'Not recorded'}</dd></div>
              </dl>

              <span className="cc-eyebrow cc-eyebrow--spaced">Vitals (reported)</span>
              {bp || vitalFields.some((field) => readVital(vitals, field.keys) !== undefined) ? (
                <div className="cc-vitals">
                  {bp && <div><dt>BP</dt><dd className={bpAbnormal(bp) ? 'is-abnormal' : ''}>{bp}<i>mmHg</i></dd></div>}
                  {vitalFields.map((field) => {
                    const value = readVital(vitals, field.keys);
                    if (value === undefined) return null;
                    const numeric = Number(value);
                    const abnormal = Number.isFinite(numeric) && field.abnormal?.(numeric);
                    return (
                      <div key={field.label}>
                        <dt>{field.label}</dt>
                        <dd className={abnormal ? 'is-abnormal' : ''}>{String(value)}<i>{field.unit}</i></dd>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="cc-empty-copy">No vitals reported by the caller.</p>}

              <div className="cc-meta-row">
                <span>Blood group<strong>{bloodGroup ? String(bloodGroup) : '—'}</strong></span>
                <span>Allergies<strong>{allergies ? String(allergies) : 'None known'}</strong></span>
              </div>
            </div>
          </section>

          <section className="card cc-card">
            <div className="cc-card__head"><h2>Call timeline</h2></div>
            <div className="cc-card__body">
              <div className="cc-timeline">
                {eventsQuery.isLoading && <Skeleton rows={3} />}
                {!eventsQuery.isLoading && events.slice(0, 6).map((event, index) => (
                  <div key={event.id}>
                    <i className={index === 0 ? 'is-current' : ''} />
                    <time>{formatClock(event.createdAt)}</time>
                    <p><strong>{event.summary}</strong><span>{event.actorName || 'System'}</span></p>
                  </div>
                ))}
                {!eventsQuery.isLoading && !events.length && <p className="cc-empty-copy">Events will appear as the call progresses.</p>}
                {!eventsQuery.isLoading && selectedCall && !dispatched && (
                  <div className="is-pending">
                    <i />
                    <time>Next</time>
                    <p><strong>Dispatch ambulance</strong><span>Assign team &amp; inform facility</span></p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <NewCallDialog open={newCallOpen} submitting={logCall.isPending} onClose={() => setNewCallOpen(false)} onSubmit={createCall} />
    </div>
  );
}
