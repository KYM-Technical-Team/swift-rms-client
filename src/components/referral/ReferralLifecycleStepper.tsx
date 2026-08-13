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

  const formatStepDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return `${formatDate(dateStr)}, ${formatTime(dateStr)}`;
  };

  const missionStatusOrder = [
    'REQUESTED',
    'DISPATCHED',
    'EN_ROUTE_PICKUP',
    'AT_PICKUP',
    'PATIENT_LOADED',
    'EN_ROUTE_DROPOFF',
    'AT_DROPOFF',
    'HANDED_OVER',
    'COMPLETED',
    'RETURNED_STANDBY',
  ];

  const missionHasReached = (missionStatus: string | undefined, target: string) => {
    if (!missionStatus) return false;
    return missionStatusOrder.indexOf(missionStatus) >= missionStatusOrder.indexOf(target);
  };

  const referralHasReached = (target: ReferralStatus | string) => {
    const order = ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'ARRIVED', 'CLINICIAN_REVIEWED', 'COMPLETED'];
    return order.indexOf(status) >= order.indexOf(target);
  };

  const getVerticalSteps = () => {
    const isPending = status === 'PENDING';
    const missionStatus = nemsRequest?.status;
    const hasMission = !!nemsRequest;
    const isAccepted = !!acceptedAt || referralHasReached('ACCEPTED');
    const isArrived = !!arrivedAt || referralHasReached('ARRIVED');
    const isClinicianReviewed = !!seenByClinicianAt || referralHasReached('CLINICIAN_REVIEWED');
    const isCompleted = !!completedAt || referralHasReached('COMPLETED');

    const triageLabel = priority 
      ? (priority === 'CRITICAL' ? 'RED - Critical' : priority === 'HIGH' ? 'YELLOW - Urgent' : priority === 'MEDIUM' ? 'YELLOW - Medium' : 'GREEN - Low')
      : 'Initiated';

    const baseSteps = [
      {
        label: 'Referral Initiated',
        status: 'completed',
        time: formatStepDateTime(createdAt),
        note: sendingFacilityName || 'Origin Facility'
      },
      {
        label: 'NEMS Triage',
        status: 'completed',
        time: formatStepDateTime(createdAt),
        note: triageLabel
      },
      {
        label: 'Facility Review',
        status: isPending ? 'current' : 'completed',
        time: isPending ? 'In progress' : formatStepDateTime(acceptedAt),
        note: isPending ? 'Action required' : ''
      },
      {
        label: 'Accepted',
        status: isAccepted ? 'completed' : 'pending',
        time: isAccepted ? formatStepDateTime(acceptedAt) : '',
        note: isAccepted ? '' : 'Pending'
      },
    ];

    if (!hasMission) {
      return [
        ...baseSteps,
        {
          label: 'Arrived at Facility',
          status: isArrived ? 'completed' : isAccepted ? 'current' : 'pending',
          time: isArrived ? formatStepDateTime(arrivedAt) : '',
          note: isArrived ? '' : 'Pending'
        },
        {
          label: 'Seen by Clinician',
          status: isClinicianReviewed ? 'completed' : isArrived ? 'current' : 'pending',
          time: isClinicianReviewed ? formatStepDateTime(seenByClinicianAt) : '',
          note: isClinicianReviewed ? '' : 'Pending'
        },
        {
          label: 'Referral Complete',
          status: isCompleted ? 'completed' : isClinicianReviewed ? 'current' : 'pending',
          time: isCompleted ? formatStepDateTime(completedAt) : '',
          note: isCompleted ? '' : 'Pending'
        },
      ];
    }

    const missionStep = (label: string, reachedStatus: string, timestamp?: string, note?: string) => {
      const completed = !!timestamp || missionHasReached(missionStatus, reachedStatus);
      const current = missionStatus === reachedStatus && !timestamp;
      return {
        label,
        status: completed ? 'completed' : current ? 'current' : 'pending',
        time: timestamp ? formatStepDateTime(timestamp) : '',
        note: completed ? note || '' : current ? 'In progress' : 'Pending',
      };
    };

    return [
      ...baseSteps,
      {
        label: 'Ambulance Assigned',
        status: nemsRequest?.dispatchedAt || missionHasReached(missionStatus, 'DISPATCHED') ? 'completed' : 'pending',
        time: formatStepDateTime(nemsRequest?.dispatchedAt),
        note: nemsRequest?.ambulanceId ? `Ambulance: ${nemsRequest.ambulanceId}` : 'Pending'
      },
      {
        label: 'Crew Accepted Mission',
        status: nemsRequest?.acknowledgedAt ? 'completed' : missionStatus === 'DISPATCHED' ? 'current' : 'pending',
        time: formatStepDateTime(nemsRequest?.acknowledgedAt),
        note: nemsRequest?.currentOwnerName || (nemsRequest?.acknowledgedAt ? 'Crew acknowledged' : 'Pending')
      },
      missionStep('Departed Standby', 'EN_ROUTE_PICKUP', nemsRequest?.departedStandbyAt || nemsRequest?.enrouteToPickupAt),
      missionStep('Arrived at Pickup', 'AT_PICKUP', nemsRequest?.arrivedAtPickupAt),
      missionStep('Patient Loaded', 'PATIENT_LOADED', nemsRequest?.patientLoadedAt),
      missionStep('Departed Pickup', 'EN_ROUTE_DROPOFF', nemsRequest?.departedPickupAt || nemsRequest?.enrouteToDropoffAt),
      missionStep('Arrived at Facility', 'AT_DROPOFF', nemsRequest?.arrivedAtDropoffAt),
      {
        label: 'Handover Complete',
        status: nemsRequest?.patientHandedOverAt || missionHasReached(missionStatus, 'HANDED_OVER') ? 'completed' : missionStatus === 'AT_DROPOFF' ? 'current' : 'pending',
        time: formatStepDateTime(nemsRequest?.patientHandedOverAt),
        note: nemsRequest?.patientReportId ? 'Patient report submitted' : nemsRequest?.patientHandedOverAt ? 'Receiving team handover' : 'Pending'
      },
      {
        label: 'Mission Completed',
        status: nemsRequest?.completedAt || missionHasReached(missionStatus, 'COMPLETED') ? 'completed' : missionStatus === 'HANDED_OVER' ? 'current' : 'pending',
        time: formatStepDateTime(nemsRequest?.completedAt),
        note: nemsRequest?.completedAt ? '' : 'Pending'
      },
      {
        label: 'Returned to Standby',
        status: nemsRequest?.returnedToStandbyAt || missionHasReached(missionStatus, 'RETURNED_STANDBY') ? 'completed' : missionStatus === 'COMPLETED' ? 'current' : 'pending',
        time: formatStepDateTime(nemsRequest?.returnedToStandbyAt),
        note: nemsRequest?.returnedToStandbyAt ? '' : 'Pending'
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
