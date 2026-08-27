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
  Clock,
  Scissors,
  X,
  MapPin,
  Building2,
  Activity,
  FileText,
} from 'lucide-react';

export const getScoreColor = (score: number) => {
  if (score >= 80) return 'var(--success, #22c55e)';
  if (score >= 50) return 'var(--warning, #f59e0b)';
  return 'var(--error, #ef4444)';
};

export const getStatusColor = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'ADEQUATE':
    case 'FULLY_STAFFED':
    case 'AVAILABLE':
    case 'FUNCTIONAL':
      return 'var(--success, #22c55e)';
    case 'LOW':
    case 'UNDERSTAFFED':
    case 'LIMITED':
    case 'OCCUPIED':
      return 'var(--warning, #f59e0b)';
    case 'CRITICAL':
    case 'UNAVAILABLE':
    case 'NON_FUNCTIONAL':
      return 'var(--error, #ef4444)';
    default:
      return 'var(--muted, #94a3b8)';
  }
};

export const getStatusBg = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'ADEQUATE':
    case 'FULLY_STAFFED':
    case 'AVAILABLE':
    case 'FUNCTIONAL':
      return 'rgba(34, 197, 94, 0.15)';
    case 'LOW':
    case 'UNDERSTAFFED':
    case 'LIMITED':
    case 'OCCUPIED':
      return 'rgba(245, 158, 11, 0.15)';
    case 'CRITICAL':
    case 'UNAVAILABLE':
    case 'NON_FUNCTIONAL':
      return 'rgba(239, 68, 68, 0.15)';
    default:
      return 'var(--bg-overlay, rgba(255, 255, 255, 0.05))';
  }
};

export const StatusBadge = ({ status }: { status?: string }) => (
  <span
    style={{
      padding: '3px 10px',
      borderRadius: 'var(--radius-full, 9999px)',
      fontSize: '11px',
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

/**
 * System Weighted Readiness Score Calculation (0 - 100):
 * Matches the Server & Mobile calculation:
 * - Server Score directly if available
 * - Otherwise 6-component weighted calculation:
 *   1. Beds (25%): bedCapacityAvailable / bedCapacityTotal
 *   2. ICU (20%): icuBedsAvailable / icuBedsTotal (1.0 if no ICU capacity)
 *   3. Blood (15%): Total 8 blood units normalized against 400 total units
 *   4. Oxygen (15%): oxygenCylinders normalized against 100 cylinders
 *   5. Staffing (15%): (doctorsOnDuty / 20 + nursesOnDuty / 50) / 2
 *   6. Equipment (10%): working / total ratio across tracked items
 */
export const calculateScore = (data: FacilityReadiness): number => {
  if (!data) return 0;

  const raw = data as any;
  const serverScore =
    typeof raw.overallScore === 'number' && raw.overallScore > 0
      ? raw.overallScore
      : typeof raw.readinessScore === 'number' && raw.readinessScore > 0
      ? raw.readinessScore
      : typeof raw.score === 'number' && raw.score > 0
      ? raw.score
      : typeof raw.overall_score === 'number' && raw.overall_score > 0
      ? raw.overall_score
      : typeof raw.readiness_score === 'number' && raw.readiness_score > 0
      ? raw.readiness_score
      : undefined;

  if (typeof serverScore === 'number' && !isNaN(serverScore)) {
    if (serverScore > 0 && serverScore <= 1) {
      return Math.round(serverScore * 100);
    }
    return Math.round(serverScore);
  }

  // 1. Bed Capacity (25%)
  const bedScore =
    data.bedCapacityTotal > 0
      ? Math.min(Math.max(data.bedCapacityAvailable / data.bedCapacityTotal, 0), 1)
      : 0;

  // 2. ICU Beds (20%)
  const icuScore =
    data.icuBedsTotal > 0
      ? Math.min(Math.max(data.icuBedsAvailable / data.icuBedsTotal, 0), 1)
      : 1.0;

  // 3. Blood Bank (15%) - 8 types normalized against 400 total units
  const bloodTotal =
    (data.bloodUnitsAPositive || 0) +
    (data.bloodUnitsANegative || 0) +
    (data.bloodUnitsBPositive || 0) +
    (data.bloodUnitsBNegative || 0) +
    (data.bloodUnitsOPositive || 0) +
    (data.bloodUnitsONegative || 0) +
    (data.bloodUnitsABPositive || 0) +
    (data.bloodUnitsABNegative || 0);
  const bloodScore = Math.min(Math.max(bloodTotal / 400, 0), 1);

  // 4. Oxygen (15%) - normalized against 100 cylinders
  const oxygenScore = Math.min(Math.max((data.oxygenCylinders || 0) / 100, 0), 1);

  // 5. Staffing (15%) - doctors / 20, nurses / 50
  const docScore = Math.min(Math.max((data.doctorsOnDuty || 0) / 20, 0), 1);
  const nurseScore = Math.min(Math.max((data.nursesOnDuty || 0) / 50, 0), 1);
  const staffScore = (docScore + nurseScore) / 2;

  // 6. Equipment (10%)
  let equipScore = 1.0;
  if (data.equipmentStatus && typeof data.equipmentStatus === 'object') {
    const rawObj = data.equipmentStatus as Record<string, any>;
    const rawItems = Array.isArray(rawObj)
      ? rawObj
      : rawObj.items
      ? Object.values(rawObj.items)
      : Object.values(rawObj);
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      let totalRatio = 0;
      let validCount = 0;
      rawItems.forEach((item: any) => {
        if (item && typeof item.total === 'number' && item.total > 0) {
          totalRatio += Math.min(Math.max((item.working || 0) / item.total, 0), 1);
          validCount++;
        }
      });
      if (validCount > 0) {
        equipScore = totalRatio / validCount;
      }
    }
  }

  const overall =
    bedScore * 0.25 +
    icuScore * 0.20 +
    bloodScore * 0.15 +
    oxygenScore * 0.15 +
    staffScore * 0.15 +
    equipScore * 0.10;

  return Math.round(overall * 100);
};

export const formatSpecialist = (raw: string): string => {
  switch (raw.toUpperCase().trim()) {
    case 'OBSTETRICIAN':
    case 'OBSTETRICIAN_GYNAECOLOGIST':
    case 'OB/GYN':
    case 'OBGYN':
      return 'Obstetrician / Gyn';
    case 'ANAESTHETIST':
    case 'ANESTHESIOLOGIST':
      return 'Anaesthetist';
    case 'PAEDIATRICIAN':
    case 'PEDIATRICIAN':
      return 'Paediatrician / Neonatologist';
    case 'GENERAL_SURGEON':
    case 'SURGEON':
      return 'General Surgeon';
    case 'MIDWIFE':
      return 'Midwife / Senior Midwife';
    case 'LAB_TECHNICIAN':
    case 'LABORATORY_TECHNICIAN':
      return 'Lab / Blood Transfusion Tech';
    case 'THEATRE_NURSE':
      return 'Theatre Scrub Nurse';
    case 'MEDICAL_OFFICER':
      return 'Medical Officer (EmONC)';
    default:
      return raw.replace(/_/g, ' ');
  }
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
        { type: 'AB+', units: activeData.bloodUnitsABPositive || 0 },
        { type: 'AB-', units: activeData.bloodUnitsABNegative || 0 },
        { type: 'O+', units: activeData.bloodUnitsOPositive || 0 },
        { type: 'O-', units: activeData.bloodUnitsONegative || 0 },
      ]
    : [];

  const getBloodUnitColor = (units: number) => {
    if (units >= 10) return 'var(--success, #22c55e)';
    if (units > 0) return 'var(--warning, #f59e0b)';
    return 'var(--error, #ef4444)';
  };

  const diagnosticsMap = activeData?.diagnosticsStatus as
    | { ctScan?: string; laboratory?: string; ultrasound?: string; xray?: string }
    | undefined;

  const diagnosticItems = [
    { name: 'CT Scan', status: diagnosticsMap?.ctScan || 'UNAVAILABLE' },
    { name: 'Laboratory', status: diagnosticsMap?.laboratory || 'UNAVAILABLE' },
    { name: 'Ultrasound', status: diagnosticsMap?.ultrasound || 'UNAVAILABLE' },
    { name: 'X-Ray', status: diagnosticsMap?.xray || 'UNAVAILABLE' },
  ];

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 'var(--space-4, 16px)',
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 0,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: 'var(--space-4, 16px) var(--space-5, 20px)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-elevated)',
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
                    background: 'var(--bg-elevated)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: getScoreColor(score),
                  }}
                >
                  {score}%
                </div>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
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
                    Report Date:{' '}
                    {activeData.reportDate
                      ? new Date(activeData.reportDate).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Building2 size={24} style={{ color: 'var(--accent, #38bdf8)' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
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
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner mx-auto" />
            <div className="text-sm text-muted mt-3">Fetching live readiness data...</div>
          </div>
        ) : !activeData ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: 'var(--warning, #f59e0b)', margin: '0 auto 12px' }} />
            <h3 className="font-bold text-primary mb-1">No Readiness Data Available</h3>
            <p className="text-sm text-muted">
              This facility has not submitted a recent readiness report.
            </p>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            {/* Quick Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              {/* Beds */}
              <div
                style={{
                  padding: '14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <BedDouble
                  size={22}
                  style={{ color: 'rgb(59, 130, 246)', margin: '0 auto 8px' }}
                />
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {activeData.bedCapacityAvailable}
                  <span
                    className="text-muted"
                    style={{ fontSize: '12px', fontWeight: 400 }}
                  >
                    /{activeData.bedCapacityTotal}
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Beds Available ({bedOccupancy}% occ)
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    height: 4,
                    background: 'var(--border-subtle)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${bedOccupancy}%`,
                      height: '100%',
                      background: bedOccupancy > 80 ? 'var(--error, #ef4444)' : 'var(--success, #22c55e)',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>

              {/* ICU */}
              <div
                style={{
                  padding: '14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <Stethoscope
                  size={22}
                  style={{ color: 'rgb(168, 85, 247)', margin: '0 auto 8px' }}
                />
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {activeData.icuBedsAvailable || 0}
                  <span
                    className="text-muted"
                    style={{ fontSize: '12px', fontWeight: 400 }}
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
                  padding: '14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <Users
                  size={22}
                  style={{ color: 'rgb(34, 197, 94)', margin: '0 auto 8px' }}
                />
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
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
                  padding: '14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <Scissors
                  size={22}
                  style={{ color: 'rgb(236, 72, 153)', margin: '0 auto 8px' }}
                />
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
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
                  padding: '14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <Wind
                  size={22}
                  style={{ color: 'rgb(59, 130, 246)', margin: '0 auto 8px' }}
                />
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {activeData.oxygenCylinders || 0}
                </div>
                <div className="text-xs text-muted mb-1" style={{ marginTop: 2 }}>
                  O2 Cylinders
                </div>
                <StatusBadge status={activeData.oxygenStatus} />
              </div>
            </div>

            {/* CEmONC Specialists Section */}
            <div
              style={{
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                marginBottom: '16px',
              }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Users size={18} style={{ color: 'var(--accent, #38bdf8)' }} />
                  <span className="font-semibold text-sm">Specialists on Duty (CEmONC)</span>
                </div>
                <span className="text-xs text-muted">
                  {activeData.specialistsAvailable?.length || 0} Active
                </span>
              </div>
              {activeData.specialistsAvailable && activeData.specialistsAvailable.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeData.specialistsAvailable.map((spec) => (
                    <span
                      key={spec}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--accent-light, #818cf8)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                      }}
                    >
                      {formatSpecialist(spec)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted">No specialists currently rostered.</div>
              )}
            </div>

            {/* Resource Status Breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              {/* Blood Bank */}
              <div
                style={{
                  padding: '16px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  borderRadius: '12px',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Droplets size={18} style={{ color: getStatusColor(activeData.bloodBankStatus) }} />
                    <span className="font-semibold text-sm">Blood Bank (8 Types)</span>
                  </div>
                  <StatusBadge status={activeData.bloodBankStatus} />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                  }}
                >
                  {bloodUnitsArray.map((blood) => (
                    <div
                      key={blood.type}
                      style={{
                        textAlign: 'center',
                        padding: '8px 4px',
                        background: 'var(--bg-surface)',
                        border: blood.units === 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--muted, #94a3b8)' }}>
                        {blood.type}
                      </div>
                      <div style={{ fontWeight: 700, color: getBloodUnitColor(blood.units), fontSize: '14px', marginTop: 2 }}>
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

              {/* Diagnostic Capabilities */}
              <div
                style={{
                  padding: '16px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  borderRadius: '12px',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={18} style={{ color: 'var(--success, #22c55e)' }} />
                    <span className="font-semibold text-sm">Diagnostic Capabilities</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {diagnosticItems.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                      style={{
                        padding: '6px 8px',
                        background: 'var(--bg-surface)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{item.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes Section if any */}
            {activeData.notes && (
              <div
                style={{
                  padding: '14px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5 text-muted text-xs font-semibold">
                  <FileText size={14} />
                  Handover Notes
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {activeData.notes}
                </div>
              </div>
            )}

            {/* Reporter Footer */}
            {activeData.reportedBy && (
              <div
                className="flex items-center justify-between text-xs text-muted"
                style={{
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Users size={13} />
                  Reported by {activeData.reportedBy.firstName} {activeData.reportedBy.lastName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {(() => {
                    const timestamp = activeData.updatedAt || activeData.createdAt || activeData.reportDate;
                    if (!timestamp) return '—';
                    const d = new Date(timestamp);
                    if (isNaN(d.getTime())) return '—';
                    const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
                    const timeSource = activeData.updatedAt || activeData.createdAt;
                    if (timeSource) {
                      const timeStr = new Date(timeSource).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return `${dateStr}, ${timeStr}`;
                    }
                    return dateStr;
                  })()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
