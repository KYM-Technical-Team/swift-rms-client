'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ambulanceService, facilityService, userService } from '@/lib/api';
import type { Ambulance, CreateAmbulanceRequest, UpdateAmbulanceRequest, AmbulanceStatus } from '@/lib/api/ambulances';
import { 
  Ambulance as AmbulanceIcon, 
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Navigation,
  Plus,
  X,
  Wrench,
  AlertOctagon,
  Search,
  Settings,
  Users,
  List,
  Map,
  Pencil
} from 'lucide-react';
import dynamic from 'next/dynamic';

const AmbulanceMap = dynamic(() => import('@/components/AmbulanceMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  ),
});

const ambulanceSchema = z.object({
  ambulanceId: z.string().min(1, 'Ambulance ID is required').max(50),
  facilityId: z.string().optional(),
  status: z.enum(['AVAILABLE', 'ON_MISSION', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(),
  phone: z.string().optional(),
  equipment: z.string().optional(),
});

type AmbulanceFormData = z.infer<typeof ambulanceSchema>;

const editAmbulanceSchema = z.object({
  facilityId: z.string().optional(),
  status: z.enum(['AVAILABLE', 'ON_MISSION', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional(),
  phone: z.string().optional(),
  equipment: z.string().optional(),
});

type EditAmbulanceFormData = z.infer<typeof editAmbulanceSchema>;

interface CrewCandidate {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  ambulanceId?: string | null;
  facility?: {
    id: string;
    name: string;
  };
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode; label: string }> = {
    AVAILABLE: { 
      bg: 'rgba(34, 197, 94, 0.15)', 
      color: '#4ade80', 
      border: 'rgba(34, 197, 94, 0.3)',
      icon: <CheckCircle2 size={12} />,
      label: 'Available'
    },
    ON_MISSION: { 
      bg: 'rgba(59, 130, 246, 0.15)', 
      color: '#60a5fa', 
      border: 'rgba(59, 130, 246, 0.3)',
      icon: <Navigation size={12} />,
      label: 'On Mission'
    },
    MAINTENANCE: { 
      bg: 'rgba(234, 179, 8, 0.15)', 
      color: '#fbbf24', 
      border: 'rgba(234, 179, 8, 0.3)',
      icon: <Wrench size={12} />,
      label: 'Maintenance'
    },
    OUT_OF_SERVICE: { 
      bg: 'rgba(239, 68, 68, 0.15)', 
      color: '#f87171', 
      border: 'rgba(239, 68, 68, 0.3)',
      icon: <AlertOctagon size={12} />,
      label: 'Out of Service'
    },
  };
  const c = config[status] || config.OUT_OF_SERVICE;
  return (
    <span style={{ 
      padding: '4px 10px', 
      background: c.bg, 
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-full)',
      fontSize: '11px',
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px'
    }}>
      {c.icon}
      {c.label}
    </span>
  );
}

export default function AmbulancesPage() {
  const [selected, setSelected] = useState<Ambulance | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const [editCrewIds, setEditCrewIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch ambulances
  const { data: ambulancesData, isLoading: ambulancesLoading } = useQuery({
    queryKey: ['ambulances'],
    queryFn: () => ambulanceService.list({ limit: 100 }),
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ambulance-stats'],
    queryFn: () => ambulanceService.getStats(),
  });

  // Fetch facilities for dropdown
  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities-dropdown'],
    queryFn: () => facilityService.list({ limit: 500 }),
  });

  const { data: crewData, isLoading: crewLoading } = useQuery({
    queryKey: ['crew', 'unassigned'],
    queryFn: () => userService.list({ userType: 'AMBULANCE_CREW', limit: 500, status: 'ACTIVE' }),
    enabled: showModal || showEditModal,
  });

  const ambulances = ambulancesData?.data || [];
  const facilities = facilitiesData?.data || [];
  const crewCandidates = (crewData?.data || []) as CrewCandidate[];
  const availableCrew = crewCandidates.filter((member) => !member.ambulanceId);

  const filteredAmbulances = useMemo(() => {
    return ambulances.filter((amb: Ambulance) => {
      if (statusFilter && amb.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return amb.ambulanceId.toLowerCase().includes(s) ||
               amb.facility?.name?.toLowerCase().includes(s) ||
               amb.phone?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [ambulances, statusFilter, search]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AmbulanceFormData>({
    resolver: zodResolver(ambulanceSchema),
    defaultValues: {
      status: 'AVAILABLE',
    }
  });

  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } = useForm<EditAmbulanceFormData>({
    resolver: zodResolver(editAmbulanceSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAmbulanceRequest) => ambulanceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambulances'] });
      queryClient.invalidateQueries({ queryKey: ['ambulance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['crew', 'unassigned'] });
      setShowModal(false);
      reset();
      setSelectedCrewIds([]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAmbulanceRequest }) => ambulanceService.update(id, data),
    onSuccess: (updatedAmbulance) => {
      queryClient.invalidateQueries({ queryKey: ['ambulances'] });
      queryClient.invalidateQueries({ queryKey: ['ambulance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['crew', 'unassigned'] });
      setSelected(updatedAmbulance);
      setShowEditModal(false);
      resetEdit();
      setEditCrewIds([]);
    },
  });

  const onSubmit = (data: AmbulanceFormData) => {
    const request: CreateAmbulanceRequest = {
      ambulanceId: data.ambulanceId,
      facilityId: data.facilityId || undefined,
      status: data.status as AmbulanceStatus,
      phone: data.phone || undefined,
      equipment: data.equipment ? data.equipment.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      crewMemberIds: selectedCrewIds.length > 0 ? selectedCrewIds : undefined,
    };
    createMutation.mutate(request);
  };

  const handleEdit = (ambulance: Ambulance) => {
    resetEdit({
      facilityId: ambulance.facility?.id || '',
      status: ambulance.status,
      phone: ambulance.phone || '',
      equipment: ambulance.equipment?.join(', ') || '',
    });
    setEditCrewIds([]);
    setShowEditModal(true);
  };

  const onEditSubmit = (data: EditAmbulanceFormData) => {
    if (!selected) return;

    // Build crew member IDs: keep existing crew IDs and add newly selected ones
    const existingCrewIds = (selected.crew || []).map(c => c.id);
    const combinedCrewIds = [...existingCrewIds, ...editCrewIds];

    const request: UpdateAmbulanceRequest = {
      facilityId: data.facilityId || undefined,
      status: data.status as AmbulanceStatus,
      phone: data.phone || undefined,
      equipment: data.equipment ? data.equipment.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      crewMemberIds: combinedCrewIds.length > 0 ? combinedCrewIds : [],
    };
    updateMutation.mutate({ id: selected.id, data: request });
  };

  const isLoading = ambulancesLoading || statsLoading;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ambulances</h1>
          <p className="page-subtitle">Fleet management and tracking</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowModal(true);
            setSelectedCrewIds([]);
          }}
        >
          <Plus size={16} />
          Add Ambulance
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 'var(--space-5)' }}>
        <div className="stat-card" onClick={() => setStatusFilter('')} style={{ cursor: 'pointer', opacity: statusFilter ? 0.5 : 1 }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'var(--accent-subtle)' }}>
              <AmbulanceIcon size={20} style={{ color: 'var(--accent-light)' }} />
            </div>
          </div>
          <div className="stat-label">Total Fleet</div>
          <div className="stat-value">{stats?.total || 0}</div>
        </div>
        <div className="stat-card" onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? '' : 'AVAILABLE')} style={{ cursor: 'pointer', opacity: statusFilter && statusFilter !== 'AVAILABLE' ? 0.5 : 1 }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
              <CheckCircle2 size={20} style={{ color: '#4ade80' }} />
            </div>
          </div>
          <div className="stat-label">Available</div>
          <div className="stat-value" style={{ color: '#4ade80' }}>{stats?.available || 0}</div>
        </div>
        <div className="stat-card" onClick={() => setStatusFilter(statusFilter === 'ON_MISSION' ? '' : 'ON_MISSION')} style={{ cursor: 'pointer', opacity: statusFilter && statusFilter !== 'ON_MISSION' ? 0.5 : 1 }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
              <Navigation size={20} style={{ color: '#60a5fa' }} />
            </div>
          </div>
          <div className="stat-label">On Mission</div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>{stats?.onMission || 0}</div>
        </div>
        <div className="stat-card" onClick={() => setStatusFilter(statusFilter === 'MAINTENANCE' ? '' : 'MAINTENANCE')} style={{ cursor: 'pointer', opacity: statusFilter && statusFilter !== 'MAINTENANCE' ? 0.5 : 1 }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
              <Wrench size={20} style={{ color: '#fbbf24' }} />
            </div>
          </div>
          <div className="stat-label">Maintenance</div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>{stats?.maintenance || 0}</div>
        </div>
        <div className="stat-card" onClick={() => setStatusFilter(statusFilter === 'OUT_OF_SERVICE' ? '' : 'OUT_OF_SERVICE')} style={{ cursor: 'pointer', opacity: statusFilter && statusFilter !== 'OUT_OF_SERVICE' ? 0.5 : 1 }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <AlertOctagon size={20} style={{ color: '#f87171' }} />
            </div>
          </div>
          <div className="stat-label">Out of Service</div>
          <div className="stat-value" style={{ color: '#f87171' }}>{stats?.outOfService || 0}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 250 }}>
          <Search size={16} className="search-box-icon" />
          <input
            type="text"
            className="search-box-input"
            placeholder="Search ambulances..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-divider" />
        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_MISSION">On Mission</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OUT_OF_SERVICE">Out of Service</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-1)' }}>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={16} />
            List
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('map')}
            title="Map View"
          >
            <Map size={16} />
            Map
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : filteredAmbulances.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--bg-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)'
          }}>
            <AmbulanceIcon size={36} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {ambulances.length === 0 ? 'No Ambulances Yet' : 'No Results Found'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            {ambulances.length === 0 
              ? 'Add your first ambulance to start managing your fleet.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {ambulances.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Add Ambulance
            </button>
          )}
        </div>
      ) : viewMode === 'map' ? (
        <div className="dashboard-grid">
          <div className="col-8">
            <AmbulanceMap 
              ambulances={filteredAmbulances} 
              onAmbulanceClick={(amb) => {
                setSelected(amb);
              }}
              isLoading={isLoading}
            />
          </div>
          <div className="col-4">
            <div className="card" style={{ position: 'sticky', top: 'var(--space-5)' }}>
              <h3 className="card-title mb-4">
                <Settings size={16} />
                Ambulance Details
              </h3>
              {selected ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div style={{ 
                      width: 56, 
                      height: 56, 
                      background: 'var(--accent-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AmbulanceIcon size={28} style={{ color: 'var(--accent-light)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {selected.ambulanceId}
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
                    {selected.phone && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Phone
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <a href={`tel:${selected.phone}`} style={{ color: 'var(--accent-light)', fontSize: '14px' }}>{selected.phone}</a>
                        </div>
                      </div>
                    )}
                    {selected.facility && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Assigned Facility
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{selected.facility.name}</span>
                        </div>
                      </div>
                    )}
                    {selected.crew && selected.crew.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Crew Members
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selected.crew.map((member) => (
                            <span key={member.id} style={{
                              padding: '4px 10px',
                              background: 'var(--bg-overlay)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '12px',
                              color: 'var(--text-secondary)'
                            }}>
                              {member.firstName} {member.lastName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.equipment && selected.equipment.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Equipment
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selected.equipment.map((equip, i) => (
                            <span key={i} style={{
                              padding: '4px 10px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '12px'
                            }}>
                              {equip}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.latitude && selected.longitude && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          GPS Location
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {Number(selected.latitude).toFixed(5)}, {Number(selected.longitude).toFixed(5)}
                          </span>
                        </div>
                        <a 
                          href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '12px', 
                            color: 'var(--accent-light)', 
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          View on Google Maps →
                        </a>
                      </div>
                    )}
                    {selected.lastLocationUpdate && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Last Updated
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {new Date(selected.lastLocationUpdate).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => handleEdit(selected)}
                    >
                      <Pencil size={14} />
                      Edit Ambulance
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--bg-overlay)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-3)'
                  }}>
                    <AmbulanceIcon size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Click on an ambulance marker to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Ambulance Grid */}
          <div className="col-8">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: 'var(--space-4)' 
            }}>
              {filteredAmbulances.map((amb: Ambulance) => (
                <div 
                  key={amb.id}
                  onClick={() => setSelected(amb)}
                  style={{ 
                    padding: 'var(--space-4)',
                    background: selected?.id === amb.id ? 'var(--bg-overlay)' : 'var(--bg-surface)',
                    border: `1px solid ${selected?.id === amb.id ? 'var(--accent)' : 'var(--border-default)'}`,
                    borderRadius: 'var(--radius-xl)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{ 
                      width: 44, 
                      height: 44, 
                      background: amb.status === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-overlay)',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AmbulanceIcon size={22} style={{ 
                        color: amb.status === 'AVAILABLE' ? '#4ade80' : 
                               amb.status === 'ON_MISSION' ? '#60a5fa' : 
                               amb.status === 'MAINTENANCE' ? '#fbbf24' : '#f87171' 
                      }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {amb.ambulanceId}
                      </div>
                      <StatusBadge status={amb.status} />
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: 'var(--space-3)', 
                    background: 'var(--bg-subtle)', 
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-3)'
                  }}>
                    <div className="flex items-center gap-2" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                      {amb.facility?.name || 'Unassigned'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {amb.phone ? (
                      <div className="flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <Phone size={12} />
                        {amb.phone}
                      </div>
                    ) : <span />}
                    {amb.crew && amb.crew.length > 0 && (
                      <div className="flex items-center gap-1" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <Users size={12} />
                        {amb.crew.length}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Ambulance Details */}
          <div className="col-4">
            <div className="card" style={{ position: 'sticky', top: 'var(--space-5)' }}>
              <h3 className="card-title mb-4">
                <Settings size={16} />
                Details
              </h3>
              {selected ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div style={{ 
                      width: 56, 
                      height: 56, 
                      background: 'var(--accent-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AmbulanceIcon size={28} style={{ color: 'var(--accent-light)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {selected.ambulanceId}
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
                    {selected.phone && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Phone
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <a href={`tel:${selected.phone}`} style={{ color: 'var(--accent-light)', fontSize: '14px' }}>{selected.phone}</a>
                        </div>
                      </div>
                    )}
                    {selected.facility && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Assigned Facility
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{selected.facility.name}</span>
                        </div>
                      </div>
                    )}
                    {selected.crew && selected.crew.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Crew Members
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selected.crew.map((member) => (
                            <span key={member.id} style={{
                              padding: '4px 10px',
                              background: 'var(--bg-overlay)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '12px',
                              color: 'var(--text-secondary)'
                            }}>
                              {member.firstName} {member.lastName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.equipment && selected.equipment.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Equipment
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selected.equipment.map((equip, i) => (
                            <span key={i} style={{
                              padding: '4px 10px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '12px'
                            }}>
                              {equip}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.latitude && selected.longitude && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Location
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {Number(selected.latitude).toFixed(5)}, {Number(selected.longitude).toFixed(5)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => handleEdit(selected)}
                    >
                      <Pencil size={14} />
                      Edit Ambulance
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--bg-overlay)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-3)'
                  }}>
                    <AmbulanceIcon size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Select an ambulance to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Ambulance Modal */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)'
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-5)',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AmbulanceIcon size={20} style={{ color: 'var(--accent-light)' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Add Ambulance
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Register a new vehicle
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ padding: 'var(--space-5)' }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Ambulance ID *
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g., AMB-001"
                    {...register('ambulanceId')}
                  />
                  {errors.ambulanceId && <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>{errors.ambulanceId.message}</p>}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                      Status
                    </label>
                    <select className="form-input" {...register('status')}>
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_MISSION">On Mission</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                      Phone Number
                    </label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="+232 XX XXX XXX"
                      {...register('phone')}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Assigned Facility *
                  </label>
                  <select className="form-input" {...register('facilityId')}>
                    <option value="">-- Select Facility --</option>
                    {facilities.map((f: { id: string; name: string; latitude?: number; longitude?: number }) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <p className="form-hint">The ambulance's GPS location will be set to this facility's coordinates.</p>
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Equipment
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="AED, Oxygen, Stretcher (comma separated)"
                    {...register('equipment')}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Crew Members
                  </label>
                  {crewLoading ? (
                    <div className="flex items-center gap-2" style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      background: 'var(--bg-subtle)'
                    }}>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      <span className="text-sm text-muted">Loading crew members...</span>
                    </div>
                  ) : availableCrew.length === 0 ? (
                    <div className="text-sm text-muted" style={{ padding: 'var(--space-3) 0' }}>
                      No unassigned crew members available.
                    </div>
                  ) : (
                    <div style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      display: 'grid',
                      gap: 'var(--space-2)',
                      maxHeight: 200,
                      overflow: 'auto'
                    }}>
                      {availableCrew.map((member) => {
                        const fullName = `${member.firstName} ${member.lastName}`.trim();
                        const isSelected = selectedCrewIds.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            className="flex items-start gap-2"
                            style={{
                              padding: 'var(--space-2)',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedCrewIds((prev) =>
                                  prev.includes(member.id)
                                    ? prev.filter((id) => id !== member.id)
                                    : [...prev, member.id]
                                );
                              }}
                              style={{ marginTop: 3 }}
                            />
                            <div>
                              <div className="font-medium" style={{ fontSize: '13px' }}>{fullName}</div>
                              <div className="text-xs text-muted">
                                {member.phone}
                                {member.facility?.name ? ` • ${member.facility.name}` : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="form-hint">Only crew members not already assigned to an ambulance are listed.</p>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-3)',
                padding: 'var(--space-4) var(--space-5)',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)'
              }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Ambulance'}
                </button>
              </div>
              {createMutation.isError && (
                <p style={{ padding: '0 var(--space-5) var(--space-4)', fontSize: '12px', color: 'var(--danger)' }}>
                  Failed to create ambulance. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Edit Ambulance Modal */}
      {showEditModal && selected && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)'
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-5)',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Pencil size={20} style={{ color: 'var(--accent-light)' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Edit Ambulance
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {selected.ambulanceId}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit(onEditSubmit)}>
              <div style={{ padding: 'var(--space-5)' }}>
                {/* Status & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                      Status
                    </label>
                    <select className="form-input" {...registerEdit('status')}>
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_MISSION">On Mission</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                      Phone Number
                    </label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="+232 XX XXX XXX"
                      {...registerEdit('phone')}
                    />
                  </div>
                </div>

                {/* Facility */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Assigned Facility
                  </label>
                  <select className="form-input" {...registerEdit('facilityId')}>
                    <option value="">-- Select Facility --</option>
                    {facilities.map((f: { id: string; name: string }) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Equipment */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Equipment
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="AED, Oxygen, Stretcher (comma separated)"
                    {...registerEdit('equipment')}
                  />
                </div>

                {/* Current Crew Members */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Current Crew Members
                  </label>
                  {selected.crew && selected.crew.length > 0 ? (
                    <div style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-2)',
                    }}>
                      {selected.crew.map((member) => (
                        <span key={member.id} style={{
                          padding: '4px 10px',
                          background: 'var(--bg-overlay)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <User size={12} />
                          {member.firstName} {member.lastName}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedCrew = selected.crew!.filter((c) => c.id !== member.id);
                              setSelected({ ...selected, crew: updatedCrew });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: 'var(--text-tertiary)',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Remove crew member"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted" style={{ padding: 'var(--space-2) 0' }}>
                      No crew members assigned.
                    </div>
                  )}
                </div>

                {/* Add Crew Members */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Add Crew Members
                  </label>
                  {crewLoading ? (
                    <div className="flex items-center gap-2" style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      background: 'var(--bg-subtle)'
                    }}>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      <span className="text-sm text-muted">Loading crew members...</span>
                    </div>
                  ) : availableCrew.length === 0 ? (
                    <div className="text-sm text-muted" style={{ padding: 'var(--space-3) 0' }}>
                      No unassigned crew members available.
                    </div>
                  ) : (
                    <div style={{
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      display: 'grid',
                      gap: 'var(--space-2)',
                      maxHeight: 160,
                      overflow: 'auto'
                    }}>
                      {availableCrew.map((member) => {
                        const fullName = `${member.firstName} ${member.lastName}`.trim();
                        const isSelected = editCrewIds.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            className="flex items-start gap-2"
                            style={{
                              padding: 'var(--space-2)',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setEditCrewIds((prev) =>
                                  prev.includes(member.id)
                                    ? prev.filter((id) => id !== member.id)
                                    : [...prev, member.id]
                                );
                              }}
                              style={{ marginTop: 3 }}
                            />
                            <div>
                              <div className="font-medium" style={{ fontSize: '13px' }}>{fullName}</div>
                              <div className="text-xs text-muted">
                                {member.phone}
                                {member.facility?.name ? ` • ${member.facility.name}` : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="form-hint">Only crew members not already assigned to an ambulance are listed.</p>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-3)',
                padding: 'var(--space-4) var(--space-5)',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)'
              }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              {updateMutation.isError && (
                <p style={{ padding: '0 var(--space-5) var(--space-4)', fontSize: '12px', color: 'var(--danger)' }}>
                  Failed to update ambulance. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
