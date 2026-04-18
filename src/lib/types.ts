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
