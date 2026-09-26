import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface FarmMapPreviewProps {
  latitude: number;
  longitude: number;
  label?: string;
  elevationMeters?: number | null;
}

export const FarmMapPreview: React.FC<FarmMapPreviewProps> = ({
  latitude,
  longitude,
  label,
  elevationMeters,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      // Clean up any existing map instance on container
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 12,
        scrollWheelZoom: false,
        attributionControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Custom crisp SVG marker icon
      const customIcon = L.divIcon({
        className: 'custom-farm-pin',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#1b4332;border:2px solid #ffffff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.25);transform:translate(-50%, -50%);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;color:#1e293b;padding:2px 4px;">
          <strong style="color:#1b4332;font-size:13px;display:block;margin-bottom:2px;">${label || 'Farm Location'}</strong>
          <div>Lat: ${latitude.toFixed(5)}°</div>
          <div>Lon: ${longitude.toFixed(5)}°</div>
          ${elevationMeters ? `<div>Elev: ${elevationMeters}m</div>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);

      // Invalidate size once rendered to ensure tiles display properly
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.warn('Leaflet map initialization error:', err);
      setMapError(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, label, elevationMeters]);

  if (mapError) {
    return (
      <div className="w-full h-48 bg-stone-100 rounded-xl flex items-center justify-center border border-stone-200 text-stone-500 text-xs">
        Map preview unavailable
      </div>
    );
  }

  return (
    <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-stone-200 shadow-sm z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-mono text-stone-700 shadow-sm border border-stone-200/80 pointer-events-none">
        {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
      </div>
    </div>
  );
};
