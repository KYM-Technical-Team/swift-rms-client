import React from 'react';
import { Activity, Heart, Thermometer, Wind, Droplet, AlertTriangle, ShieldAlert } from 'lucide-react';
import { VitalSigns, Referral } from '@/types/referral';

interface VitalSignsCardProps {
  vitalSigns?: VitalSigns;
  referral: Referral;
}

export function VitalSignsCard({ vitalSigns, referral }: VitalSignsCardProps) {
  const { bloodGroup, knownAllergies, allergyDetails, onSupplementalOxygen } = referral;

  if (!vitalSigns && !bloodGroup && !knownAllergies) {
    return (
      <div className="card">
        <h3 className="card-title mb-3 flex items-center gap-2">
          <Activity size={18} className="text-accent" />
          Clinical Vital Signs & Lab Indicators
        </h3>
        <p className="text-sm text-muted">No baseline vital signs recorded for this referral.</p>
      </div>
    );
  }

  // Clinical Threshold Helper Functions
  const isBPAbrnormal = (sys?: number, dia?: number) => {
    if (!sys || !dia) return false;
    return sys >= 140 || sys <= 90 || dia >= 90 || dia <= 60;
  };

  const isHRAbnormal = (hr?: number) => {
    if (!hr) return false;
    return hr > 100 || hr < 60;
  };

  const isTempAbnormal = (temp?: number) => {
    if (!temp) return false;
    return temp >= 38.0 || temp <= 35.5;
  };

  const isSpO2Abnormal = (spo2?: number) => {
    if (!spo2) return false;
    return spo2 < 95;
  };

  const isRRAbnormal = (rr?: number) => {
    if (!rr) return false;
    return rr > 20 || rr < 12;
  };

  return (
    <div className="card mb-4" style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)'
    }}>
      <div className="flex items-center justify-between mb-4 border-b border-subtle pb-3">
        <h3 className="card-title flex items-center gap-2 text-base font-semibold">
          <Activity size={18} style={{ color: 'var(--accent)' }} />
          Clinical Vital Signs & Lab Indicators
        </h3>

        {bloodGroup && (
          <span className="badge badge-danger font-bold text-xs flex items-center gap-1">
            <Droplet size={12} />
            Blood Group: {bloodGroup}
          </span>
        )}
      </div>

      {/* Allergies Alert Banner if Present */}
      {knownAllergies && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2.5" style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: 'var(--danger)'
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="font-bold text-xs uppercase tracking-wider">Known Patient Allergies</div>
            <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {allergyDetails || 'Allergies reported by referring facility'}
            </div>
          </div>
        </div>
      )}

      {/* Vital Signs Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* Blood Pressure */}
        <div className="metric-card" style={{
          textAlign: 'center',
          padding: 'var(--space-3)',
          background: isBPAbrnormal(vitalSigns?.bloodPressureSystolic, vitalSigns?.bloodPressureDiastolic)
            ? 'rgba(239, 68, 68, 0.1)'
            : 'var(--glass-bg)',
          border: `1px solid ${isBPAbrnormal(vitalSigns?.bloodPressureSystolic, vitalSigns?.bloodPressureDiastolic) ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)'
        }}>
          <div className="flex justify-center mb-1">
            <Activity size={18} style={{ color: isBPAbrnormal(vitalSigns?.bloodPressureSystolic, vitalSigns?.bloodPressureDiastolic) ? 'var(--danger)' : 'var(--text-tertiary)' }} />
          </div>
          <div className="font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
            {vitalSigns?.bloodPressureSystolic && vitalSigns?.bloodPressureDiastolic 
              ? `${vitalSigns.bloodPressureSystolic}/${vitalSigns.bloodPressureDiastolic}`
              : 'N/A'}
          </div>
          <div className="text-xs text-muted mt-0.5">BP (mmHg)</div>
        </div>

        {/* Heart Rate */}
        <div className="metric-card" style={{
          textAlign: 'center',
          padding: 'var(--space-3)',
          background: isHRAbnormal(vitalSigns?.heartRate) ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)',
          border: `1px solid ${isHRAbnormal(vitalSigns?.heartRate) ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)'
        }}>
          <div className="flex justify-center mb-1">
            <Heart size={18} style={{ color: isHRAbnormal(vitalSigns?.heartRate) ? 'var(--danger)' : 'var(--accent-light)' }} />
          </div>
          <div className="font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
            {vitalSigns?.heartRate ? `${vitalSigns.heartRate}` : 'N/A'}
          </div>
          <div className="text-xs text-muted mt-0.5">Heart Rate (bpm)</div>
        </div>

        {/* Temperature */}
        <div className="metric-card" style={{
          textAlign: 'center',
          padding: 'var(--space-3)',
          background: isTempAbnormal(vitalSigns?.temperature) ? 'rgba(245, 158, 11, 0.1)' : 'var(--glass-bg)',
          border: `1px solid ${isTempAbnormal(vitalSigns?.temperature) ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)'
        }}>
          <div className="flex justify-center mb-1">
            <Thermometer size={18} style={{ color: isTempAbnormal(vitalSigns?.temperature) ? 'var(--warning)' : 'var(--text-tertiary)' }} />
          </div>
          <div className="font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
            {vitalSigns?.temperature ? `${vitalSigns.temperature}°C` : 'N/A'}
          </div>
          <div className="text-xs text-muted mt-0.5">Temperature</div>
        </div>

        {/* Oxygen Saturation SpO2 */}
        <div className="metric-card" style={{
          textAlign: 'center',
          padding: 'var(--space-3)',
          background: isSpO2Abnormal(vitalSigns?.oxygenSaturation || referral.oxygenSaturation) ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)',
          border: `1px solid ${isSpO2Abnormal(vitalSigns?.oxygenSaturation || referral.oxygenSaturation) ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)'
        }}>
          <div className="flex justify-center mb-1">
            <Wind size={18} style={{ color: isSpO2Abnormal(vitalSigns?.oxygenSaturation || referral.oxygenSaturation) ? 'var(--danger)' : 'var(--info)' }} />
          </div>
          <div className="font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
            {(vitalSigns?.oxygenSaturation || referral.oxygenSaturation) 
              ? `${vitalSigns?.oxygenSaturation || referral.oxygenSaturation}%`
              : 'N/A'}
          </div>
          <div className="text-xs text-muted mt-0.5">
            SpO2 {onSupplementalOxygen ? '(O₂)' : ''}
          </div>
        </div>

        {/* Respiratory Rate */}
        <div className="metric-card" style={{
          textAlign: 'center',
          padding: 'var(--space-3)',
          background: isRRAbnormal(vitalSigns?.respiratoryRate) ? 'rgba(245, 158, 11, 0.1)' : 'var(--glass-bg)',
          border: `1px solid ${isRRAbnormal(vitalSigns?.respiratoryRate) ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)'
        }}>
          <div className="flex justify-center mb-1">
            <Activity size={18} style={{ color: isRRAbnormal(vitalSigns?.respiratoryRate) ? 'var(--warning)' : 'var(--text-tertiary)' }} />
          </div>
          <div className="font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>
            {vitalSigns?.respiratoryRate ? `${vitalSigns.respiratoryRate}` : 'N/A'}
          </div>
          <div className="text-xs text-muted mt-0.5">Resp Rate (/min)</div>
        </div>
      </div>
    </div>
  );
}
