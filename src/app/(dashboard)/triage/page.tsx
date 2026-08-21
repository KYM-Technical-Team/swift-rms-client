'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Baby,
  Bell,
  Building2,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Droplet,
  ExternalLink,
  Flame,
  HeartPulse,
  Inbox,
  Minus,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  User,
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
  type TriageProtocol,
} from '@/lib/triage-protocols';
import type { ArrivalCondition, Priority, Referral } from '@/types';
import {
  useAcceptReferral,
  useAddReferralNote,
  useArrivedReferrals,
  useClinicianReview,
  usePendingReferrals,
  useReferralTimeline,
  useRejectReferral,
  useSetReferralPriority,
} from './hooks';
import '../console.css';

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

/** Pre-arrival triage and on-arrival clinician validation are two different jobs. */
type Stage = 'pending' | 'arrived';
type ConsoleTab = 'assessment' | 'referral' | 'decision' | 'history';
type QueueFilter = 'all' | 'critical' | 'high' | 'other';

const queueFilters: { id: QueueFilter; label: string; match: (referral: Referral) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'critical', label: 'Critical', match: (referral) => referral.priority === 'CRITICAL' },
  { id: 'high', label: 'High', match: (referral) => referral.priority === 'HIGH' },
  { id: 'other', label: 'Medium / low', match: (referral) => referral.priority !== 'CRITICAL' && referral.priority !== 'HIGH' },
];

const arrivalConditions: { id: ArrivalCondition; label: string; icon: typeof TrendingUp; tone: string }[] = [
  { id: 'IMPROVED', label: 'Improved', icon: TrendingUp, tone: 'improved' },
  { id: 'SAME', label: 'Unchanged', icon: Minus, tone: 'same' },
  { id: 'DETERIORATED', label: 'Deteriorated', icon: TrendingDown, tone: 'deteriorated' },
];

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'The operation could not be completed.';
}

function waitedMinutes(from: string | undefined, now: number) {
  if (!from) return 0;
  return Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000));
}

function formatWait(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function formatClock(value?: string) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function colourPriority(colour: TriageColour): Priority {
  if (colour === 'RED') return 'CRITICAL';
  if (colour === 'YELLOW') return 'HIGH';
  return 'LOW';
}

function priorityColour(priority?: string): TriageColour {
  if (priority === 'CRITICAL') return 'RED';
  if (priority === 'HIGH') return 'YELLOW';
  return 'GREEN';
}

function isTriageColour(value?: string): value is TriageColour {
  return value === 'RED' || value === 'YELLOW' || value === 'GREEN';
}

function colourHeadline(colour: TriageColour) {
  if (colour === 'RED') return { title: 'Life-threatening', copy: 'Accept immediately and prepare the receiving team.' };
  if (colour === 'YELLOW') return { title: 'Urgent', copy: 'Respond promptly — assess capacity before accepting.' };
  return { title: 'Non-critical', copy: 'Route to routine care or advise the sending facility.' };
}

function priorityTone(priority?: string) {
  if (priority === 'CRITICAL') return 'critical';
  if (priority === 'HIGH') return 'high';
  if (priority === 'MEDIUM') return 'medium';
  return 'low';
}

function priorityBadgeClass(priority?: string) {
  if (priority === 'CRITICAL') return 'badge badge-critical';
  if (priority === 'HIGH') return 'badge badge-high';
  if (priority === 'MEDIUM') return 'badge badge-medium';
  return 'badge badge-low';
}

function patientName(referral?: Referral) {
  if (!referral?.patient) return 'Unknown patient';
  return `${referral.patient.firstName ?? ''} ${referral.patient.lastName ?? ''}`.trim() || 'Unknown patient';
}

/** A question with no colour mapping captures data rather than branching the protocol. */
function isFreeText(question: { yesColour?: TriageColour; noColour?: TriageColour }) {
  return !question.yesColour && !question.noColour;
}

/** Preselect a protocol by matching its keywords against the referral's own words. */
function matchProtocol(referral?: Referral) {
  if (!referral) return undefined;
  const haystack = [referral.chiefComplaint, referral.clinicalSummary, ...(referral.dangerSigns || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!haystack) return undefined;
  return triageProtocols.find((protocol) => protocol.keywords.some((keyword) => haystack.includes(keyword)))?.id;
}

/** The protocol answers, rendered for the free-text `notes` the review endpoint accepts. */
function triageSummary(protocol: TriageProtocol, answers: Record<string, string>) {
  const lines = protocol.questions
    .filter((question) => answers[question.id])
    .map((question) => `• ${question.text} — ${answers[question.id]}`);
  if (!lines.length) return '';
  return [`${protocol.name} protocol assessment:`, ...lines].join('\n');
}

const vitalFields: { key: keyof NonNullable<Referral['vitalSigns']>; label: string; unit: string; abnormal: (value: number) => boolean }[] = [
  { key: 'heartRate', label: 'Pulse', unit: 'bpm', abnormal: (value) => value < 50 || value > 110 },
  { key: 'respiratoryRate', label: 'Resp. rate', unit: '/min', abnormal: (value) => value < 10 || value > 24 },
  { key: 'oxygenSaturation', label: 'SpO₂', unit: '%', abnormal: (value) => value < 94 },
  { key: 'temperature', label: 'Temp.', unit: '°C', abnormal: (value) => value < 35.5 || value > 37.8 },
];

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="cc-skeleton-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => <div className="cc-skeleton cc-skeleton--row" key={index} />)}
    </div>
  );
}

export default function TriagePage() {
  const clinician = useUser();
  const toast = useToast();
  const pendingScope =
    clinician?.userType === 'SYSTEM_ADMIN' ||
    clinician?.userType === 'NEMS' ||
    clinician?.userType === 'AMBULANCE_DISPATCH' ||
    !clinician?.facility?.id
      ? 'global'
      : 'facility';

  // ---- server state -----------------------------------------------------
  const pendingQuery = usePendingReferrals(pendingScope);
  const arrivedQuery = useArrivedReferrals();
  const acceptReferral = useAcceptReferral();
  const rejectReferral = useRejectReferral();
  const setPriority = useSetReferralPriority();
  const addNote = useAddReferralNote();
  const clinicianReview = useClinicianReview();

  const pending = useMemo(() => pendingQuery.data ?? [], [pendingQuery.data]);
  const arrived = useMemo(() => arrivedQuery.data ?? [], [arrivedQuery.data]);

  // ---- local state ------------------------------------------------------
  const [stage, setStage] = useState<Stage>('pending');
  const [tab, setTab] = useState<ConsoleTab>('assessment');
  const [selectedId, setSelectedId] = useState<string>();
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [queueSearch, setQueueSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [protocolId, setProtocolId] = useState('obstetric');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedColour, setSelectedColour] = useState<TriageColour>();
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [showAllProtocols, setShowAllProtocols] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [arrivalCondition, setArrivalCondition] = useState<ArrivalCondition>();
  const [conditionNotes, setConditionNotes] = useState('');

  const source = stage === 'pending' ? pending : arrived;
  const sourceQuery = stage === 'pending' ? pendingQuery : arrivedQuery;

  const filterCounts = useMemo(
    () => Object.fromEntries(queueFilters.map((filter) => [filter.id, source.filter(filter.match).length])) as Record<QueueFilter, number>,
    [source],
  );

  const queue = useMemo(() => {
    const matcher = queueFilters.find((filter) => filter.id === queueFilter) || queueFilters[0];
    const term = queueSearch.trim().toLowerCase();
    const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return source
      .filter(matcher.match)
      .filter((referral) => !term || [
        referral.referralCode,
        patientName(referral),
        referral.sendingFacility?.name,
        referral.chiefComplaint,
      ].some((value) => value?.toLowerCase().includes(term)))
      .sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9)
        || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [source, queueFilter, queueSearch]);

  const selected = source.find((referral) => referral.id === selectedId) || queue[0];
  const activeId = selected?.id;

  // Reset the assessment only when a *different* referral is opened — polling
  // replaces every object each cycle, so keying on identity would wipe answers.
  const [loadedId, setLoadedId] = useState(activeId);
  if (activeId !== loadedId) {
    setLoadedId(activeId);
    setAnswers({});
    setCriteriaOpen(false);
    setShowAllProtocols(false);
    setRejectOpen(false);
    setRejectReason('');
    setNoteDraft('');
    setNoteOpen(false);
    setArrivalCondition(undefined);
    setConditionNotes('');
    setTab('assessment');
    setProtocolId(matchProtocol(selected) || 'obstetric');
    setSelectedColour(isTriageColour(selected?.clinicianValidatedColourCode)
      ? selected.clinicianValidatedColourCode
      : isTriageColour(selected?.colourCode) ? selected.colourCode : undefined);
  }

  const timelineQuery = useReferralTimeline(activeId);
  const timeline = useMemo(() => timelineQuery.data ?? [], [timelineQuery.data]);

  const protocol = protocolById[protocolId] || triageProtocols[0];
  const recommendation = useMemo(() => recommendColour(protocol, answers), [protocol, answers]);
  const answered = protocol.questions.filter((question) => answers[question.id]).length;
  const totalQuestions = protocol.questions.length;
  // Before any assessment, fall back to the priority the sending facility set.
  const colour = selectedColour || (answered > 0 ? recommendation : priorityColour(selected?.priority));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // ---- derived ----------------------------------------------------------
  const clinicianName = clinician ? `${clinician.firstName} ${clinician.lastName}` : 'Clinician';
  const criticalCount = pending.filter((referral) => referral.priority === 'CRITICAL').length;
  const highCount = pending.filter((referral) => referral.priority === 'HIGH').length;
  const headline = colourHeadline(colour);
  const dangerSigns = selected?.dangerSigns || [];
  const vitals = selected?.vitalSigns;
  const bp = vitals?.bloodPressureSystolic !== undefined && vitals?.bloodPressureDiastolic !== undefined
    ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`
    : undefined;
  const hasVitals = Boolean(bp) || vitalFields.some((field) => vitals?.[field.key] !== undefined);
  const isOtherProtocol = !problemTiles.some((tile) => tile.id === protocolId);
  const targetPriority = colourPriority(colour);
  const priorityChanged = Boolean(selected) && targetPriority !== selected?.priority;
  const decided = selected?.status === 'ACCEPTED' || selected?.status === 'REJECTED';
  const reviewed = selected?.status === 'CLINICIAN_REVIEWED' || Boolean(selected?.seenByClinicianAt);
  const isArrivalStage = stage === 'arrived';
  const loadError = sourceQuery.isError ? errorMessage(sourceQuery.error) : undefined;
  const busy = acceptReferral.isPending || rejectReferral.isPending || setPriority.isPending || clinicianReview.isPending;
  const referredColour = isTriageColour(selected?.colourCode) ? selected.colourCode : priorityColour(selected?.priority);
  const summary = triageSummary(protocol, answers);

  const steps = [
    { label: 'Select referral', done: Boolean(selected) },
    { label: 'Problem type', done: Boolean(selected) },
    { label: 'Triage questions', done: answered > 0 && answered === totalQuestions },
    { label: 'Colour code', done: Boolean(selectedColour) },
  ];
  const firstIncomplete = steps.findIndex((step) => !step.done);
  const currentStep = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;

  const decisionChecklist = isArrivalStage
    ? [
        { label: 'Answer triage questions', done: answered > 0, hint: `${answered} of ${totalQuestions} answered` },
        { label: 'Validate colour code', done: Boolean(selectedColour), hint: `Currently ${colour.toLowerCase()}` },
        { label: 'Record arrival condition', done: Boolean(arrivalCondition), hint: arrivalCondition ? arrivalConditions.find((item) => item.id === arrivalCondition)!.label : 'Compared with the referral' },
      ]
    : [
        { label: 'Review danger signs', done: Boolean(selected), hint: dangerSigns.length ? `${dangerSigns.length} recorded` : 'None recorded' },
        { label: 'Answer triage questions', done: answered > 0, hint: `${answered} of ${totalQuestions} answered` },
        { label: 'Confirm colour code', done: Boolean(selectedColour), hint: `Currently ${colour.toLowerCase()}` },
      ];
  const checklistDone = decisionChecklist.filter((item) => item.done).length;
  const canDecide = Boolean(selected) && Boolean(selectedColour) && !decided && !busy;
  const canReview = Boolean(selected) && Boolean(selectedColour) && Boolean(arrivalCondition) && !reviewed && !busy;

  const consoleTabs: { id: ConsoleTab; label: string; icon: typeof Baby; badge?: string; ready?: boolean }[] = [
    { id: 'assessment', label: 'Assessment', icon: Stethoscope, badge: `${answered}/${totalQuestions}`, ready: totalQuestions > 0 && answered === totalQuestions },
    { id: 'referral', label: 'Referral', icon: User, badge: dangerSigns.length ? String(dangerSigns.length) : undefined },
    {
      id: 'decision',
      label: isArrivalStage ? 'Arrival review' : 'Decision',
      icon: CheckCircle2,
      badge: isArrivalStage
        ? (reviewed ? 'Done' : `${checklistDone}/${decisionChecklist.length}`)
        : (decided ? 'Done' : `${checklistDone}/${decisionChecklist.length}`),
      ready: isArrivalStage ? reviewed || canReview : decided || canDecide,
    },
    { id: 'history', label: 'History', icon: ClipboardList, badge: timeline.length ? String(timeline.length) : undefined },
  ];

  const openDecision = () => {
    setSelectedColour(colour);
    setTab('decision');
    window.requestAnimationFrame(() => document.getElementById('cc-tab-decision')?.focus());
  };

  const refreshAll = () => {
    void pendingQuery.refetch();
    void arrivedQuery.refetch();
    if (activeId) void timelineQuery.refetch();
  };

  const switchStage = (next: Stage) => {
    if (next === stage) return;
    setStage(next);
    setSelectedId(undefined);
    setQueueFilter('all');
    setQueueSearch('');
  };

  // ---- actions ----------------------------------------------------------
  const applyPriority = () => {
    if (!selected) return;
    setPriority.mutate(
      { referralId: selected.id, priority: targetPriority },
      {
        onSuccess: () => toast.success('Priority updated', `${selected.referralCode} is now ${targetPriority}.`),
        onError: (error) => toast.error('Could not update priority', errorMessage(error)),
      },
    );
  };

  const accept = () => {
    if (!selected) return;
    acceptReferral.mutate(selected.id, {
      onSuccess: () => toast.success('Referral accepted', `${selected.referralCode} has been accepted.`),
      onError: (error) => toast.error('Could not accept referral', errorMessage(error)),
    });
  };

  const reject = () => {
    if (!selected || !rejectReason.trim()) return;
    rejectReferral.mutate(
      { referralId: selected.id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason('');
          toast.success('Referral rejected', `${selected.referralCode} was returned to the sending facility.`);
        },
        onError: (error) => toast.error('Could not reject referral', errorMessage(error)),
      },
    );
  };

  const saveNote = () => {
    if (!selected || !noteDraft.trim()) return;
    addNote.mutate(
      { referralId: selected.id, notes: noteDraft.trim() },
      {
        onSuccess: () => {
          setNoteDraft('');
          setNoteOpen(false);
          toast.success('Note added', 'The assessment note was recorded on the referral.');
        },
        onError: (error) => toast.error('Could not add note', errorMessage(error)),
      },
    );
  };

  const submitReview = () => {
    if (!selected || !selectedColour || !arrivalCondition) return;
    clinicianReview.mutate(
      {
        referralId: selected.id,
        review: {
          validatedColourCode: selectedColour,
          arrivalCondition,
          arrivalConditionNotes: conditionNotes.trim() || undefined,
          // The protocol answers ride along as the reviewer's clinical note.
          notes: summary || undefined,
        },
      },
      {
        onSuccess: () => toast.success('Review submitted', `${selected.referralCode} validated as ${selectedColour}.`),
        onError: (error) => toast.error('Could not submit review', errorMessage(error)),
      },
    );
  };

  return (
    <div className="cc-page">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="cc-page__header">
        <div>
          <h1>Triage</h1>
          <p>Assess incoming referrals against the national protocols, then validate on arrival</p>
        </div>
        <div className="cc-page__actions">
          <button className="btn btn-secondary" onClick={refreshAll} disabled={sourceQuery.isFetching}>
            <RefreshCw size={16} className={sourceQuery.isFetching ? 'cc-spin' : ''} /> Refresh
          </button>
          <Link href="/referrals" className="btn btn-primary">
            All referrals <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* ── KPI row (the first two also filter the queue) ───────────── */}
      <div className="stats-grid cc-stats">
        <button
          type="button"
          className={`stat-card cc-stat-card--filter ${queueFilter === 'critical' ? 'is-selected' : ''}`}
          onClick={() => setQueueFilter(queueFilter === 'critical' ? 'all' : 'critical')}
          aria-pressed={queueFilter === 'critical'}
        >
          <div className="stat-header"><div className="stat-icon stat-icon-error"><AlertTriangle size={20} /></div></div>
          <div className="stat-label">Critical pending</div>
          <div className="stat-value">{criticalCount}</div>
        </button>
        <button
          type="button"
          className={`stat-card cc-stat-card--filter ${queueFilter === 'high' ? 'is-selected' : ''}`}
          onClick={() => setQueueFilter(queueFilter === 'high' ? 'all' : 'high')}
          aria-pressed={queueFilter === 'high'}
        >
          <div className="stat-header"><div className="stat-icon stat-icon-warning"><Clock size={20} /></div></div>
          <div className="stat-label">High priority</div>
          <div className="stat-value">{highCount}</div>
        </button>
        <div className="stat-card">
          <div className="stat-header"><div className="stat-icon stat-icon-info"><Inbox size={20} /></div></div>
          <div className="stat-label">Awaiting triage</div>
          <div className="stat-value">{pending.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header"><div className="stat-icon stat-icon-success"><Stethoscope size={20} /></div></div>
          <div className="stat-label">Awaiting review</div>
          <div className="stat-value">{arrived.length}</div>
        </div>
      </div>

      {/* ── Current assessment bar ──────────────────────────────────── */}
      <div className="card cc-callbar">
        <div className="cc-callbar__item">
          <span>Assessing</span>
          <strong>{selected ? selected.referralCode : '—'}</strong>
        </div>
        <div className="cc-callbar__item">
          <span>Patient</span>
          <strong>{selected ? patientName(selected) : '—'}</strong>
        </div>
        <div className="cc-callbar__item">
          <span>{isArrivalStage ? 'Since referral' : 'Waiting'}</span>
          <strong className={!isArrivalStage && waitedMinutes(selected?.createdAt, now) > 60 ? 'cc-text-red' : ''}>
            {selected ? formatWait(waitedMinutes(selected.createdAt, now)) : '—'}
          </strong>
        </div>
        <div className="cc-callbar__item">
          <span>Referred as</span>
          <strong>{selected ? <em className={priorityBadgeClass(selected.priority)}>{selected.priority}</em> : '—'}</strong>
        </div>
        <div className="cc-callbar__item">
          <span>Triage code</span>
          <strong><em className={`cc-status is-code-${colour.toLowerCase()}`}>{selectedColour ? colour : `${colour} · rec`}</em></strong>
        </div>
        <div className="cc-callbar__item">
          <span>Clinician</span>
          <strong>{clinicianName}</strong>
        </div>
      </div>

      {loadError && (
        <div className="cc-alert" role="alert">
          <AlertTriangle size={18} />
          <div><strong>The triage queue is unavailable</strong><span>{loadError}</span></div>
          <button className="btn btn-secondary btn-sm" onClick={() => void sourceQuery.refetch()}>Try again</button>
        </div>
      )}

      {/* ── Console: persistent queue rail + tabbed work area ───────── */}
      <div className="cc-console">
        <aside className="cc-rail">
          <section className="card cc-card">
            <div className="cc-card__head">
              <h2>{isArrivalStage ? 'Arrival queue' : 'Triage queue'}</h2>
              <span className="cc-card__meta">{queue.length} {queue.length === 1 ? 'referral' : 'referrals'}</span>
            </div>

            <div className="cc-queue-tools">
              <div className="cc-stage-toggle" role="group" aria-label="Queue stage">
                <button
                  type="button"
                  className={stage === 'pending' ? 'is-selected' : ''}
                  onClick={() => switchStage('pending')}
                  aria-pressed={stage === 'pending'}
                >
                  Awaiting triage<b>{pending.length}</b>
                </button>
                <button
                  type="button"
                  className={stage === 'arrived' ? 'is-selected' : ''}
                  onClick={() => switchStage('arrived')}
                  aria-pressed={stage === 'arrived'}
                >
                  On arrival<b>{arrived.length}</b>
                </button>
              </div>

              <div className="cc-search">
                <Search size={15} />
                <input
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Search code, patient, facility"
                  aria-label="Search the triage queue"
                />
                {queueSearch && <button type="button" onClick={() => setQueueSearch('')} aria-label="Clear search"><X size={14} /></button>}
              </div>

              <div className="cc-filter-chips" role="group" aria-label="Filter by priority">
                {queueFilters.map((filter) => (
                  <button
                    type="button"
                    className={queueFilter === filter.id ? 'is-selected' : ''}
                    key={filter.id}
                    onClick={() => setQueueFilter(filter.id)}
                    aria-pressed={queueFilter === filter.id}
                  >
                    {filter.label}<b>{filterCounts[filter.id] || 0}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="cc-queue-list">
              {sourceQuery.isLoading && <Skeleton rows={5} />}

              {!sourceQuery.isLoading && !queue.length && (
                <div className="cc-empty-state">
                  <CheckCircle2 size={26} />
                  <strong>{queueSearch || queueFilter !== 'all' ? 'No matching referrals' : 'Queue is clear'}</strong>
                  <span>
                    {queueSearch || queueFilter !== 'all'
                      ? 'Try another search term or priority filter.'
                      : isArrivalStage
                        ? 'No arrived patients are waiting for clinician review.'
                        : 'No referrals are waiting for triage right now.'}
                  </span>
                  {(queueSearch || queueFilter !== 'all') && (
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setQueueSearch(''); setQueueFilter('all'); }}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {!sourceQuery.isLoading && queue.map((referral) => (
                <button
                  type="button"
                  className={`cc-queue-item ${referral.id === activeId ? 'is-selected' : ''}`}
                  key={referral.id}
                  onClick={() => setSelectedId(referral.id)}
                  aria-current={referral.id === activeId}
                >
                  <i className={`cc-queue-item__flag is-${priorityTone(referral.priority)}`} aria-hidden="true" />
                  <div className="cc-queue-item__body">
                    <strong>{referral.referralCode}</strong>
                    <span>{patientName(referral)}</span>
                    <span className="cc-queue-item__from">{referral.sendingFacility?.name || 'Unknown facility'}</span>
                  </div>
                  <div className="cc-queue-item__meta">
                    <em className={priorityBadgeClass(referral.priority)}>{referral.priority}</em>
                    <time dateTime={referral.createdAt}>{formatWait(waitedMinutes(referral.createdAt, now))}</time>
                    {referral.dangerSigns?.length > 0 && (
                      <span className="cc-queue-item__danger"><AlertTriangle size={12} />{referral.dangerSigns.length}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* Tabbed work area */}
        <div className="cc-panel">
          <div className="cc-tabs" role="tablist" aria-label="Triage console sections">
            {consoleTabs.map((item, index) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  className={`cc-tab ${isActive ? 'is-active' : ''}`}
                  type="button"
                  role="tab"
                  id={`cc-tab-${item.id}`}
                  key={item.id}
                  aria-selected={isActive}
                  aria-controls={`cc-panel-${item.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                    event.preventDefault();
                    const step = event.key === 'ArrowRight' ? 1 : consoleTabs.length - 1;
                    const next = consoleTabs[(index + step) % consoleTabs.length];
                    setTab(next.id);
                    document.getElementById(`cc-tab-${next.id}`)?.focus();
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.badge && <em className={`cc-tab__badge ${item.ready ? 'is-ready' : ''}`}>{item.badge}</em>}
                </button>
              );
            })}
          </div>

          <div className="cc-tabpanel" role="tabpanel" id={`cc-panel-${tab}`} aria-labelledby={`cc-tab-${tab}`} tabIndex={-1}>
            {/* ── Assessment ───────────────────────────────────────── */}
            {tab === 'assessment' && (
              <div className="cc-tab-grid cc-tab-grid--triage">
                <section className="card cc-card">
                  <div className="cc-steps">
                    {steps.map((step, index) => (
                      <div className={`cc-step ${step.done ? 'is-complete' : ''} ${index === currentStep ? 'is-active' : ''}`} key={step.label}>
                        <span>{step.done ? <Check size={13} /> : index + 1}</span>
                        <strong>{step.label}</strong>
                      </div>
                    ))}
                  </div>

                  {!selected && !sourceQuery.isLoading ? (
                    <div className="cc-card__body">
                      <div className="cc-empty-state">
                        <Inbox size={26} />
                        <strong>No referral selected</strong>
                        <span>Pick a referral from the queue to start the assessment.</span>
                      </div>
                    </div>
                  ) : (
                    <>
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
                        <button className={`cc-confirm is-${colour.toLowerCase()}`} type="button" disabled={!selected} onClick={openDecision}>
                          {selectedColour ? `${colour} code confirmed` : `Confirm ${colour} code`} <ArrowRight size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </section>

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
                          {item}{item === recommendation && answered > 0 && <em>rec</em>}
                        </button>
                      ))}
                    </div>

                    {priorityChanged && !isArrivalStage && (
                      <div className="cc-priority-shift">
                        <div>
                          <strong>Priority differs from the sending facility</strong>
                          <span>They sent {selected?.priority}; your assessment is {targetPriority}.</span>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={applyPriority} disabled={!selectedColour || setPriority.isPending}>
                          {setPriority.isPending ? <RefreshCw size={13} className="cc-spin" /> : null} Apply
                        </button>
                      </div>
                    )}

                    <div className="cc-meta-grid">
                      <span>Protocol<strong>{protocol.name}</strong></span>
                      <span>Assessed by<strong>{selectedColour ? clinicianName : 'Pending'}</strong></span>
                      <span>Danger signs<strong>{dangerSigns.length || 'None'}</strong></span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ── Referral detail ──────────────────────────────────── */}
            {tab === 'referral' && (
              <div className="cc-tab-grid cc-tab-grid--split">
                <section className="card cc-card">
                  <div className="cc-card__head">
                    <h2>Referral detail</h2>
                    {selected && (
                      <Link href={`/referrals/${selected.id}`} className="cc-text-button">
                        Open full record <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                  <div className="cc-card__body">
                    {sourceQuery.isLoading ? <Skeleton rows={4} /> : !selected ? (
                      <p className="cc-empty-copy">Select a referral to see its clinical detail.</p>
                    ) : (
                      <>
                        <div className="cc-person">
                          <div className="cc-avatar cc-avatar--patient">
                            {patientName(selected).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong>{patientName(selected)}</strong>
                            <span>{[selected.patient?.gender, selected.patient?.age ? `${selected.patient.age} years` : undefined].filter(Boolean).join(' · ') || 'Age and gender not recorded'}</span>
                          </div>
                        </div>

                        <dl className="cc-detail-list">
                          <div>
                            <dt><Phone size={15} /></dt>
                            <dd>{selected.patient?.phone ? <a href={`tel:${selected.patient.phone}`}>{selected.patient.phone}</a> : 'No phone recorded'}</dd>
                          </div>
                          <div>
                            <dt><Building2 size={15} /></dt>
                            <dd>
                              <strong>{selected.sendingFacility?.name || 'Unknown facility'}</strong>
                              <span>Referred {formatWait(waitedMinutes(selected.createdAt, now))} ago · {selected.referralType}</span>
                            </dd>
                          </div>
                        </dl>

                        <span className="cc-eyebrow cc-eyebrow--spaced">Chief complaint</span>
                        <p className="cc-empty-copy" style={{ color: 'var(--text-primary)', marginTop: 0 }}>{selected.chiefComplaint || 'Not recorded'}</p>
                        {selected.clinicalSummary && (
                          <>
                            <span className="cc-eyebrow cc-eyebrow--spaced">Clinical summary</span>
                            <p className="cc-empty-copy" style={{ marginTop: 0 }}>{selected.clinicalSummary}</p>
                          </>
                        )}

                        {dangerSigns.length > 0 && (
                          <div className="cc-danger-panel">
                            <strong><AlertTriangle size={14} /> Danger signs ({selected.dangerSignScore || dangerSigns.length})</strong>
                            <ul>{dangerSigns.map((sign) => <li key={sign}>{sign}</li>)}</ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>

                <section className="card cc-card">
                  <div className="cc-card__head"><h2>Vitals (as referred)</h2></div>
                  <div className="cc-card__body">
                    {hasVitals ? (
                      <div className="cc-vitals">
                        {bp && (
                          <div>
                            <dt>BP</dt>
                            <dd className={(vitals?.bloodPressureSystolic ?? 0) < 90 || (vitals?.bloodPressureSystolic ?? 0) > 160 ? 'is-abnormal' : ''}>{bp}<i>mmHg</i></dd>
                          </div>
                        )}
                        {vitalFields.map((field) => {
                          const value = vitals?.[field.key];
                          if (value === undefined) return null;
                          return (
                            <div key={field.label}>
                              <dt>{field.label}</dt>
                              <dd className={field.abnormal(Number(value)) ? 'is-abnormal' : ''}>{String(value)}<i>{field.unit}</i></dd>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="cc-empty-copy">No vitals recorded on this referral.</p>}

                    <div className="cc-meta-row">
                      <span>Blood group<strong>{selected?.bloodGroup || '—'}</strong></span>
                      <span>Allergies<strong>{selected?.knownAllergies ? (selected.allergyDetails || 'Yes') : 'None known'}</strong></span>
                    </div>
                    <div className="cc-meta-row">
                      <span>Transport<strong>{selected?.transportMethod || '—'}</strong></span>
                      <span>Accompanied<strong>{selected?.relativeAccompanying ? 'Relative' : selected?.bloodDonorAccompanying ? 'Blood donor' : 'No'}</strong></span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ── Decision / arrival review ────────────────────────── */}
            {tab === 'decision' && (
              <div className="cc-tab-grid cc-tab-grid--split">
                <section className={`card cc-card cc-card--dispatch ${(isArrivalStage ? canReview : canDecide) ? 'is-ready' : ''}`}>
                  <div className="cc-card__head">
                    <h2>{isArrivalStage ? 'Arrival review' : 'Decision'}</h2>
                    <span className="cc-card__meta">{checklistDone} of {decisionChecklist.length} ready</span>
                  </div>
                  <div className="cc-card__body">
                    {isArrivalStage && reviewed ? (
                      <div className="cc-decided is-accepted" role="status">
                        <CheckCircle2 size={18} />
                        <div>
                          <strong>Clinician review recorded</strong>
                          <span>
                            Validated as {selected?.clinicianValidatedColourCode || colour}
                            {selected?.arrivalCondition ? ` · arrived ${selected.arrivalCondition.toLowerCase()}` : ''}
                          </span>
                        </div>
                      </div>
                    ) : !isArrivalStage && decided ? (
                      <div className={`cc-decided ${selected?.status === 'ACCEPTED' ? 'is-accepted' : 'is-rejected'}`} role="status">
                        {selected?.status === 'ACCEPTED' ? <CheckCircle2 size={18} /> : <X size={18} />}
                        <div>
                          <strong>Referral {selected?.status === 'ACCEPTED' ? 'accepted' : 'rejected'}</strong>
                          <span>{selected?.rejectionReason || 'Track it from the referrals list.'}</span>
                        </div>
                      </div>
                    ) : (
                      <ol className="cc-checklist">
                        {decisionChecklist.map((item) => (
                          <li className={item.done ? 'is-done' : ''} key={item.label}>
                            <i>{item.done ? <Check size={13} /> : null}</i>
                            <div><strong>{item.label}</strong><span>{item.hint}</span></div>
                          </li>
                        ))}
                      </ol>
                    )}

                    {isArrivalStage ? (
                      <>
                        {!reviewed && (
                          <>
                            <span className="cc-eyebrow cc-eyebrow--spaced">Condition on arrival</span>
                            <div className="cc-condition-picker" role="group" aria-label="Condition on arrival">
                              {arrivalConditions.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <button
                                    type="button"
                                    className={`${arrivalCondition === item.id ? 'is-selected' : ''} is-${item.tone}`}
                                    key={item.id}
                                    aria-pressed={arrivalCondition === item.id}
                                    onClick={() => setArrivalCondition(item.id)}
                                  >
                                    <Icon size={18} />{item.label}
                                  </button>
                                );
                              })}
                            </div>

                            <label className="cc-field">
                              <span>Condition notes (optional)</span>
                              <textarea
                                value={conditionNotes}
                                onChange={(event) => setConditionNotes(event.target.value)}
                                placeholder="What changed between referral and arrival?"
                                style={{ minHeight: 72, padding: '10px 12px', lineHeight: 1.5 }}
                              />
                            </label>

                            <div className="cc-code-compare">
                              <div>
                                <span>Referred as</span>
                                <strong className={`is-${referredColour.toLowerCase()}`}>{referredColour}</strong>
                              </div>
                              <ArrowRight size={18} />
                              <div>
                                <span>Validated as</span>
                                <strong className={`is-${colour.toLowerCase()}`}>{selectedColour || '—'}</strong>
                              </div>
                            </div>

                            <div className="cc-review-summary">
                              <strong>Sent with the review</strong>
                              {summary
                                ? <pre>{summary}</pre>
                                : <p>Answer the triage questions to attach the protocol assessment to this review.</p>}
                            </div>
                          </>
                        )}

                        <div className="cc-decision-actions" style={{ marginTop: 'var(--space-4)' }}>
                          <button className="cc-accept-button" disabled={!canReview} onClick={submitReview}>
                            {clinicianReview.isPending ? <RefreshCw size={17} className="cc-spin" /> : <Stethoscope size={17} />}
                            {reviewed ? 'Review recorded' : 'Submit clinician review'}
                          </button>
                          <button className="btn btn-ghost" disabled={!selected} onClick={() => setNoteOpen((value) => !value)} aria-expanded={noteOpen}>
                            Add assessment note
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="cc-decision-actions">
                        <button className="cc-accept-button" disabled={!canDecide} onClick={accept}>
                          {acceptReferral.isPending ? <RefreshCw size={17} className="cc-spin" /> : <CheckCircle2 size={17} />}
                          {decided ? 'Decision recorded' : 'Accept referral'}
                        </button>
                        <button className="btn btn-secondary" disabled={!selected || decided || busy} onClick={() => setRejectOpen((value) => !value)} aria-expanded={rejectOpen}>
                          <X size={15} /> Reject referral
                        </button>
                        <button className="btn btn-ghost" disabled={!selected} onClick={() => setNoteOpen((value) => !value)} aria-expanded={noteOpen}>
                          Add assessment note
                        </button>
                      </div>
                    )}

                    {rejectOpen && !decided && !isArrivalStage && (
                      <div className="cc-reject-form">
                        <textarea
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder="Reason returned to the sending facility…"
                          aria-label="Rejection reason"
                          autoFocus
                        />
                        <div>
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setRejectOpen(false); setRejectReason(''); }}>Cancel</button>
                          <button className="btn btn-danger btn-sm" type="button" disabled={!rejectReason.trim() || rejectReferral.isPending} onClick={reject}>
                            {rejectReferral.isPending && <RefreshCw size={13} className="cc-spin" />} Confirm rejection
                          </button>
                        </div>
                      </div>
                    )}

                    {noteOpen && (
                      <div className="cc-reject-form">
                        <textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          placeholder={`Assessment: ${protocol.name} protocol, ${colour} code…`}
                          aria-label="Assessment note"
                          autoFocus
                        />
                        <div>
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setNoteOpen(false); setNoteDraft(''); }}>Cancel</button>
                          <button className="btn btn-primary btn-sm" type="button" disabled={!noteDraft.trim() || addNote.isPending} onClick={saveNote}>
                            {addNote.isPending && <RefreshCw size={13} className="cc-spin" />} Save note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

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
                      <button type="button" onClick={() => setTab('assessment')}>Back to assessment</button>
                    </div>

                    <div className="cc-colour-picker" role="group" aria-label="Override triage colour">
                      {(['GREEN', 'YELLOW', 'RED'] as TriageColour[]).map((item) => (
                        <button
                          className={`${item === colour ? 'is-selected' : ''} is-${item.toLowerCase()}`}
                          key={item}
                          aria-pressed={item === colour}
                          disabled={reviewed || decided}
                          onClick={() => setSelectedColour(item)}
                        >
                          {item}{item === recommendation && answered > 0 && <em>rec</em>}
                        </button>
                      ))}
                    </div>

                    <div className="cc-meta-grid">
                      <span>Protocol<strong>{protocol.name}</strong></span>
                      <span>Answers<strong>{answered} of {totalQuestions}</strong></span>
                      <span>{isArrivalStage ? 'Reviewed by' : 'Assessed by'}<strong>{selectedColour ? clinicianName : 'Pending'}</strong></span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ── History ──────────────────────────────────────────── */}
            {tab === 'history' && (
              <div className="cc-tab-grid cc-tab-grid--split">
                <section className="card cc-card">
                  <div className="cc-card__head"><h2>Referral timeline</h2></div>
                  <div className="cc-card__body">
                    <div className="cc-timeline">
                      {timelineQuery.isLoading && <Skeleton rows={3} />}
                      {!timelineQuery.isLoading && timeline.map((entry, index) => (
                        <div key={`${entry.action}-${entry.timestamp}-${index}`}>
                          <i className={index === 0 ? 'is-current' : ''} />
                          <time>{formatClock(entry.timestamp)}</time>
                          <p><strong>{entry.action.replace(/_/g, ' ')}</strong><span>{entry.userName || 'System'}</span></p>
                        </div>
                      ))}
                      {!timelineQuery.isLoading && !timeline.length && (
                        <p className="cc-empty-copy">{selected ? 'No timeline entries recorded yet.' : 'Select a referral to see its history.'}</p>
                      )}
                      {!timelineQuery.isLoading && selected && !decided && !reviewed && (
                        <div className="is-pending">
                          <i />
                          <time>Next</time>
                          <p>
                            <strong>{isArrivalStage ? 'Clinician review' : 'Triage decision'}</strong>
                            <span>{isArrivalStage ? 'Validate the colour code on arrival' : 'Accept or return to the sending facility'}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="card cc-card">
                  <div className="cc-card__head"><h2>Assessment record</h2></div>
                  <div className="cc-card__body">
                    {summary ? (
                      <div className="cc-review-summary" style={{ marginTop: 0 }}>
                        <strong>This session</strong>
                        <pre>{summary}</pre>
                      </div>
                    ) : <p className="cc-empty-copy">No protocol answers recorded in this session yet.</p>}

                    <div className="cc-meta-row">
                      <span>Referred code<strong>{referredColour}</strong></span>
                      <span>Validated code<strong>{selected?.clinicianValidatedColourCode || selectedColour || '—'}</strong></span>
                    </div>
                    <div className="cc-meta-row">
                      <span>Seen by clinician<strong>{selected?.seenByClinicianAt ? formatClock(selected.seenByClinicianAt) : 'Not yet'}</strong></span>
                      <span>Arrival condition<strong>{selected?.arrivalCondition || '—'}</strong></span>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
