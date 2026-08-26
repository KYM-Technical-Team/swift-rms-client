'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { readinessService } from '@/lib/api';
import {
  BedDouble,
  Droplet,
  Wind,
  Activity,
  AlertCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { calculateScore, getScoreColor, getStatusColor, StatusBadge } from './ReadinessDetailModal';

interface FacilityReadinessPreviewProps {
  facilityId: string;
  facilityName?: string;
  onViewDetails?: () => void;
}

export function FacilityReadinessPreview({
  facilityId,
  facilityName,
  onViewDetails,
}: FacilityReadinessPreviewProps) {
  const { data: readiness, isLoading } = useQuery({
    queryKey: ['facility-readiness-latest', facilityId],
    queryFn: () => readinessService.getLatest(facilityId),
    enabled: !!facilityId,
  });

  if (isLoading) {
    return (
      <div
        className="p-3 my-2 text-center"
        style={{
          background: 'var(--bg-overlay, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div className="spinner mx-auto" style={{ width: 20, height: 20 }} />
        <span className="text-xs text-muted mt-2 block">Checking facility readiness...</span>
      </div>
    );
  }

  if (!readiness) {
    return (
      <div
        className="p-3 my-2 flex items-center gap-2"
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <div className="text-xs text-muted">
          No live readiness report submitted for <strong>{facilityName || 'this facility'}</strong>.
        </div>
      </div>
    );
  }

  const score = calculateScore(readiness);
  const bedsAvailable = readiness.bedCapacityAvailable ?? 0;
  const bedsTotal = readiness.bedCapacityTotal ?? 0;
  const bloodO = readiness.bloodUnitsOPositive ?? 0;
  const oxygen = readiness.oxygenStatus;
  const theatreRooms = readiness.operatingRoomsAvailable ?? 0;

  const hasSpecialist = (role: string) => {
    if (!readiness.specialistsAvailable) return false;
    return readiness.specialistsAvailable.some(
      (s) => s.toUpperCase() === role.toUpperCase() || s.toUpperCase().includes(role.toUpperCase())
    );
  };

  const obgyn = hasSpecialist('OBSTETRICIAN') || hasSpecialist('OB/GYN') || hasSpecialist('OBGYN');
  const anaesthetist = hasSpecialist('ANESTHESIOLOGIST') || hasSpecialist('ANAESTHETIST');

  return (
    <div
      style={{
        background: 'var(--bg-elevated, rgba(255, 255, 255, 0.04))',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3.5)',
        margin: 'var(--space-3) 0',
      }}
    >
      <div className="flex justify-between items-center mb-2.5 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: getScoreColor(score),
            }}
          />
          <span className="text-xs font-bold text-primary">Live Readiness Status</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: '10px',
              fontWeight: 800,
              background: `rgba(255, 255, 255, 0.06)`,
              color: getScoreColor(score),
              border: `1px solid ${getScoreColor(score)}40`,
            }}
          >
            {score}% SCORE
          </span>
        </div>
        {onViewDetails && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onViewDetails}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              height: 'auto',
              gap: 4,
              color: 'var(--accent)',
            }}
          >
            Full Details
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2.5)',
        }}
      >
        <div
          style={{
            padding: '6px 8px',
            background: 'var(--bg-overlay, rgba(0,0,0,0.2))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-1 text-muted" style={{ fontSize: '10px' }}>
            <BedDouble size={12} style={{ color: 'var(--success)' }} />
            <span>Beds</span>
          </div>
          <strong style={{ fontSize: '12px', color: bedsAvailable > 0 ? 'var(--success)' : 'var(--danger)' }}>
            {bedsAvailable}/{bedsTotal}
          </strong>
        </div>

        <div
          style={{
            padding: '6px 8px',
            background: 'var(--bg-overlay, rgba(0,0,0,0.2))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-1 text-muted" style={{ fontSize: '10px' }}>
            <Droplet size={12} style={{ color: 'var(--danger)' }} />
            <span>Blood (O+)</span>
          </div>
          <strong style={{ fontSize: '12px', color: bloodO > 0 ? 'var(--success)' : 'var(--danger)' }}>
            {bloodO} units
          </strong>
        </div>

        <div
          style={{
            padding: '6px 8px',
            background: 'var(--bg-overlay, rgba(0,0,0,0.2))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-1 text-muted" style={{ fontSize: '10px' }}>
            <Wind size={12} style={{ color: 'var(--info)' }} />
            <span>Oxygen</span>
          </div>
          <strong style={{ fontSize: '12px', color: getStatusColor(oxygen) }}>
            {oxygen ? oxygen.replace(/_/g, ' ') : '—'}
          </strong>
        </div>

        <div
          style={{
            padding: '6px 8px',
            background: 'var(--bg-overlay, rgba(0,0,0,0.2))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-1 text-muted" style={{ fontSize: '10px' }}>
            <Activity size={12} style={{ color: 'var(--success)' }} />
            <span>Theatre</span>
          </div>
          <strong style={{ fontSize: '12px', color: theatreRooms > 0 ? 'var(--success)' : 'var(--warning)' }}>
            {theatreRooms} Room{theatreRooms !== 1 ? 's' : ''}
          </strong>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted" style={{ fontSize: '10px' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: obgyn ? 'var(--success)' : 'var(--text-secondary)',
              }}
            />
            OB/GYN: {obgyn ? 'On duty' : 'Off'}
          </span>
          <span className="flex items-center gap-1">
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: anaesthetist ? 'var(--success)' : 'var(--text-secondary)',
              }}
            />
            Anaesthetist: {anaesthetist ? 'On duty' : 'Off'}
          </span>
        </div>
        <span>Updated {readiness.reportDate ? new Date(readiness.reportDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
      </div>
    </div>
  );
}
