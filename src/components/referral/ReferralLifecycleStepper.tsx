import React from 'react';
import { CheckCircle2, Clock, CircleDot, Ambulance, Check, AlertCircle } from 'lucide-react';
import { ReferralStatus } from '@/types/common';

interface ReferralLifecycleStepperProps {
  status: ReferralStatus | string;
  createdAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
}

const STAGES = [
  { key: 'PENDING', label: 'Triage Pending', desc: 'Submitted by facility' },
  { key: 'ACCEPTED', label: 'Accepted', desc: 'Bed / Team ready' },
  { key: 'DISPATCHED', label: 'Dispatched', desc: 'Ambulance en route' },
  { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Patient en route' },
  { key: 'ARRIVED', label: 'Arrived', desc: 'At receiving facility' },
  { key: 'COMPLETED', label: 'Completed', desc: 'Admission / Handover' },
];

function getStageIndex(status: string): number {
  switch (status) {
    case 'PENDING': return 0;
    case 'ACCEPTED': return 1;
    case 'DISPATCHED': return 2;
    case 'IN_TRANSIT': return 3;
    case 'ARRIVED': return 4;
    case 'COMPLETED': return 5;
    case 'REJECTED': return -1;
    case 'CANCELLED': return -1;
    default: return 0;
  }
}

export function ReferralLifecycleStepper({
  status,
  createdAt,
  acceptedAt,
  arrivedAt,
  completedAt
}: ReferralLifecycleStepperProps) {
  const currentIndex = getStageIndex(status);
  const isRejected = status === 'REJECTED' || status === 'CANCELLED';

  return (
    <div className="card mb-6" style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)'
    }}>
      <div className="flex items-center justify-between mb-4 border-b border-subtle pb-3">
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
        <div className="relative py-2">
          {/* Stepper Line and Nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 relative z-10">
            {STAGES.map((stage, idx) => {
              const isPassed = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;

              let nodeBg = 'var(--bg-muted)';
              let nodeBorder = 'var(--border-subtle)';
              let iconColor = 'var(--text-muted)';

              if (isPassed) {
                nodeBg = 'var(--success-subtle)';
                nodeBorder = 'var(--success)';
                iconColor = 'var(--success)';
              } else if (isCurrent) {
                nodeBg = 'var(--accent-subtle)';
                nodeBorder = 'var(--accent)';
                iconColor = 'var(--accent-light)';
              }

              return (
                <div key={stage.key} className="flex flex-col items-center text-center p-2.5 rounded-xl transition-all" style={{
                  background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isCurrent ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 font-bold text-xs shadow-sm transition-all" style={{
                    background: nodeBg,
                    border: `2px solid ${nodeBorder}`,
                    color: iconColor
                  }}>
                    {isPassed ? <Check size={14} /> : isCurrent ? <CircleDot size={14} className="animate-pulse" /> : idx + 1}
                  </div>

                  <div className="font-semibold text-xs leading-tight mb-0.5" style={{
                    color: isCurrent ? 'var(--text-primary)' : isPassed ? 'var(--text-secondary)' : 'var(--text-muted)'
                  }}>
                    {stage.label}
                  </div>

                  <div className="text-[11px] text-muted">
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
