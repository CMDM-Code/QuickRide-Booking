'use client';

export interface PriceSnapshot {
  totalPrice: number;
  lockedAt: string;
  pricingMode: 'locked' | 'recalculated';
  lockedBy: string;
}

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  vehicleId: number;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  priceSnapshot?: PriceSnapshot;
}

export interface Vehicle {
  id: number;
  name: string;
  plate: string;
  vin: string;
  mileage: number;
  status: 'available' | 'in-use' | 'maintenance' | 'cleaning';
}

const generateId = (): string => {
  return 'BKG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const staffStore = {
  getBookings: (): Booking[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_bookings') || '[]');
    } catch {
      return [];
    }
  },

  getVehicles: (): Vehicle[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_fleet') || '[]');
    } catch {
      return [];
    }
  },

  updateBookingStatus: (id: string, status: Booking['status'], approverId?: string) => {
    const bookings = staffStore.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
      const oldStatus = bookings[index].status;
      bookings[index].status = status;

      // Lock price at approval time if pricing mode is 'locked' and transitioning to confirmed
      if (status === 'confirmed' && oldStatus !== 'confirmed') {
        const settings = JSON.parse(localStorage.getItem('quickride_full_config_v2') || '{}');
        const pricingMode = settings?.pricing?.pricing_mode || 'locked';

        if (pricingMode === 'locked' || !bookings[index].priceSnapshot) {
          bookings[index].priceSnapshot = {
            totalPrice: bookings[index].totalPrice,
            lockedAt: new Date().toISOString(),
            pricingMode: pricingMode,
            lockedBy: approverId || 'system'
          };
        }
      }

      localStorage.setItem('quickride_bookings', JSON.stringify(bookings));
    }
  },

  assignVehicle: (bookingId: string, vehicleId: number, approverId?: string) => {
    const bookings = staffStore.getBookings();
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
      const oldStatus = bookings[index].status;
      bookings[index].vehicleId = vehicleId;
      bookings[index].status = 'confirmed';

      // Lock price at approval time if pricing mode is 'locked' and transitioning to confirmed
      if (oldStatus !== 'confirmed') {
        const settings = JSON.parse(localStorage.getItem('quickride_full_config_v2') || '{}');
        const pricingMode = settings?.pricing?.pricing_mode || 'locked';

        if (pricingMode === 'locked' || !bookings[index].priceSnapshot) {
          bookings[index].priceSnapshot = {
            totalPrice: bookings[index].totalPrice,
            lockedAt: new Date().toISOString(),
            pricingMode: pricingMode,
            lockedBy: approverId || 'system'
          };
        }
      }

      localStorage.setItem('quickride_bookings', JSON.stringify(bookings));
    }
  },

  updateVehicleStatus: (id: number, status: Vehicle['status']) => {
    const vehicles = staffStore.getVehicles();
    const index = vehicles.findIndex(v => v.id === id);
    if (index !== -1) {
      vehicles[index].status = status;
      localStorage.setItem('quickride_fleet', JSON.stringify(vehicles));
    }
  }
};
