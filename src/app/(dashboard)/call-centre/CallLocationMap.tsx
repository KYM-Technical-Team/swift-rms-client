'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { TriageColour } from '@/lib/triage-protocols';

interface CallLocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
  colour: TriageColour;
  accuracyMetres?: number;
}

const pinColour: Record<TriageColour, string> = {
  RED: '#e0453f',
  YELLOW: '#e2a020',
  GREEN: '#2f9e5b',
};

function createPin(colour: TriageColour) {
  return L.divIcon({
    className: 'cc-map-pin',
    html: `<i style="--cc-pin:${pinColour[colour]}"></i>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/** Keeps the viewport on the call without remounting the map on every coordinate update. */
function Recentre({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
  }, [latitude, longitude, map]);
  return null;
}

export default function CallLocationMap({
  latitude,
  longitude,
  label,
  colour,
  accuracyMetres = 150,
}: CallLocationMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      zoomControl={false}
      scrollWheelZoom={false}
      attributionControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Dark basemap to match the RMS dashboard chrome. */}
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <Circle
        center={[latitude, longitude]}
        radius={accuracyMetres}
        pathOptions={{ color: pinColour[colour], weight: 1, fillOpacity: 0.12 }}
      />
      <Marker position={[latitude, longitude]} icon={createPin(colour)} title={label} alt={label} />
      <Recentre latitude={latitude} longitude={longitude} />
    </MapContainer>
  );
}
