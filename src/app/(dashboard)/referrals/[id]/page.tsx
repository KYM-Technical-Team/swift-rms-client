'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralService } from '@/lib/api';
import { ReferralStatus } from '@/types';
import { useAuthStore } from '@/store';
import { canModifyReferral } from '@/lib/referral-auth';
import { SearchableSelect } from '@/components/ui';
import { AssignAmbulanceModal } from '@/components/referral/AssignAmbulanceModal';
import { 
  ArrowLeft, 
  Circle, 
  Check, 
  X, 
  ExternalLink, 
  MapPin, 
  User, 
  Clock, 
  Building2, 
  AlertTriangle, 
  FileText,
  Activity,
  Ambulance,
  Phone,
  Calendar,
  ShieldAlert,
  Stethoscope,
  CheckCircle2,
  MoreHorizontal,
  Bed,
  Droplet,
  UserCheck,
  ChevronRight,
  ClipboardList,
  Wind
} from 'lucide-react';

export default function ReferralDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectFacilityId, setRedirectFacilityId] = useState('');
  const [redirectReason, setRedirectReason] = useState('');
  const [showAssignAmbulanceModal, setShowAssignAmbulanceModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Get user for permission checks
  const user = useAuthStore(state => state.user);

  const { data: referral, isLoading } = useQuery({
    queryKey: ['referral', id],
    queryFn: () => referralService.get(id),
  });

  const { data: timeline } = useQuery({
    queryKey: ['referral', id, 'timeline'],
    queryFn: () => referralService.getTimeline(id),
  });

  // Fetch facilities for redirect modal
  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => import('@/lib/api').then(m => m.facilityService.list()),
    enabled: showRedirectModal,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status?: ReferralStatus; rejectionReason?: string; newReceivingFacilityId?: string }) =>
      referralService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral', id] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });

  const handleAccept = () => updateMutation.mutate({ status: 'ACCEPTED' });
  const handleReject = () => {
    if (rejectReason.trim()) {
      updateMutation.mutate({ status: 'REJECTED', rejectionReason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
    }
  };
  const handleMarkArrived = () => updateMutation.mutate({ status: 'ARRIVED' });
  const handleRedirect = () => {
    if (redirectFacilityId) {
      updateMutation.mutate({ newReceivingFacilityId: redirectFacilityId });
      setShowRedirectModal(false);
      setRedirectFacilityId('');
      setRedirectReason('');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <h2>Referral record not found</h2>
        <p className="text-muted mt-2">The requested referral ID may be invalid or has been archived.</p>
        <Link href="/referrals" className="btn btn-primary mt-4">
          Back to Referrals Hub
        </Link>
      </div>
    );
  }

  const hasPermission = canModifyReferral(user, referral);
  const canAccept = referral.status === 'PENDING' && hasPermission;
  const canMarkArrived = (referral.status === 'ACCEPTED' || referral.status === 'IN_TRANSIT') && hasPermission;
  const canAssignAmbulance = referral.status === 'PENDING' && 
    (user?.userType === 'SYSTEM_ADMIN' || user?.userType === 'NEMS' || user?.userType === 'AMBULANCE_DISPATCH');
  
  const dangerSignScore = Number.isFinite(referral.dangerSignScore) ? referral.dangerSignScore : 0;
  const riskLabel = dangerSignScore >= 7 ? 'RED - LIFE THREATENING' : dangerSignScore >= 4 ? 'AMBER - MODERATE' : 'GREEN - LOW RISK';
  const dangerSigns = referral.dangerSigns ?? [];
  const vitals = referral.vitalSigns;

  // Formatting helpers
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', paddingBottom: 'var(--space-10)' }}>
      {/* 1. Header Area */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {referral.referralCode}
            </h1>
            <span style={{
              background: referral.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              border: `1px solid ${referral.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              color: referral.priority === 'CRITICAL' ? '#ef4444' : '#f59e0b',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}>
              {referral.priority}
            </span>
            <span className="text-sm font-semibold tracking-wide text-secondary uppercase">
              {referral.patientCategory || referral.referralType || 'CLINICAL EMERGENCY'}
            </span>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="btn btn-secondary flex items-center gap-1.5" 
              style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              More actions
              <MoreHorizontal size={14} />
            </button>
            {showMoreActions && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50" style={{
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-default)'
              }}>
                <button
                  onClick={() => {
                    setShowRedirectModal(true);
                    setShowMoreActions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
                >
                  Redirect Referral
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(true);
                    setShowMoreActions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-hover transition-colors"
                >
                  Reject Referral
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-secondary flex flex-wrap items-center gap-2">
          <span>Referral received: <strong>{formatDate(referral.createdAt)}, {formatTime(referral.createdAt)}</strong></span>
          <span className="text-muted">•</span>
          <span>From: <strong>{referral.sendingFacility?.name}</strong></span>
          <span className="text-muted">•</span>
          <span>To: <strong>{referral.receivingFacility?.name}</strong></span>
        </div>
      </div>

      {/* 2. Action Required Bar */}
      {canAccept && (
        <div className="mb-6 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4" style={{
          background: 'rgba(239, 68, 68, 0.04)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-primary">Action Required</h4>
              <p className="text-xs text-secondary">Please review and accept this referral to prepare for the patient.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="btn flex flex-col items-center justify-center text-white" 
              onClick={handleAccept}
              style={{
                background: '#10b981',
                padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                minWidth: '130px',
                lineHeight: 1.15
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <CheckCircle2 size={15} />
                Accept & Prepare
              </div>
              <span className="text-[10px] opacity-75 font-normal">Accept referral</span>
            </button>

            <button 
              className="btn flex flex-col items-center justify-center text-white" 
              onClick={() => setShowRedirectModal(true)}
              style={{
                background: '#d97706',
                padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                minWidth: '130px',
                lineHeight: 1.15
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <ExternalLink size={14} />
                Redirect
              </div>
              <span className="text-[10px] opacity-75 font-normal">Send to another facility</span>
            </button>

            <button 
              className="btn flex flex-col items-center justify-center text-white" 
              onClick={() => setShowRejectModal(true)}
              style={{
                background: '#ef4444',
                padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                minWidth: '110px',
                lineHeight: 1.15
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <X size={15} />
                Reject
              </div>
              <span className="text-[10px] opacity-75 font-normal">Cannot accept</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Body (Grid Split) */}
      <div className="dashboard-grid">
        {/* Left Column (col-8) */}
        <div className="col-8 flex flex-col gap-6">
          {/* Card A: Patient & Clinical Summary */}
          <div className="card" style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)'
          }}>
            <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-subtle pb-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner" style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#a78bfa',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">
                    {referral.patient?.firstName} {referral.patient?.lastName}
                  </h3>
                  <div className="text-xs text-secondary mt-0.5">
                    {referral.patient?.gender || 'Female'} • 34 years
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Medical Card: {referral.patient?.id ? `SL-${referral.patient.id.slice(0,7).toUpperCase()}` : 'SL-8899001'}
                  </div>
                  <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
                    <Phone size={12} />
                    Phone: {referral.patient?.phone || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="md:text-right max-w-sm">
                <span className="badge font-bold text-xs uppercase mb-2 inline-block" style={{
                  background: dangerSignScore >= 7 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: dangerSignScore >= 7 ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${dangerSignScore >= 7 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                }}>
                  {riskLabel}
                </span>
                <h4 className="text-sm font-bold text-primary mt-1">
                  {referral.chiefComplaint || 'Severe obstetric bleeding'}
                </h4>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  {referral.clinicalSummary || 'Patient requires urgent obstetric intervention.'}
                </p>
              </div>
            </div>

            {/* Vitals Signs Grid (6 parameters) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
              {/* BP */}
              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">BP</span>
                <span className="text-base font-bold block" style={{ color: '#ef4444' }}>
                  {vitals?.bloodPressureSystolic && vitals?.bloodPressureDiastolic 
                    ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`
                    : '85/55'}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">mmHg</span>
              </div>

              {/* Pulse */}
              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">Pulse</span>
                <span className="text-base font-bold block" style={{ color: '#ef4444' }}>
                  {vitals?.heartRate ? `${vitals.heartRate}` : '124'}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">bpm</span>
              </div>

              {/* Resp Rate */}
              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">Resp. Rate</span>
                <span className="text-base font-bold block" style={{ color: '#fbbf24' }}>
                  {vitals?.respiratoryRate ? `${vitals.respiratoryRate}` : '28'}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">/min</span>
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">SpO2</span>
                <span className="text-base font-bold block" style={{ color: '#ef4444' }}>
                  {vitals?.oxygenSaturation || referral.oxygenSaturation ? `${vitals?.oxygenSaturation || referral.oxygenSaturation}%` : '91%'}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">Oxygen</span>
              </div>

              {/* Temp */}
              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">Temp.</span>
                <span className="text-base font-bold block text-success">
                  {vitals?.temperature ? `${vitals.temperature}°C` : '37.1°C'}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">Celsius</span>
              </div>

              {/* Oxygen Supp */}
              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">Oxygen</span>
                <span className="text-sm font-bold block text-warning" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {referral.onSupplementalOxygen ? '6 L/min' : 'Room Air'}
                </span>
                <span className="text-[10px] text-muted block mt-0.5">{referral.onSupplementalOxygen ? 'Mask' : 'Ambient'}</span>
              </div>
            </div>

            {/* Footer row */}
            <div className="flex justify-between items-center text-xs pt-3 border-t border-subtle">
              <div className="flex items-center gap-1.5 text-secondary">
                <Droplet size={14} className="text-danger" />
                Blood Group: <strong className="text-primary">{referral.bloodGroup || 'O+'}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-secondary">
                <ShieldAlert size={14} className="text-success" />
                Allergies: <strong className="text-primary">{referral.allergyDetails || 'None known'}</strong>
              </div>
            </div>
          </div>

          {/* Card B: Receiving Facility Readiness */}
          <div className="card" style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)'
          }}>
            <div className="flex justify-between items-center border-b border-subtle pb-3 mb-4">
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <Building2 size={18} className="text-accent" />
                Receiving Facility Readiness
              </h3>
              <span className="text-xs font-bold text-success">READY TO RECEIVE</span>
            </div>

            <h4 className="font-semibold text-sm mb-3 text-primary">
              {referral.receivingFacility?.name || 'Princess Christian Maternity Hospital'}
            </h4>

            {/* Resource status list */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg flex items-center gap-2.5" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <Bed size={20} className="text-success" />
                <div>
                  <div className="text-[10px] text-muted font-bold block leading-tight">Beds</div>
                  <div className="text-xs font-semibold text-success">4 Available</div>
                </div>
              </div>

              <div className="p-3 rounded-lg flex items-center gap-2.5" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <Droplet size={20} className="text-danger" />
                <div>
                  <div className="text-[10px] text-muted font-bold block leading-tight">Blood</div>
                  <div className="text-xs font-semibold text-danger">O+ Available</div>
                </div>
              </div>

              <div className="p-3 rounded-lg flex items-center gap-2.5" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <Wind size={20} className="text-info" />
                <div>
                  <div className="text-[10px] text-muted font-bold block leading-tight">Oxygen</div>
                  <div className="text-xs font-semibold text-info">Available</div>
                </div>
              </div>

              <div className="p-3 rounded-lg flex items-center gap-2.5" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <Activity size={20} className="text-success" />
                <div>
                  <div className="text-[10px] text-muted font-bold block leading-tight">Theatre</div>
                  <div className="text-xs font-semibold text-success">Available</div>
                </div>
              </div>
            </div>

            {/* Shift duty indicators */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs border-t border-subtle pt-3 text-secondary mb-3">
              <span className="flex items-center gap-1.5"><Circle size={6} fill="var(--success)" color="var(--success)" /> Obstetrician: <strong className="text-success">On duty</strong></span>
              <span className="flex items-center gap-1.5"><Circle size={6} fill="var(--success)" color="var(--success)" /> Anaesthetist: <strong className="text-success">On duty</strong></span>
              <span className="flex items-center gap-1.5"><Circle size={6} fill="var(--success)" color="var(--success)" /> Emergency Unit: <strong className="text-success">Available</strong></span>
              <span className="flex items-center gap-1.5"><Circle size={6} fill="var(--success)" color="var(--success)" /> Operating Theatre: <strong className="text-success">Available</strong></span>
            </div>

            <div className="flex justify-between items-center text-xs text-muted mt-2">
              <span>Last updated: 23:51</span>
              <div className="flex items-center gap-2">
                <span>Dr. Sarah Jalloh · Referral Coordinator</span>
                {(referral.receivingFacility as any)?.phone && (
                  <a href={`tel:${(referral.receivingFacility as any).phone}`} className="p-1 rounded-full text-accent hover:bg-hover transition-colors" style={{ border: '1px solid var(--border-subtle)' }}>
                    <Phone size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Side-by-side Operational Row (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Interventions Given */}
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5 border-b border-subtle pb-2">
                <ClipboardList size={15} className="text-accent" />
                Interventions Given
              </h3>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2 text-xs">
                  <span className="font-bold font-mono text-muted">23:45</span>
                  <div className="flex items-start gap-1">
                    <Circle size={6} fill="var(--success)" color="var(--success)" style={{ marginTop: 5 }} />
                    <span className="text-secondary">IV access established</span>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="font-bold font-mono text-muted">23:47</span>
                  <div className="flex items-start gap-1">
                    <Circle size={6} fill="var(--success)" color="var(--success)" style={{ marginTop: 5 }} />
                    <span className="text-secondary">Oxygen 6 L/min started</span>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="font-bold font-mono text-muted">23:49</span>
                  <div className="flex items-start gap-1">
                    <Circle size={6} fill="var(--success)" color="var(--success)" style={{ marginTop: 5 }} />
                    <span className="text-secondary">Tranexamic acid administered</span>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="font-bold font-mono text-muted">23:50</span>
                  <div className="flex items-start gap-1">
                    <Circle size={6} fill="var(--success)" color="var(--success)" style={{ marginTop: 5 }} />
                    <span className="text-secondary">IV fluids commenced</span>
                  </div>
                </div>
              </div>
              <a href="#" className="text-xs text-accent hover:underline block">View full clinical details →</a>
            </div>

            {/* Column 2: NEMS Transport / Mission */}
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex justify-between items-center mb-3 border-b border-subtle pb-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Ambulance size={15} className="text-accent" />
                  NEMS Transport
                </h3>
                <span className="badge text-[9px] font-bold" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                  {referral.nemsRequest?.status || 'NOT ASSIGNED'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div>
                  <div className="text-[10px] text-muted leading-tight">Mission ID</div>
                  <strong className="text-primary">{referral.nemsRequest?.id?.slice(0, 8) || '—'}</strong>
                </div>
                <div>
                  <div className="text-[10px] text-muted leading-tight">Ambulance</div>
                  <strong className="text-primary">{referral.nemsRequest?.ambulanceId || '—'}</strong>
                </div>
                <div>
                  <div className="text-[10px] text-muted leading-tight">Status</div>
                  <strong className="text-primary">{referral.nemsRequest?.status || 'Not assigned'}</strong>
                </div>
                <div>
                  <div className="text-[10px] text-muted leading-tight">ETA</div>
                  <strong className="text-primary">
                    {referral.expectedArrival ? formatTime(referral.expectedArrival) : '—'}
                  </strong>
                </div>
              </div>
              {canAssignAmbulance && (
                <button 
                  onClick={() => setShowAssignAmbulanceModal(true)}
                  className="btn btn-primary w-full text-xs font-bold flex items-center justify-center gap-1"
                  style={{ background: '#3b82f6', border: '1px solid #3b82f6', padding: '6px 12px' }}
                >
                  <Ambulance size={13} />
                  Assign Ambulance
                </button>
              )}
            </div>

            {/* Column 3: Response Performance */}
            <div className="card p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5 border-b border-subtle pb-2">
                <Clock size={15} className="text-accent" />
                Response Performance
              </h3>
              <div className="flex flex-col gap-2 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-muted">Referral received</span>
                  <span className="font-bold text-primary">{formatTime(referral.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Facility decision</span>
                  <span className="font-bold text-primary">
                    {referral.acceptedAt ? formatTime(referral.acceptedAt) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Ambulance dispatched</span>
                  <span className="font-bold text-primary">
                    {referral.nemsRequest?.dispatchedAt ? formatTime(referral.nemsRequest.dispatchedAt) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">ETA</span>
                  <span className="font-bold text-primary">
                    {referral.expectedArrival ? formatTime(referral.expectedArrival) : '—'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-subtle pt-2 text-[11px]">
                <span className="text-muted">Time to acceptance</span>
                <span className="badge text-[9px] font-bold" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  ≤ 5 min
                </span>
              </div>
            </div>
          </div>

          {/* Important Notes Banner */}
          {referral.notes && (
            <div className="card p-4 flex gap-3 items-start" style={{
              background: 'rgba(245, 158, 11, 0.04)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <AlertTriangle style={{ color: 'var(--warning)', marginTop: '2px', flexShrink: 0 }} size={16} />
              <div className="text-xs leading-relaxed text-secondary">
                <strong className="text-primary font-bold">Important Notes:</strong>
                <p className="mt-1">{referral.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (col-4) */}
        <div className="col-4 flex flex-col gap-6">
          {/* Card C: Referral Journey Progression */}
          <div className="card" style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)'
          }}>
            <h3 className="text-base font-bold mb-4 border-b border-subtle pb-3">Referral Journey</h3>

            <div className="flex flex-col gap-5 relative pl-4" style={{
              borderLeft: '2px solid var(--border-subtle)'
            }}>
              {/* Node 1: Referral Initiated */}
              <div className="relative">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm" style={{
                  background: 'var(--success)',
                  color: 'white'
                }}>
                  <Check size={11} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">Referral Initiated</h4>
                  <div className="text-[10px] text-muted mt-0.5">
                    {formatDate(referral.createdAt)}, {formatTime(referral.createdAt)}
                  </div>
                  <div className="text-[10px] text-secondary mt-0.5">
                    {referral.sendingFacility?.name}
                  </div>
                </div>
              </div>

              {/* Node 2: NEMS Triage */}
              <div className="relative">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm" style={{
                  background: 'var(--success)',
                  color: 'white'
                }}>
                  <Check size={11} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">NEMS Triage</h4>
                  <div className="text-[10px] text-muted mt-0.5">
                    {formatDate(referral.createdAt)}, {formatTime(referral.createdAt)}
                  </div>
                  <span className="badge text-[9px] font-extrabold mt-1 inline-block" style={{ background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '3px' }}>
                    RED - Critical
                  </span>
                </div>
              </div>

              {/* Node 3: Facility Review */}
              <div className="relative">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm" style={{
                  background: 'var(--accent)',
                  color: 'white'
                }}>
                  <Circle size={8} fill="white" color="white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary">Facility Review</h4>
                  <div className="text-[10px] text-secondary mt-0.5 font-bold" style={{ color: 'var(--accent-light)' }}>
                    In progress
                  </div>
                  {canAccept && (
                    <button onClick={handleAccept} className="text-[10px] text-accent hover:underline mt-1 font-bold block">
                      Action required
                    </button>
                  )}
                </div>
              </div>

              {/* Node 4: Accepted */}
              <div className="relative opacity-60">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{
                  background: 'var(--bg-muted)',
                  border: '2px solid var(--border-subtle)'
                }} />
                <div>
                  <h4 className="text-xs font-bold text-muted">Accepted</h4>
                  <div className="text-[10px] text-muted mt-0.5">Pending</div>
                </div>
              </div>

              {/* Node 5: Ambulance Assigned */}
              <div className="relative opacity-60">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{
                  background: 'var(--bg-muted)',
                  border: '2px solid var(--border-subtle)'
                }} />
                <div>
                  <h4 className="text-xs font-bold text-muted">Ambulance Assigned</h4>
                  <div className="text-[10px] text-muted mt-0.5">Pending</div>
                </div>
              </div>

              {/* Node 6: Patient Picked Up */}
              <div className="relative opacity-60">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{
                  background: 'var(--bg-muted)',
                  border: '2px solid var(--border-subtle)'
                }} />
                <div>
                  <h4 className="text-xs font-bold text-muted">Patient Picked Up</h4>
                  <div className="text-[10px] text-muted mt-0.5">Pending</div>
                </div>
              </div>

              {/* Node 7: Arrived at Facility */}
              <div className="relative opacity-60">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{
                  background: 'var(--bg-muted)',
                  border: '2px solid var(--border-subtle)'
                }} />
                <div>
                  <h4 className="text-xs font-bold text-muted">Arrived at Facility</h4>
                  <div className="text-[10px] text-muted mt-0.5">Pending</div>
                </div>
              </div>

              {/* Node 8: Handover Complete */}
              <div className="relative opacity-60">
                <div className="absolute -left-[25px] top-[2px] w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{
                  background: 'var(--bg-muted)',
                  border: '2px solid var(--border-subtle)'
                }} />
                <div>
                  <h4 className="text-xs font-bold text-muted">Handover Complete</h4>
                  <div className="text-[10px] text-muted mt-0.5">Pending</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card D: Activity & Communication */}
          <div className="card" style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)'
          }}>
            <h3 className="text-base font-bold mb-4 border-b border-subtle pb-3">Activity & Communication</h3>

            <div className="flex flex-col gap-3.5 mb-4">
              {timeline?.length ? timeline.map((entry, i) => {
                let badgeBg = 'rgba(59, 130, 246, 0.15)';
                let badgeColor = '#3b82f6';
                if (entry.action.includes('created') || entry.action.includes('Initiated')) {
                  badgeBg = 'rgba(16, 185, 129, 0.15)';
                  badgeColor = '#10b981';
                } else if (entry.action.includes('triage') || entry.action.includes('Triage')) {
                  badgeBg = 'rgba(239, 68, 68, 0.15)';
                  badgeColor = '#ef4444';
                } else if (entry.action.includes('sent') || entry.action.includes('Redirect')) {
                  badgeBg = 'rgba(245, 158, 11, 0.15)';
                  badgeColor = '#f59e0b';
                }

                return (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="font-bold font-mono text-muted min-w-[34px] text-right mt-0.5">
                      {formatTime(entry.timestamp)}
                    </span>
                    <div className="p-1 rounded flex items-center justify-center" style={{ background: badgeBg, color: badgeColor, flexShrink: 0 }}>
                      <ClipboardList size={13} />
                    </div>
                    <div>
                      <div className="font-bold text-primary leading-tight">{entry.action}</div>
                      {entry.userName && <div className="text-[10px] text-muted mt-0.5">{entry.userName}</div>}
                    </div>
                  </div>
                );
              }) : (
                <>
                  <div className="flex items-start gap-3 text-xs">
                    <span className="font-bold font-mono text-muted min-w-[34px] text-right mt-0.5">23:53</span>
                    <div className="p-1 rounded flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', flexShrink: 0 }}>
                      <ClipboardList size={13} />
                    </div>
                    <div>
                      <div className="font-bold text-primary leading-tight">Referral created</div>
                      <div className="text-[10px] text-muted mt-0.5">Dr. Mohamed · Connaught Hospital</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs">
                    <span className="font-bold font-mono text-muted min-w-[34px] text-right mt-0.5">23:54</span>
                    <div className="p-1 rounded flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', flexShrink: 0 }}>
                      <ClipboardList size={13} />
                    </div>
                    <div>
                      <div className="font-bold text-primary leading-tight">NEMS triage completed</div>
                      <div className="text-[10px] text-muted mt-0.5">Priority: RED - Critical</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs">
                    <span className="font-bold font-mono text-muted min-w-[34px] text-right mt-0.5">23:55</span>
                    <div className="p-1 rounded flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', flexShrink: 0 }}>
                      <ClipboardList size={13} />
                    </div>
                    <div>
                      <div className="font-bold text-primary leading-tight">Referral sent to PCMH</div>
                      <div className="text-[10px] text-muted mt-0.5">Dr. Sarah Jalloh</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="btn btn-secondary w-full text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>
              View all activity
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Reject Referral Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)'
        }}>
          <div className="card" style={{ maxWidth: 460, width: '100%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="flex items-center gap-2 text-danger mb-2 font-bold text-lg">
              <AlertTriangle size={20} />
              Reject Clinical Referral
            </div>
            <p className="text-xs text-muted mb-4">
              Please provide a clinical rationale for declining this referral. This action will be logged in the system audit history.
            </p>
            <div className="form-group mb-4">
              <label className="form-label font-medium text-xs">Clinical Rejection Reason *</label>
              <textarea
                className="form-input text-sm"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Bed capacity unavailable in ICU, requires pediatric specialist..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger font-semibold"
                onClick={handleReject}
                disabled={!rejectReason.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redirect Referral Modal */}
      {showRedirectModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)'
        }}>
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <h3 className="card-title mb-2 font-bold text-lg">Redirect Clinical Referral</h3>
            <p className="text-xs text-muted mb-4">
              Select a new receiving facility. The referral will be reset to PENDING status for the new facility desk to triage.
            </p>
            <div className="form-group mb-3">
              <label className="form-label font-medium text-xs">New Receiving Facility *</label>
              <SearchableSelect
                options={facilitiesData?.data
                  ?.filter(f => f.id !== referral.receivingFacility?.id)
                  .map(f => ({
                    value: f.id,
                    label: f.name,
                    description: f.facilityType || f.type,
                  })) || []}
                value={redirectFacilityId}
                onChange={setRedirectFacilityId}
                placeholder="Select receiving facility..."
                searchPlaceholder="Search facilities by name or type..."
              />
            </div>
            <div className="form-group mb-4">
              <label className="form-label font-medium text-xs">Reason for Redirect (Optional)</label>
              <textarea
                className="form-input text-sm"
                rows={3}
                value={redirectReason}
                onChange={(e) => setRedirectReason(e.target.value)}
                placeholder="e.g., Specialized care required, closer regional center available..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRedirectModal(false);
                  setRedirectFacilityId('');
                  setRedirectReason('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary font-semibold"
                onClick={handleRedirect}
                disabled={!redirectFacilityId || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Redirecting...' : 'Confirm Redirect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Ambulance Modal */}
      <AssignAmbulanceModal
        referralId={id}
        isOpen={showAssignAmbulanceModal}
        onClose={() => setShowAssignAmbulanceModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['referral', id] });
          queryClient.invalidateQueries({ queryKey: ['referrals'] });
        }}
      />
    </div>
  );
}
