'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Ambulance } from '@/lib/api/ambulances';

// Fix for default marker icons in webpack/next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Helper to create custom marker icons
const createStatusIcon = (color: string, iconHtml: string) => {
  return L.divIcon({
    className: 'custom-marker ambulance-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    ">
      ${iconHtml}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const ambulanceSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="10" height="10" x="7" y="10" rx="2"/><path d="M10 3h4l2 7h-8z"/><path d="M12 10v4"/><path d="M14 12h-4"/><path d="M6 17v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3"/><path d="M19 19h2a1 1 0 0 0 1-1v-5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v5a1 1 0 0 0 1 1h2"/></svg>`;

// Status icons
const availableIcon = createStatusIcon('linear-gradient(135deg, #22c55e, #16a34a)', ambulanceSvg);
const onMissionIcon = createStatusIcon('linear-gradient(135deg, #3b82f6, #1d4ed8)', ambulanceSvg);
const maintenanceIcon = createStatusIcon('linear-gradient(135deg, #eab308, #ca8a04)', ambulanceSvg);
const outOfServiceIcon = createStatusIcon('linear-gradient(135deg, #ef4444, #dc2626)', ambulanceSvg);

interface AmbulanceMapProps {
  ambulances: Ambulance[];
  onAmbulanceClick?: (ambulance: Ambulance) => void;
  isLoading?: boolean;
}

export default function AmbulanceMap({ ambulances, onAmbulanceClick, isLoading }: AmbulanceMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Sierra Leone center coordinates
    const sierraLeoneCenter: [number, number] = [8.4606, -11.7799];
    
    mapRef.current = L.map(containerRef.current).setView(sierraLeoneCenter, 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    // Create marker cluster group with custom options
    clusterGroupRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let sizeClass = 40;
        
        if (count >= 100) {
          size = 'large';
          sizeClass = 60;
        } else if (count >= 20) {
          size = 'medium';
          sizeClass = 50;
        }
        
        return L.divIcon({
          html: `<div style="
            width: ${sizeClass}px;
            height: ${sizeClass}px;
            background: linear-gradient(135deg, #f97316, #ea580c);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 3px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: ${count >= 100 ? '14px' : '12px'};
          ">${count}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(sizeClass, sizeClass),
        });
      }
    });
    
    mapRef.current.addLayer(clusterGroupRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when ambulances change
  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;

    // Clear existing markers
    clusterGroupRef.current.clearLayers();

    // Add markers for ambulances with valid coordinates
    const validAmbulances = ambulances.filter(
      a => a.latitude && a.longitude && 
           !isNaN(Number(a.latitude)) && !isNaN(Number(a.longitude))
    );

    const markers: L.Marker[] = [];

    validAmbulances.forEach(ambulance => {
      const lat = Number(ambulance.latitude);
      const lng = Number(ambulance.longitude);
      
      let icon = outOfServiceIcon;
      let statusColor = '#ef4444';
      
      switch (ambulance.status) {
        case 'AVAILABLE':
          icon = availableIcon;
          statusColor = '#22c55e';
          break;
        case 'ON_MISSION':
          icon = onMissionIcon;
          statusColor = '#3b82f6';
          break;
        case 'MAINTENANCE':
          icon = maintenanceIcon;
          statusColor = '#eab308';
          break;
      }

      const marker = L.marker([lat, lng], { icon });
      
      // Create popup content with full details
      const popupContent = `
        <div style="min-width: 280px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${ambulance.ambulanceId}</h3>
          </div>
          
          <div style="font-size: 13px; color: #4b5563; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 500; color: ${statusColor}; border: 1px solid ${statusColor}40; background: ${statusColor}15; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
                ${ambulance.status.replace('_', ' ')}
              </span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
              <span style="color: #9ca3af;">Facility:</span>
              <span style="color: #1f2937; font-weight: 500;">${ambulance.facility?.name || 'Unassigned'}</span>
            </div>
            
            ${ambulance.phone ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #9ca3af;">Phone:</span>
              <a href="tel:${ambulance.phone}" style="color: #3b82f6; text-decoration: none;">${ambulance.phone}</a>
            </div>` : ''}
            
            ${ambulance.crew && ambulance.crew.length > 0 ? `
            <div style="display: flex; align-items: flex-start; gap: 6px;">
              <span style="color: #9ca3af;">Crew:</span>
              <span style="color: #374151;">${ambulance.crew.map(c => `${c.firstName} ${c.lastName}`).join(', ')}</span>
            </div>` : ''}
            
            ${ambulance.equipment && ambulance.equipment.length > 0 ? `
            <div style="display: flex; align-items: flex-start; gap: 6px;">
              <span style="color: #9ca3af;">Equipment:</span>
              <span style="color: #374151;">${ambulance.equipment.join(', ')}</span>
            </div>` : ''}

            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">GPS Location (Actual Position)</div>
              <div style="font-size: 12px; color: #1f2937; font-weight: 500;">
                ${lat.toFixed(5)}, ${lng.toFixed(5)}
              </div>
              <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="font-size: 11px; color: #3b82f6; text-decoration: none;">View on Google Maps →</a>
            </div>
            
            ${ambulance.lastLocationUpdate ? `
            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
              Last updated: ${new Date(ambulance.lastLocationUpdate).toLocaleString()}
            </div>` : ''}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, { maxWidth: 300 });
      
      marker.on('click', () => {
        if (onAmbulanceClick) {
          onAmbulanceClick(ambulance);
        }
      });
      
      markers.push(marker);
    });

    // Add all markers to cluster group
    clusterGroupRef.current.addLayers(markers);

    // Fit bounds if we have ambulances
    if (validAmbulances.length > 0) {
      const bounds = L.latLngBounds(
        validAmbulances.map(a => [Number(a.latitude), Number(a.longitude)] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [ambulances, onAmbulanceClick]);

  if (isLoading) {
    return (
      <div style={{ 
        height: 600, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  const validCount = ambulances.filter(a => a.latitude && a.longitude).length;

  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={containerRef}
        style={{ 
          height: 600, 
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          zIndex: 0
        }} 
      />
      
      {/* Legend / Stats overlay */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
        minWidth: 180
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
          Fleet Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }}></div>
            Available
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6' }}></div>
            On Mission
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }}></div>
            Maintenance
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></div>
            Out of Service
          </div>
        </div>
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '11px', color: '#9ca3af' }}>
          Showing {validCount} of {ambulances.length} units
        </div>
      </div>
    </div>
  );
}
