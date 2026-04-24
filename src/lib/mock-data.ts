import { Location, Vehicle, PricingRate } from './types';

export const MOCK_LOCATIONS: Location[] = [
  { id: 'loc_gensan', name: 'General Santos City (Base)' },
  { id: 'loc_southcot', name: 'South Cotabato' },
  { id: 'loc_saranggani', name: 'Saranggani' },
  { id: 'loc_davaosur', name: 'Davao del Sur' },
  { id: 'loc_davaonorte', name: 'Davao del Norte' },
  { id: 'loc_outside11', name: 'Outside Region 11' }
];

export const MOCK_VEHICLES: (Vehicle & { car_type: any })[] = [
  {
    id: 'veh_mazdavan',
    name: 'Mazda DA17 2024',
    car_type_id: 'type_mini_van',
    year: '2024',
    available: true,
    image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&q=80&w=800',
    seats: 9,
    transmission: 'Automatic',
    car_type: { id: 'type_mini_van', name: 'Mini Van', driver_only: false }
  },
  {
    id: 'veh_mirage_gls',
    name: 'Mitsubishi Mirage GLS',
    car_type_id: 'type_hatchback',
    year: '2024',
    available: true,
    image_url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c15d?auto=format&fit=crop&q=80&w=800',
    seats: 4,
    transmission: 'Automatic',
    car_type: { id: 'type_hatchback', name: 'Hatchback', driver_only: false }
  },
  {
    id: 'veh_vios_xle',
    name: 'Toyota Vios XLE',
    car_type_id: 'type_sedan',
    year: '2024',
    available: true,
    image_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800',
    seats: 5,
    transmission: 'Automatic',
    car_type: { id: 'type_sedan', name: 'Sedan', driver_only: false }
  },
  {
    id: 'veh_ertiga',
    name: 'Suzuki Ertiga Hybrid',
    car_type_id: 'type_suv',
    year: '2024',
    available: true,
    image_url: 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&q=80&w=800',
    seats: 8,
    transmission: 'Automatic',
    car_type: { id: 'type_suv', name: 'SUV', driver_only: false }
  },
  {
    id: 'veh_l300',
    name: 'Mitsubishi L300',
    car_type_id: 'type_l300',
    year: '2024',
    available: true,
    image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800',
    seats: 15,
    transmission: 'Manual',
    car_type: { id: 'type_l300', name: 'L300', driver_only: false }
  },
  {
    id: 'veh_pickup',
    name: 'Toyota Hilux Pickup',
    car_type_id: 'type_pick_up',
    year: '2024',
    available: true,
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
    seats: 5,
    transmission: 'Automatic',
    car_type: { id: 'type_pick_up', name: 'Pick Up', driver_only: false }
  }
];

export const MOCK_RATES: PricingRate[] = [
  // Sample rates for calculation logic
  { id: '1', car_type_id: 'type_mini_van', location_id: 'loc_gensan', rate_12hr: 700, rate_24hr: 1300 },
  { id: '2', car_type_id: 'type_hatchback', location_id: 'loc_gensan', rate_12hr: 800, rate_24hr: 1400 },
  { id: '3', car_type_id: 'type_sedan', location_id: 'loc_gensan', rate_12hr: 1000, rate_24hr: 1600 },
  { id: '4', car_type_id: 'type_suv', location_id: 'loc_gensan', rate_12hr: 1300, rate_24hr: 1900 },
  { id: '5', car_type_id: 'type_l300', location_id: 'loc_gensan', rate_12hr: 1500, rate_24hr: 2500 },
  { id: '6', car_type_id: 'type_pick_up', location_id: 'loc_gensan', rate_12hr: 1200, rate_24hr: 2000 },
];
