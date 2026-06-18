import type { Timestamp } from 'firebase/firestore';

// ── User ─────────────────────────────────────────────────────────────────────
export interface UserModel {
  userId: string;
  fullName?: string;
  email?: string;
  mobile?: string;
  role?: 'User' | 'Driver' | 'Vehicle Owner';
  profileImageUrl?: string;
  verificationStatus?: 'pending' | 'submitted' | 'approved' | 'rejected';
  isAdmin?: boolean;
  fcmToken?: string;
  authMethod?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

// ── Vehicle ──────────────────────────────────────────────────────────────────
export interface VehicleModel {
  vehicleId: string;
  userId: string;
  isOnline: boolean;
  isAvailable: boolean;
  documentStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'active';
  location?: { city?: string; latitude?: number; longitude?: number };
  vehicleDetails?: {
    type?: string;
    brand?: string;
    model?: string;
    registrationNumber?: string;
    color?: string;
    seatingCapacity?: number;
    hasAC?: boolean;
    fuelType?: string;
  };
  pricing?: { basePrice?: number; perKmRate?: number };
  driver?: { rating?: number; totalTrips?: number };
  createdAt?: Timestamp;
}

// ── Booking ──────────────────────────────────────────────────────────────────
export type BookingStatus =
  | 'pending' | 'confirmed' | 'driverArriving' | 'arrived'
  | 'inProgress' | 'completed' | 'cancelled' | 'rejected' | 'expired';

export interface BookingModel {
  bookingId: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  status: BookingStatus;
  bookingType?: string;
  pickupLocation?: { address?: string; latitude?: number; longitude?: number };
  dropLocation?: { address?: string; latitude?: number; longitude?: number };
  vehicle?: { vehicleId?: string; type?: string; registrationNumber?: string };
  driver?: { driverId?: string; name?: string; rating?: number };
  fareDetails?: {
    baseFare?: number;
    perKmRate?: number;
    distance?: number;
    totalFare?: number;
    discount?: number;
  };
  paymentMethod?: string;
  paymentStatus?: string;
  rideOtp?: string;
  createdAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  userRating?: number;
  driverRating?: number;
}

// ── Driver (live) ─────────────────────────────────────────────────────────────
export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  isOnline?: boolean;
  lastUpdated?: Timestamp;
  currentBookingId?: string;
}

// ── Content ───────────────────────────────────────────────────────────────────
export interface BannerModel {
  id: string;
  title?: string;
  imageUrl?: string;
  isActive?: boolean;
  priority?: number;
  expiryDate?: Timestamp;
}

export interface OfferModel {
  id: string;
  code?: string;
  discount?: number;
  isActive?: boolean;
  minBookingAmount?: number;
  expiryDate?: Timestamp;
}

export interface OfferBannerModel {
  id: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  promoCode?: string;
  discount?: number;
  actionRoute?: string;
  isActive?: boolean;
  priority?: number;
  expiryDate?: Timestamp;
}

// ── Push Notification ─────────────────────────────────────────────────────────
export type NotificationTarget = 'all' | 'topic' | 'token';
export type NotificationStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  target: NotificationTarget;
  topic?: string;
  token?: string;
  targetUserId?: string;
  targetUserName?: string;
  data?: Record<string, string>;
  status: NotificationStatus;
  sentCount?: number;
  errorMessage?: string;
  createdAt?: Timestamp;
  sentAt?: Timestamp;
  createdBy?: string;
}

// ── Support ───────────────────────────────────────────────────────────────────
export interface ComplaintModel {
  id: string;
  userId?: string;
  ticketId?: string;
  subject?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  status?: string;
  createdAt?: Timestamp;
}

export interface FeedbackModel {
  id: string;
  userId?: string;
  feedbackId?: string;
  rating?: number;
  message?: string;
  createdAt?: Timestamp;
}
