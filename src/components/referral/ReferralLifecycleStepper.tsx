import React from 'react';
import { Clock, Check, Circle, AlertCircle, CircleDot } from 'lucide-react';
import { ReferralStatus } from '@/types/common';
import { NEMSRequestSummary } from '@/types/referral';

interface ReferralLifecycleStepperProps {
  status: ReferralStatus | string;
  createdAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  seenByClinicianAt?: string;
  nemsRequest?: NEMSRequestSummary;
  layout?: 'horizontal' | 'vertical';
  sendingFacilityName?: string;
  priority?: string;
}

export function ReferralLifecycleStepper({
  status,
  createdAt,
  acceptedAt,
  arrivedAt,
  completedAt,
  seenByClinicianAt,
  nemsRequest,
  layout = 'horizontal',
  sendingFacilityName,
  priority
}: ReferralLifecycleStepperProps) {
  const isRejected = status === 'REJECTED' || status === 'CANCELLED';

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Define clinical steps for vertical stepper matching screenshot journey
  const getVerticalSteps = () => {
    const isPending = status === 'PENDING';
    const isAccepted = status === 'ACCEPTED' || status === 'DISPATCHED' || status === 'IN_TRANSIT' || status === 'ARRIVED' || status === 'COMPLETED';
    const isDispatched = status === 'DISPATCHED' || status === 'IN_TRANSIT' || status === 'ARRIVED' || status === 'COMPLETED';
    const isPickedUp = status === 'IN_TRANSIT' || status === 'ARRIVED' || status === 'COMPLETED';
    const isArrived = status === 'ARRIVED' || status === 'COMPLETED';
    const isCompleted = status === 'COMPLETED';

    const triageLabel = priority 
      ? (priority === 'CRITICAL' ? '🔴 RED - Critical' : priority === 'HIGH' ? '🟠 ORANGE - High' : priority === 'MEDIUM' ? '🟡 YELLOW - Medium' : '🟢 GREEN - Low')
      : 'Initiated';

    return [
      {
        label: 'Referral Initiated',
        status: 'completed',
        time: `${formatDate(createdAt)}, ${formatTime(createdAt)}`,
        note: sendingFacilityName || 'Origin Facility'
      },
      {
        label: 'NEMS Triage',
        status: 'completed',
        time: `${formatDate(createdAt)}, ${formatTime(createdAt)}`,
        note: triageLabel
      },
      {
        label: 'Facility Review',
        status: isPending ? 'current' : 'completed',
        time: isPending ? 'In progress' : acceptedAt ? `${formatDate(acceptedAt)}, ${formatTime(acceptedAt)}` : '',
        note: isPending ? 'Action required' : ''
      },
      {
        label: 'Accepted',
        status: isAccepted ? 'completed' : 'pending',
        time: isAccepted && acceptedAt ? `${formatDate(acceptedAt)}, ${formatTime(acceptedAt)}` : '',
        note: isAccepted ? '' : 'Pending'
      },
      {
        label: 'Ambulance Assigned',
        status: isDispatched ? 'completed' : 'pending',
        time: isDispatched && nemsRequest?.dispatchedAt ? `${formatDate(nemsRequest.dispatchedAt)}, ${formatTime(nemsRequest.dispatchedAt)}` : '',
        note: isDispatched ? (nemsRequest?.ambulanceId ? `Ambulance: ${nemsRequest.ambulanceId}` : 'Ambulance assigned') : 'Pending'
      },
      {
        label: 'Patient Picked Up',
        status: isPickedUp ? 'completed' : 'pending',
        time: '',
        note: isPickedUp ? 'Picked up' : 'Pending'
      },
      {
        label: 'Arrived at Facility',
        status: isArrived ? 'completed' : 'pending',
        time: isArrived && arrivedAt ? `${formatDate(arrivedAt)}, ${formatTime(arrivedAt)}` : '',
        note: isArrived ? '' : 'Pending'
      },
      {
        label: 'Handover Complete',
        status: isCompleted ? 'completed' : 'pending',
        time: isCompleted && completedAt ? `${formatDate(completedAt)}, ${formatTime(completedAt)}` : '',
        note: isCompleted ? '' : 'Pending'
      }
    ];
  };

  const steps = getVerticalSteps();

  if (layout === 'vertical') {
    return (
      <div className="card mb-4" style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)'
      }}>
        <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '8px'
        }}>
          <Clock size={16} style={{ color: 'var(--accent)' }} />
          Referral Journey
        </h3>

        {isRejected ? (
          <div className="p-3 rounded-lg flex items-start gap-2.5" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={18} className="text-danger flex-shrink-0" style={{ marginTop: '2px' }} />
            <div>
              <div className="font-bold text-xs text-danger">Referral {status}</div>
              <div className="text-muted mt-0.5" style={{ fontSize: '10px' }}>The progression has been terminated.</div>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col gap-5" style={{
            borderLeft: '1.5px solid var(--border-subtle)',
            paddingLeft: '20px',
            marginLeft: '10px'
          }}>
            {steps.map((step, idx) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';

              let dotBg = 'var(--bg-muted)';
              let dotBorder = 'var(--border-subtle)';
              let dotColor = 'var(--text-muted)';

              if (isCompleted) {
                dotBg = 'var(--success)';
                dotBorder = 'var(--success)';
                dotColor = '#ffffff';
              } else if (isCurrent) {
                dotBg = 'var(--accent)';
                dotBorder = 'var(--accent-light)';
                dotColor = '#ffffff';
              }

              return (
                <div key={idx} className="relative" style={{ position: 'relative' }}>
                  {/* Step node */}
                  <div style={{
                    position: 'absolute',
                    left: '-29px',
                    top: '1px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: dotBg,
                    border: `1px solid ${dotBorder}`,
                    color: dotColor,
                    zIndex: 10,
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {isCompleted ? (
                      <Check size={11} strokeWidth={3} />
                    ) : isCurrent ? (
                      <CircleDot size={10} className="animate-pulse" />
                    ) : (
                      <Circle size={8} className="text-muted" style={{ opacity: 0.5 }} />
                    )}
                  </div>

                  {/* Step text details */}
                  <div style={{ opacity: !isCompleted && !isCurrent ? 0.5 : 1 }}>
                    <h4 className="text-xs font-bold text-primary">{step.label}</h4>
                    {step.time && (
                      <div className="text-muted font-medium" style={{ fontSize: '10px', marginTop: '2px' }}>{step.time}</div>
                    )}
                    {step.note && (
                      <div style={{ 
                        fontSize: '10px',
                        marginTop: '2px',
                        color: isCurrent ? 'var(--accent-light)' : 'var(--text-secondary)',
                        fontWeight: isCurrent ? 700 : 500
                      }}>
                        {step.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Classic horizontal layout (for fallback)
  const STAGES_HORIZ = [
    { key: 'PENDING', label: 'Triage Pending', desc: 'Submitted by facility' },
    { key: 'ACCEPTED', label: 'Accepted', desc: 'Bed / Team ready' },
    { key: 'DISPATCHED', label: 'Dispatched', desc: 'Ambulance en route' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Patient en route' },
    { key: 'ARRIVED', label: 'Arrived', desc: 'At receiving facility' },
    { key: 'COMPLETED', label: 'Completed', desc: 'Admission / Handover' },
  ];

  function getStageIndex(s: string): number {
    switch (s) {
      case 'PENDING': return 0;
      case 'ACCEPTED': return 1;
      case 'DISPATCHED': return 2;
      case 'IN_TRANSIT': return 3;
      case 'ARRIVED': return 4;
      case 'COMPLETED': return 5;
      default: return 0;
    }
  }

  const currentIndex = getStageIndex(status);

  return (
    <div className="card" style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)',
      marginBottom: 'var(--space-6)'
    }}>
      <div className="flex items-center justify-between mb-4 pb-3" style={{
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <h3 className="text-xs font-semibold text-muted tracking-wider uppercase flex items-center gap-2">
          <Clock size={14} style={{ color: 'var(--accent)' }} />
          Clinical Referral Progression Lifecycle
        </h3>
        <span className={`badge ${isRejected ? 'badge-danger' : 'badge-info'} text-xs font-bold`}>
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      {isRejected ? (
        <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--danger)' }}>Referral {status}</div>
            <div className="text-xs text-muted">This referral lifecycle has been terminated. See notes for clinical rejection details.</div>
          </div>
        </div>
      ) : (
        <div className="relative py-2" style={{ position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 'var(--space-3)',
            position: 'relative',
            zIndex: 10
          }}>
            {STAGES_HORIZ.map((stage, idx) => {
              const isPassed = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              let nodeBg = 'var(--bg-muted)';
              let nodeBorder = 'var(--border-subtle)';
              let iconColor = 'var(--text-muted)';

              if (isPassed) {
                nodeBg = 'rgba(16, 185, 129, 0.15)';
                nodeBorder = 'var(--success)';
                iconColor = 'var(--success)';
              } else if (isCurrent) {
                nodeBg = 'rgba(99, 102, 241, 0.15)';
                nodeBorder = 'var(--accent)';
                iconColor = 'var(--accent-light)';
              }

              return (
                <div key={stage.key} className="flex flex-col items-center text-center p-2.5 transition-all" style={{
                  background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isCurrent ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div className="transition-all" style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    fontSize: '12px',
                    boxShadow: 'var(--shadow-sm)',
                    border: `2px solid ${nodeBorder}`,
                    background: nodeBg,
                    color: iconColor,
                    fontWeight: 'bold'
                  }}>
                    {isPassed ? <Check size={14} /> : isCurrent ? <CircleDot size={14} className="animate-pulse" /> : idx + 1}
                  </div>
                  <div className="font-semibold text-xs mb-0.5" style={{
                    lineHeight: '1.25',
                    color: isCurrent ? 'var(--text-primary)' : isPassed ? 'var(--text-secondary)' : 'var(--text-muted)'
                  }}>
                    {stage.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {stage.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
