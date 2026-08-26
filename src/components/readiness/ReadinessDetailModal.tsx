'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { readinessService } from '@/lib/api';
import { FacilityReadiness } from '@/types';
import {
  BedDouble,
  Droplets,
  Wind,
  Users,
  Stethoscope,
  Syringe,
  AlertCircle,
  CheckCircle,
  Clock,
  Scissors,
  Package,
  X,
  MapPin,
  Building2,
} from 'lucide-react';

export const getScoreColor = (score: number) => {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--error)';
};

export const getStatusColor = (status?: string) => {
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

export const getStatusBg = (status?: string) => {
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

export const StatusBadge = ({ status }: { status?: string }) => (
  <span
    style={{
      padding: '4px 12px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      color: getStatusColor(status),
      background: getStatusBg(status),
      textTransform: 'capitalize',
      display: 'inline-block',
    }}
  >
    {status?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
  </span>
);

export const calculateScore = (data: FacilityReadiness) => {
  let score = 0;
  let factors = 0;

  if (data.bedCapacityTotal > 0) {
    const bedScore = (data.bedCapacityAvailable / data.bedCapacityTotal) * 100;
    score += bedScore * 0.4;
    factors += 0.4;
  }

  const statusScore = (status?: string) => {
    switch (status) {
      case 'ADEQUATE':
        return 100;
      case 'LOW':
        return 50;
      case 'CRITICAL':
        return 20;
      default:
        return 0;
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
    const staffScore =
      status === 'FULLY_STAFFED'
        ? 100
        : status === 'ADEQUATE'
        ? 80
        : status === 'UNDERSTAFFED'
        ? 50
        : 20;
    score += staffScore * 0.2;
    factors += 0.2;
  }

  return factors > 0 ? Math.round(score / factors) : 0;
};

export const getTotalBloodUnits = (data: FacilityReadiness) => {
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

export interface ReadinessDetailModalProps {
  data?: FacilityReadiness | null;
  facilityId?: string;
  facilityName?: string;
  onClose: () => void;
}

export function ReadinessDetailModal({
  data,
  facilityId,
  facilityName,
  onClose,
}: ReadinessDetailModalProps) {
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ['facility-readiness-latest', facilityId],
    queryFn: () => readinessService.getLatest(facilityId!),
    enabled: !data && !!facilityId,
  });

  const activeData = data || fetchedData;

  const score = activeData ? calculateScore(activeData) : 0;
  const totalBlood = activeData ? getTotalBloodUnits(activeData) : 0;
  const bedOccupancy =
    activeData && activeData.bedCapacityTotal > 0
      ? Math.round(
          ((activeData.bedCapacityTotal - activeData.bedCapacityAvailable) /
            activeData.bedCapacityTotal) *
            100
        )
      : 0;

  const bloodUnitsArray = activeData
    ? [
        { type: 'A+', units: activeData.bloodUnitsAPositive || 0 },
        { type: 'A-', units: activeData.bloodUnitsANegative || 0 },
        { type: 'B+', units: activeData.bloodUnitsBPositive || 0 },
        { type: 'B-', units: activeData.bloodUnitsBNegative || 0 },
        { type: 'O+', units: activeData.bloodUnitsOPositive || 0 },
        { type: 'O-', units: activeData.bloodUnitsONegative || 0 },
        { type: 'AB+', units: activeData.bloodUnitsABPositive || 0 },
        { type: 'AB-', units: activeData.bloodUnitsABNegative || 0 },
      ]
    : [];

  const getBloodUnitColor = (units: number) => {
    if (units >= 10) return 'var(--success)';
    if (units > 0) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 'var(--space-4)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 0,
          background: 'var(--bg-card, #121826)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-elevated, #182234)',
            zIndex: 10,
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="spinner" />
              <span>Loading facility readiness details...</span>
            </div>
          ) : activeData ? (
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  background: `conic-gradient(${getScoreColor(score)} ${score}%, var(--border-subtle) 0)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    background: 'var(--bg-card, #121826)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-md)',
                    fontWeight: 800,
                    color: getScoreColor(score),
                  }}
                >
                  {score}%
                </div>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {activeData.facilityName || facilityName || 'Facility Readiness'}
                </h2>
                <div
                  className="text-sm text-muted flex items-center gap-2"
                  style={{ marginTop: 3 }}
                >
                  {activeData.facilityCode && (
                    <>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {activeData.facilityCode}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Updated{' '}
                    {activeData.reportDate
                      ? new Date(activeData.reportDate).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Building2 size={24} style={{ color: 'var(--accent)' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                  {facilityName || 'Facility Readiness'}
                </h2>
                <span className="text-xs text-muted">No recent readiness report</span>
              </div>
            </div>
          )}

          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            style={{ borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <div className="spinner mx-auto" />
            <div className="text-sm text-muted mt-3">Fetching live readiness data...</div>
          </div>
        ) : !activeData ? (
          <div style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: 'var(--warning)', margin: '0 auto var(--space-3)' }} />
            <h3 className="font-bold text-primary mb-1">No Readiness Data Available</h3>
            <p className="text-sm text-muted">
              This facility has not submitted a recent readiness report.
            </p>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-5)' }}>
            {/* Quick Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-5)',
              }}
            >
              {/* Beds */}
              <div
                style={{
                  padding: 'var(--space-3.5)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <BedDouble
                  size={22}
                  style={{ color: 'rgb(59, 130, 246)', margin: '0 auto var(--space-2)' }}
                />
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {activeData.bedCapacityAvailable}
                  <span
                    className="text-muted"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: 400 }}
                  >
                    /{activeData.bedCapacityTotal}
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Beds Available
                </div>
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    height: 4,
                    background: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${bedOccupancy}%`,
                      height: '100%',
                      background: bedOccupancy > 80 ? 'var(--error)' : 'var(--success)',
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>

              {/* ICU */}
              <div
                style={{
                  padding: 'var(--space-3.5)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <Stethoscope
                  size={22}
                  style={{ color: 'rgb(168, 85, 247)', margin: '0 auto var(--space-2)' }}
                />
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {activeData.icuBedsAvailable || 0}
                  <span
                    className="text-muted"
                    style={{ fontSize: 'var(--text-xs)', fontWeight: 400 }}
                  >
                    /{activeData.icuBedsTotal || 0}
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  ICU Beds
                </div>
              </div>

              {/* Staff */}
              <div
                style={{
                  padding: 'var(--space-3.5)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <Users
                  size={22}
                  style={{ color: 'rgb(34, 197, 94)', margin: '0 auto var(--space-2)' }}
                />
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                  {activeData.doctorsOnDuty}D / {activeData.nursesOnDuty}N
                </div>
                <div className="text-xs text-muted mb-1" style={{ marginTop: 2 }}>
                  Staff on Duty
                </div>
                <StatusBadge status={String(activeData.staffingStatus)} />
              </div>

              {/* Theatre */}
              <div
                style={{
                  padding: 'var(--space-3.5)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <Scissors
                  size={22}
                  style={{ color: 'rgb(236, 72, 153)', margin: '0 auto var(--space-2)' }}
                />
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {activeData.operatingRoomsAvailable || 0}
                </div>
                <div className="text-xs text-muted mb-1" style={{ marginTop: 2 }}>
                  Operating Rooms
                </div>
                {activeData.theatreStatus && <StatusBadge status={activeData.theatreStatus} />}
              </div>

              {/* Oxygen */}
              <div
                style={{
                  padding: 'var(--space-3.5)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                }}
              >
                <Wind
                  size={22}
                  style={{ color: 'rgb(59, 130, 246)', margin: '0 auto var(--space-2)' }}
                />
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {activeData.oxygenCylinders || 0}
                </div>
                <div className="text-xs text-muted mb-1" style={{ marginTop: 2 }}>
                  O2 Cylinders
                </div>
                <StatusBadge status={activeData.oxygenStatus} />
              </div>
            </div>

            {/* Resource Status Breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-5)',
              }}
            >
              {/* Blood Bank */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.02))',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Droplets size={18} style={{ color: getStatusColor(activeData.bloodBankStatus) }} />
                    <span className="font-semibold text-sm">Blood Bank</span>
                  </div>
                  <StatusBadge status={activeData.bloodBankStatus} />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--space-2)',
                  }}
                >
                  {bloodUnitsArray.map((blood) => (
                    <div
                      key={blood.type}
                      style={{
                        textAlign: 'center',
                        padding: 'var(--space-2)',
                        background: 'var(--bg-card, rgba(0, 0, 0, 0.2))',
                        border: blood.units === 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                        {blood.type}
                      </div>
                      <div style={{ fontWeight: 700, color: getBloodUnitColor(blood.units), fontSize: '15px' }}>
                        {blood.units}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted mt-3 text-center flex items-center justify-center gap-1">
                  <Syringe size={12} />
                  <span><strong>{totalBlood}</strong> total units</span>
                </div>
              </div>

              {/* Emergency Supplies */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.02))',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package
                      size={18}
                      style={{ color: getStatusColor(activeData.emergencySuppliesStatus) }}
                    />
                    <span className="font-semibold text-sm">Emergency Supplies</span>
                  </div>
                  <StatusBadge status={activeData.emergencySuppliesStatus} />
                </div>
                <div
                  style={{
                    padding: 'var(--space-5)',
                    background: getStatusBg(activeData.emergencySuppliesStatus),
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    minHeight: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {String(activeData.emergencySuppliesStatus).toUpperCase() === 'ADEQUATE' ? (
                    <div
                      className="flex items-center justify-center gap-2"
                      style={{ color: 'var(--success)' }}
                    >
                      <CheckCircle size={20} />
                      <span className="font-medium text-sm">All supplies adequately stocked</span>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center gap-2"
                      style={{ color: getStatusColor(activeData.emergencySuppliesStatus) }}
                    >
                      <AlertCircle size={20} />
                      <span className="font-medium text-sm">Supplies need attention</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reporter Footer */}
            {activeData.reportedBy && (
              <div
                className="flex items-center justify-between text-xs text-muted"
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--bg-overlay, rgba(255, 255, 255, 0.03))',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Users size={13} />
                  Reported by {activeData.reportedBy.firstName} {activeData.reportedBy.lastName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {activeData.createdAt ? new Date(activeData.createdAt).toLocaleString() : '—'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
