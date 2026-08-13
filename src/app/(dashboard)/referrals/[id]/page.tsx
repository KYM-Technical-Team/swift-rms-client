'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralService } from '@/lib/api';
import { ReferralStatus, TimelineEntry } from '@/types';
import { useAuthStore } from '@/store';
import { canModifyReferral } from '@/lib/referral-auth';
import { SearchableSelect } from '@/components/ui';
import { AssignAmbulanceModal } from '@/components/referral/AssignAmbulanceModal';
import { ReceivingFacilityReadinessCard } from '@/components/referral/ReceivingFacilityReadinessCard';
import { FacilityTransferVisualizer } from '@/components/referral/FacilityTransferVisualizer';
import { PatientClinicalSummaryCard } from '@/components/referral/PatientClinicalSummaryCard';
import { ReferralLifecycleStepper } from '@/components/referral/ReferralLifecycleStepper';
import { ResponsePerformanceCard } from '@/components/referral/ResponsePerformanceCard';
import { NEMSTransportCard } from '@/components/referral/NEMSTransportCard';
import {
  AlertTriangle,
  Ambulance,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  MapPin,
  MoreVertical,
  RotateCcw,
  X,
} from 'lucide-react';

const detailCardStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-xl)',
} as const;

const actionButtonStyle = {
  border: 'none',
  minHeight: 58,
  justifyContent: 'flex-start',
  padding: 'var(--space-3) var(--space-4)',
} as const;

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function readable(value?: string) {
  return value ? value.replace(/_/g, ' ') : '—';
}

function colourFromReferral(priority: string, colourCode?: string) {
  const code = colourCode || (priority === 'CRITICAL' ? 'RED' : priority === 'HIGH' ? 'YELLOW' : 'GREEN');
  switch (code) {
    case 'RED':
      return { label: 'CRITICAL', clinical: 'RED - Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.35)' };
    case 'YELLOW':
      return { label: 'URGENT', clinical: 'YELLOW - Urgent', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.35)' };
    default:
      return { label: 'ROUTINE', clinical: 'GREEN - Non-urgent', color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.35)' };
  }
}

function PriorityBadge({ priority, colourCode }: { priority: string; colourCode?: string }) {
  const tone = colourFromReferral(priority, colourCode);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        borderRadius: 'var(--radius-md)',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <Circle size={8} fill={tone.color} color={tone.color} />
      {tone.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusTone = status === 'REJECTED' || status === 'CANCELLED'
    ? { bg: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.28)' }
    : status === 'COMPLETED' || status === 'ARRIVED'
      ? { bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981', border: 'rgba(16, 185, 129, 0.28)' }
      : { bg: 'rgba(99, 102, 241, 0.14)', color: 'var(--accent-light)', border: 'rgba(99, 102, 241, 0.28)' };

  return (
    <span style={{
      padding: '7px 12px',
      borderRadius: 'var(--radius-md)',
      background: statusTone.bg,
      color: statusTone.color,
      border: `1px solid ${statusTone.border}`,
      fontSize: 12,
      fontWeight: 800,
      textTransform: 'uppercase',
    }}>
      {readable(status)}
    </span>
  );
}

function ActivityTimelineCard({ entries, createdAt, createdByName }: {
  entries: TimelineEntry[];
  createdAt: string;
  createdByName?: string;
}) {
  const activity = entries.length ? entries : [{
    action: 'CREATED',
    timestamp: createdAt,
    userName: createdByName,
    notes: 'Referral created',
  }];

  const activityTone = (action: string) => {
    if (action.includes('REJECT')) return { bg: 'rgba(239, 68, 68, 0.18)', color: '#ef4444' };
    if (action.includes('ACCEPT') || action.includes('CREATED')) return { bg: 'rgba(16, 185, 129, 0.16)', color: '#10b981' };
    if (action.includes('AMBULANCE')) return { bg: 'rgba(59, 130, 246, 0.16)', color: '#60a5fa' };
    return { bg: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b' };
  };

  return (
    <div className="card" style={{ ...detailCardStyle, padding: 'var(--space-4)' }}>
      <h3 className="text-sm font-bold text-primary mb-4">Activity &amp; Communication</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
        {activity.map((entry, index) => {
          const tone = activityTone(entry.action);
          return (
            <div key={`${entry.action}-${entry.timestamp}-${index}`} style={{ display: 'grid', gridTemplateColumns: '28px 44px 1fr', gap: 10, alignItems: 'start' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-md)',
                background: tone.bg,
                color: tone.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileText size={14} />
              </div>
              <span className="text-xs text-muted" style={{ paddingTop: 4 }}>{formatTime(entry.timestamp)}</span>
              <div>
                <div className="text-sm font-semibold text-primary">{readable(entry.action)}</div>
                {entry.notes && <div className="text-xs text-secondary" style={{ marginTop: 2 }}>{entry.notes}</div>}
                {entry.userName && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{entry.userName}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InterventionsCard({ dangerSigns, timeline }: { dangerSigns: string[]; timeline: TimelineEntry[] }) {
  const clinicalEntries = timeline.filter(entry =>
    entry.action === 'NOTE_ADDED' || entry.action.includes('TRIAGE') || entry.action.includes('CLINICIAN')
  );
  const rows = clinicalEntries.length
    ? clinicalEntries.slice(0, 4).map(entry => ({ time: formatTime(entry.timestamp), label: entry.notes || readable(entry.action) }))
    : dangerSigns.slice(0, 4).map((sign, index) => ({ time: index === 0 ? 'Now' : '—', label: readable(sign) }));

  return (
    <div className="card" style={{ ...detailCardStyle, padding: 'var(--space-4.5)', height: '100%' }}>
      <h3 className="text-xs font-bold text-muted flex items-center gap-1.5 mb-4" style={{
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: 'var(--space-2)',
      }}>
        <FileText size={16} style={{ color: 'var(--accent)' }} />
        Interventions Given
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rows.length ? rows.map((row, index) => (
          <div key={`${row.time}-${row.label}-${index}`} style={{
            display: 'grid',
            gridTemplateColumns: '58px 1fr',
            gap: 14,
            padding: '10px 0',
            borderBottom: index < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <span className="text-xs font-bold text-primary">{row.time}</span>
            <span className="text-sm text-secondary">{row.label}</span>
          </div>
        )) : (
          <div className="text-sm text-muted">No clinical intervention notes have been recorded yet.</div>
        )}
      </div>
    </div>
  );
}

export default function ReferralDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectFacilityId, setRedirectFacilityId] = useState('');
  const [redirectReason, setRedirectReason] = useState('');
  const [showAssignAmbulanceModal, setShowAssignAmbulanceModal] = useState(false);

  // Get user for permission checks (must be before conditional returns)
  const user = useAuthStore(state => state.user);

  const { data: referral, isLoading } = useQuery({
    queryKey: ['referral', id],
    queryFn: () => referralService.get(id),
  });

  const { data: timeline } = useQuery({
    queryKey: ['referral', id, 'timeline'],
    queryFn: () => referralService.getTimeline(id),
  });

  // Fetch facilities for redirect modal
  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => import('@/lib/api').then(m => m.facilityService.list()),
    enabled: showRedirectModal,
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      action?: 'ACCEPT' | 'REJECT' | 'REDIRECT' | 'CANCEL' | 'CONFIRM_ARRIVAL' | 'RECORD_OUTCOME' | 'UPDATE_STATUS';
      status?: ReferralStatus;
      rejectionReason?: string;
      newReceivingFacilityId?: string;
      redirectReason?: string;
    }) =>
      referralService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral', id] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });

  const handleAccept = () => updateMutation.mutate({ status: 'ACCEPTED' });
  const handleReject = () => {
    if (rejectReason.trim()) {
      updateMutation.mutate({ status: 'REJECTED', rejectionReason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
    }
  };
  const handleMarkArrived = () => updateMutation.mutate({ status: 'ARRIVED' });
  const handleRedirect = () => {
    if (redirectFacilityId) {
      updateMutation.mutate({
        action: 'REDIRECT',
        newReceivingFacilityId: redirectFacilityId,
        redirectReason: redirectReason || undefined,
      });
      setShowRedirectModal(false);
      setRedirectFacilityId('');
      setRedirectReason('');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <h2>Referral not found</h2>
        <Link href="/referrals" className="btn btn-primary mt-4">
          Back to Referrals
        </Link>
      </div>
    );
  }

  const hasPermission = canModifyReferral(user, referral);
  const canAccept = referral.status === 'PENDING' && hasPermission;
  const canMarkArrived = (referral.status === 'ACCEPTED' || referral.status === 'IN_TRANSIT') && hasPermission;
  const canAssignAmbulance = referral.status === 'PENDING' && 
    (user?.userType === 'SYSTEM_ADMIN' || user?.userType === 'NEMS' || user?.userType === 'AMBULANCE_DISPATCH');
  const dangerSigns = referral.dangerSigns ?? [];
  const timelineEntries = timeline?.length ? timeline : referral.timeline || [];
  const createdByName = referral.referringUser
    ? `${referral.referringUser.firstName} ${referral.referringUser.lastName}`
    : referral.createdBy
      ? `${referral.createdBy.firstName} ${referral.createdBy.lastName}`
      : undefined;
  const priorityTone = colourFromReferral(referral.priority, referral.colourCode);
  const hasActionBand = canAccept || canMarkArrived || canAssignAmbulance;
  const notes = [
    referral.notes,
    referral.clinicalSummary,
    referral.redirectReason ? `Redirect reason: ${referral.redirectReason}` : undefined,
  ].filter(Boolean);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Link href="/referrals" className="flex items-center gap-1 text-sm text-muted" style={{ width: 'fit-content' }}>
          <ArrowLeft size={14} />
          Back to Referrals
        </Link>

        <div className="page-header" style={{ marginBottom: 0, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{referral.referralCode}</h1>
              <PriorityBadge priority={referral.priority} colourCode={referral.colourCode} />
              <StatusBadge status={referral.status} />
              <span className="text-sm font-bold text-primary">{readable(referral.referralType)}</span>
            </div>
            <div className="flex items-center gap-3 mt-3 text-sm text-muted" style={{ flexWrap: 'wrap' }}>
              <span>Referral received: {formatDateTime(referral.createdAt)}</span>
              <span>•</span>
              <span>From: {referral.sendingFacility?.name || '—'}</span>
              <span>•</span>
              <span>To: {referral.receivingFacility?.name || '—'}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" type="button">
            More actions
            <MoreVertical size={15} />
          </button>
        </div>

        <div className="referral-detail-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {hasActionBand && (
              <div className="card referral-action-grid" style={{ ...detailCardStyle, padding: 'var(--space-4)' }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.16)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-primary">Action Required</div>
                    <div className="text-sm text-secondary" style={{ marginTop: 2 }}>
                      {canAccept ? 'Review and accept this referral to prepare the receiving facility.' : canMarkArrived ? 'Confirm the patient has arrived at the receiving facility.' : 'Assign transport for this emergency referral.'}
                    </div>
                  </div>
                </div>

                {canAccept && (
                  <>
                    <button className="btn btn-success" onClick={handleAccept} disabled={updateMutation.isPending} style={actionButtonStyle}>
                      <Check size={16} />
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <strong>Accept &amp; Prepare</strong>
                        <small>Accept referral</small>
                      </span>
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowRedirectModal(true)} disabled={updateMutation.isPending} style={{ ...actionButtonStyle, background: 'rgba(245, 158, 11, 0.16)', border: '1px solid rgba(245, 158, 11, 0.28)', color: '#f59e0b' }}>
                      <RotateCcw size={16} />
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <strong>Redirect</strong>
                        <small>Send elsewhere</small>
                      </span>
                    </button>
                    <button className="btn btn-danger" onClick={() => setShowRejectModal(true)} disabled={updateMutation.isPending} style={actionButtonStyle}>
                      <X size={16} />
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <strong>Reject</strong>
                        <small>Cannot accept</small>
                      </span>
                    </button>
                  </>
                )}

                {canMarkArrived && (
                  <button className="btn btn-primary" onClick={handleMarkArrived} disabled={updateMutation.isPending} style={{ ...actionButtonStyle, gridColumn: 'span 3' }}>
                    <MapPin size={16} />
                    Mark Arrived
                  </button>
                )}

                {canAssignAmbulance && !canAccept && (
                  <button className="btn btn-primary" onClick={() => setShowAssignAmbulanceModal(true)} disabled={updateMutation.isPending} style={{ ...actionButtonStyle, gridColumn: 'span 3' }}>
                    <Ambulance size={16} />
                    Assign Ambulance
                  </button>
                )}
              </div>
            )}

            {referral.status === 'REJECTED' && referral.rejectionReason && (
              <div className="p-4 flex gap-3 items-start" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-xl)'
              }}>
                <AlertTriangle style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }} size={20} />
                <div>
                  <h3 style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '4px' }}>Referral Rejected</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{referral.rejectionReason}</p>
                </div>
              </div>
            )}

            <FacilityTransferVisualizer referral={referral} />

            <div className="referral-primary-grid">
              <PatientClinicalSummaryCard referral={referral} />
              <ReceivingFacilityReadinessCard
                facilityId={referral.receivingFacility?.id || ''}
                facilityName={referral.receivingFacility?.name || ''}
              />
            </div>

            <div className="referral-metrics-grid">
              <InterventionsCard dangerSigns={dangerSigns} timeline={timelineEntries} />
              <NEMSTransportCard
                referral={referral}
                onAssignAmbulance={() => setShowAssignAmbulanceModal(true)}
                canAssignAmbulance={canAssignAmbulance}
              />
              <ResponsePerformanceCard referral={referral} />
            </div>

            <div className="card" style={{ ...detailCardStyle, padding: 'var(--space-4)', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
              <div className="flex items-start gap-3">
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <div className="font-bold" style={{ color: '#f59e0b' }}>Important Notes</div>
                  <div className="text-sm text-secondary" style={{ marginTop: 6, lineHeight: 1.55 }}>
                    {notes.length ? notes.map((note, index) => <div key={index}>{note}</div>) : 'No additional referral notes have been recorded.'}
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 8 }}>
                    Triage: {priorityTone.clinical} • Target response: {referral.responseDeadline ? formatDateTime(referral.responseDeadline) : '≤ 5 min'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'sticky', top: 'var(--space-4)' }}>
            <ReferralLifecycleStepper
              status={referral.status}
              createdAt={referral.createdAt}
              acceptedAt={referral.acceptedAt}
              arrivedAt={referral.arrivedAt}
              completedAt={referral.completedAt}
              seenByClinicianAt={referral.seenByClinicianAt}
              nemsRequest={referral.nemsRequest}
              sendingFacilityName={referral.sendingFacility?.name}
              priority={referral.priority}
              layout="vertical"
            />
            <ActivityTimelineCard entries={timelineEntries} createdAt={referral.createdAt} createdByName={createdByName} />
            <div className="card" style={{ ...detailCardStyle, padding: 'var(--space-4)' }}>
              <h3 className="text-sm font-bold text-primary mb-3">Referral Snapshot</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted">Owner</span>
                  <span className="font-semibold text-primary">{referral.currentOwner || referral.receivingFacility?.name || '—'}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted">NEMS required</span>
                  <span className="font-semibold text-primary">{referral.nemsRequired || !!referral.nemsRequest ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted">Clinical review</span>
                  <span className="font-semibold text-primary">{referral.seenByClinicianAt ? formatTime(referral.seenByClinicianAt) : 'Pending'}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted">Transport</span>
                  <span className="font-semibold text-primary">{readable(referral.transportMethod)}</span>
                </div>
              </div>
              {referral.status === 'COMPLETED' && (
                <div className="flex items-center gap-2 mt-4 text-success text-sm font-semibold">
                  <CheckCircle2 size={16} />
                  Referral journey complete
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {showRejectModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)'
        }}>
          <div className="card" style={{ maxWidth: 400, width: '100%' }}>
            <h3 className="card-title mb-4">Reject Referral</h3>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <textarea
                className="form-input"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showRedirectModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)'
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%' }}>
            <h3 className="card-title mb-4">Redirect Referral</h3>
            <p className="text-sm text-muted mb-4">
              Select a new receiving facility. The referral will be reset to PENDING status for the new facility to accept.
            </p>
            <div className="form-group">
              <label className="form-label">New Receiving Facility *</label>
              <SearchableSelect
                options={facilitiesData?.data
                  ?.filter(f => f.id !== referral.receivingFacility?.id)
                  .map(f => ({
                    value: f.id,
                    label: f.name,
                    description: f.facilityType || f.type,
                  })) || []}
                value={redirectFacilityId}
                onChange={setRedirectFacilityId}
                placeholder="Select a facility..."
                searchPlaceholder="Search facilities..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Redirect (Optional)</label>
              <textarea
                className="form-input"
                rows={3}
                value={redirectReason}
                onChange={(e) => setRedirectReason(e.target.value)}
                placeholder="e.g., Closer facility available, specialized care needed..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRedirectModal(false);
                  setRedirectFacilityId('');
                  setRedirectReason('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleRedirect}
                disabled={!redirectFacilityId || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Redirecting...' : 'Redirect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Ambulance Modal */}
      <AssignAmbulanceModal
        referralId={id}
        isOpen={showAssignAmbulanceModal}
        onClose={() => setShowAssignAmbulanceModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['referral', id] });
          queryClient.invalidateQueries({ queryKey: ['referrals'] });
        }}
      />
    </>
  );
}
