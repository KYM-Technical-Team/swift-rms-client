'use client';

import './dashboard.css';
import { usePathname } from 'next/navigation';
import { Sidebar, Header } from '@/components/layout';
import { RouteGuard } from '@/components/auth';
import { ToastContainer } from '@/components/ui';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith('/call-centre')) {
    return (
      <RouteGuard>
        <a href="#call-centre-main" className="skip-link">Skip to call-centre workspace</a>
        <main id="call-centre-main">{children}</main>
        <ToastContainer />
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      <div className="dashboard-layout">
        {/* Skip link for keyboard accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <Sidebar />
        <div className="main-content">
          <Header />
          <main id="main-content" className="page-content">
            {children}
          </main>
        </div>
        
        {/* Global toast notifications */}
        <ToastContainer />
      </div>
    </RouteGuard>
  );
}
