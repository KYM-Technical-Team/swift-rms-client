import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { readinessService } from '@/lib/api';
import { Building2, Bed, Droplet, Wind, Activity, Phone, Eye } from 'lucide-react';
import { ReadinessDetailModal } from '@/components/readiness';

interface ReceivingFacilityReadinessCardProps {
  facilityId: string;
  facilityName: string;
}

export function ReceivingFacilityReadinessCard({ facilityId, facilityName }: ReceivingFacilityReadinessCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { data: readiness, isLoading } = useQuery({
    queryKey: ['facility-readiness-latest', facilityId],
    queryFn: () => readinessService.getLatest(facilityId),
    enabled: !!facilityId,
  });

  if (isLoading) {
    return (
      <div className="card text-center p-6">
        <div className="spinner mx-auto" />
        <span className="text-xs text-muted mt-2 block">Loading readiness details...</span>
      </div>
    );
  }

  const hasSpecialist = (role: string) => {
    if (!readiness?.specialistsAvailable) return false;
    return readiness.specialistsAvailable.some(s => 
      s.toUpperCase() === role.toUpperCase() || s.toUpperCase().includes(role.toUpperCase())
    );
  };

  const bedsAvailable = readiness?.bedCapacityAvailable;
  const bedsTotal = readiness?.bedCapacityTotal;
  const bloodOUnits = readiness?.bloodUnitsOPositive;
  const oxygenStatus = readiness?.oxygenStatus;
  const theatreRooms = readiness?.operatingRoomsAvailable;
  const theatreAvailable = readiness?.theatreAvailable;

  const obgynStatus = hasSpecialist('OBSTETRICIAN') || hasSpecialist('OB/GYN') || hasSpecialist('OBGYN') ? 'On duty' : 'Off duty';
  const anesthesiologistStatus = hasSpecialist('ANESTHESIOLOGIST') || hasSpecialist('ANAESTHETIST') ? 'On duty' : 'Off duty';
  const emergencyStatus = readiness?.emergencySuppliesStatus;

  const reporterName = readiness?.reportedBy 
    ? `Dr. ${readiness.reportedBy.firstName} ${readiness.reportedBy.lastName}`
    : '—';
  
  const formattedLastUpdated = (() => {
    if (!readiness) return '—';
    const timestamp = readiness.updatedAt || readiness.createdAt || readiness.reportDate;
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '—';

    const dateStr = d.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timeSource = readiness.updatedAt || readiness.createdAt;
    if (timeSource) {
      const timeStr = new Date(timeSource).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateStr}, ${timeStr}`;
    }

    return dateStr;
  })();

  return (
    <>
      <div className="card" style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4.5)'
      }}>
        <div className="flex justify-between items-center mb-4" style={{
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px'
        }}>
          <h3 className="text-xs font-bold text-muted flex items-center gap-1.5" style={{
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <Building2 size={16} style={{ color: 'var(--accent)' }} />
            Receiving Facility Readiness
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-bold text-success" style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>{readiness ? 'DATA INSTANT' : 'NO REPORT'}</span>
            {readiness && (
              <button
                type="button"
                onClick={() => setShowDetailModal(true)}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  height: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid var(--border-default)',
                }}
              >
                <Eye size={12} />
                View Details
              </button>
            )}
          </div>
        </div>

      <h4 className="font-semibold text-sm text-primary" style={{ marginBottom: '14px' }}>
        {facilityName}
      </h4>

      {/* Resource status list */}
      <div className="mb-4" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--space-2.5)'
      }}>
        {/* Beds */}
        <div className="flex items-center gap-2.5" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          padding: '10px',
          borderRadius: 'var(--radius-md)'
        }}>
          <Bed size={18} style={{ color: 'var(--success)' }} />
          <div>
            <div className="text-muted font-bold block" style={{ fontSize: '9px', lineHeight: '1.25' }}>Beds</div>
            <div className="text-xs font-bold text-success">
              {bedsAvailable !== undefined ? (
                bedsTotal !== undefined ? `${bedsAvailable}/${bedsTotal} Available` : `${bedsAvailable} Available`
              ) : '—'}
            </div>
          </div>
        </div>

        {/* Blood */}
        <div className="flex items-center gap-2.5" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          padding: '10px',
          borderRadius: 'var(--radius-md)'
        }}>
          <Droplet size={18} style={{ color: 'var(--danger)' }} />
          <div>
            <div className="text-muted font-bold block" style={{ fontSize: '9px', lineHeight: '1.25' }}>Blood</div>
            <div className="text-xs font-bold" style={{
              color: bloodOUnits !== undefined && bloodOUnits > 0 ? 'var(--success)' : 'var(--danger)'
            }}>
              {bloodOUnits !== undefined ? (
                bloodOUnits > 0 ? `${bloodOUnits} Units (O+)` : 'Critical (0 Units)'
              ) : '—'}
            </div>
          </div>
        </div>

        {/* Oxygen */}
        <div className="flex items-center gap-2.5" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          padding: '10px',
          borderRadius: 'var(--radius-md)'
        }}>
          <Wind size={18} style={{ color: 'var(--info)' }} />
          <div>
            <div className="text-muted font-bold block" style={{ fontSize: '9px', lineHeight: '1.25' }}>Oxygen</div>
            <div className="text-xs font-bold" style={{
              color: oxygenStatus === 'ADEQUATE' ? 'var(--success)' : oxygenStatus === 'LOW' ? 'var(--warning)' : 'var(--danger)'
            }}>
              {oxygenStatus ? (
                oxygenStatus === 'ADEQUATE' ? 'Adequate' : oxygenStatus === 'LOW' ? 'Low Stock' : oxygenStatus === 'CRITICAL' ? 'Critical' : 'Unavailable'
              ) : '—'}
            </div>
          </div>
        </div>

        {/* Operating Theatre */}
        <div className="flex items-center gap-2.5" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          padding: '10px',
          borderRadius: 'var(--radius-md)'
        }}>
          <Activity size={18} style={{ color: 'var(--success)' }} />
          <div>
            <div className="text-muted font-bold block" style={{ fontSize: '9px', lineHeight: '1.25' }}>Theatre</div>
            <div className="text-xs font-bold text-success">
              {theatreRooms !== undefined ? `${theatreRooms} Room${theatreRooms !== 1 ? 's' : ''} Ready` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Shift duty indicators */}
      <div className="flex flex-wrap text-secondary" style={{
        gap: '8px 16px',
        fontSize: '11px',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '12px',
        marginBottom: '14px'
      }}>
        <span className="flex items-center gap-1.5">
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: obgynStatus === 'On duty' ? 'var(--success)' : 'var(--text-secondary)', flexShrink: 0 }} /> 
          Obstetrician: <strong style={{ color: obgynStatus === 'On duty' ? 'var(--success)' : 'var(--text-secondary)' }}>{obgynStatus}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: anesthesiologistStatus === 'On duty' ? 'var(--success)' : 'var(--text-secondary)', flexShrink: 0 }} /> 
          Anaesthetist: <strong style={{ color: anesthesiologistStatus === 'On duty' ? 'var(--success)' : 'var(--text-secondary)' }}>{anesthesiologistStatus}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: emergencyStatus === 'ADEQUATE' ? 'var(--success)' : emergencyStatus === 'LOW' ? 'var(--warning)' : 'var(--danger)', flexShrink: 0 }} /> 
          Emergency Unit: <strong style={{ color: emergencyStatus === 'ADEQUATE' ? 'var(--success)' : emergencyStatus === 'LOW' ? 'var(--warning)' : 'var(--danger)' }}>
            {emergencyStatus ? (emergencyStatus === 'ADEQUATE' ? 'Available' : emergencyStatus === 'LOW' ? 'Low Stock' : 'Critical') : '—'}
          </strong>
        </span>
        <span className="flex items-center gap-1.5">
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theatreAvailable ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} /> 
          Operating Theatre: <strong style={{ color: theatreAvailable ? 'var(--success)' : 'var(--danger)' }}>{theatreAvailable ? 'Available' : 'Unavailable'}</strong>
        </span>
      </div>

      <div className="flex justify-between items-center text-muted" style={{
        fontSize: '10px',
        marginTop: '8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        paddingTop: '10px'
      }}>
        <span>Last updated: {formattedLastUpdated}</span>
        <div className="flex items-center gap-2">
          <span>{reporterName}</span>
          {readiness?.reportedBy && (
            <a href="tel:+23276123456" className="transition-colors" style={{
              padding: '4px',
              borderRadius: '50%',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Phone size={11} />
            </a>
          )}
        </div>
      </div>
    </div>

    {showDetailModal && readiness && (
      <ReadinessDetailModal
        data={readiness}
        facilityId={facilityId}
        facilityName={facilityName}
        onClose={() => setShowDetailModal(false)}
      />
    )}
  </>
);
}
