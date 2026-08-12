import React from 'react';
import { ClipboardList, Circle } from 'lucide-react';
import { Referral } from '@/types/referral';

interface InterventionsCardProps {
  referral: Referral;
}

export function InterventionsCard({ referral }: InterventionsCardProps) {
  // Sierra Leone NEMS Emergency Care Standard Interventions (MOCK feed matching clinical screenshot spec)
  const defaultInterventions = [
    { time: '23:45', description: 'IV access established' },
    { time: '23:47', description: 'Oxygen 6 L/min started' },
    { time: '23:49', description: 'Tranexamic acid administered' },
    { time: '23:50', description: 'IV fluids commenced' }
  ];

  return (
    <div className="card" style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-4.5)'
    }}>
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-subtle pb-2">
        <ClipboardList size={16} className="text-accent" />
        Interventions Given
      </h3>

      <div className="flex flex-col gap-3.5 mb-4">
        {defaultInterventions.map((item, idx) => (
          <div key={idx} className="flex gap-3 text-xs">
            <span className="font-bold font-mono text-muted min-w-[34px]">{item.time}</span>
            <div className="flex items-start gap-2">
              <Circle size={6} fill="var(--success)" color="var(--success)" style={{ marginTop: 5, flexShrink: 0 }} />
              <span className="text-secondary leading-tight">{item.description}</span>
            </div>
          </div>
        ))}
      </div>

      <a 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          alert('Detailed pre-hospital patient care report (PCR) log is under development.');
        }}
        className="text-xs text-accent hover:underline block font-semibold"
      >
        View full clinical details →
      </a>
    </div>
  );
}
