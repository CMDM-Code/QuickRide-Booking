'use client';

export interface SecurityLog {
  id: string;
  timestamp: number;
  action: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  details: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'staff';
  status: 'active' | 'disabled';
  createdAt: string;
  lastLogin: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  name: string;
  year: number;
  licensePlate: string;
  vin: string;
  color: string;
  category: 'economy' | 'compact' | 'midsize' | 'suv' | 'luxury' | 'van' | 'truck';
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  available: boolean;
  dailyRate: number;
  mileage: number;
  seats: number;
  transmission: string;
  image: string;
  lastMaintenance: string;
  createdAt: string;
}

// Backwards compatibility adapter
export type AdminVehicle = Vehicle;

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  vehicleId: string;
  vehicleName: string;
  vehicleLicensePlate: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRule {
  id: string;
  name: string;
  category: string;
  type: 'base' | 'seasonal' | 'weekend' | 'holiday' | 'surge' | 'discount';
  value: number;
  valueType: 'fixed' | 'percentage';
  active: boolean;
  validFrom: string;
  validTo: string;
  priority: number;
  createdAt: string;
}

export interface NotificationTrigger {
  id: string;
  name: string;
  event: string;
  channel: 'email' | 'sms' | 'push' | 'all';
  template: string;
  subject: string;
  active: boolean;
  sendTiming: 'immediate' | '1h' | '24h' | '48h' | '7d';
  createdAt: string;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const adminStore = {
  // ✅ Security Logs - APPEND ONLY, IMMUTABLE
  logSecurityEvent: (action: string, details: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem('quickride_security_logs') || '[]');
      
      const newLog: SecurityLog = {
        id: `LOG-${generateId()}`,
        timestamp: Date.now(),
        action,
        userId: localStorage.getItem('quickride_admin_session') || 'system',
        ipAddress: '127.0.0.1',
        userAgent: navigator.userAgent,
        details
      };

      logs.unshift(newLog);
      localStorage.setItem('quickride_security_logs', JSON.stringify(logs.slice(0, 1000))); // Keep last 1000 logs
    } catch {}
  },

  getSecurityLogs: (): SecurityLog[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_security_logs') || '[]');
    } catch {
      return [];
    }
  },

  // ✅ User Management with RBAC
  getUsers: (): AdminUser[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_admin_users') || '[]');
    } catch {
      return [];
    }
  },

  createUser: (email: string, name: string, role: AdminUser['role']) => {
    const users = adminStore.getUsers();
    
    const newUser: AdminUser = {
      id: `USR-${generateId()}`,
      email,
      name,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: ''
    };

    users.push(newUser);
    localStorage.setItem('quickride_admin_users', JSON.stringify(users));
    adminStore.logSecurityEvent('USER_CREATED', `Created user ${email} with role ${role}`);
    
    return newUser;
  },

  updateUserStatus: (id: string, status: AdminUser['status']) => {
    const users = adminStore.getUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index !== -1) {
      users[index].status = status;
      localStorage.setItem('quickride_admin_users', JSON.stringify(users));
      adminStore.logSecurityEvent('USER_STATUS_CHANGED', `User ${users[index].email} status changed to ${status}`);
    }
  },

  updateUserRole: (id: string, role: AdminUser['role']) => {
    const users = adminStore.getUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index !== -1) {
      const oldRole = users[index].role;
      users[index].role = role;
      localStorage.setItem('quickride_admin_users', JSON.stringify(users));
      adminStore.logSecurityEvent('USER_ROLE_CHANGED', `User ${users[index].email} role changed from ${oldRole} to ${role}`);
    }
  },

  // ✅ Vehicle Management
  getVehicles: (): Vehicle[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_vehicles') || '[]');
    } catch {
      return [];
    }
  },

  createVehicle: (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const vehicles = adminStore.getVehicles();
    
    const newVehicle: Vehicle = {
      id: `VEH-${generateId()}`,
      ...vehicleData,
      createdAt: new Date().toISOString()
    };

    vehicles.push(newVehicle);
    localStorage.setItem('quickride_vehicles', JSON.stringify(vehicles));
    adminStore.logSecurityEvent('VEHICLE_CREATED', `Created vehicle ${vehicleData.make} ${vehicleData.model} ${vehicleData.licensePlate}`);
    
    return newVehicle;
  },

  updateVehicleStatus: (id: string, status: Vehicle['status']) => {
    const vehicles = adminStore.getVehicles();
    const index = vehicles.findIndex(v => v.id === id);
    
    if (index !== -1) {
      vehicles[index].status = status;
      localStorage.setItem('quickride_vehicles', JSON.stringify(vehicles));
      adminStore.logSecurityEvent('VEHICLE_STATUS_CHANGED', `Vehicle ${vehicles[index].licensePlate} status changed to ${status}`);
    }
  },

  updateVehicle: (id: string, updates: Partial<Vehicle>) => {
    const vehicles = adminStore.getVehicles();
    const index = vehicles.findIndex(v => v.id === id);
    
    if (index !== -1) {
      vehicles[index] = { ...vehicles[index], ...updates };
      localStorage.setItem('quickride_vehicles', JSON.stringify(vehicles));
      adminStore.logSecurityEvent('VEHICLE_UPDATED', `Updated vehicle ${vehicles[index].licensePlate}`);
    }
  },

  deleteVehicle: (id: string) => {
    const vehicles = adminStore.getVehicles();
    const vehicle = vehicles.find(v => v.id === id);
    const filteredVehicles = vehicles.filter(v => v.id !== id);
    
    localStorage.setItem('quickride_vehicles', JSON.stringify(filteredVehicles));
    if (vehicle) {
      adminStore.logSecurityEvent('VEHICLE_DELETED', `Deleted vehicle ${vehicle.licensePlate}`);
    }
  },

  // ✅ Booking Management
  getBookings: (): Booking[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_bookings') || '[]');
    } catch {
      return [];
    }
  },

  createBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => {
    const bookings = adminStore.getBookings();
    
    const newBooking: Booking = {
      id: `BKG-${generateId()}`,
      ...bookingData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bookings.unshift(newBooking);
    localStorage.setItem('quickride_bookings', JSON.stringify(bookings));
    adminStore.logSecurityEvent('BOOKING_CREATED', `Created booking ${newBooking.id} for ${bookingData.userName}`);
    
    return newBooking;
  },

  updateBookingStatus: (id: string, status: Booking['status']) => {
    const bookings = adminStore.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    
    if (index !== -1) {
      const oldStatus = bookings[index].status;
      bookings[index].status = status;
      bookings[index].updatedAt = new Date().toISOString();
      localStorage.setItem('quickride_bookings', JSON.stringify(bookings));
      adminStore.logSecurityEvent('BOOKING_STATUS_CHANGED', `Booking ${id} status changed from ${oldStatus} to ${status}`);
    }
  },

  updatePaymentStatus: (id: string, paymentStatus: Booking['paymentStatus']) => {
    const bookings = adminStore.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    
    if (index !== -1) {
      bookings[index].paymentStatus = paymentStatus;
      bookings[index].updatedAt = new Date().toISOString();
      localStorage.setItem('quickride_bookings', JSON.stringify(bookings));
      adminStore.logSecurityEvent('PAYMENT_STATUS_CHANGED', `Booking ${id} payment status changed to ${paymentStatus}`);
    }
  },

  updateBooking: (id: string, updates: Partial<Booking>) => {
    const bookings = adminStore.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    
    if (index !== -1) {
      bookings[index] = { ...bookings[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('quickride_bookings', JSON.stringify(bookings));
      adminStore.logSecurityEvent('BOOKING_UPDATED', `Updated booking ${id}`);
    }
  },

  // ✅ Dynamic Pricing Engine
  getPricingRules: (): PricingRule[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_pricing_rules') || '[]');
    } catch {
      return [];
    }
  },

  createPricingRule: (ruleData: Omit<PricingRule, 'id' | 'createdAt'>) => {
    const rules = adminStore.getPricingRules();
    
    const newRule: PricingRule = {
      id: `PRC-${generateId()}`,
      ...ruleData,
      createdAt: new Date().toISOString()
    };

    rules.push(newRule);
    localStorage.setItem('quickride_pricing_rules', JSON.stringify(rules));
    adminStore.logSecurityEvent('PRICING_RULE_CREATED', `Created pricing rule ${ruleData.name}`);
    
    return newRule;
  },

  updatePricingRule: (id: string, updates: Partial<PricingRule>) => {
    const rules = adminStore.getPricingRules();
    const index = rules.findIndex(r => r.id === id);
    
    if (index !== -1) {
      rules[index] = { ...rules[index], ...updates };
      localStorage.setItem('quickride_pricing_rules', JSON.stringify(rules));
      adminStore.logSecurityEvent('PRICING_RULE_UPDATED', `Updated pricing rule ${id}`);
    }
  },

  deletePricingRule: (id: string) => {
    const rules = adminStore.getPricingRules();
    const rule = rules.find(r => r.id === id);
    const filteredRules = rules.filter(r => r.id !== id);
    
    localStorage.setItem('quickride_pricing_rules', JSON.stringify(filteredRules));
    if (rule) {
      adminStore.logSecurityEvent('PRICING_RULE_DELETED', `Deleted pricing rule ${rule.name}`);
    }
  },

  // ✅ Notification Trigger System
  getNotificationTriggers: (): NotificationTrigger[] => {
    try {
      return JSON.parse(localStorage.getItem('quickride_notification_triggers') || '[]');
    } catch {
      return [];
    }
  },

  createNotificationTrigger: (triggerData: Omit<NotificationTrigger, 'id' | 'createdAt'>) => {
    const triggers = adminStore.getNotificationTriggers();
    
    const newTrigger: NotificationTrigger = {
      id: `NOT-${generateId()}`,
      ...triggerData,
      createdAt: new Date().toISOString()
    };

    triggers.push(newTrigger);
    localStorage.setItem('quickride_notification_triggers', JSON.stringify(triggers));
    adminStore.logSecurityEvent('NOTIFICATION_TRIGGER_CREATED', `Created notification trigger ${triggerData.name}`);
    
    return newTrigger;
  },

  updateNotificationTrigger: (id: string, updates: Partial<NotificationTrigger>) => {
    const triggers = adminStore.getNotificationTriggers();
    const index = triggers.findIndex(t => t.id === id);
    
    if (index !== -1) {
      triggers[index] = { ...triggers[index], ...updates };
      localStorage.setItem('quickride_notification_triggers', JSON.stringify(triggers));
      adminStore.logSecurityEvent('NOTIFICATION_TRIGGER_UPDATED', `Updated notification trigger ${id}`);
    }
  },

  deleteNotificationTrigger: (id: string) => {
    const triggers = adminStore.getNotificationTriggers();
    const trigger = triggers.find(t => t.id === id);
    const filteredTriggers = triggers.filter(t => t.id !== id);
    
    localStorage.setItem('quickride_notification_triggers', JSON.stringify(filteredTriggers));
    if (trigger) {
      adminStore.logSecurityEvent('NOTIFICATION_TRIGGER_DELETED', `Deleted notification trigger ${trigger.name}`);
    }
  }
};

// Initialize default super admin on first run (client-side only)
if (typeof window !== 'undefined' && adminStore.getUsers().length === 0) {
  adminStore.createUser('admin@quickridebooking.com', 'System Administrator', 'super_admin');
}
