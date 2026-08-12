'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralService } from '@/lib/api';
import { ReferralStatus } from '@/types';
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
  ArrowLeft, 
  Circle, 
  Check, 
  X, 
  ExternalLink, 
  MapPin, 
  User, 
  Clock, 
  Building2, 
  AlertTriangle, 
  FileText,
  Activity,
  Heart,
  Thermometer,
  Ambulance
} from 'lucide-react';

function PriorityBadge({ priority }: { priority: string }) {
  const getColor = (p: string) => {
    switch (p) {
      case 'CRITICAL': return 'var(--priority-critical)';
      case 'HIGH': return 'var(--priority-high)';
      case 'MEDIUM': return 'var(--priority-medium)';
      case 'LOW': return 'var(--priority-low)';
      default: return 'var(--muted)';
    }
  };
  
  return (
    <span className="flex items-center gap-2">
      <Circle size={8} fill={getColor(priority)} color={getColor(priority)} />
      <span className="text-sm font-medium">{priority}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status.toLowerCase().replace(/_/g, '-')}`}>
      {status.replace(/_/g, ' ')}
    </span>
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
    mutationFn: (data: { status?: ReferralStatus; rejectionReason?: string; newReceivingFacilityId?: string }) =>
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
      updateMutation.mutate({ newReceivingFacilityId: redirectFacilityId });
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
  const dangerSignScore = Number.isFinite(referral.dangerSignScore)
    ? referral.dangerSignScore
    : 0;
  const riskLabel = dangerSignScore >= 7 ? 'Critical Risk'
    : dangerSignScore >= 4 ? 'Moderate Risk'
      : 'Low Risk';
  const dangerSigns = referral.dangerSigns ?? [];

  return (
    <>
      <div className="mb-4">
        <Link href="/referrals" className="flex items-center gap-1 text-sm text-muted">
          <ArrowLeft size={14} />
          Back to Referrals
        </Link>
      </div>

      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{referral.referralCode}</h1>
            <StatusBadge status={referral.status} />
          </div>
          <div className="flex items-center gap-4 mt-2">
            <PriorityBadge priority={referral.priority} />
            <span className="text-sm text-muted">
              Created {new Date(referral.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {(canAccept || canMarkArrived || canAssignAmbulance) && (
        <div className="card mb-4 flex gap-2" style={{ flexWrap: 'wrap' }}>
          {canAccept && (
            <>
              <button 
                className="btn btn-success"
                onClick={handleAccept}
                disabled={updateMutation.isPending}
              >
                <Check size={16} />
                Accept
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => setShowRejectModal(true)}
                disabled={updateMutation.isPending}
              >
                <X size={16} />
                Reject
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowRedirectModal(true)}
                disabled={updateMutation.isPending}
              >
                <ExternalLink size={16} />
                Redirect
              </button>
            </>
          )}
          {canMarkArrived && (
            <button 
              className="btn btn-primary"
              onClick={handleMarkArrived}
              disabled={updateMutation.isPending}
            >
              <MapPin size={16} />
              Mark Arrived
            </button>
          )}
          {canAssignAmbulance && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowAssignAmbulanceModal(true)}
              disabled={updateMutation.isPending}
              style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
            >
              <Ambulance size={16} />
              Assign Ambulance
            </button>
          )}
        </div>
      )}

      {referral.status === 'REJECTED' && referral.rejectionReason && (
        <div className="mb-6 p-4 flex gap-3 items-start" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)'
        }}>
          <AlertTriangle style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }} size={20} />
          <div>
            <h3 style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '4px' }}>Referral Rejected</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{referral.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Lifecycle Stepper */}
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
      />

      {/* Transfer Visualizer */}
      <FacilityTransferVisualizer referral={referral} />

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Patient Clinical Summary */}
        <div className="col-8">
          <PatientClinicalSummaryCard referral={referral} />
        </div>

        {/* Target Facility Readiness */}
        <div className="col-4">
          <ReceivingFacilityReadinessCard
            facilityId={referral.receivingFacility?.id || ''}
            facilityName={referral.receivingFacility?.name || ''}
          />
        </div>

        {/* Adaptive Metrics and Timeline */}
        {(() => {
          const showNemsCard = !!referral.nemsRequest || canAssignAmbulance;
          return (
            <>
              <div className={showNemsCard ? "col-4" : "col-6"}>
                <ResponsePerformanceCard referral={referral} />
              </div>

              {showNemsCard && (
                <div className="col-4">
                  <NEMSTransportCard
                    referral={referral}
                    onAssignAmbulance={() => setShowAssignAmbulanceModal(true)}
                    canAssignAmbulance={canAssignAmbulance}
                  />
                </div>
              )}

              <div className={showNemsCard ? "col-4" : "col-6"}>
                <div className="card" style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-4.5)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <h3 className="text-xs font-bold text-muted flex items-center gap-1.5 mb-4" style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: 'var(--space-2)',
                    width: '100%',
                    flexShrink: 0
                  }}>
                    <Clock size={16} style={{ color: 'var(--accent)' }} />
                    Referral Timeline
                  </h3>
                  <div className="flex flex-col gap-3" style={{
                    overflowY: 'auto',
                    flexGrow: 1,
                    maxHeight: '180px',
                    paddingRight: '4px'
                  }}>
                    {timeline?.length ? timeline.map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        <div style={{
                          width: 8,
                          height: 8,
                          background: i === 0 ? 'var(--foreground)' : 'var(--border)',
                          borderRadius: '50%',
                          marginTop: 6,
                          flexShrink: 0
                        }} />
                        <div>
                          <div className="font-medium text-sm">{entry.action}</div>
                          <div className="text-xs text-muted">
                            {new Date(entry.timestamp).toLocaleString()}
                            {entry.userName && ` · ${entry.userName}`}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex items-center gap-2">
                        <Circle size={8} fill="var(--foreground)" color="var(--foreground)" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--foreground)' }} />
                        <span className="text-sm">Created {new Date(referral.createdAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
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