import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Custom Luxury SVG Marker Icons
const riderIcon = L.divIcon({
  className: 'custom-rider-icon',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(16, 185, 129, 0.35); border: 1.5px solid #10b981;" class="radar-beacon"></div>
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #09090b; border: 2.5px solid #10b981; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

const destinationIcon = L.divIcon({
  className: 'custom-destination-icon',
  html: `
    <div style="width: 32px; height: 32px; border-radius: 50%; background: #09090b; border: 2.5px solid #f43f5e; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(244, 63, 94, 0.6);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const carIcon = L.divIcon({
  className: 'custom-car-icon',
  html: `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; transition: all 0.5s ease-out;">
      <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(245, 158, 11, 0.25); border: 1.5px solid #f59e0b;" class="radar-beacon"></div>
      <div style="width: 34px; height: 34px; border-radius: 50%; background: #09090b; border: 2.5px solid #f59e0b; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(245, 158, 11, 0.7);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21]
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

export default function Map({ pickupCoord, destinationCoord, driverCoord, routePoints, onMapClick }) {
  const defaultCenter = [28.6315, 77.2167]; // Connaught Place, New Delhi
  const activeCenter = driverCoord || pickupCoord || defaultCenter;

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-dark-800 bg-dark-950 shadow-2xl">
      <MapContainer
        center={activeCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* 100% Free OpenStreetMap Tiles (No API key needed) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={activeCenter} />
        <MapClickHandler onMapClick={onMapClick} />

        {/* Pickup Marker */}
        {pickupCoord && (
          <Marker position={pickupCoord} icon={riderIcon}>
            <Popup className="font-semibold text-zinc-900">
              📍 Pickup Point
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationCoord && (
          <Marker position={destinationCoord} icon={destinationIcon}>
            <Popup className="font-semibold text-zinc-900">
              🏁 Destination Point
            </Popup>
          </Marker>
        )}

        {/* Driver Marker */}
        {driverCoord && (
          <Marker position={driverCoord} icon={carIcon}>
            <Popup className="font-semibold text-zinc-900">
              🚗 Captain (Live GPS Location)
            </Popup>
          </Marker>
        )}

        {/* Trip Route Line in Electric Emerald */}
        {pickupCoord && destinationCoord && (
          <Polyline
            positions={routePoints && routePoints.length > 0 ? routePoints : [pickupCoord, destinationCoord]}
            color="#10b981"
            weight={4}
            opacity={0.85}
            dashArray={routePoints ? null : '6, 8'}
          />
        )}

        {/* Driver to Pickup Path */}
        {driverCoord && pickupCoord && (
          <Polyline
            positions={[driverCoord, pickupCoord]}
            color="#f59e0b"
            weight={2.5}
            opacity={0.7}
            dashArray="4, 6"
          />
        )}
      </MapContainer>

      {/* Floating Info Pill */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-dark-950/80 backdrop-blur-md border border-dark-800 text-[11px] text-zinc-400 px-3 py-1.5 rounded-full shadow-lg pointer-events-none flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>OpenStreetMap Vector Canvas • Click map to set GPS</span>
      </div>
    </div>
  );
}
