'use client';

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

  updateBookingStatus: (id: string, status: Booking['status']) => {
    const bookings = staffStore.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
      bookings[index].status = status;
      localStorage.setItem('quickride_bookings', JSON.stringify(bookings));
    }
  },

  assignVehicle: (bookingId: string, vehicleId: number) => {
    const bookings = staffStore.getBookings();
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
      bookings[index].vehicleId = vehicleId;
      bookings[index].status = 'confirmed';
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
