'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { readinessService } from '@/lib/api';
import { useAuthStore } from '@/store';
import { FacilityReadiness } from '@/types';
import { ReadinessDetailModal } from '@/components/readiness';
import { 
  BedDouble, 
  Droplets, 
  Wind,
  RefreshCw,
  Users,
  Stethoscope,
  Syringe,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  Scissors,
  Package,
  ChevronDown,
  ChevronUp,
  X,
  MapPin
} from 'lucide-react';

// Helper functions
const getScoreColor = (score: number) => {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--error)';
};

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ADEQUATE':
    case 'FULLY_STAFFED':
    case 'AVAILABLE':
      return 'var(--success)';
    case 'LOW':
    case 'UNDERSTAFFED':
      return 'var(--warning)';
    case 'CRITICAL':
    case 'UNAVAILABLE':
      return 'var(--error)';
    default:
      return 'var(--muted)';
  }
};

const getStatusBg = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ADEQUATE':
    case 'FULLY_STAFFED':
    case 'AVAILABLE':
      return 'rgba(34, 197, 94, 0.15)';
    case 'LOW':
    case 'UNDERSTAFFED':
      return 'rgba(234, 179, 8, 0.15)';
    case 'CRITICAL':
    case 'UNAVAILABLE':
      return 'rgba(239, 68, 68, 0.15)';
    default:
      return 'var(--bg-overlay)';
  }
};

const StatusBadge = ({ status }: { status: string }) => (
  <span style={{
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    color: getStatusColor(status),
    background: getStatusBg(status),
    textTransform: 'capitalize'
  }}>
    {status?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
  </span>
);

const calculateScore = (data: FacilityReadiness) => {
  let score = 0;
  let factors = 0;
  
  if (data.bedCapacityTotal > 0) {
    const bedScore = (data.bedCapacityAvailable / data.bedCapacityTotal) * 100;
    score += bedScore * 0.4;
    factors += 0.4;
  }
  
  const statusScore = (status: string) => {
    switch (status) {
      case 'ADEQUATE': return 100;
      case 'LOW': return 50;
      case 'CRITICAL': return 20;
      default: return 0;
    }
  };
  
  if (data.oxygenStatus) {
    score += statusScore(data.oxygenStatus) * 0.2;
    factors += 0.2;
  }
  
  if (data.bloodBankStatus) {
    score += statusScore(data.bloodBankStatus) * 0.2;
    factors += 0.2;
  }
  
  if (data.staffingStatus) {
    const status = String(data.staffingStatus);
    const staffScore = status === 'FULLY_STAFFED' ? 100 : 
                       status === 'ADEQUATE' ? 80 :
                       status === 'UNDERSTAFFED' ? 50 : 20;
    score += staffScore * 0.2;
    factors += 0.2;
  }
  
  return factors > 0 ? Math.round(score / factors) : 0;
};

const getTotalBloodUnits = (data: FacilityReadiness) => {
  return (
    (data.bloodUnitsAPositive || 0) +
    (data.bloodUnitsANegative || 0) +
    (data.bloodUnitsBPositive || 0) +
    (data.bloodUnitsBNegative || 0) +
    (data.bloodUnitsOPositive || 0) +
    (data.bloodUnitsONegative || 0) +
    (data.bloodUnitsABPositive || 0) +
    (data.bloodUnitsABNegative || 0)
  );
};

// Facility Card Component for multi-facility view
function FacilityReadinessCard({ 
  data, 
  isExpanded, 
  onToggle,
  onViewDetails 
}: { 
  data: FacilityReadiness; 
  isExpanded: boolean; 
  onToggle: () => void;
  onViewDetails: () => void;
}) {
  const score = calculateScore(data);
  const bedOccupancy = data.bedCapacityTotal > 0 
    ? Math.round(((data.bedCapacityTotal - data.bedCapacityAvailable) / data.bedCapacityTotal) * 100) 
    : 0;
  const totalBlood = getTotalBloodUnits(data);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header - Always visible */}
      <div 
        onClick={onToggle}
        style={{ 
          padding: 'var(--space-4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isExpanded ? 'var(--bg-overlay)' : 'transparent',
          transition: 'background 0.2s'
        }}
      >
        <div className="flex items-center gap-4">
          <div style={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%',
            background: `conic-gradient(${getScoreColor(score)} ${score}%, var(--border) 0)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              background: 'var(--card)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: getScoreColor(score)
            }}>
              {score}%
            </div>
          </div>
          <div>
            <div className="font-semibold">{data.facilityName || 'Unknown Facility'}</div>
            <div className="text-xs text-muted flex items-center gap-1">
              <MapPin size={10} />
              {data.facilityCode || 'No code'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2" style={{ display: isExpanded ? 'none' : 'flex' }}>
            <span style={{ 
              padding: '4px 10px', 
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--text-secondary)'
            }}>
              <BedDouble size={12} />
              {data.bedCapacityAvailable}/{data.bedCapacityTotal}
            </span>
            <StatusBadge status={data.bloodBankStatus} />
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          {/* Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)'
          }}>
            {/* Beds */}
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--bg-overlay)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <div className="flex items-center gap-2 mb-2">
                <BedDouble size={14} style={{ color: 'rgb(59, 130, 246)' }} />
                <span className="text-xs font-medium">Beds</span>
              </div>
              <div className="font-bold">
                {data.bedCapacityAvailable}
                <span className="text-muted font-normal">/{data.bedCapacityTotal}</span>
              </div>
              <div style={{ 
                marginTop: 6,
                height: 4, 
                background: 'var(--border)', 
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${bedOccupancy}%`,
                  height: '100%',
                  background: bedOccupancy > 80 ? 'var(--error)' : bedOccupancy > 60 ? 'var(--warning)' : 'var(--success)'
                }} />
              </div>
            </div>

            {/* Staff */}
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--bg-overlay)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} style={{ color: 'rgb(34, 197, 94)' }} />
                <span className="text-xs font-medium">Staff</span>
              </div>
              <div className="font-bold">{data.doctorsOnDuty}D / {data.nursesOnDuty}N</div>
              <div className="text-xs mt-1">
                <StatusBadge status={String(data.staffingStatus)} />
              </div>
            </div>

            {/* Blood Bank */}
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--bg-overlay)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Droplets size={14} style={{ color: 'rgb(239, 68, 68)' }} />
                <span className="text-xs font-medium">Blood</span>
              </div>
              <div className="font-bold">{totalBlood} units</div>
              <div className="text-xs mt-1">
                <StatusBadge status={data.bloodBankStatus} />
              </div>
            </div>

            {/* Oxygen */}
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--bg-overlay)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Wind size={14} style={{ color: 'rgb(59, 130, 246)' }} />
                <span className="text-xs font-medium">Oxygen</span>
              </div>
              <div className="font-bold">{data.oxygenCylinders || 0} cyl</div>
              <div className="text-xs mt-1">
                <StatusBadge status={data.oxygenStatus} />
              </div>
            </div>
          </div>

          {/* Additional Quick Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Scissors size={12} />
                {data.operatingRoomsAvailable || 0} OR
              </span>
              <span className="flex items-center gap-1">
                <Stethoscope size={12} />
                {data.icuBedsAvailable || 0}/{data.icuBedsTotal || 0} ICU
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(data.reportDate).toLocaleDateString()}
              </span>
            </div>
            <button 
              className="btn btn-sm btn-primary"
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            >
              View Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Facility View (for facility staff)
function SingleFacilityView({ data }: { data: FacilityReadiness }) {
  const score = calculateScore(data);
  const totalBlood = getTotalBloodUnits(data);
  const bedOccupancy = data.bedCapacityTotal > 0 
    ? Math.round(((data.bedCapacityTotal - data.bedCapacityAvailable) / data.bedCapacityTotal) * 100) 
    : 0;

  const bloodUnitsArray = [
    { type: 'A+', units: data.bloodUnitsAPositive || 0 },
    { type: 'A-', units: data.bloodUnitsANegative || 0 },
    { type: 'B+', units: data.bloodUnitsBPositive || 0 },
    { type: 'B-', units: data.bloodUnitsBNegative || 0 },
    { type: 'O+', units: data.bloodUnitsOPositive || 0 },
    { type: 'O-', units: data.bloodUnitsONegative || 0 },
    { type: 'AB+', units: data.bloodUnitsABPositive || 0 },
    { type: 'AB-', units: data.bloodUnitsABNegative || 0 },
  ];

  const getBloodUnitColor = (units: number) => {
    if (units >= 10) return 'var(--success)';
    if (units > 0) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <>
      {/* Overall Score & Quick Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: 'var(--space-4)', 
        marginBottom: 'var(--space-6)' 
      }}>
        {/* Overall Readiness Score */}
        <div className="card" style={{ 
          gridColumn: 'span 1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6)'
        }}>
          <div style={{ 
            width: 100, 
            height: 100, 
            borderRadius: '50%',
            background: `conic-gradient(${getScoreColor(score)} ${score}%, var(--border) 0)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-3)'
          }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              background: 'var(--card)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: getScoreColor(score)
            }}>
              {score}%
            </div>
          </div>
          <div className="text-sm font-medium">Overall Readiness</div>
          <div className="text-xs text-muted flex items-center gap-1 mt-1">
            <Clock size={12} />
            {new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Bed Stats */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BedDouble size={18} style={{ color: 'rgb(59, 130, 246)' }} />
            </div>
            <span className="text-sm font-medium">Beds</span>
          </div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, lineHeight: 1.2 }}>
            {data.bedCapacityAvailable}
            <span className="text-muted" style={{ fontSize: 'var(--text-lg)', fontWeight: 400 }}>
              /{data.bedCapacityTotal}
            </span>
          </div>
          <div className="text-xs text-muted mt-1">Available beds</div>
          <div style={{ 
            marginTop: 'var(--space-3)',
            height: 6, 
            background: 'var(--bg-overlay)', 
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${bedOccupancy}%`,
              height: '100%',
              background: bedOccupancy > 80 ? 'var(--error)' : bedOccupancy > 60 ? 'var(--warning)' : 'var(--success)',
              borderRadius: 'var(--radius-full)'
            }} />
          </div>
          <div className="text-xs text-muted mt-1">{bedOccupancy}% occupied</div>
        </div>

        {/* ICU Stats */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(168, 85, 247, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Stethoscope size={18} style={{ color: 'rgb(168, 85, 247)' }} />
            </div>
            <span className="text-sm font-medium">ICU</span>
          </div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, lineHeight: 1.2 }}>
            {data.icuBedsAvailable || 0}
            <span className="text-muted" style={{ fontSize: 'var(--text-lg)', fontWeight: 400 }}>
              /{data.icuBedsTotal || 0}
            </span>
          </div>
          <div className="text-xs text-muted mt-1">ICU beds available</div>
        </div>

        {/* Staff Stats */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} style={{ color: 'rgb(34, 197, 94)' }} />
            </div>
            <span className="text-sm font-medium">Staff</span>
          </div>
          <div className="flex gap-4">
            <div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.doctorsOnDuty || 0}</div>
              <div className="text-xs text-muted">Doctors</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{data.nursesOnDuty || 0}</div>
              <div className="text-xs text-muted">Nurses</div>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <StatusBadge status={String(data.staffingStatus)} />
          </div>
        </div>

        {/* Theatre Stats */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(236, 72, 153, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Scissors size={18} style={{ color: 'rgb(236, 72, 153)' }} />
            </div>
            <span className="text-sm font-medium">Theatre</span>
          </div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, lineHeight: 1.2 }}>
            {data.operatingRoomsAvailable || 0}
          </div>
          <div className="text-xs text-muted mt-1">Operating rooms</div>
          {data.theatreStatus && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <StatusBadge status={data.theatreStatus} />
            </div>
          )}
        </div>
      </div>

      {/* Resource Status Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 'var(--space-4)', 
        marginBottom: 'var(--space-6)' 
      }}>
        {/* Oxygen Status */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 'var(--radius-lg)', 
                background: getStatusBg(data.oxygenStatus),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Wind size={22} style={{ color: getStatusColor(data.oxygenStatus) }} />
              </div>
              <div>
                <div className="font-semibold">Oxygen Supply</div>
                <div className="text-xs text-muted">Medical grade O2</div>
              </div>
            </div>
            <StatusBadge status={data.oxygenStatus} />
          </div>
          {data.oxygenCylinders > 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--bg-overlay)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              <span>{data.oxygenCylinders} cylinders available</span>
            </div>
          )}
        </div>

        {/* Blood Bank Status */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 'var(--radius-lg)', 
                background: getStatusBg(data.bloodBankStatus),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Droplets size={22} style={{ color: getStatusColor(data.bloodBankStatus) }} />
              </div>
              <div>
                <div className="font-semibold">Blood Bank</div>
                <div className="text-xs text-muted">All blood types</div>
              </div>
            </div>
            <StatusBadge status={data.bloodBankStatus} />
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ 
            padding: 'var(--space-3)', 
            background: 'var(--bg-overlay)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <Syringe size={14} style={{ color: getStatusColor(data.bloodBankStatus) }} />
            <span>{totalBlood} total units in stock</span>
          </div>
        </div>

        {/* Emergency Supplies Status */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 'var(--radius-lg)', 
                background: getStatusBg(data.emergencySuppliesStatus),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={22} style={{ color: getStatusColor(data.emergencySuppliesStatus) }} />
              </div>
              <div>
                <div className="font-semibold">Emergency Supplies</div>
                <div className="text-xs text-muted">Critical supplies</div>
              </div>
            </div>
            <StatusBadge status={data.emergencySuppliesStatus} />
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ 
            padding: 'var(--space-3)', 
            background: 'var(--bg-overlay)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            {String(data.emergencySuppliesStatus).toUpperCase() === 'ADEQUATE' ? (
              <>
                <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                <span>All supplies stocked</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} style={{ color: getStatusColor(data.emergencySuppliesStatus) }} />
                <span>Supplies need attention</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Blood Bank Detail */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title" style={{ marginBottom: 0 }}>
            <Droplets size={16} />
            Blood Bank Inventory
          </h3>
          <div className="text-sm text-muted">{totalBlood} total units</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 'var(--space-3)' }}>
          {bloodUnitsArray.map((blood) => (
            <div key={blood.type} style={{ 
              textAlign: 'center',
              padding: 'var(--space-4)',
              background: 'var(--bg-overlay)',
              borderRadius: 'var(--radius-lg)',
              border: `2px solid ${blood.units === 0 ? 'var(--error)' : 'transparent'}`
            }}>
              <div style={{ 
                fontSize: 'var(--text-sm)', 
                fontWeight: 600,
                color: blood.type.includes('-') ? 'rgb(236, 72, 153)' : 'rgb(239, 68, 68)',
                marginBottom: 'var(--space-2)'
              }}>
                {blood.type}
              </div>
              <div style={{ 
                fontSize: 'var(--text-2xl)', 
                fontWeight: 700,
                color: getBloodUnitColor(blood.units)
              }}>
                {blood.units}
              </div>
              <div className="text-xs text-muted">units</div>
            </div>
          ))}
        </div>
        {totalBlood === 0 && (
          <div style={{ 
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: 'var(--error)',
            fontSize: 'var(--text-sm)'
          }}>
            <AlertCircle size={16} />
            <span>Critical: No blood units in stock. Immediate restocking required.</span>
          </div>
        )}
      </div>

      {/* Report Info Footer */}
      <div className="card" style={{ 
        background: 'var(--bg-overlay)', 
        padding: 'var(--space-4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Building2 size={14} className="text-muted" />
            <span>{data.facilityName || 'Facility'}</span>
          </div>
          {data.reportedBy && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Users size={14} />
              <span>Reported by {data.reportedBy.firstName} {data.reportedBy.lastName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Clock size={14} />
          <span>Report date: {new Date(data.reportDate).toLocaleDateString()}</span>
        </div>
      </div>
    </>
  );
}

// Main Page Component
export default function ReadinessPage() {
  const user = useAuthStore((state) => state.user);
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityReadiness | null>(null);

  // Check if user is admin, NEMS, or ambulance dispatch/crew
  const isMultiFacilityView = user?.userType === 'SYSTEM_ADMIN' ||
                               user?.userType === 'NEMS' ||
                               user?.userType === 'AMBULANCE_DISPATCH' ||
                               user?.userType === 'AMBULANCE_CREW' ||
                               user?.userType === 'NATIONAL_USER' ||
                               user?.userType === 'DISTRICT_HEALTH';

  // Fetch data based on view type
  const { data: allReadiness, isLoading: loadingAll } = useQuery({
    queryKey: ['readiness', 'all'],
    queryFn: () => readinessService.getAllCurrent(),
    enabled: isMultiFacilityView,
  });

  const { data: currentReadiness, isLoading: loadingSingle } = useQuery({
    queryKey: ['readiness', 'current'],
    queryFn: () => readinessService.getCurrent(),
    enabled: !isMultiFacilityView,
  });

  const isLoading = isMultiFacilityView ? loadingAll : loadingSingle;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Multi-facility view for admin/dispatch
  if (isMultiFacilityView) {
    const facilities = allReadiness || [];
    
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Facility Readiness Overview</h1>
            <p className="page-subtitle">
              Monitoring {facilities.length} facilities across the network
            </p>
          </div>
        </div>

        {facilities.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <AlertCircle size={48} style={{ color: 'var(--muted)', margin: '0 auto var(--space-4)' }} />
            <h3 style={{ marginBottom: 'var(--space-2)' }}>No Readiness Data</h3>
            <p className="text-muted">No facilities have submitted readiness reports yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {facilities.map((facility) => (
              <FacilityReadinessCard 
                key={facility.id}
                data={facility}
                isExpanded={expandedFacility === facility.id}
                onToggle={() => setExpandedFacility(
                  expandedFacility === facility.id ? null : facility.id
                )}
                onViewDetails={() => setSelectedFacility(facility)}
              />
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedFacility && (
          <ReadinessDetailModal 
            data={selectedFacility} 
            onClose={() => setSelectedFacility(null)} 
          />
        )}
      </>
    );
  }

  // Single facility view for facility staff
  if (!currentReadiness) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Facility Readiness</h1>
            <p className="page-subtitle">Monitor and update facility status</p>
          </div>
          <Link href="/readiness/update" className="btn btn-primary">
            <RefreshCw size={16} />
            Update Status
          </Link>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <AlertCircle size={48} style={{ color: 'var(--muted)', margin: '0 auto var(--space-4)' }} />
          <h3 style={{ marginBottom: 'var(--space-2)' }}>No Readiness Data</h3>
          <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>
            No readiness report has been submitted yet for this facility.
          </p>
          <Link href="/readiness/update" className="btn btn-primary">
            Submit First Report
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Facility Readiness</h1>
          <p className="page-subtitle">
            {currentReadiness.facilityName || 'Current Facility'} - Last updated {new Date(currentReadiness.reportDate).toLocaleDateString()}
          </p>
        </div>
        <Link href="/readiness/update" className="btn btn-primary">
          <RefreshCw size={16} />
          Update Status
        </Link>
      </div>

      <SingleFacilityView data={currentReadiness} />
    </>
  );
}
