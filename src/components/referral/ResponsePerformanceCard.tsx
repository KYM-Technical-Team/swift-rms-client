import React from 'react';
import { Clock } from 'lucide-react';
import { Referral } from '@/types/referral';

interface ResponsePerformanceCardProps {
  referral: Referral;
}

export function ResponsePerformanceCard({ referral }: ResponsePerformanceCardProps) {
  const { createdAt, acceptedAt, expectedArrival, nemsRequest, responseTimeMinutes } = referral;

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const actualResponseTime = responseTimeMinutes !== undefined ? `${responseTimeMinutes} min` : '—';
  
  // Highlight performance indicator green if within target of 5 minutes
  const isWithinTarget = responseTimeMinutes !== undefined && responseTimeMinutes <= 5;

  return (
    <div className="card" style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-4.5)'
    }}>
      <h3 className="text-xs font-bold text-muted flex items-center gap-1.5 mb-4" style={{
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: 'var(--space-2)',
        width: '100%'
      }}>
        <Clock size={16} style={{ color: 'var(--accent)' }} />
        Response Performance
      </h3>

      <div className="flex flex-col gap-2 text-xs" style={{ marginBottom: '14px' }}>
        <div className="flex justify-between">
          <span className="text-muted">Referral received</span>
          <span className="font-bold text-primary" style={{ fontFamily: 'monospace' }}>{formatTime(createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Facility decision</span>
          <span className="font-bold text-primary" style={{ fontFamily: 'monospace' }}>{formatTime(acceptedAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Ambulance dispatched</span>
          <span className="font-bold text-primary" style={{ fontFamily: 'monospace' }}>
            {formatTime(nemsRequest?.dispatchedAt)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">ETA</span>
          <span className="font-bold text-primary" style={{ fontFamily: 'monospace' }}>{formatTime(expectedArrival)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '10px',
        fontSize: '11px'
      }}>
        <span className="text-muted font-medium">Time to acceptance</span>
        <span className="badge font-bold" style={{ 
          background: isWithinTarget ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
          color: isWithinTarget ? '#10b981' : 'var(--text-primary)',
          borderRadius: '4px',
          fontSize: '10px',
          padding: '2px 8px'
        }}>
          {responseTimeMinutes !== undefined ? actualResponseTime : '≤ 5 min'}
        </span>
      </div>

      <div className="flex items-center justify-between" style={{
        fontSize: '11px',
        marginTop: '6px'
      }}>
        <span className="text-muted font-medium">Response target</span>
        <span className="text-success font-semibold" style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>≤ 5 min</span>
      </div>
    </div>
  );
}
