'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { useAuthStore } from '@/store';
import { referralService, analyticsService, readinessService } from '@/lib/api';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  ArrowRight,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Calendar,
  Users,
  HeartPulse,
  Bed,
  Droplet,
  Wind
} from 'lucide-react';
import { StatCard, DataTable, PriorityBadge, StatusIndicator } from '@/components/ui';
import { calculateScore } from '@/components/readiness';
import NemsCallCentreDashboard from './NemsCallCentreDashboard';

interface Referral {
  id: string;
  referralCode: string;
  priority: string;
  patient?: {
    firstName: string;
    lastName: string;
  };
  referralType: string;
  sendingFacility?: {
    name: string;
  };
  status: string;
  createdAt?: string;
}

// Quick action card for common tasks
function QuickActionCard({ 
  icon: Icon, 
  label, 
  description, 
  href, 
  variant = 'default' 
}: { 
  icon: any; 
  label: string; 
  description: string; 
  href: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const styles: Record<string, { iconBg: string; iconColor: string }> = {
    default: { 
      iconBg: 'var(--glass-bg)', 
      iconColor: 'var(--text-tertiary)' 
    },
    primary: { 
      iconBg: 'var(--accent-subtle)', 
      iconColor: 'var(--accent-light)' 
    },
    success: { 
      iconBg: 'var(--success-subtle)', 
      iconColor: 'var(--success)' 
    },
    warning: { 
      iconBg: 'var(--warning-subtle)', 
      iconColor: 'var(--warning)' 
    },
  };

  const style = styles[variant];

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div 
        className="card hover-lift"
        style={{
          padding: '20px',
          cursor: 'pointer',
          height: '100%',
        }}
      >
        <div style={{ 
          width: '44px', 
          height: '44px', 
          borderRadius: 'var(--radius-lg)',
          background: style.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <Icon size={22} style={{ color: style.iconColor }} strokeWidth={1.75} />
        </div>
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{description}</div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  // NEMS operators work the call centre, not the referral inbox — they get the
  // call-centre dashboard in this same shell instead of the referral overview.
  const isNemsUser = user?.userType === 'NEMS';

  // UX Decision: Time-based greeting creates personal connection
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  const { data: referralsData, isLoading: referralsLoading } = useQuery({
    queryKey: ['referrals', 'dashboard'],
    queryFn: () => referralService.list({ page: 1, limit: 5 }),
    enabled: !isNemsUser,
  });

  const { data: pendingReferrals } = useQuery({
    queryKey: ['referrals', 'pending'],
    queryFn: () => referralService.listPending(),
    enabled: !isNemsUser,
  });

  const { data: incomingReferrals } = useQuery({
    queryKey: ['referrals', 'incoming'],
    queryFn: () => referralService.listIncoming({ page: 1, limit: 10 }),
    enabled: !isNemsUser,
  });

  const { data: outgoingReferrals } = useQuery({
    queryKey: ['referrals', 'outgoing'],
    queryFn: () => referralService.listOutgoing({ page: 1, limit: 10 }),
    enabled: !isNemsUser,
  });

  // Admin and NEMS users get global stats from analytics API
  const isAdminUser = user?.userType === 'SYSTEM_ADMIN' || user?.userType === 'NATIONAL_USER' || user?.userType === 'NEMS';
  
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', 'referrals', 'overview'],
    queryFn: () => analyticsService.getReferralAnalytics(),
    enabled: isAdminUser && !isNemsUser, // Only fetch for admin users
  });

  // Fetch facility readiness for users with a facility
  const facilityId = user?.facility?.id;
  const { data: facilityReadiness } = useQuery({
    queryKey: ['facility-readiness', facilityId],
    queryFn: () => readinessService.getLatest(facilityId!),
    enabled: !!facilityId && !isNemsUser, // Only fetch if user has a facility
  });

  const referrals: Referral[] = referralsData?.data || [];
  
  // Admin users see total from analytics, facility users see from pending referrals
  const totalCount = isAdminUser 
    ? (analyticsData?.summary?.totalReferrals || referralsData?.meta?.total || 0)
    : (pendingReferrals?.length || 0);
  const incomingCount = incomingReferrals?.data?.length || 0;
  const outgoingCount = outgoingReferrals?.data?.length || 0;
  const pendingCount = pendingReferrals?.filter((r: any) => r.status === 'PENDING').length || 0;
  
  // Calculate critical count for urgency indicator
  const criticalCount = pendingReferrals?.filter((r: any) => r.priority === 'CRITICAL').length || 0;

  // Calculate readiness score using server score or unified calculation
  const readinessScore = facilityReadiness ? calculateScore(facilityReadiness) : null;

  const columnHelper = createColumnHelper<Referral>();
  
  // UX Decision: Columns ordered by importance - Code (identity) → Priority (urgency) → Patient (context)
  const columns = useMemo<ColumnDef<Referral, any>[]>(() => [
    columnHelper.accessor('referralCode', {
      header: 'Referral',
      cell: info => (
        <div>
          <Link href={`/referrals/${info.row.original.id}`} className="link font-semibold">
            {info.getValue()}
          </Link>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            {info.row.original.referralType}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('priority', {
      header: 'Priority',
      cell: info => <PriorityBadge priority={info.getValue()} size="sm" />,
    }),
    columnHelper.accessor(row => `${row.patient?.firstName || ''} ${row.patient?.lastName || ''}`.trim(), {
      id: 'patient',
      header: 'Patient',
      cell: info => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
          }}>
            {info.getValue()?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
          </div>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{info.getValue() || 'Unknown'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('sendingFacility.name', {
      header: 'From',
      cell: info => (
        <span style={{ 
          color: 'var(--muted)', 
          maxWidth: '180px', 
          display: 'block', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }}>
          {info.getValue() || 'Unknown'}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => <StatusIndicator status={info.getValue()} size="sm" />,
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <Link href={`/referrals/${info.row.original.id}`} className="btn btn-ghost btn-sm">
          View
          <ArrowRight size={14} />
        </Link>
      ),
    }),
  ], []);

  // NEMS operators get the call-centre view of this same dashboard route.
  if (isNemsUser) {
    return (
      <>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            {getGreeting()}, {user?.firstName}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} />
            {currentDate}
          </p>
        </div>
        <NemsCallCentreDashboard />
      </>
    );
  }

  return (
    <>
      {/* Hero Section - Personal greeting with context */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', // 28px = readable but not overwhelming
              fontWeight: 700, 
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}>
              {getGreeting()}, {user?.firstName}
            </h1>
            <p style={{ 
              color: 'var(--muted)', 
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Calendar size={14} />
              {currentDate}
            </p>
          </div>
          
          {/* Urgent Alert - Only shown when critical items exist */}
          {criticalCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <AlertTriangle size={18} style={{ color: 'var(--red-500)' }} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                <strong>{criticalCount}</strong> critical referral{criticalCount > 1 ? 's' : ''} pending
              </span>
              <Link href="/referrals?priority=CRITICAL" className="btn btn-sm" style={{
                background: 'var(--red-500)',
                color: 'white',
                marginLeft: '8px'
              }}>
                Review Now
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - 4 columns on desktop, 2 on tablet, 1 on mobile */}
      <div className="stats-grid">
        <div style={{ animation: 'fade-in-up var(--duration-smooth) var(--ease) forwards', animationDelay: '0ms' }}>
          <StatCard
            label="Total Referrals"
            value={totalCount}
            icon={Activity}
            trend="12%"
            trendType="up"
            description="All time referrals"
          />
        </div>
        <div style={{ animation: 'fade-in-up var(--duration-smooth) var(--ease) forwards', animationDelay: '50ms', opacity: 0 }}>
          <StatCard
            label="Incoming"
            value={incomingCount}
            icon={ArrowDownLeft}
            trend="8%"
            trendType="up"
            variant="info"
            description="Referrals to your facility"
          />
        </div>
        <div style={{ animation: 'fade-in-up var(--duration-smooth) var(--ease) forwards', animationDelay: '100ms', opacity: 0 }}>
          <StatCard
            label="Outgoing"
            value={outgoingCount}
            icon={ArrowUpRight}
            trend="20%"
            trendType="up"
            variant="success"
            description="Referrals sent out"
          />
        </div>
        <div style={{ animation: 'fade-in-up var(--duration-smooth) var(--ease) forwards', animationDelay: '150ms', opacity: 0 }}>
          <StatCard
            label="Pending Action"
            value={pendingCount}
            icon={Clock}
            trend={pendingCount > 5 ? `${pendingCount - 5}+` : '0'}
            trendType={pendingCount > 5 ? 'up' : 'neutral'}
            variant={pendingCount > 5 ? 'warning' : 'default'}
            description="Awaiting your response"
          />
        </div>
      </div>

      {/* Facility Readiness Score - Only shown for users with a facility */}
      {facilityId && facilityReadiness && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <HeartPulse size={18} style={{ color: 'var(--accent)' }} />
            Facility Readiness
            {readinessScore !== null && (
              <span style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                background: readinessScore >= 70 
                  ? 'var(--success-subtle)' 
                  : readinessScore >= 40 
                    ? 'var(--warning-subtle)' 
                    : 'var(--error-subtle)',
                color: readinessScore >= 70 
                  ? 'var(--success)' 
                  : readinessScore >= 40 
                    ? 'var(--warning)' 
                    : 'var(--error)',
              }}>
                Score: {readinessScore}%
              </span>
            )}
          </h2>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Bed size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Bed Availability</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>
                    {facilityReadiness.bedCapacityAvailable}/{facilityReadiness.bedCapacityTotal}
                  </div>
                </div>
              </div>
              <div style={{ 
                height: '4px', 
                background: 'var(--glass-bg)', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${facilityReadiness.bedCapacityTotal > 0 
                    ? (facilityReadiness.bedCapacityAvailable / facilityReadiness.bedCapacityTotal) * 100 
                    : 0}%`,
                  background: 'var(--accent)',
                  borderRadius: '2px',
                }} />
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: facilityReadiness.oxygenStatus === 'ADEQUATE' 
                    ? 'var(--success-subtle)' 
                    : facilityReadiness.oxygenStatus === 'LOW' 
                      ? 'var(--warning-subtle)' 
                      : 'var(--error-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Wind size={20} style={{ 
                    color: facilityReadiness.oxygenStatus === 'ADEQUATE' 
                      ? 'var(--success)' 
                      : facilityReadiness.oxygenStatus === 'LOW' 
                        ? 'var(--warning)' 
                        : 'var(--error)'
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Oxygen</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {facilityReadiness.oxygenStatus?.toLowerCase() || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: ['FULLY_STAFFED', 'ADEQUATE'].includes(String(facilityReadiness.staffingStatus))
                    ? 'var(--success-subtle)' 
                    : String(facilityReadiness.staffingStatus) === 'UNDERSTAFFED' || String(facilityReadiness.staffingStatus) === 'LOW'
                      ? 'var(--warning-subtle)' 
                      : 'var(--error-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Users size={20} style={{ 
                    color: ['FULLY_STAFFED', 'ADEQUATE'].includes(String(facilityReadiness.staffingStatus))
                      ? 'var(--success)' 
                      : String(facilityReadiness.staffingStatus) === 'UNDERSTAFFED' || String(facilityReadiness.staffingStatus) === 'LOW'
                        ? 'var(--warning)' 
                        : 'var(--error)'
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Staffing</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {String(facilityReadiness.staffingStatus || 'N/A').replace('_', ' ').toLowerCase()}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: facilityReadiness.bloodBankStatus === 'ADEQUATE' 
                    ? 'var(--success-subtle)' 
                    : facilityReadiness.bloodBankStatus === 'LOW' 
                      ? 'var(--warning-subtle)' 
                      : 'var(--error-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Droplet size={20} style={{ 
                    color: facilityReadiness.bloodBankStatus === 'ADEQUATE' 
                      ? 'var(--success)' 
                      : facilityReadiness.bloodBankStatus === 'LOW' 
                        ? 'var(--warning)' 
                        : 'var(--error)'
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Blood Bank</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {facilityReadiness.bloodBankStatus?.toLowerCase() || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <Link href="/readiness" className="btn btn-ghost btn-sm">
              View full readiness report
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions - Grid of 4 actionable items */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Zap size={18} style={{ color: 'var(--amber-500)' }} />
          Quick Actions
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px',
        }} className="stats-grid">
          <QuickActionCard 
            icon={ArrowUpRight}
            label="New Referral"
            description="Create outgoing referral"
            href="/referrals/new"
            variant="primary"
          />
          <QuickActionCard 
            icon={Users}
            label="Register Patient"
            description="Add new patient record"
            href="/patients/new"
            variant="success"
          />
          <QuickActionCard 
            icon={Clock}
            label="Pending Reviews"
            description={`${pendingCount} awaiting action`}
            href="/referrals?status=PENDING"
            variant={pendingCount > 0 ? 'warning' : 'default'}
          />
          <QuickActionCard 
            icon={CheckCircle2}
            label="Completed Today"
            description="View today's completions"
            href="/referrals?status=COMPLETED"
          />
        </div>
      </div>

      {/* Recent Referrals Table */}
      <div className="card">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Recent Referrals
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Latest activity across your facility
            </p>
          </div>
          <Link href="/referrals" className="btn btn-ghost btn-sm">
            View all
            <ArrowRight size={14} />
          </Link>
        </div>
        
        {referralsLoading ? (
          <div style={{ 
            padding: '60px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div className="spinner spinner-lg" />
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading referrals...</span>
          </div>
        ) : (
          <DataTable 
            data={referrals} 
            columns={columns}
            emptyMessage="No recent referrals"
            emptyDescription="New referrals will appear here"
          />
        )}
      </div>
    </>
  );
}
