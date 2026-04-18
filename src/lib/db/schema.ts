import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  licensePlate: text('license_plate').notNull().unique(),
  vin: text('vin').notNull().unique(),
  color: text('color').notNull(),
  category: text('category', { enum: ['economy', 'compact', 'midsize', 'suv', 'luxury', 'van', 'truck'] }).notNull(),
  status: text('status', { enum: ['available', 'rented', 'maintenance', 'retired'] }).notNull().default('available'),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  dailyRate: real('daily_rate').notNull(),
  mileage: integer('mileage').notNull(),
  seats: integer('seats').notNull().default(5),
  transmission: text('transmission').notNull().default('Automatic'),
  image: text('image').notNull(),
  lastMaintenance: integer('last_maintenance', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
  vehicleName: text('vehicle_name').notNull(),
  vehicleLicensePlate: text('vehicle_license_plate').notNull(),
  startDate: integer('start_date', { mode: 'timestamp_ms' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp_ms' }).notNull(),
  pickupLocation: text('pickup_location').notNull(),
  returnLocation: text('return_location').notNull(),
  totalAmount: real('total_amount').notNull(),
  status: text('status', { enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show'] }).notNull().default('pending'),
  paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'refunded', 'failed'] }).notNull().default('pending'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const securityLogs = sqliteTable('security_logs', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  action: text('action').notNull(),
  userId: text('user_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  details: text('details').notNull(),
});

export const adminUsers = sqliteTable('admin_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['super_admin', 'admin', 'manager', 'staff'] }).notNull(),
  status: text('status', { enum: ['active', 'disabled'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  lastLogin: integer('last_login', { mode: 'timestamp_ms' }),
});

export const pricingRules = sqliteTable('pricing_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  type: text('type', { enum: ['base', 'seasonal', 'weekend', 'holiday', 'surge', 'discount'] }).notNull(),
  value: real('value').notNull(),
  valueType: text('value_type', { enum: ['fixed', 'percentage'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  validFrom: integer('valid_from', { mode: 'timestamp_ms' }).notNull(),
  validTo: integer('valid_to', { mode: 'timestamp_ms' }).notNull(),
  priority: integer('priority').notNull().default(10),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const notificationTriggers = sqliteTable('notification_triggers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  event: text('event').notNull(),
  channel: text('channel', { enum: ['email', 'sms', 'push', 'all'] }).notNull(),
  template: text('template').notNull(),
  subject: text('subject'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sendTiming: text('send_timing', { enum: ['immediate', '1h', '24h', '48h', '7d'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type SecurityLog = typeof securityLogs.$inferSelect;
export type NewSecurityLog = typeof securityLogs.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;
export type NotificationTrigger = typeof notificationTriggers.$inferSelect;
export type NewNotificationTrigger = typeof notificationTriggers.$inferInsert;
