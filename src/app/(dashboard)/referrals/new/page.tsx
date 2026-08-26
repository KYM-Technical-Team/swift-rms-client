'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { referralService, patientService, facilityService } from '@/lib/api';
import { Priority, ReferralPreparationResponse, ReferralType, VitalSigns } from '@/types';
import { useAuthStore } from '@/store';
import { 
  ArrowLeft, 
  User, 
  Building2, 
  FileText, 
  AlertTriangle, 
  Activity,
  Send,
  Check,
  X,
  Search
} from 'lucide-react';

const referralSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  receivingFacilityId: z.string().min(1, 'Receiving facility is required'),
  referralType: z.string().min(1, 'Referral type is required'),
  priority: z.string().min(1, 'Priority is required'),
  patientCategory: z.string().optional(),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  clinicalSummary: z.string().min(1, 'Clinical summary is required'),
  bloodPressureSystolic: z.number().optional(),
  bloodPressureDiastolic: z.number().optional(),
  heartRate: z.number().optional(),
  temperature: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  transportMethod: z.string().optional(),
  bloodDonorAccompanying: z.boolean().optional(),
  relativeAccompanying: z.boolean().optional(),
});

type ReferralFormData = z.infer<typeof referralSchema>;

const dangerSignOptions = [
  'Severe bleeding',
  'Unconscious/reduced consciousness',
  'Convulsions',
  'Severe respiratory distress',
  'Shock symptoms',
  'Severe dehydration',
  'Fever > 39°C',
  'Severe headache with neck stiffness',
  'Unable to drink/eat',
  'Severe abdominal pain',
];

const referralTypes: ReferralType[] = [
  'EMERGENCY', 'URGENT', 'ROUTINE', 'SPECIALIST_CONSULTATION'
];

const priorities = [
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
];

const patientCategories = [
  'PREGNANT', 'CHILD', 'ADULT', 'ELDERLY', 'NEWBORN'
];

export default function NewReferralPage() {
  const router = useRouter();
  const [patientSearch, setPatientSearch] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');
  const [selectedDangerSigns, setSelectedDangerSigns] = useState<string[]>([]);
  const [preparation, setPreparation] = useState<ReferralPreparationResponse | null>(null);
  const [readinessConfirmed, setReadinessConfirmed] = useState(false);

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<ReferralFormData>({
    resolver: zodResolver(referralSchema),
    defaultValues: { bloodDonorAccompanying: false, relativeAccompanying: false },
  });

  const clearPreparation = () => {
    setPreparation(null);
    setReadinessConfirmed(false);
  };

  const selectedPatientId = useWatch({ control, name: 'patientId' });
  const selectedFacilityId = useWatch({ control, name: 'receivingFacilityId' });
  const selectedTransportMethod = useWatch({ control, name: 'transportMethod' });
  const referralTypeField = register('referralType', { onChange: clearPreparation });
  const priorityField = register('priority', { onChange: clearPreparation });
  const chiefComplaintField = register('chiefComplaint', { onChange: clearPreparation });
  const systolicField = register('bloodPressureSystolic', { valueAsNumber: true, onChange: clearPreparation });
  const diastolicField = register('bloodPressureDiastolic', { valueAsNumber: true, onChange: clearPreparation });
  const heartRateField = register('heartRate', { valueAsNumber: true, onChange: clearPreparation });
  const temperatureField = register('temperature', { valueAsNumber: true, onChange: clearPreparation });
  const oxygenSaturationField = register('oxygenSaturation', { valueAsNumber: true, onChange: clearPreparation });
  const patientCategoryField = register('patientCategory');
  const transportMethodField = register('transportMethod');

  const { data: patients } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => patientService.search({ q: patientSearch }),
    enabled: patientSearch.length >= 2,
  });

  const { data: facilities } = useQuery({
    queryKey: ['facilities', 'search', facilitySearch],
    queryFn: () => facilityService.search(facilitySearch),
    enabled: facilitySearch.length >= 2,
  });

  const { data: selectedPatient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => patientService.get(selectedPatientId),
    enabled: !!selectedPatientId,
  });

  const { data: selectedFacility } = useQuery({
    queryKey: ['facility', selectedFacilityId],
    queryFn: () => facilityService.get(selectedFacilityId),
    enabled: !!selectedFacilityId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ReferralFormData) => {
      const user = useAuthStore.getState().user;

      if (!user) {
        throw new Error('User not logged in');
      }

      if (!user.facility?.id) {
        throw new Error('User facility not found. Please contact your administrator.');
      }

      const vitalSigns = sanitizeVitalSigns({
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        heartRate: data.heartRate,
        temperature: data.temperature,
        oxygenSaturation: data.oxygenSaturation,
      });

      const prepared = await referralService.prepare({
        receivingFacilityId: data.receivingFacilityId,
        referralType: data.referralType as ReferralType,
        priority: data.priority as Priority,
        chiefComplaint: data.chiefComplaint,
        vitalSigns,
        dangerSigns: selectedDangerSigns,
        nemsRequired: data.transportMethod === 'AMBULANCE',
      });

      setPreparation(prepared);

      const requiresConfirmation = !prepared.suitable || prepared.requiredConfirmations.length > 0 || prepared.warnings.length > 0;
      if (requiresConfirmation && !readinessConfirmed) {
        throw new Error('Review the readiness and triage guidance, then confirm before submitting.');
      }

      const colourCode = prepared.recommendedColourCode;
      const nemsRequired = colourCode === 'RED' || colourCode === 'YELLOW' || data.transportMethod === 'AMBULANCE';

      return referralService.create({
        patientId: data.patientId,
        sendingFacilityId: user.facility.id,
        receivingFacilityId: data.receivingFacilityId,
        referralType: data.referralType as ReferralType,
        priority: prepared.recommendedPriority,
        colourCode,
        chiefComplaint: data.chiefComplaint,
        clinicalSummary: data.clinicalSummary || '',
        vitalSigns,
        dangerSigns: selectedDangerSigns,
        patientCategory: data.patientCategory,
        transportMethod: nemsRequired ? 'NEMS_AMBULANCE' : data.transportMethod,
        nemsRequired,
        bloodDonorAccompanying: data.bloodDonorAccompanying,
        relativeAccompanying: data.relativeAccompanying,
      });
    },
    onSuccess: (response) => router.push(`/referrals/${response.id}`),
  });

  const toggleDangerSign = (sign: string) => {
    setSelectedDangerSigns(prev => 
      prev.includes(sign) ? prev.filter(s => s !== sign) : [...prev, sign]
    );
  };

  return (
    <>
      <div className="mb-4">
        <Link href="/referrals" className="flex items-center gap-1 text-sm text-muted">
          <ArrowLeft size={14} />
          Back to Referrals
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">New Referral</h1>
          <p className="page-subtitle">Create a new patient referral</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
        <div className="dashboard-grid">
          {/* Patient */}
          <div className="col-6">
            <div className="card">
              <h3 className="card-title mb-4">
                <User size={16} />
                Patient
              </h3>
              
              {selectedPatient ? (
                <div style={{ 
                  padding: 'var(--space-4)', 
                  background: 'var(--accent)', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                    <div className="text-xs text-muted">{selectedPatient.gender} | {selectedPatient.phone || 'No phone'}</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setValue('patientId', '')}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ margin: 0 }}>
                  <div className="search-box mb-3">
                    <Search size={16} className="search-box-icon" />
                    <input
                      type="text"
                      className="search-box-input"
                      placeholder="Search by name or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                  </div>
                  {patients?.length ? (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: 200, overflow: 'auto' }}>
                      {patients.map((p) => (
                        <div
                          key={p.id}
                          style={{ padding: 'var(--space-3)', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background var(--duration-fast)' }}
                          className="hover-bg"
                          onClick={() => { setValue('patientId', p.id); setPatientSearch(''); }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className="font-medium text-sm">{p.firstName} {p.lastName}</div>
                          <div className="text-xs text-muted">{p.phone || 'No phone'}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {errors.patientId && <span className="form-error">{errors.patientId.message}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Facility */}
          <div className="col-6">
            <div className="card">
              <h3 className="card-title mb-4">
                <Building2 size={16} />
                Receiving Facility
              </h3>
              
              {selectedFacility ? (
                <div style={{ 
                  padding: 'var(--space-4)', 
                  background: 'var(--accent)', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div className="font-medium">{selectedFacility.name}</div>
                    <div className="text-xs text-muted">{selectedFacility.type} | {selectedFacility.district?.name}</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setValue('receivingFacilityId', ''); clearPreparation(); }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ margin: 0 }}>
                  <div className="search-box mb-3">
                    <Search size={16} className="search-box-icon" />
                    <input
                      type="text"
                      className="search-box-input"
                      placeholder="Search facilities..."
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                    />
                  </div>
                  {facilities?.length ? (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: 200, overflow: 'auto' }}>
                      {facilities.map((f) => (
                        <div
                          key={f.id}
                          style={{ padding: 'var(--space-3)', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background var(--duration-fast)' }}
                          onClick={() => { setValue('receivingFacilityId', f.id); setFacilitySearch(''); clearPreparation(); }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className="font-medium text-sm">{f.name}</div>
                          <div className="text-xs text-muted">{f.type}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {errors.receivingFacilityId && <span className="form-error">{errors.receivingFacilityId.message}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Clinical Info */}
          <div className="col-12">
            <div className="card">
              <h3 className="card-title mb-4">
                <FileText size={16} />
                Clinical Information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Referral Type *</label>
                  <select className={`form-input ${errors.referralType ? 'error' : ''}`} {...referralTypeField}>
                    <option value="">Select type...</option>
                    {referralTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.referralType && <span className="form-error">{errors.referralType.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Priority *</label>
                  <select className={`form-input ${errors.priority ? 'error' : ''}`} {...priorityField}>
                    <option value="">Select priority...</option>
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.priority && <span className="form-error">{errors.priority.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Patient Category</label>
                <select className="form-input" {...patientCategoryField} onChange={(event) => { patientCategoryField.onChange(event); clearPreparation(); }}>
                  <option value="">Select category...</option>
                  {patientCategories.map(category => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transport Method</label>
                <select className="form-input" {...transportMethodField} onChange={(event) => { transportMethodField.onChange(event); clearPreparation(); }}>
                  <option value="">Select...</option>
                  <option value="AMBULANCE">Ambulance / NEMS required</option>
                  <option value="PRIVATE">Private Vehicle</option>
                  <option value="PUBLIC">Public Transport</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chief Complaint *</label>
                <input
                  type="text"
                  className={`form-input ${errors.chiefComplaint ? 'error' : ''}`}
                  placeholder="Main reason for referral"
                  {...chiefComplaintField}
                />
                {errors.chiefComplaint && <span className="form-error">{errors.chiefComplaint.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Summary *</label>
                <textarea
                  className={`form-input ${errors.clinicalSummary ? 'error' : ''}`}
                  rows={3}
                  placeholder="Additional clinical details..."
                  {...register('clinicalSummary')}
                />
                {errors.clinicalSummary && <span className="form-error">{errors.clinicalSummary.message}</span>}
              </div>
            </div>
          </div>

          {/* Danger Signs */}
          <div className="col-6">
            <div className="card">
              <h3 className="card-title mb-4">
                <AlertTriangle size={16} />
                Danger Signs
              </h3>
              <div className="flex flex-col gap-2">
                {dangerSignOptions.map((sign) => (
                  <label key={sign} className="flex items-center gap-2 text-sm" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedDangerSigns.includes(sign)}
                      onChange={() => { toggleDangerSign(sign); clearPreparation(); }}
                      style={{ width: 16, height: 16 }}
                    />
                    {sign}
                  </label>
                ))}
              </div>
              {selectedDangerSigns.length > 0 && (
                <div style={{ 
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--warning-light)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)'
                }}>
                  {selectedDangerSigns.length} danger sign(s) selected
                </div>
              )}
            </div>
          </div>

          {/* Vital Signs */}
          <div className="col-6">
            <div className="card">
              <h3 className="card-title mb-4">
                <Activity size={16} />
                Vital Signs
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">BP Systolic</label>
                  <input type="number" className="form-input" placeholder="mmHg" {...systolicField} />
                </div>
                <div className="form-group">
                  <label className="form-label">BP Diastolic</label>
                  <input type="number" className="form-input" placeholder="mmHg" {...diastolicField} />
                </div>
                <div className="form-group">
                  <label className="form-label">Heart Rate</label>
                  <input type="number" className="form-input" placeholder="bpm" {...heartRateField} />
                </div>
                <div className="form-group">
                  <label className="form-label">Temperature</label>
                  <input type="number" step="0.1" className="form-input" placeholder="°C" {...temperatureField} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Oxygen Saturation</label>
                  <input type="number" className="form-input" placeholder="%" {...oxygenSaturationField} />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <label className="flex items-center gap-2 text-sm" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" {...register('bloodDonorAccompanying')} style={{ width: 16, height: 16 }} />
                  Blood donor accompanying
                </label>
                <label className="flex items-center gap-2 text-sm" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" {...register('relativeAccompanying')} style={{ width: 16, height: 16 }} />
                  Relative accompanying
                </label>
              </div>
            </div>
          </div>
        </div>

        {preparation && (
          <div className="card mt-6" style={{
            borderColor: preparation.suitable ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 158, 11, 0.45)',
            background: preparation.suitable ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.1)'
          }}>
            <h3 className="card-title mb-3">
              {preparation.suitable ? <Check size={16} /> : <AlertTriangle size={16} />}
              Pre-arrival triage and readiness check
            </h3>
            <div className="dashboard-grid" style={{ gap: 'var(--space-3)' }}>
              <div className="col-4">
                <div className="text-xs text-muted">Recommended colour</div>
                <strong>{preparation.recommendedColourCode}</strong>
              </div>
              <div className="col-4">
                <div className="text-xs text-muted">Recommended priority</div>
                <strong>{preparation.recommendedPriority}</strong>
              </div>
              <div className="col-4">
                <div className="text-xs text-muted">NEMS requirement</div>
                <strong>{preparation.recommendedColourCode === 'RED' || preparation.recommendedColourCode === 'YELLOW' || selectedTransportMethod === 'AMBULANCE' ? 'Required' : 'Not required'}</strong>
              </div>
            </div>
            {preparation.readinessAgeHours !== undefined && (
              <p className="text-xs text-muted mt-3">
                Latest readiness report: {preparation.readinessAgeHours} hour(s) old
              </p>
            )}
            {[...preparation.warnings, ...preparation.requiredConfirmations].length > 0 && (
              <ul className="mt-3" style={{ paddingLeft: 18 }}>
                {[...preparation.warnings, ...preparation.requiredConfirmations].map((item) => (
                  <li key={item} className="text-sm text-secondary">{item}</li>
                ))}
              </ul>
            )}
            {(!preparation.suitable || preparation.requiredConfirmations.length > 0 || preparation.warnings.length > 0) && (
              <label className="flex items-center gap-2 text-sm mt-4" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={readinessConfirmed}
                  onChange={(event) => setReadinessConfirmed(event.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                I have reviewed the readiness warning and confirmed the receiving facility by phone or operational protocol.
              </label>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <Link href="/referrals" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                {preparation ? 'Creating...' : 'Checking...'}
              </>
            ) : (
              <>
                <Send size={16} />
                {preparation && (!preparation.suitable || preparation.requiredConfirmations.length > 0 || preparation.warnings.length > 0)
                  ? 'Confirm & Create Referral'
                  : 'Create Referral'}
              </>
            )}
          </button>
        </div>

        {createMutation.isError && (
          <div className="auth-error mt-4">
            {createMutation.error instanceof Error 
              ? createMutation.error.message 
              : 'Failed to create referral. Please try again.'}
          </div>
        )}
      </form>
    </>
  );
}

function sanitizeVitalSigns(vitals: {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
}): VitalSigns | undefined {
  const cleaned: VitalSigns = {};
  for (const [key, value] of Object.entries(vitals)) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      cleaned[key as keyof VitalSigns] = value;
    }
  }
  return Object.keys(cleaned).length ? cleaned : undefined;
}
