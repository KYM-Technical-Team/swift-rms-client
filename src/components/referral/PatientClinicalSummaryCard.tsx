import React from 'react';
import { User, Droplet, ShieldAlert, Heart, Activity, Thermometer, Wind } from 'lucide-react';
import { Referral } from '@/types/referral';

interface PatientClinicalSummaryCardProps {
  referral: Referral;
}

export function PatientClinicalSummaryCard({ referral }: PatientClinicalSummaryCardProps) {
  const { patient, dangerSignScore, chiefComplaint, clinicalSummary, vitalSigns, bloodGroup, allergyDetails, onSupplementalOxygen, oxygenSaturation } = referral;

  const dangerSignsCount = dangerSignScore || 0;
  
  // Triage alert thresholds & colors
  const getRiskDetails = (score: number) => {
    if (score >= 7) {
      return { text: 'RED – LIFE THREATENING', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' };
    } else if (score >= 4) {
      return { text: 'AMBER – MODERATE', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' };
    } else {
      return { text: 'GREEN – LOW RISK', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' };
    }
  };

  const risk = getRiskDetails(dangerSignsCount);

  // Vitals styling helpers
  const bpSys = vitalSigns?.bloodPressureSystolic;
  const bpDia = vitalSigns?.bloodPressureDiastolic;
  const isBPAbnormal = bpSys !== undefined && bpDia !== undefined && (bpSys < 90 || bpSys > 140 || bpDia < 60 || bpDia > 90);

  const hr = vitalSigns?.heartRate;
  const isHRAbnormal = hr !== undefined && (hr > 100 || hr < 60);

  const rr = vitalSigns?.respiratoryRate;
  const isRRAbnormal = rr !== undefined && (rr > 20 || rr < 12);

  const spo2 = vitalSigns?.oxygenSaturation ?? oxygenSaturation;
  const isSpO2Abnormal = spo2 !== undefined && spo2 < 95;

  const temp = vitalSigns?.temperature;
  const isTempAbnormal = temp !== undefined && (temp >= 38.0 || temp <= 35.5);

  return (
    <div className="card" style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-4.5)'
    }}>
      <h3 className="text-sm font-bold text-muted flex items-center gap-1.5 mb-4" style={{
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: 'var(--space-2)',
        width: '100%'
      }}>
        <User size={16} style={{ color: 'var(--accent)' }} />
        Patient &amp; Clinical Summary
      </h3>

      <div className="flex justify-between gap-4 mb-5" style={{
        flexDirection: 'row',
        flexWrap: 'wrap'
      }}>
        <div className="flex items-start gap-3">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={24} />
          </div>
          <div>
            <h4 className="font-bold text-primary" style={{ fontSize: '16px' }}>
              {patient?.firstName} {patient?.lastName}
            </h4>
            <div className="text-xs text-secondary" style={{ marginTop: '2px' }}>
              {patient?.gender?.toLowerCase() === 'female' ? 'Female' : patient?.gender?.toLowerCase() === 'male' ? 'Male' : patient?.gender || 'Female'} • {patient?.age || '34'} years
            </div>
            <div className="text-xs text-muted font-bold" style={{ marginTop: '4px', fontFamily: 'monospace' }}>
              Medical Card: {patient?.id ? `SL-${patient.id.slice(0, 7).toUpperCase()}` : 'SL-8899001'}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
              Phone: {patient?.phone || 'N/A'}
            </div>
          </div>
        </div>

        <div className="flex flex-col" style={{
          alignItems: 'flex-end',
          maxWidth: '320px',
          textAlign: 'right'
        }}>
          <span className="badge font-bold" style={{
            background: risk.bg,
            color: risk.color,
            border: `1px solid ${risk.border}`,
            borderRadius: '4px',
            display: 'inline-block',
            fontSize: '10px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '8px',
            padding: '2px 10px'
          }}>
            {risk.text}
          </span>
          <h4 className="font-bold text-primary" style={{ fontSize: '14px', lineHeight: '1.4' }}>
            {chiefComplaint}
          </h4>
          <p className="text-xs text-secondary" style={{ marginTop: '4px', lineHeight: '1.5' }}>
            {clinicalSummary}
          </p>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="mb-4" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
        gap: 'var(--space-2.5)'
      }}>
        {/* BP */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <span className="text-muted font-bold block" style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>BP</span>
          <span className="font-bold block" style={{ fontSize: '14px', color: isBPAbnormal ? '#ef4444' : 'var(--text-primary)' }}>
            {bpSys !== undefined && bpDia !== undefined ? `${bpSys}/${bpDia}` : '—'}
          </span>
          <span className="text-muted block" style={{ fontSize: '9px', marginTop: '2px' }}>mmHg</span>
        </div>

        {/* Pulse */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <span className="text-muted font-bold block" style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Pulse</span>
          <span className="font-bold block" style={{ fontSize: '14px', color: isHRAbnormal ? '#ef4444' : '#10b981' }}>
            {hr !== undefined ? `${hr}` : '—'}
          </span>
          <span className="text-muted block" style={{ fontSize: '9px', marginTop: '2px' }}>bpm</span>
        </div>

        {/* Resp Rate */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <span className="text-muted font-bold block" style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Resp. Rate</span>
          <span className="font-bold block" style={{ fontSize: '14px', color: isRRAbnormal ? '#f59e0b' : 'var(--text-primary)' }}>
            {rr !== undefined ? `${rr}` : '—'}
          </span>
          <span className="text-muted block" style={{ fontSize: '9px', marginTop: '2px' }}>/min</span>
        </div>

        {/* SpO2 */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <span className="text-muted font-bold block" style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>SpO2</span>
          <span className="font-bold block" style={{ fontSize: '14px', color: isSpO2Abnormal ? '#ef4444' : '#10b981' }}>
            {spo2 !== undefined ? `${spo2}%` : '—'}
          </span>
          <span className="text-muted block" style={{ fontSize: '9px', marginTop: '2px' }}>Oxygen</span>
        </div>

        {/* Temp */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <span className="text-muted font-bold block" style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Temp.</span>
          <span className="font-bold block" style={{ fontSize: '14px', color: isTempAbnormal ? '#f59e0b' : '#10b981' }}>
            {temp !== undefined ? `${temp}°C` : '—'}
          </span>
          <span className="text-muted block" style={{ fontSize: '9px', marginTop: '2px' }}>Celsius</span>
        </div>

        {/* Oxygen Delivery */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <span className="text-muted font-bold block" style={{ fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Oxygen</span>
          <span className="font-bold block text-warning" style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {onSupplementalOxygen ? '6 L/min' : 'Room Air'}
          </span>
          <span className="text-muted block" style={{ fontSize: '9px', marginTop: '2px' }}>{onSupplementalOxygen ? 'Mask' : 'Ambient'}</span>
        </div>
      </div>

      {/* Lab Parameters Footer Row */}
      <div className="flex justify-between items-center text-xs" style={{
        paddingTop: '12px',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <div className="flex items-center gap-1.5 text-secondary">
          <Droplet size={14} style={{ color: 'var(--danger)' }} />
          Blood Group: <strong className="text-primary">{bloodGroup || 'O+'}</strong>
        </div>
        <div className="flex items-center gap-1.5 text-secondary">
          <ShieldAlert size={14} style={{ color: 'var(--success)' }} />
          Allergies: <strong className="text-primary">{allergyDetails || 'None known'}</strong>
        </div>
      </div>
    </div>
  );
}
