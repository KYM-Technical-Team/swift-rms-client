'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  ArrowRight,
  Baby,
  BarChart3,
  Bell,
  Building2,
  Car,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Droplet,
  FileText,
  Flame,
  Headphones,
  HeartPulse,
  History,
  LayoutDashboard,
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
  Settings,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { callCentreService, facilityService, readinessService, userService } from '@/lib/api';
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
import type { FacilityReadiness } from '@/types/readiness';
import type { User as SystemUser } from '@/types/user';
import { CallNotifications } from './CallNotifications';
import './call-centre.css';

const CallLocationMap = dynamic(() => import('./CallLocationMap'), {
  ssr: false,
  loading: () => <div className="cc-skeleton cc-skeleton--map" />,
});

/** Problem tiles, in the order shown on the console. */
const problemTiles: { id: string; icon: typeof Baby }[] = [
  { id: 'obstetric', icon: Baby },
  { id: 'paediatric', icon: Users },
  { id: 'breathing', icon: Wind },
  { id: 'chest-pain', icon: HeartPulse },
  { id: 'consciousness', icon: CircleDot },
  { id: 'road-accident', icon: Car },
  { id: 'bleeding', icon: Droplet },
  { id: 'burns', icon: Flame },
  { id: 'seizures', icon: Zap },
];

const navGroups = [
  {
    label: 'Main',
    links: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Active Calls', href: '/call-centre', icon: PhoneCall, badge: 'active' as const },
      { label: 'Call Queue', href: '/call-centre?view=queue', icon: Users, badge: 'queue' as const },
      { label: 'Recent Calls', href: '/call-centre?view=recent', icon: History },
      { label: 'Call History', href: '/call-centre?view=history', icon: Clock3 },
    ],
  },
  {
    label: 'Operations',
    links: [
      { label: 'Triage', href: '/triage', icon: Stethoscope },
      { label: 'Ambulances', href: '/ambulances', icon: Ambulance },
      { label: 'Facilities', href: '/facilities', icon: Building2 },
      { label: 'Missions', href: '/ambulances', icon: Radio },
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
  if (colour === 'RED') return { title: 'LIFE-THREATENING', copy: 'Immediate ambulance dispatch required' };
  if (colour === 'YELLOW') return { title: 'URGENT', copy: 'Prompt clinical response required' };
  return { title: 'NON-CRITICAL', copy: 'Assess transport need and provide advice' };
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

/** A question with no colour mapping is a data-capture question, not a yes/no branch. */
function isFreeText(question: { yesColour?: TriageColour; noColour?: TriageColour }) {
  return !question.yesColour && !question.noColour;
}

interface ParsedNote {
  time?: string;
  text: string;
}

function parseNotes(notes?: string): ParsedNote[] {
  if (!notes?.trim()) return [];
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[?(\d{1,2}:\d{2})\]?\s*[-–—]?\s*(.*)$/);
      return match ? { time: match[1], text: match[2] } : { text: line };
    });
}

const vitalFields: { keys: string[]; label: string; unit: string; abnormal?: (value: number) => boolean }[] = [
  { keys: ['pulse', 'heartRate'], label: 'Pulse', unit: 'bpm', abnormal: (value) => value < 50 || value > 110 },
  { keys: ['respiratoryRate', 'respRate'], label: 'Resp. Rate', unit: '/min', abnormal: (value) => value < 10 || value > 24 },
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
  if (systolic && diastolic) return `${systolic}/${diastolic}`;
  return undefined;
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
  const [readiness, setReadiness] = useState<FacilityReadiness>();
  const [operators, setOperators] = useState<SystemUser[]>([]);
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
  const [pickupFacilityId, setPickupFacilityId] = useState('');
  const [dropoffFacilityId, setDropoffFacilityId] = useState('');
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
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
  const [patientDetailsOpen, setPatientDetailsOpen] = useState(false);

  const selectedCall = calls.find((call) => call.id === selectedCallId) || calls[0];
  const activeCallId = selectedCall?.id;
  const selectedCallRef = useRef(selectedCall);
  selectedCallRef.current = selectedCall;

  const protocol = protocolById[protocolId] || triageProtocols[0];
  const recommendation = useMemo(() => recommendColour(protocol, answers), [protocol, answers]);
  const colour = selectedColour || recommendation;
  const activeCalls = calls.filter((call) => call.callStatus === 'ACTIVE');
  const queuedCalls = calls.filter((call) => call.callStatus === 'HELD');

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

  // Keyed on the call id only: a background refresh replaces every call object, and
  // re-running this on identity change would discard edits the operator is making.
  useEffect(() => {
    const call = selectedCallRef.current;
    setNoteDraft('');
    setNoteOpen(false);
    setCriteriaOpen(false);
    setPatientDetailsOpen(false);
    setShowAllAmbulances(false);
    setConferenceOpen(false);
    setTransferOpen(false);
    setMuted(false);

    if (!call) {
      setEvents([]);
      setRankings([]);
      setPatientInfo({});
      setSelectedColour(undefined);
      setAnswers({});
      return;
    }

    setPatientInfo(call.patientInfo || {});
    setSelectedColour(call.triageResult?.colourCode);
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

  // Readiness for the proposed receiving facility drives the capability tiles.
  useEffect(() => {
    if (!dropoffFacilityId) {
      setReadiness(undefined);
      return;
    }
    let cancelled = false;
    readinessService.getLatest(dropoffFacilityId)
      .then((result) => { if (!cancelled) setReadiness(result); })
      .catch(() => { if (!cancelled) setReadiness(undefined); });
    return () => { cancelled = true; };
  }, [dropoffFacilityId]);

  const openTransfer = async () => {
    setTransferOpen((value) => !value);
    if (operators.length) return;
    try {
      const result = await userService.list({ userType: 'NEMS', limit: 50 });
      setOperators(result.data.filter((item) => item.id !== operator?.id));
    } catch {
      setOperators([]);
    }
  };

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
    command: 'hold' | 'resume' | 'transfer' | 'conference' | 'notes' | 'complete',
    payload: { reason?: string; participant?: string; note?: string; targetOperatorId?: string } = {},
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
      if (command === 'transfer') {
        setTransferTarget('');
        setTransferOpen(false);
      }
      if (command === 'notes') {
        setNoteDraft('');
        setNoteOpen(false);
        callCentreService.listEvents(selectedCall.id).then(setEvents).catch(() => undefined);
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
        notes: selectedCall.notes,
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
  const callerFacilityName = facilityLabel(selectedCall?.callerFacility);
  const callerAddress = selectedCall?.emergencyLocation?.address;
  const callerLocation = callerAddress || callerFacilityName || 'Location not linked';
  const answered = protocol.questions.filter((question) => answers[question.id]).length;
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

  const status = !selectedCall ? { label: 'NO ACTIVE CALL', tone: 'idle' }
    : onHold ? { label: 'ON HOLD', tone: 'held' }
    : selectedCall.callStatus === 'DISPATCHED' ? { label: 'DISPATCHED', tone: 'dispatched' }
    : callClosed ? { label: selectedCall.callStatus, tone: selectedCall.callStatus.toLowerCase() }
    : answered > 0 ? { label: 'TRIAGE IN PROGRESS', tone: 'active' }
    : { label: 'CALL CONNECTED', tone: 'active' };

  const steps = [
    { label: 'Caller Details', done: Boolean(selectedCall) },
    { label: 'Problem Type', done: Boolean(selectedCall) },
    { label: 'Triage Questions', done: answered > 0 && answered === protocol.questions.length },
    { label: 'Colour Code', done: Boolean(selectedColour) },
  ];
  const firstIncomplete = steps.findIndex((step) => !step.done);
  const currentStep = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;

  const readinessTiles = readiness ? [
    { label: 'Beds', value: `${readiness.bedCapacityAvailable ?? 0}`, ok: (readiness.bedCapacityAvailable ?? 0) > 0, note: (readiness.bedCapacityAvailable ?? 0) > 0 ? 'Available' : 'Full' },
    { label: `Blood${bloodGroup ? ` (${bloodGroup})` : ''}`, value: `${readiness.bloodUnitsOPositive ?? 0}`, ok: readiness.bloodBankStatus === 'ADEQUATE', note: readiness.bloodBankStatus === 'ADEQUATE' ? 'Available' : 'Low' },
    { label: 'Oxygen', value: `${readiness.oxygenCylinders ?? 0}`, ok: readiness.oxygenStatus === 'ADEQUATE', note: readiness.oxygenStatus === 'ADEQUATE' ? 'Available' : 'Low' },
    { label: 'Theatre', value: `${readiness.operatingRoomsAvailable ?? 0}`, ok: Boolean(readiness.theatreAvailable) || (readiness.operatingRoomsAvailable ?? 0) > 0, note: readiness.theatreAvailable ? 'Available' : 'Closed' },
    { label: 'Specialists', value: `${readiness.doctorsOnDuty ?? 0}`, ok: (readiness.doctorsOnDuty ?? 0) > 0, note: (readiness.doctorsOnDuty ?? 0) > 0 ? 'On Duty' : 'None' },
  ] : [];

  return (
    <div className="cc-shell">
      <header className="cc-topbar">
        <div className="cc-brand">
          <div className="cc-brand__mark"><ShieldAlert size={18} /></div>
          <div><strong>NEMS CALL CENTRE</strong><span>SIERRA LEONE</span></div>
        </div>
        <div className="cc-call-strip">
          <div>
            <span>Active Call</span>
            <strong className={`cc-live ${selectedCall && !callClosed ? '' : 'is-idle'}`}>
              <i />{formatDuration(callSeconds)}
              <em>{!selectedCall ? 'Idle' : callClosed ? 'Ended' : onHold ? 'Held' : 'Connected'}</em>
            </strong>
          </div>
          <div><span>Call ID</span><strong>{selectedCall ? `#${selectedCall.id.slice(0, 12).toUpperCase()}` : '—'}</strong></div>
          <div><span>Date &amp; Time</span><strong>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(now))}</strong></div>
          <div><span>Operator</span><strong>{operatorName}</strong></div>
          <div><span>Status</span><strong className={`cc-status cc-status--${status.tone}`}>{status.label}</strong></div>
        </div>
        <div className="cc-operator">
          <button
            type="button"
            className={`cc-icon-button cc-icon-button--dark ${muted ? 'is-active' : ''}`}
            onClick={() => setMuted((value) => !value)}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute call audio' : 'Mute call audio'}
          >
            <Headphones size={16} />
          </button>
          <CallNotifications />
          <div className="cc-avatar">{operator ? `${operator.firstName[0]}${operator.lastName[0]}` : 'OP'}</div>
          <div><strong>{operatorName}</strong><span>Operator</span></div>
          <ChevronDown size={14} />
        </div>
      </header>

      <aside className="cc-sidebar">
        <nav aria-label="Call centre navigation">
          {navGroups.map((group) => (
            <div className="cc-nav-group" key={group.label}>
              <span className="cc-nav-label">{group.label}</span>
              {group.links.map((link) => {
                const Icon = link.icon;
                const badge = link.badge === 'active' ? activeCalls.length : link.badge === 'queue' ? queuedCalls.length : 0;
                const active = link.href === '/call-centre'
                  ? pathname === '/call-centre'
                  : link.href !== '/' && pathname.startsWith(link.href.split('?')[0]) && link.href.includes('?') === false;
                return (
                  <Link className={`cc-nav-link ${active ? 'is-active' : ''}`} href={link.href} key={link.label}>
                    <Icon size={15} /><span>{link.label}</span>
                    {badge > 0 && <b>{badge}</b>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <a className="cc-emergency-line" href="tel:112"><Phone size={16} /><span>Emergency lines<strong>112 / 117</strong></span></a>
      </aside>

      <main className="cc-workspace">
        {loadError && (
          <div className="cc-load-error" role="alert">
            <AlertTriangle size={17} />
            <div><strong>Live call data is unavailable</strong><span>{loadError}</span></div>
            <button onClick={() => void loadConsole()}>Try again</button>
          </div>
        )}

        {/* Column 1 — call controls, caller, patient, notes ----------------- */}
        <div className="cc-col cc-col--controls">
          <section className="cc-card">
            <div className="cc-card__head">
              <h2>Call Controls</h2>
              <button className="cc-text-button" type="button" onClick={() => setNewCallOpen(true)}><Plus size={12} /> New</button>
            </div>
            <div className="cc-card__body">
              <button className="cc-end-call" disabled={!selectedCall || callClosed || busyAction === 'complete'} onClick={() => void runCommand('complete', { reason: 'Call completed by operator' })}>
                {busyAction === 'complete' ? <RefreshCw size={14} className="cc-spin" /> : <PhoneOff size={14} />} End Call
              </button>

              <div className="cc-control-grid">
                <button
                  type="button"
                  className={onHold ? 'is-active' : ''}
                  disabled={!selectedCall || callClosed || Boolean(busyAction)}
                  aria-pressed={onHold}
                  onClick={() => void runCommand(onHold ? 'resume' : 'hold', { reason: 'Operator call control' })}
                >
                  {busyAction === 'hold' || busyAction === 'resume' ? <RefreshCw size={15} className="cc-spin" /> : <Pause size={15} />}
                  {onHold ? 'Resume' : 'Hold'}
                </button>
                <button
                  type="button"
                  className={muted ? 'is-active' : ''}
                  disabled={!selectedCall || callClosed}
                  aria-pressed={muted}
                  onClick={() => setMuted((value) => !value)}
                >
                  {muted ? <MicOff size={15} /> : <Mic size={15} />}{muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  type="button"
                  className={transferOpen ? 'is-active' : ''}
                  disabled={!selectedCall || callClosed}
                  aria-expanded={transferOpen}
                  onClick={() => void openTransfer()}
                >
                  <PhoneForwarded size={15} />Transfer
                </button>
              </div>

              {transferOpen && (
                <div className="cc-inline-action">
                  <select value={transferTarget} onChange={(event) => setTransferTarget(event.target.value)} aria-label="Transfer to operator">
                    <option value="">Select operator</option>
                    {operators.map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}
                  </select>
                  <button disabled={!transferTarget || busyAction === 'transfer'} onClick={() => void runCommand('transfer', { targetOperatorId: transferTarget, reason: 'Operator transfer' })}>
                    {busyAction === 'transfer' ? <RefreshCw size={11} className="cc-spin" /> : 'Send'}
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
                <Users size={13} /> Create Conference
              </button>

              {conferenceOpen && (
                <div className="cc-inline-action">
                  <input value={conferenceMember} onChange={(event) => setConferenceMember(event.target.value)} placeholder="Clinician or facility" aria-label="Conference participant" />
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

              {onHold && (
                <div className="cc-hold-banner" role="status">
                  <Pause size={12} />
                  <span>On hold · {formatDuration(elapsedSeconds(selectedCall?.heldAt, now))}</span>
                </div>
              )}
            </div>
          </section>

          <section className="cc-card">
            <div className="cc-card__head"><h2>Caller Information</h2></div>
            <div className="cc-card__body">
              {loading ? <Skeleton rows={3} /> : !selectedCall ? (
                <div className="cc-empty-state">
                  <PhoneCall size={20} />
                  <strong>No call selected</strong>
                  <span>Log a new call to begin triage.</span>
                  <button type="button" onClick={() => setNewCallOpen(true)}>Log a new call</button>
                </div>
              ) : (
                <>
                  <div className="cc-caller-card">
                    <div className="cc-avatar cc-avatar--blue">{(selectedCall.callerName || 'CL').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <strong>{selectedCall.callerName || 'Unnamed caller'}</strong>
                      <span>{callerFacilityName || selectedCall.callType.replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                  </div>
                  {callerFacilityName && (
                    <span className="cc-verified"><ShieldCheck size={10} /> Verified caller</span>
                  )}
                  <dl className="cc-detail-list">
                    <div>
                      <dt><Phone size={12} /></dt>
                      <dd>{selectedCall.callerPhone ? <a href={`tel:${selectedCall.callerPhone}`}>{selectedCall.callerPhone}</a> : '—'}</dd>
                    </div>
                    <div>
                      <dt><MapPin size={12} /></dt>
                      <dd>
                        <strong>{callerFacilityName || callerLocation}</strong>
                        {callerFacilityName && callerAddress && <span>{callerAddress}</span>}
                        {selectedCall.emergencyLocation?.landmark && <span>{selectedCall.emergencyLocation.landmark}</span>}
                      </dd>
                    </div>
                  </dl>
                  <div className="cc-meta-row">
                    <span>PHU Code<strong>{facilityCode(selectedCall.callerFacility) || '—'}</strong></span>
                    <span>Type<strong>{callerFacilityName ? 'Facility' : 'Community'}</strong></span>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="cc-card">
            <div className="cc-card__head"><h2>Patient Quick Info</h2></div>
            <div className="cc-card__body">
              <div className="cc-caller-card">
                <div className="cc-avatar cc-avatar--patient">{(patientInfo.name || 'PT').slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{patientInfo.name || 'Patient not identified'}</strong>
                  <span>{[patientInfo.gender, patientInfo.age ? `${patientInfo.age} years` : undefined].filter(Boolean).join(' • ') || 'Age and gender not recorded'}</span>
                </div>
              </div>

              <div className="cc-checks">
                <span className={answers.alert === 'no' ? 'is-danger' : ''}>
                  {answers.alert === 'no' ? <X size={10} /> : <Check size={10} />}Conscious
                </span>
                <span className={answers.breathing === 'no' ? 'is-danger' : ''}>
                  {answers.breathing === 'no' ? <X size={10} /> : <Check size={10} />}Breathing
                </span>
                <span className={answers.contact === 'no' ? 'is-danger' : ''}>
                  {answers.contact === 'no' ? <X size={10} /> : <Check size={10} />}Close to patient
                </span>
              </div>

              <button type="button" className="cc-ghost-button" onClick={() => setPatientDetailsOpen((value) => !value)} aria-expanded={patientDetailsOpen}>
                {patientDetailsOpen ? 'Hide details' : 'View Full Details'} <ArrowRight size={11} />
              </button>

              {patientDetailsOpen && (
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

          <section className="cc-card">
            <div className="cc-card__head">
              <h2>Call Notes</h2>
              <button className="cc-text-button" type="button" disabled={!selectedCall || callClosed} onClick={() => setNoteOpen((value) => !value)}>
                <Plus size={12} /> Add Note
              </button>
            </div>
            <div className="cc-card__body">
              {noteOpen && (
                <div className="cc-note-compose">
                  <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Document call details and actions…" autoFocus />
                  <div>
                    <button type="button" className="cc-ghost-button" onClick={() => { setNoteOpen(false); setNoteDraft(''); }}>Cancel</button>
                    <button type="button" className="cc-button cc-button--primary" disabled={!noteDraft.trim() || busyAction === 'notes'} onClick={() => void runCommand('notes', { note: noteDraft.trim() })}>
                      {busyAction === 'notes' ? <RefreshCw size={11} className="cc-spin" /> : null} Save
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
              ) : (
                !noteOpen && <p className="cc-empty-copy">No notes recorded for this call yet.</p>
              )}
            </div>
          </section>
        </div>

        {/* Column 2 — triage ------------------------------------------------ */}
        <div className="cc-col cc-col--triage">
          <section className="cc-card cc-card--fill">
            <div className="cc-card__head"><h2>Triage Steps</h2></div>

            <div className="cc-steps">
              {steps.map((step, index) => (
                <div className={`cc-step ${step.done ? 'is-complete' : ''} ${index === currentStep ? 'is-active' : ''}`} key={step.label}>
                  <span>{step.done ? <Check size={10} /> : index + 1}</span>
                  <strong>{step.label}</strong>
                </div>
              ))}
            </div>

            <div className="cc-protocols">
              <span className="cc-eyebrow">Select problem type</span>
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
                      <Icon size={18} /><span>{item.name}</span>
                    </button>
                  );
                })}
                <button
                  className={isOtherProtocol ? 'is-selected' : ''}
                  onClick={() => setShowAllProtocols((value) => !value)}
                  aria-expanded={showAllProtocols}
                >
                  <MoreHorizontal size={18} /><span>{isOtherProtocol ? protocol.name : 'Other / unknown'}</span>
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
              <div className="cc-card__head cc-card__head--inner">
                <h3>{protocol.name} triage — key questions</h3>
                <div className="cc-heading-actions">
                  <span>{answered}/{protocol.questions.length}</span>
                  {answered > 0 && <button type="button" onClick={() => { setAnswers({}); setSelectedColour(undefined); }}>Clear</button>}
                </div>
              </div>
              <div className="cc-question-list">
                {protocol.questions.map((question) => (
                  <div className={`cc-question ${answers[question.id] ? 'is-answered' : ''}`} key={question.id}>
                    <div>
                      <strong>{question.text}</strong>
                      {question.note && <small>{question.note}</small>}
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
                        {['yes', 'no', 'unknown'].map((answer) => (
                          <button
                            className={`${answers[question.id] === answer ? 'is-selected' : ''} is-${answer}`}
                            key={answer}
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
              <button
                className="cc-button cc-button--secondary"
                type="button"
                disabled={answered === 0}
                onClick={() => { setAnswers({}); setSelectedColour(undefined); }}
              >
                Back
              </button>
              <button
                className="cc-button cc-button--primary cc-button--wide"
                type="button"
                onClick={() => { setSelectedColour(colour); setCriteriaOpen(true); }}
              >
                Next: Determine Colour Code <ArrowRight size={14} />
              </button>
            </div>
          </section>
        </div>

        {/* Column 3 — triage result, patient summary, receiving facility ----- */}
        <div className="cc-col cc-col--result">
          <section className="cc-card">
            <div className="cc-card__head"><h2>Triage Result</h2></div>
            <div className="cc-card__body">
              <div className={`cc-result is-${colour.toLowerCase()}`}>
                <div className="cc-result__mark"><Bell size={17} /></div>
                <div className="cc-result__text">
                  <strong>{colour} CODE</strong>
                  <span>{headline.title}</span>
                </div>
                <p>{headline.copy}</p>
                <button type="button" onClick={() => setCriteriaOpen((value) => !value)} aria-expanded={criteriaOpen}>
                  {criteriaOpen ? 'Hide Criteria' : 'View Criteria'}
                </button>
              </div>

              {criteriaOpen && (
                <ul className="cc-criteria">
                  {protocol.criteria[colour].map((line) => <li key={line}><i />{line}</li>)}
                </ul>
              )}

              <div className="cc-meta-grid">
                <span>Category<strong>{protocol.name}</strong></span>
                <span>Completed By<strong>{selectedColour ? operatorName : 'Pending'}</strong></span>
                <span>Completed At<strong>{selectedCall?.triageResult?.completedAt ? formatClock(selectedCall.triageResult.completedAt) : selectedColour ? formatClock(new Date(now).toISOString()) : '--:--'}</strong></span>
              </div>

              <div className="cc-colour-picker" role="group" aria-label="Triage colour override">
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
            </div>
          </section>

          <section className="cc-card">
            <div className="cc-card__head"><h2>Patient Summary</h2></div>
            <div className="cc-card__body">
              <dl className="cc-summary-list">
                <div><dt>Name</dt><dd>{patientInfo.name || 'Not recorded'}</dd></div>
                <div><dt>Age / Gender</dt><dd>{patientInfo.age ? `${patientInfo.age} years` : '—'} / {patientInfo.gender || '—'}</dd></div>
                <div><dt>Status</dt><dd className={`cc-text-${colour.toLowerCase()}`}>● {colourPriority(colour) === 'CRITICAL' ? 'Critical' : colourPriority(colour) === 'HIGH' ? 'Urgent' : 'Stable'}</dd></div>
                <div><dt>Symptoms</dt><dd className="cc-wrap">{selectedCall?.emergencyNature || patientInfo.symptoms || 'Not recorded'}</dd></div>
              </dl>

              <span className="cc-eyebrow cc-eyebrow--spaced">Vitals (reported)</span>
              {bp || vitalFields.some((field) => readVital(vitals, field.keys) !== undefined) ? (
                <div className="cc-vitals">
                  {bp && (
                    <div><dt>BP</dt><dd className={bpAbnormal(bp) ? 'is-abnormal' : ''}>{bp}<i>mmHg</i></dd></div>
                  )}
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
              ) : (
                <p className="cc-empty-copy">No vitals reported by the caller.</p>
              )}

              <div className="cc-meta-row">
                <span>Blood Group<strong>{bloodGroup ? String(bloodGroup) : '—'}</strong></span>
                <span>Allergies<strong>{allergies ? String(allergies) : 'None known'}</strong></span>
              </div>
            </div>
          </section>

          <section className="cc-card">
            <div className="cc-card__head">
              <h2>Receiving Facility</h2>
              {receivingFacility && (
                <strong className={`cc-badge ${readiness ? 'is-ready' : 'is-muted'}`}>{readiness ? 'Ready' : 'No report'}</strong>
              )}
            </div>
            <div className="cc-card__body">
              <label className="cc-field"><span>Pickup facility</span>
                <select value={pickupFacilityId} onChange={(event) => setPickupFacilityId(event.target.value)}>
                  <option value="">Select pickup</option>
                  {facilities.map((facility) => <option value={facility.id} key={facility.id}>{facility.name}</option>)}
                </select>
              </label>
              <label className="cc-field"><span>Receiving facility (proposed)</span>
                <select value={dropoffFacilityId} onChange={(event) => setDropoffFacilityId(event.target.value)}>
                  <option value="">Select receiving facility</option>
                  {facilities.filter((facility) => facility.id !== pickupFacilityId).map((facility) => <option value={facility.id} key={facility.id}>{facility.name}</option>)}
                </select>
              </label>

              {receivingFacility && (
                readinessTiles.length ? (
                  <div className="cc-readiness">
                    {readinessTiles.map((tile) => (
                      <div className={tile.ok ? '' : 'is-low'} key={tile.label}>
                        <strong>{tile.value}</strong>
                        <span>{tile.label}</span>
                        <em>{tile.note}</em>
                      </div>
                    ))}
                  </div>
                ) : <p className="cc-empty-copy">No readiness report submitted by this facility.</p>
              )}

              {receivingFacility?.phone && (
                <a className="cc-ghost-button cc-ghost-button--full" href={`tel:${receivingFacility.phone}`}>
                  <Phone size={12} /> Call Facility RC
                </a>
              )}
            </div>
          </section>
        </div>

        {/* Column 4 — location, ambulances, timeline ------------------------- */}
        <div className="cc-col cc-col--location">
          <section className="cc-card">
            <div className="cc-card__head">
              <h2>Caller Location</h2>
              <strong className={`cc-badge ${coordinates ? 'is-ready' : 'is-warning'}`}>{coordinates ? 'Accurate' : 'No GPS'}</strong>
            </div>
            <div className="cc-card__body">
              <p className="cc-location-text">
                <strong>{callerFacilityName || callerLocation}{facilityCode(selectedCall?.callerFacility) ? ` (${facilityCode(selectedCall?.callerFacility)})` : ''}</strong>
                <span>{callerAddress || selectedCall?.emergencyLocation?.landmark || 'Location reported by caller'}</span>
              </p>
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
            </div>
          </section>

          <section className="cc-card">
            <div className="cc-card__head">
              <h2>Nearest Ambulances</h2>
              <div className="cc-heading-actions">
                {rankings.length > 3 && (
                  <button type="button" onClick={() => setShowAllAmbulances((value) => !value)}>
                    {showAllAmbulances ? 'Top 3' : `View All ${rankings.length}`}
                  </button>
                )}
                <button type="button" onClick={() => void refreshRankings()} disabled={!selectedCall || rankingRefreshing} aria-label="Refresh ambulance ranking">
                  <RefreshCw size={11} className={rankingRefreshing ? 'cc-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="cc-card__body">
              <div className="cc-ambulance-list">
                {callDetailLoading && <Skeleton rows={3} />}
                {!callDetailLoading && visibleRankings.map((item) => (
                  <button
                    className={selectedAmbulanceId === item.ambulanceId ? 'is-selected' : ''}
                    disabled={!item.eligible}
                    key={item.ambulanceId}
                    onClick={() => setSelectedAmbulanceId(item.ambulanceId)}
                  >
                    <span className="cc-ambulance-list__mark"><Ambulance size={15} /></span>
                    <div>
                      <strong>{item.registryId}</strong>
                      <span>{item.facilityName || 'Unassigned base'}</span>
                      <em className={item.eligible ? 'is-ok' : 'is-busy'}>{item.eligible ? 'Available' : item.reasons?.[0] || 'On mission'}</em>
                    </div>
                    <div className="cc-ambulance-list__metrics">
                      <b>{item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km away` : 'Distance n/a'}</b>
                      <span>{item.estimatedMinutes != null ? `ETA ${item.estimatedMinutes} min` : 'ETA n/a'}</span>
                    </div>
                  </button>
                ))}
                {!callDetailLoading && !rankings.length && (
                  <p className="cc-empty-copy">
                    {selectedCall ? 'No eligible ambulance ranking is available for this call.' : 'Select a call to rank nearby ambulances.'}
                  </p>
                )}
              </div>

              <button
                className={`cc-dispatch-button is-${colour.toLowerCase()}`}
                disabled={!selectedCall || !pickupFacilityId || !dropoffFacilityId || !selectedAmbulanceId || Boolean(busyAction)}
                onClick={() => void dispatch()}
              >
                {busyAction === 'dispatch' ? <RefreshCw size={14} className="cc-spin" /> : <Radio size={14} />}
                Dispatch Ambulance
              </button>
              {selectedCall && !dispatched && (!pickupFacilityId || !dropoffFacilityId || !selectedAmbulanceId) && (
                <p className="cc-empty-copy">
                  {!selectedAmbulanceId ? 'Select an ambulance to enable dispatch.' : 'Select pickup and receiving facilities to enable dispatch.'}
                </p>
              )}
            </div>
          </section>

          <section className="cc-card">
            <div className="cc-card__head"><h2>Call Timeline</h2></div>
            <div className="cc-card__body">
              <div className="cc-timeline">
                {callDetailLoading && <Skeleton rows={3} />}
                {!callDetailLoading && events.slice(0, 6).map((event, index) => (
                  <div key={event.id}>
                    <i className={index === 0 ? 'is-current' : ''} />
                    <time>{formatClock(event.createdAt)}</time>
                    <p><strong>{event.summary}</strong><span>{event.actorName || 'System'}</span></p>
                  </div>
                ))}
                {!callDetailLoading && !events.length && <p className="cc-empty-copy">Events will appear as the call progresses.</p>}
                {!callDetailLoading && selectedCall && !dispatched && (
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
      </main>

      <footer className="cc-statusbar">
        <div><PhoneCall size={17} /><span>Active Calls<strong>{dashboard?.activeCalls ?? activeCalls.length}</strong></span></div>
        <div><Users size={17} /><span>Calls in Queue<strong>{queuedCalls.length}</strong></span></div>
        <div><Ambulance size={17} /><span>Ambulances Available<strong>{dashboard ? `${dashboard.ambulancesAvailable} / ${dashboard.ambulancesAvailable + dashboard.ambulancesOnMission}` : '—'}</strong></span></div>
        <div><Clock3 size={17} /><span>Average Response Time<strong>{dashboard?.todayStats?.averageResponseTime || '—'}</strong></span></div>
        <div><FileText size={17} /><span>Today’s Missions<strong>{dashboard?.todayStats?.completedMissions ?? 0}</strong></span></div>
        <div><CircleDot size={17} /><span>System Status<strong className={loadError ? 'is-warning' : ''}>{loadError ? 'Live data unavailable' : 'All Systems Operational'}</strong></span></div>
        <button onClick={() => void loadConsole(true)} disabled={refreshing} aria-label="Refresh console"><RefreshCw size={15} className={refreshing ? 'cc-spin' : ''} /></button>
      </footer>

      <NewCallDialog open={newCallOpen} submitting={submittingCall} onClose={() => setNewCallOpen(false)} onSubmit={createCall} />
    </div>
  );
}
