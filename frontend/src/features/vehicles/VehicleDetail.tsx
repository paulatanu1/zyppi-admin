import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { SlideOver, DetailField, DetailSection } from '@/components/shared/SlideOver';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { VerificationBadge, OnlineBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/formatters';
import type { VehicleModel } from '@/lib/types';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Props {
  vehicle: (VehicleModel & { documents?: any }) | null;
  onClose: () => void;
}

export function VehicleDetail({ vehicle, onClose }: Props) {
  const qc = useQueryClient();
  const [savedLabel, setSavedLabel] = useState('');

  const updateDocStatus = useMutation({
    mutationFn: (status: string) =>
      updateDoc(doc(db, COLLECTIONS.vehicles, vehicle!.vehicleId), { documentStatus: status }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setSavedLabel(status === 'approved' ? 'Approved ✓' : 'Rejected ✓');
      setTimeout(() => setSavedLabel(''), 3000);
    },
    onError: () => {
      setSavedLabel('Failed — try again');
      setTimeout(() => setSavedLabel(''), 3000);
    },
  });

  return (
    <SlideOver
      open={!!vehicle}
      onClose={onClose}
      title={vehicle ? `${vehicle.vehicleDetails?.brand ?? ''} ${vehicle.vehicleDetails?.model ?? ''}`.trim() || 'Vehicle Detail' : ''}
      subtitle={vehicle?.vehicleDetails?.registrationNumber}
      width="xl"
    >
      {vehicle && (
        <>
          {/* Header */}
          <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">🚗</div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">
                {vehicle.vehicleDetails?.brand} {vehicle.vehicleDetails?.model}
              </h3>
              <p className="text-sm font-mono text-gray-400">{vehicle.vehicleDetails?.registrationNumber ?? '—'}</p>
              <div className="flex items-center gap-2 mt-1">
                <VerificationBadge status={vehicle.documentStatus} />
                <OnlineBadge online={vehicle.isOnline} />
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Rating', value: `⭐ ${vehicle.driver?.rating?.toFixed(1) ?? '—'}` },
              { label: 'Total Trips', value: vehicle.driver?.totalTrips ?? 0 },
              { label: 'Base Fare', value: vehicle.pricing?.basePrice ? `₹${vehicle.pricing.basePrice}` : '—' },
            ].map(s => (
              <div key={s.label} className="px-4 py-3 text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Vehicle details */}
          <DetailSection title="Vehicle Information">
            <DetailField label="Type" value={vehicle.vehicleDetails?.type} />
            <DetailField label="Color" value={vehicle.vehicleDetails?.color} />
            <DetailField label="Fuel Type" value={vehicle.vehicleDetails?.fuelType} />
            <DetailField label="Transmission" value={vehicle.vehicleDetails?.transmission as string} />
            <DetailField label="Seating Capacity" value={vehicle.vehicleDetails?.seatingCapacity ? `${vehicle.vehicleDetails.seatingCapacity} seats` : undefined} />
            <DetailField label="AC" value={vehicle.vehicleDetails?.hasAC ? '✅ Yes' : '❌ No'} />
          </DetailSection>

          <DetailSection title="Pricing">
            <DetailField label="Base Price" value={vehicle.pricing?.basePrice ? `₹${vehicle.pricing.basePrice}` : undefined} />
            <DetailField label="Per KM Rate" value={vehicle.pricing?.perKmRate ? `₹${vehicle.pricing.perKmRate}/km` : undefined} />
            <DetailField label="City" value={vehicle.location?.city} />
            <DetailField label="Registered" value={formatDate(vehicle.createdAt)} />
          </DetailSection>

          {/* Document approval actions */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Document Status</p>
            <div className="flex items-center gap-3 flex-wrap">
              <VerificationBadge status={vehicle.documentStatus} />
              <div className="flex gap-2">
                {vehicle.documentStatus !== 'approved' && (
                  <button
                    onClick={() => updateDocStatus.mutate('approved')}
                    disabled={updateDocStatus.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {updateDocStatus.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                )}
                {vehicle.documentStatus !== 'rejected' && (
                  <button
                    onClick={() => updateDocStatus.mutate('rejected')}
                    disabled={updateDocStatus.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {updateDocStatus.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                )}
              </div>
              {savedLabel && (
                <span className={`text-xs font-medium ${savedLabel.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                  {savedLabel}
                </span>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">Uploaded Documents</p>
            <DocumentViewer documents={vehicle.documents} />
          </div>
        </>
      )}
    </SlideOver>
  );
}
