import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { OnlineBadge } from '@/components/shared/StatusBadge';
import type { DriverLocation } from '@/lib/types';

const MAPS_KEY = import.meta.env.PUBLIC_MAPS_API_KEY;

async function fetchDrivers(): Promise<DriverLocation[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.drivers));
  return snap.docs.map(d => ({ driverId: d.id, ...d.data() } as DriverLocation));
}

function GoogleMapComponent({ drivers }: { drivers: DriverLocation[] }) {
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

    drivers.forEach(driver => {
      if (!driver.latitude || !driver.longitude) return;
      const marker = new google.maps.Marker({
        position: { lat: driver.latitude, lng: driver.longitude },
        map: mapRef.current!,
        title: driver.driverId,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: driver.isOnline ? '#10b981' : '#6b7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
      const iw = new google.maps.InfoWindow({
        content: `<div style="font-size:12px;padding:4px"><b>Driver</b><br/>ID: ${driver.driverId.slice(0, 8)}…<br/>Speed: ${driver.speed?.toFixed(0) ?? '0'} km/h</div>`,
      });
      marker.addListener('click', () => iw.open(mapRef.current!, marker));
      markersRef.current.push(marker);
    });
  }, [drivers]);

  return <div ref={ref} className="h-full w-full rounded-xl" />;
}

export function DriversMapShell() {
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers, refetchInterval: 10_000 });

  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  const online = data.filter(d => d.isOnline);
  const offline = data.filter(d => !d.isOnline);

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
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Auto-refreshes every 10s
        </div>
      </div>

      {/* Map + list */}
      <div className="flex gap-4 h-[calc(100vh-280px)]">
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200">
          {!mapsLoaded || isLoading ? (
            <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
              {isLoading ? 'Loading drivers...' : 'Loading map...'}
            </div>
          ) : (
            <GoogleMapComponent drivers={data} />
          )}
        </div>

        {/* Driver list sidebar */}
        <div className="w-64 overflow-y-auto rounded-xl border border-gray-200 bg-white">
          <div className="sticky top-0 border-b border-gray-100 bg-white px-3 py-2.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">All Drivers</p>
          </div>
          <div className="divide-y divide-gray-100">
            {data.map(d => (
              <div key={d.driverId} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                  {d.driverId.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-gray-700 truncate">{d.driverId.slice(0, 12)}…</p>
                  <p className="text-[10px] text-gray-400">{d.speed?.toFixed(0) ?? 0} km/h</p>
                </div>
                <OnlineBadge online={d.isOnline ?? false} />
              </div>
            ))}
            {data.length === 0 && !isLoading && (
              <p className="py-8 text-center text-xs text-gray-400">No driver data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
