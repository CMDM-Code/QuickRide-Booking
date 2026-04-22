// Type definitions for QuickRide Booking
export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  driving_license: string;
  role: 'customer' | 'staff' | 'admin';
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  type?: string;
  parentId?: string;
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
  with_driver: boolean;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  is_edit_pending: boolean;
  edit_details: any;
  created_at: string;
  // Join data
  vehicle?: Vehicle;
  pickup_location?: Location;
  profile?: Profile;
}

export interface PricingData {
  "24hr": Record<string, { gensan: number; southCot: number; davDelSur: number; outsideReg11: number | null }>;
  "12hr": Record<string, { gensan: number; southCot: number; davDelSur: number; outsideReg11: number | null }>;
}
