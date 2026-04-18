'use client';

import { authClient, User } from './auth-client';

interface Storable {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking extends Storable {
  vehicleId: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  totalPrice: number;
}

export interface Favorite extends Storable {
  vehicleId: string;
  vehicleName: string;
  vehicleImage: string;
  vehiclePrice: number;
}

export interface PaymentMethod extends Storable {
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface Notification extends Storable {
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

export interface Review extends Storable {
  bookingId: string;
  vehicleId: string;
  rating: number;
  comment: string;
}

export interface SupportTicket extends Storable {
  subject: string;
  status: 'open' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  messages: {
    id: string;
    sender: 'user' | 'support';
    message: string;
    createdAt: string;
  }[];
}

const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const createStore = <T extends Storable>(key: string) => {
  const getItems = (): T[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  };

  const setItems = (items: T[]) => {
    localStorage.setItem(key, JSON.stringify(items));
  };

  return {
    getAll: (userId: string): T[] => {
      return getItems().filter(item => item.userId === userId);
    },

    getById: (id: string, userId: string): T | undefined => {
      return getItems().find(item => item.id === id && item.userId === userId);
    },

    create: (data: Omit<T, keyof Storable>): T => {
      const user = authClient.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const newItem = {
        ...data,
        id: generateId(),
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      } as T;

      const items = getItems();
      items.push(newItem);
      setItems(items);

      return newItem;
    },

    update: (id: string, data: Partial<T>): T | null => {
      const user = authClient.getCurrentUser();
      if (!user) return null;

      const items = getItems();
      const index = items.findIndex(item => item.id === id && item.userId === user.id);
      
      if (index === -1) return null;

      items[index] = {
        ...items[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      setItems(items);
      return items[index];
    },

    delete: (id: string): boolean => {
      const user = authClient.getCurrentUser();
      if (!user) return false;

      const items = getItems();
      const filtered = items.filter(item => !(item.id === id && item.userId === user.id));
      
      if (filtered.length === items.length) return false;
      
      setItems(filtered);
      return true;
    }
  };
};

export const bookingStore = createStore<Booking>('quickride_bookings');
export const favoriteStore = createStore<Favorite>('quickride_favorites');
export const paymentStore = createStore<PaymentMethod>('quickride_payments');
export const notificationStore = createStore<Notification>('quickride_notifications');
export const reviewStore = createStore<Review>('quickride_reviews');
export const ticketStore = createStore<SupportTicket>('quickride_tickets');
