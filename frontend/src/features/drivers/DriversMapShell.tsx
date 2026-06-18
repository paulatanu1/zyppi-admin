import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { OnlineBadge } from '@/components/shared/StatusBadge';
import type { VehicleModel } from '@/lib/types';

const MAPS_KEY = import.meta.env.PUBLIC_MAPS_API_KEY;

type LiveVehicle = VehicleModel & { documents?: any };

function GoogleMapComponent({ vehicles }: { vehicles: LiveVehicle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!ref.current || !window.google) return;
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(ref.current, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        disableDefaultUI: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });
    }

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    vehicles.forEach(v => {
      const lat = v.location?.latitude;
      const lng = v.location?.longitude;
      if (!lat || !lng) return;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current!,
        title: v.vehicleDetails?.registrationNumber ?? v.vehicleId,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: v.isOnline ? '#10b981' : '#6b7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      const iw = new google.maps.InfoWindow({
        content: `<div style="font-size:12px;padding:6px;line-height:1.6">
          <b>${v.vehicleDetails?.brand ?? ''} ${v.vehicleDetails?.model ?? ''}</b><br/>
          ${v.vehicleDetails?.registrationNumber ?? v.vehicleId.slice(0, 8)}<br/>
          ${v.location?.city ? `📍 ${v.location.city}` : ''}
        </div>`,
      });
      marker.addListener('click', () => iw.open(mapRef.current!, marker));
      markersRef.current.push(marker);
    });
  }, [vehicles]);

  return <div ref={ref} className="h-full w-full rounded-xl" />;
}

export function DriversMapShell() {
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener on vehicles — no polling needed
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.vehicles),
      snap => {
        const docs = snap.docs.map(d => ({ vehicleId: d.id, ...d.data() } as LiveVehicle));
        setVehicles(docs);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  const online = vehicles.filter(v => v.isOnline);
  const offline = vehicles.filter(v => !v.isOnline);

  // Only plot vehicles that have coordinates
  const mappable = vehicles.filter(v => v.location?.latitude && v.location?.longitude);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-4">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <div>
            <p className="text-xs text-gray-500">Online Drivers</p>
            <p className="text-xl font-bold text-gray-900">{online.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Offline</p>
            <p className="text-xl font-bold text-gray-900">{offline.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
          <div>
            <p className="text-xs text-gray-500">With GPS</p>
            <p className="text-xl font-bold text-gray-900">{mappable.length}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live — updates instantly
        </div>
      </div>

      {/* Map + list */}
      <div className="flex gap-4 h-[calc(100vh-300px)]">
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200">
          {!mapsLoaded || loading ? (
            <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
              {loading ? 'Loading drivers...' : 'Loading map...'}
            </div>
          ) : (
            <GoogleMapComponent vehicles={mappable} />
          )}
        </div>

        {/* Driver list sidebar */}
        <div className="w-72 overflow-y-auto rounded-xl border border-gray-200 bg-white">
          <div className="sticky top-0 border-b border-gray-100 bg-white px-3 py-2.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              All Vehicles ({vehicles.length})
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {vehicles.length === 0 && !loading && (
              <p className="py-8 text-center text-xs text-gray-400">No vehicles registered</p>
            )}
            {vehicles.map(v => (
              <div key={v.vehicleId} className="flex items-center gap-2.5 px-3 py-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                  🚗
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {v.vehicleDetails?.brand} {v.vehicleDetails?.model}
                  </p>
                  <p className="text-[10px] font-mono text-gray-400 truncate">
                    {v.vehicleDetails?.registrationNumber ?? v.vehicleId.slice(0, 12)}
                  </p>
                  {v.location?.city && (
                    <p className="text-[10px] text-gray-400">📍 {v.location.city}</p>
                  )}
                  {!v.location?.latitude && (
                    <p className="text-[10px] text-amber-500">No GPS yet</p>
                  )}
                </div>
                <OnlineBadge online={v.isOnline ?? false} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
