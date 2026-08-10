'use client';

import { useState, useEffect } from 'react';
import { X, Ambulance as AmbulanceIcon, Phone, User, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ambulanceService } from '@/lib/api';
import type { Ambulance } from '@/lib/api/ambulances';
import { referralService } from '@/lib/api/referrals';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { AssignAmbulanceRequest, ApiError } from '@/types';

interface AssignAmbulanceModalProps {
  referralId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignAmbulanceModal({ 
  referralId, 
  isOpen, 
  onClose, 
  onSuccess 
}: AssignAmbulanceModalProps) {
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('');
  const [crewLeadName, setCrewLeadName] = useState('');
  const [crewLeadPhone, setCrewLeadPhone] = useState('');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available ambulances
  const { data: ambulancesData, isLoading: isLoadingAmbulances } = useQuery({
    queryKey: ['ambulances', 'available'],
    queryFn: () => ambulanceService.list({ status: 'AVAILABLE', limit: 100 }),
    enabled: isOpen,
  });

  const availableAmbulances = ambulancesData?.data?.filter(
    (amb: Ambulance) => amb.status === 'AVAILABLE'
  ) || [];
  const selectedAmbulance = availableAmbulances.find((amb) => amb.id === selectedAmbulanceId);
  const crewMembers = selectedAmbulance?.crew || [];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAmbulanceId('');
      setCrewLeadName('');
      setCrewLeadPhone('');
      setEstimatedArrivalDate('');
      setEstimatedArrivalTime('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setCrewLeadName('');
    setCrewLeadPhone('');
  }, [selectedAmbulanceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAmbulanceId) {
      setError('Please select an ambulance');
      return;
    }

    if (crewMembers.length > 0 && !crewLeadName) {
      setError('Please select a crew lead from the assigned ambulance crew.');
      return;
    }

    if (estimatedArrivalDate || estimatedArrivalTime) {
      if (!estimatedArrivalDate || !estimatedArrivalTime) {
        setError('Please select both date and time for the estimated arrival.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const estimatedArrival = estimatedArrivalDate && estimatedArrivalTime
        ? `${estimatedArrivalDate}T${estimatedArrivalTime}`
        : undefined;
      const requestData: AssignAmbulanceRequest = {
        ambulanceId: selectedAmbulanceId,
        crewLeadName: crewLeadName || undefined,
        crewLeadPhone: crewLeadPhone || undefined,
        estimatedArrival,
        notes: notes || undefined,
      };

      await referralService.assignAmbulance(referralId, requestData);
      onSuccess();
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to assign ambulance');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assign-ambulance-title">
      <div className="modal" style={{ width: '100%', maxWidth: 760 }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--accent-subtle)',
                color: 'var(--accent)'
              }}
            >
              <AmbulanceIcon size={18} />
            </div>
            <div>
              <h2 id="assign-ambulance-title" className="modal-title">Assign Ambulance</h2>
              <p className="text-sm text-muted">Assign an available ambulance to this pending referral.</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div
              className="flex items-center gap-2 p-4 mb-4"
              style={{
                background: 'var(--danger-subtle)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)'
              }}
            >
              <AlertCircle className="flex-shrink-0" size={16} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Select Available Ambulance <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            {isLoadingAmbulances ? (
              <div className="flex items-center gap-2 p-4" style={{
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)'
              }}>
                <div className="spinner" />
                <span className="text-sm text-muted">Loading ambulances...</span>
              </div>
            ) : availableAmbulances.length === 0 ? (
              <div
                className="p-4"
                style={{
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--warning-subtle)',
                  color: 'var(--warning)'
                }}
              >
                <p className="text-sm">
                  No available ambulances found. All ambulances are currently on mission or unavailable.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-3)', maxHeight: 260, overflow: 'auto' }}>
                {availableAmbulances.map((ambulance: Ambulance) => (
                  <label
                    key={ambulance.id}
                    className="card"
                    style={{
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      borderColor: selectedAmbulanceId === ambulance.id ? 'var(--accent)' : 'var(--border-default)',
                      background: selectedAmbulanceId === ambulance.id ? 'var(--accent-subtle)' : 'var(--bg-surface)'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="ambulance"
                        value={ambulance.id}
                        checked={selectedAmbulanceId === ambulance.id}
                        onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <AmbulanceIcon size={16} style={{ color: 'var(--text-tertiary)' }} />
                          <span className="font-medium">{ambulance.ambulanceId}</span>
                          <span
                            className="text-xs"
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: 'var(--success-subtle)',
                              color: 'var(--success)'
                            }}
                          >
                            Available
                          </span>
                        </div>
                        {ambulance.facility && (
                          <p className="text-xs text-muted mt-1">
                            Based at: {ambulance.facility.name}
                          </p>
                        )}
                        {ambulance.equipment && ambulance.equipment.length > 0 && (
                          <p className="text-xs text-muted mt-1">
                            Equipment: {ambulance.equipment.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label className="form-label">
                <span className="flex items-center gap-2">
                  <User size={14} />
                  Crew Lead Name
                </span>
              </label>
              {crewMembers.length > 0 ? (
                <select
                  value={crewLeadName}
                  onChange={(e) => setCrewLeadName(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">Select crew lead...</option>
                  {crewMembers.map((member) => (
                    <option key={member.id} value={`${member.firstName} ${member.lastName}`}>{member.firstName} {member.lastName}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-muted" style={{ padding: '10px 0' }}>
                  No crew members assigned to this ambulance.
                </div>
              )}
            </div>
            <div>
              <label className="form-label">
                <span className="flex items-center gap-2">
                  <Phone size={14} />
                  Crew Lead Phone
                </span>
              </label>
              <input
                type="tel"
                value={crewLeadPhone}
                onChange={(e) => setCrewLeadPhone(e.target.value)}
                placeholder="Enter phone number"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="flex items-center gap-2">
                <Clock size={14} />
                Estimated Arrival at Pickup
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <input
                type="date"
                value={estimatedArrivalDate}
                onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                className="form-input"
              />
              <input
                type="time"
                value={estimatedArrivalTime}
                onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                className="form-input"
                step={60}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              Optional: Estimated time when ambulance will arrive at pickup location.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the ambulance crew..."
              rows={3}
              className="form-input"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText="Assigning..."
              variant="primary"
              disabled={!selectedAmbulanceId || availableAmbulances.length === 0}
            >
              Assign Ambulance
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
