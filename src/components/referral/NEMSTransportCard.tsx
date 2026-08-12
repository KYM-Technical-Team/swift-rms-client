import React from 'react';
import { Ambulance } from 'lucide-react';
import { Referral } from '@/types/referral';

interface NEMSTransportCardProps {
  referral: Referral;
  onAssignAmbulance: () => void;
  canAssignAmbulance: boolean;
}

export function NEMSTransportCard({ referral, onAssignAmbulance, canAssignAmbulance }: NEMSTransportCardProps) {
  const { nemsRequest, expectedArrival } = referral;

  const status = nemsRequest?.status || 'NOT ASSIGNED';
  const missionId = nemsRequest?.id ? nemsRequest.id.slice(0, 8).toUpperCase() : '—';
  const ambulanceId = nemsRequest?.ambulanceId || '—';

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card" style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-4.5)'
    }}>
      <div className="flex justify-between items-center mb-3" style={{
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: 'var(--space-2)'
      }}>
        <h3 className="text-xs font-bold text-muted flex items-center gap-1.5" style={{
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <Ambulance size={16} style={{ color: 'var(--accent)' }} />
          NEMS Transport / Mission
        </h3>
        <span className="badge font-bold" style={{ 
          background: status === 'NOT ASSIGNED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
          color: status === 'NOT ASSIGNED' ? '#ef4444' : '#3b82f6',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '9px'
        }}>
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="text-xs mb-4" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--space-2)'
      }}>
        <div>
          <div className="text-muted font-medium" style={{ fontSize: '10px', lineHeight: '1.25' }}>Mission ID</div>
          <strong className="text-primary" style={{ fontFamily: 'monospace' }}>{missionId}</strong>
        </div>
        <div>
          <div className="text-muted font-medium" style={{ fontSize: '10px', lineHeight: '1.25' }}>Ambulance</div>
          <strong className="text-primary" style={{ fontFamily: 'monospace' }}>{ambulanceId}</strong>
        </div>
        <div>
          <div className="text-muted font-medium" style={{ fontSize: '10px', lineHeight: '1.25' }}>Status</div>
          <strong className="text-primary">{status.toLowerCase().replace(/_/g, ' ')}</strong>
        </div>
        <div>
          <div className="text-muted font-medium" style={{ fontSize: '10px', lineHeight: '1.25' }}>ETA</div>
          <strong className="text-primary">{formatTime(expectedArrival)}</strong>
        </div>
      </div>

      {canAssignAmbulance && (
        <button 
          onClick={onAssignAmbulance}
          className="btn btn-primary w-full flex items-center justify-center gap-1.5"
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
            border: 'none', 
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'bold'
          }}
        >
          <Ambulance size={14} />
          Assign Ambulance
        </button>
      )}
    </div>
  );
}
