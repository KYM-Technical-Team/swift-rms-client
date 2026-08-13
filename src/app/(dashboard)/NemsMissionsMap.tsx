'use client';

import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MissionCluster {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  label: string;
}

/** Sierra Leone, roughly centred. */
const DEFAULT_CENTRE: [number, number] = [8.46, -11.78];

function bucketColour(count: number) {
  if (count >= 5) return '#ef4444';
  if (count >= 3) return '#f59e0b';
  return '#10b981';
}

function clusterIcon(cluster: MissionCluster) {
  const size = cluster.count >= 5 ? 34 : cluster.count >= 3 ? 30 : 26;
  return L.divIcon({
    className: 'nems-mission-cluster',
    html: `<span style="--cluster:${bucketColour(cluster.count)};width:${size}px;height:${size}px">${cluster.count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function NemsMissionsMap({ clusters }: { clusters: MissionCluster[] }) {
  const centre: [number, number] = clusters.length
    ? [
        clusters.reduce((sum, item) => sum + item.latitude, 0) / clusters.length,
        clusters.reduce((sum, item) => sum + item.longitude, 0) / clusters.length,
      ]
    : DEFAULT_CENTRE;

  return (
    <MapContainer
      center={centre}
      zoom={clusters.length ? 8 : 7}
      scrollWheelZoom={false}
      attributionControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      {clusters.map((cluster) => (
        <Marker
          key={cluster.key}
          position={[cluster.latitude, cluster.longitude]}
          icon={clusterIcon(cluster)}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {cluster.label}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
