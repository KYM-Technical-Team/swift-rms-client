import React from 'react';
import { Building2, ArrowRight, Ambulance, UserCheck, ShieldAlert, HeartHandshake, PhoneCall } from 'lucide-react';
import { Referral } from '@/types/referral';

interface FacilityTransferVisualizerProps {
  referral: Referral;
}

export function FacilityTransferVisualizer({ referral }: FacilityTransferVisualizerProps) {
  const { sendingFacility, receivingFacility, transportMethod, nemsRequest, bloodDonorAccompanying, relativeAccompanying, onSupplementalOxygen } = referral;

  const isAmbulanceAssigned = !!nemsRequest?.ambulanceId || referral.status === 'IN_TRANSIT';

  return (
    <div className="card mb-6" style={{
      background: 'linear-gradient(135deg, rgba(26, 26, 29, 0.95) 0%, rgba(20, 20, 22, 0.95) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div className="flex items-center justify-between mb-4 border-b border-subtle pb-3">
        <h3 className="text-xs font-semibold text-muted tracking-wider uppercase flex items-center gap-2">
          <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
          Inter-Facility Clinical Transfer Route
        </h3>
        {transportMethod && (
          <span className="badge badge-info flex items-center gap-1.5 text-xs font-medium">
            <Ambulance size={13} />
            Transport: {transportMethod.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        {/* Origin Facility */}
        <div className="md:col-span-4 p-4 rounded-xl" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-light)' }}>
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-xs text-muted block font-medium">Referring (Origin)</span>
              <h4 className="font-semibold text-base text-primary leading-snug">
                {sendingFacility?.name || 'Referring Facility'}
              </h4>
            </div>
          </div>
          
          <div className="mt-3 pt-2 border-t border-subtle flex items-center justify-between text-xs text-secondary">
            <span>Type: <strong className="text-primary">{(sendingFacility as any)?.facilityType || sendingFacility?.type || 'Hospital'}</strong></span>
            {referral.createdBy && (
              <span className="flex items-center gap-1 text-muted">
                <UserCheck size={12} />
                {referral.createdBy.firstName} {referral.createdBy.lastName}
              </span>
            )}
          </div>
        </div>

        {/* Pathway Direction / Transport Status */}
        <div className="md:col-span-3 flex flex-col items-center justify-center py-2 px-1">
          <div className="w-full flex items-center justify-center gap-2 my-1">
            <div className="h-[2px] flex-1" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.2), var(--accent))' }} />
            <div className="p-2.5 rounded-full flex items-center justify-center shadow-lg" style={{
              background: isAmbulanceAssigned ? 'var(--accent)' : 'var(--bg-elevated)',
              border: `2px solid ${isAmbulanceAssigned ? 'var(--accent-light)' : 'var(--border-default)'}`,
              color: isAmbulanceAssigned ? '#fff' : 'var(--text-secondary)'
            }}>
              <Ambulance size={20} className={referral.status === 'IN_TRANSIT' ? 'animate-pulse' : ''} />
            </div>
            <div className="h-[2px] flex-1" style={{ background: 'linear-gradient(to right, var(--accent), rgba(16,185,129,0.5))' }} />
          </div>

          <div className="text-center mt-1">
            <span className="text-xs font-semibold" style={{
              color: referral.status === 'IN_TRANSIT' ? 'var(--warning)' : referral.status === 'ARRIVED' ? 'var(--success)' : 'var(--accent-light)'
            }}>
              {referral.status === 'IN_TRANSIT' ? 'EN ROUTE TO FACILITY' : referral.status === 'ARRIVED' ? 'PATIENT ARRIVED' : 'TRANSFER PENDING'}
            </span>
            {nemsRequest?.estimatedArrival && (
              <div className="text-[11px] text-muted mt-0.5">
                ETA: {new Date(nemsRequest.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* Destination Facility */}
        <div className="md:col-span-4 p-4 rounded-xl" style={{
          background: 'rgba(16, 185, 129, 0.04)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-xs text-muted block font-medium">Receiving (Destination)</span>
              <h4 className="font-semibold text-base text-primary leading-snug">
                {receivingFacility?.name || 'Receiving Facility'}
              </h4>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-subtle flex items-center justify-between text-xs text-secondary">
            <span>Type: <strong className="text-primary">{(receivingFacility as any)?.facilityType || receivingFacility?.type || 'Referral Center'}</strong></span>
            {(receivingFacility as any)?.phone && (
              <a href={`tel:${(receivingFacility as any).phone}`} className="flex items-center gap-1 text-accent hover:underline">
                <PhoneCall size={12} />
                Call Desk
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Logistics & Clinical Escort Requirements Ribbon */}
      <div className="mt-4 pt-3 border-t border-subtle flex flex-wrap gap-2 items-center text-xs">
        <span className="text-muted font-medium mr-1">Logistics & Escort Requirements:</span>
        
        {onSupplementalOxygen ? (
          <span className="badge badge-warning flex items-center gap-1">
            <ShieldAlert size={12} />
            Supplemental Oxygen Active
          </span>
        ) : (
          <span className="badge badge-secondary opacity-75">Room Air</span>
        )}

        {bloodDonorAccompanying && (
          <span className="badge badge-danger flex items-center gap-1">
            <HeartHandshake size={12} />
            Blood Donor Accompanying
          </span>
        )}

        {relativeAccompanying && (
          <span className="badge badge-info flex items-center gap-1">
            <UserCheck size={12} />
            Relative Accompanying
          </span>
        )}

        {referral.telephoneArrangement && (
          <span className="badge badge-success flex items-center gap-1">
            <PhoneCall size={12} />
            Phone Arrangement Confirmed
          </span>
        )}
      </div>
    </div>
  );
}
