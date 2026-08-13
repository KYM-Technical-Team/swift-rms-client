'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { userService, facilityService, ambulanceService } from '@/lib/api';
import { UserType } from '@/types';
import { 
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Phone,
  Mail,
  Check,
  X,
  Edit,
  Trash2,
  MapPin
} from 'lucide-react';

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().regex(/^\d{8}$/, 'Phone must be exactly 8 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  userType: z.string().min(1, 'Role is required'),
  facilityId: z.string().optional(),
  districtId: z.string().optional(),
  ambulanceId: z.string().optional().or(z.literal('')),
  crewRole: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.userType === 'DISTRICT_HEALTH' && !data.districtId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['districtId'],
      message: 'District is required for District Health users',
    });
  }
});

type UserFormData = z.infer<typeof userSchema>;


interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  userType: string;
  status: string;
  facility?: {
    id: string;
    name: string;
  };
  districtId?: string;
  district?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
}

const columnHelper = createColumnHelper<User>();

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    SYSTEM_ADMIN: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
    HOSPITAL_DESK: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    REFERRAL_COORDINATOR: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
    AMBULANCE_DISPATCH: { bg: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: 'rgba(234, 179, 8, 0.3)' },
    AMBULANCE_CREW: { bg: 'rgba(125, 211, 252, 0.15)', color: '#7dd3fc', border: 'rgba(125, 211, 252, 0.3)' },
    DISTRICT_HEALTH: { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
    NATIONAL_USER: { bg: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
    PHU_STAFF: { bg: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' },
    SPECIALIST: { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
    NEMS: { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  };
  const c = colors[role] || colors.NATIONAL_USER;
  return (
    <span style={{ 
      padding: '4px 10px', 
      background: c.bg, 
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-full)',
      fontSize: '11px',
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }}>
      {role.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminUsersPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [facilitySearch, setFacilitySearch] = useState('');
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userService.list(),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities', 'search', facilitySearch],
    queryFn: () => facilityService.search(facilitySearch),
    enabled: facilitySearch.length >= 2,
  });

  const { data: ambulancesData } = useQuery({
    queryKey: ['ambulances', 'list'],
    queryFn: () => ambulanceService.list({ limit: 200 }),
  });

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: () => facilityService.getDistricts(),
  });

  const { register, handleSubmit, setValue, control, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) => {
      const isDistrictHealthUser = data.userType === 'DISTRICT_HEALTH';
      return userService.create({
        ...data,
        phone: `+232${data.phone}`,
        email: data.email || undefined,
        facilityId: isDistrictHealthUser ? undefined : data.facilityId || undefined,
        districtId: isDistrictHealthUser ? data.districtId || undefined : undefined,
        ambulanceId: data.ambulanceId || undefined,
        crewRole: data.userType === 'AMBULANCE_CREW' ? data.crewRole || undefined : undefined,
        userType: data.userType as UserType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowAddModal(false);
      reset();
    },
  });

  const users: User[] = usersData?.data || [];
  const ambulances = ambulancesData?.data || [];

  const roles: UserType[] = [
    'SYSTEM_ADMIN',
    'HOSPITAL_DESK',
    'REFERRAL_COORDINATOR',
    'AMBULANCE_DISPATCH',
    'AMBULANCE_CREW',
    'DISTRICT_HEALTH',
    'NATIONAL_USER',
    'PHU_STAFF',
    'SPECIALIST',
    'NEMS'
  ];

  const selectedFacilityId = useWatch({ control, name: 'facilityId' });
  const selectedUserType = useWatch({ control, name: 'userType' });

  // Define columns
  const columns = useMemo(() => [
    columnHelper.accessor(row => `${row.firstName} ${row.lastName}`, {
      id: 'name',
      header: 'User',
      cell: info => (
        <div className="font-medium">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('phone', {
      header: 'Contact',
      cell: info => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
            <Phone size={12} style={{ color: 'var(--muted)' }} />
            {info.getValue()}
          </span>
          {info.row.original.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              <Mail size={12} />
              {info.row.original.email}
            </span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('userType', {
      header: 'Role',
      cell: info => <RoleBadge role={info.getValue()} />,
      filterFn: 'equalsString',
    }),
    columnHelper.accessor('facility', {
      header: 'Assignment',
      cell: info => {
        const facility = info.getValue();
        const district = info.row.original.district;
        if (district) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              <MapPin size={12} />
              {district.name}
            </span>
          );
        }
        return facility ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
            <Building2 size={12} />
            {facility.name}
          </span>
        ) : (
          <span style={{ color: 'var(--muted)' }}>-</span>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const status = info.getValue();
        return status === 'ACTIVE' ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--success)' }}>
            <Check size={12} />
            Active
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
            <X size={12} />
            Inactive
          </span>
        );
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: info => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: () => (
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button className="btn btn-ghost btn-sm btn-icon">
            <Edit size={14} />
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--error)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: users,
    columns,
    state: {
      globalFilter,
      sorting,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const roleFilter = (columnFilters.find(f => f.id === 'userType')?.value as string) ?? '';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system users and permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {users.filter(u => u.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Admins</div>
          <div className="stat-value">
            {users.filter(u => u.userType === 'SYSTEM_ADMIN').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hospital Staff</div>
          <div className="stat-value">
            {users.filter(u => u.userType === 'HOSPITAL_DESK').length}
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-box-icon" />
          <input
            type="text"
            className="search-box-input"
            placeholder="Search by name, phone, or email..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <span className="search-box-kbd">/</span>
        </div>
        
        <div className="filter-divider" />
        
        <select 
          className="filter-select"
          value={roleFilter}
          onChange={(e) => table.getColumn('userType')?.setFilterValue(e.target.value || undefined)}
        >
          <option value="">All Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        style={{
                          padding: 'var(--space-4)',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '12px',
                          color: 'var(--text-tertiary)',
                          background: 'var(--bg-overlay)',
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          userSelect: 'none',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em'
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span style={{ opacity: 0.5 }}>
                              {header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp size={14} />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown size={14} />
                              ) : (
                                <ArrowUpDown size={14} />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={columns.length} 
                      style={{ 
                        padding: 'var(--space-8)', 
                        textAlign: 'center', 
                        color: 'var(--muted)' 
                      }}
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                      className="hover-bg"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          style={{
                            padding: 'var(--space-4)',
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <>
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
            onClick={() => setShowAddModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--background)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            width: '90%',
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'auto',
            zIndex: 1000,
            boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ 
              padding: 'var(--space-6)',
              borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Add New User</h2>
            </div>

            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
              <div style={{ padding: 'var(--space-6)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input 
                      type="text" 
                      className={`form-input ${errors.firstName ? 'error' : ''}`} 
                      {...register('firstName')}
                    />
                    {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input 
                      type="text" 
                      className={`form-input ${errors.lastName ? 'error' : ''}`} 
                      {...register('lastName')}
                    />
                    {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+232</span>
                    <input 
                      type="tel" 
                      className={`form-input ${errors.phone ? 'error' : ''}`} 
                      placeholder="76000002" 
                      maxLength={8} 
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && <span className="form-error">{errors.phone.message}</span>}
                  <span className="form-hint">8 digits (e.g., 76000002)</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input 
                    type="email" 
                    className={`form-input ${errors.email ? 'error' : ''}`} 
                    {...register('email')}
                  />
                  {errors.email && <span className="form-error">{errors.email.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input 
                    type="password" 
                    className={`form-input ${errors.password ? 'error' : ''}`} 
                    {...register('password')}
                  />
                  {errors.password && <span className="form-error">{errors.password.message}</span>}
                  <span className="form-hint">Minimum 8 characters</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className={`form-input ${errors.userType ? 'error' : ''}`} {...register('userType')}>
                    <option value="">Select role...</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  {errors.userType && <span className="form-error">{errors.userType.message}</span>}
                </div>

                {selectedUserType === 'AMBULANCE_CREW' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Crew Role (Optional)</label>
                      <select className="form-input" {...register('crewRole')}>
                        <option value="">-- Select Role --</option>
                        <option value="PARAMEDIC">Paramedic</option>
                        <option value="DRIVER">Driver</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Assigned Ambulance (Optional)</label>
                      <select className="form-input" {...register('ambulanceId')}>
                        <option value="">-- Select Ambulance --</option>
                        {ambulances.map((amb) => (
                          <option key={amb.id} value={amb.id}>
                            {amb.ambulanceId}
                          </option>
                        ))}
                      </select>
                      <span className="form-hint">Leave blank to create an unassigned crew member.</span>
                    </div>
                  </>
                )}

                {selectedUserType === 'DISTRICT_HEALTH' ? (
                  <div className="form-group">
                    <label className="form-label">District *</label>
                    <select className={`form-input ${errors.districtId ? 'error' : ''}`} {...register('districtId')}>
                      <option value="">Select district...</option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                    {errors.districtId && <span className="form-error">{errors.districtId.message}</span>}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Facility (Optional)</label>
                    <div className="search-box">
                      <Search size={16} className="search-box-icon" />
                      <input
                        type="text"
                        className="search-box-input"
                        placeholder="Search facility..."
                        value={facilitySearch}
                        onChange={(e) => setFacilitySearch(e.target.value)}
                      />
                    </div>
                    {facilities.length > 0 && (
                      <div style={{
                        marginTop: 'var(--space-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        maxHeight: 200,
                        overflow: 'auto'
                      }}>
                        {facilities.map((facility) => (
                          <div
                            key={facility.id}
                            onClick={() => {
                              setValue('facilityId', facility.id);
                              setFacilitySearch(facility.name);
                            }}
                            style={{
                              padding: 'var(--space-3)',
                              cursor: 'pointer',
                              background: selectedFacilityId === facility.id ? 'var(--accent)' : 'transparent',
                            }}
                            className="hover-bg"
                          >
                            <div className="font-medium">{facility.name}</div>
                            <div className="text-sm text-muted">{facility.type}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {createMutation.isError && (
                  <div className="auth-error">
                    Failed to create user. Please try again.
                  </div>
                )}
              </div>

              <div style={{ 
                padding: 'var(--space-6)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 'var(--space-2)',
                justifyContent: 'flex-end'
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
