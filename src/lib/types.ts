// Type definitions for QuickRide Booking
export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  driving_license: string;
  role: 'customer' | 'staff' | 'admin';
  loyalty_points?: number;
  created_at: string;
  notification_preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  in_app: boolean;
  email: boolean;
  sms: boolean;
  types: {
    booking_updates: boolean;
    promotions: boolean;
    reminders: boolean;
    chat: boolean;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'booking_status' | 'reminder' | 'chat' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: {
    booking_id?: string;
    chat_id?: string;
    [key: string]: any;
  };
  read: boolean;
  created_at: string;
  scheduled_at?: string;
}

export interface Chat {
  id: string; // usually booking_id
  type: 'booking' | 'support';
  participants: string[]; // user IDs
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  read_by: string[]; // user IDs
}

export interface BookingParticipant {
  user_id: string;
  role: 'owner' | 'participant';
  joined_at: string;
}

export interface BookingInvite {
  id: string;
  booking_id: string;
  inviter_id: string;
  email: string;
  role: 'participant';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  success: string;
  warning: string;
  error: string;
}

export interface BrandingScope {
  admin: boolean;
  staff: boolean;
  client: boolean;
  public_pages: boolean;
}

export interface BrandingConfig {
  system_name: string;
  logo_url: string;
  favicon_url?: string;
  login_background_url?: string;
  light_theme: ThemeColors;
  dark_theme: ThemeColors;
  scope: BrandingScope;
  updated_at?: any;
}

export interface LocationLevel {
  id: string;
  name: string;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface Location {
  id: string;
  name: string;
  type?: string;
  parentId?: string;
  levelId?: string;
}

export interface CarType {
  id: string;
  name: string;
  driver_only: boolean;
}

export interface PricingRate {
  id: string;
  car_type_id: string;
  location_id: string;
  rate_12hr: number | null;
  rate_24hr: number | null;
  // Join data
  location?: Location;
  car_type?: CarType;
}

export interface PricingSheet {
  id: string;
  rates: Record<
    string,
    {
      "hourly": number | null;
      "12h": number | null;
      "24h": number | null;
    }
  >;
  created_at?: any;
}

export type BookingFormFieldType = "text" | "number" | "date" | "select" | "textarea";

export type BookingFormCustomField = {
  key: string; // stored in booking.custom_fields[key]
  label: string;
  type: BookingFormFieldType;
  required?: boolean;
  enabled?: boolean;
  placeholder?: string;
  options?: string[]; // for select
  order?: number;
};

export type BookingFormConfig = {
  version: number;
  fields: {
    locations?: { enabled: boolean; maxDestinations: number; allowMultiDestination: boolean };
    specific_address?: { enabled: boolean; required: boolean; label: string; placeholder?: string };
    with_driver?: { enabled: boolean; label: string };
    start_end?: { enabled: boolean; minHours: number };
  };
  custom_fields: BookingFormCustomField[];
  updated_at?: any;
};

export interface Vehicle {
  id: string;
  name: string;
  car_type_id: string;
  seats: number;
  transmission: string;
  year: string;
  image_url: string;
  available: boolean;
  // Join data
  car_type?: CarType;
}

export interface PriceBreakdown {
  baseTotal: number;
  driverFee: number;
  totalHours: number;
  blocks24h: number;
  blocks12h: number;
  extraHours: number;
  hourlyRate: number;
  rate12h: number;
  rate24h: number;
  matchedLocationId: string;
  matchedLocationName: string;
  carTypeId: string;
  carTypeName: string;
  scheduledPriceApplied: boolean;
  scheduleId?: string;
  scheduleName?: string;
  calculatedAt: string;
}

export interface Booking {
  id: string;
  user_id: string;
  car_id: string;
  pickup_location_id: string;
  dropoff_locations_ids: string[];
  specific_address: string;
  start_date: string;
  end_date: string;
  total_price: number;
  price_mode: 'locked' | 'recalculated';
  price_breakdown?: PriceBreakdown;
  with_driver: boolean;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  is_edit_pending: boolean;
  edit_details: any;
  created_at: string;
  participants?: BookingParticipant[];
  participant_ids?: string[]; // user IDs
  assigned_staff_id?: string; // staff ID
  // Join data
  vehicle?: Vehicle;
  pickup_location?: Location;
  profile?: Profile;
}

export interface SystemLog {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  user_id?: string;
  created_at: string;
  data?: any;
}

export interface PricingData {
  "24hr": Record<string, { gensan: number; southCot: number; davDelSur: number; outsideReg11: number | null }>;
  "12hr": Record<string, { gensan: number; southCot: number; davDelSur: number; outsideReg11: number | null }>;
}
