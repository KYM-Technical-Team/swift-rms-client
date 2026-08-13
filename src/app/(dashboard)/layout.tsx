'use client';

import './dashboard.css';
import { Sidebar, Header } from '@/components/layout';
import { RouteGuard } from '@/components/auth';
import { ToastContainer } from '@/components/ui';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
