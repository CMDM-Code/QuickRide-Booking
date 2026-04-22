import type { BookingFormConfig } from "@/lib/types";

export const DEFAULT_BOOKING_FORM_CONFIG: BookingFormConfig = {
  version: 1,
  fields: {
    locations: { enabled: true, maxDestinations: 3, allowMultiDestination: true },
    specific_address: {
      enabled: true,
      required: false,
      label: "Specific Landmark / Notes",
      placeholder: "E.g. SM GenSan, Francisco Gold Hotel, Terminal..."
    },
    with_driver: { enabled: true, label: "Professional Driver" },
    start_end: { enabled: true, minHours: 12 }
  },
  custom_fields: []
};

export function normalizeBookingFormConfig(raw: any): BookingFormConfig {
  const cfg: BookingFormConfig = {
    ...DEFAULT_BOOKING_FORM_CONFIG,
    ...(raw && typeof raw === "object" ? raw : {})
  };

  // Ensure nested defaults
  cfg.fields = {
    ...DEFAULT_BOOKING_FORM_CONFIG.fields,
    ...(cfg.fields || {})
  };
  cfg.fields.locations = {
    ...DEFAULT_BOOKING_FORM_CONFIG.fields.locations!,
    ...(cfg.fields.locations || {})
  };
  cfg.fields.specific_address = {
    ...DEFAULT_BOOKING_FORM_CONFIG.fields.specific_address!,
    ...(cfg.fields.specific_address || {})
  };
  cfg.fields.with_driver = {
    ...DEFAULT_BOOKING_FORM_CONFIG.fields.with_driver!,
    ...(cfg.fields.with_driver || {})
  };
  cfg.fields.start_end = {
    ...DEFAULT_BOOKING_FORM_CONFIG.fields.start_end!,
    ...(cfg.fields.start_end || {})
  };

  cfg.custom_fields = Array.isArray(cfg.custom_fields) ? cfg.custom_fields : [];
  cfg.custom_fields = cfg.custom_fields
    .filter((f) => f && typeof f === "object" && typeof f.key === "string" && f.key.trim())
    .map((f) => ({
      key: String(f.key).trim(),
      label: String(f.label ?? f.key).trim(),
      type: (f.type as any) || "text",
      required: Boolean(f.required ?? false),
      enabled: f.enabled === undefined ? true : Boolean(f.enabled),
      placeholder: f.placeholder ? String(f.placeholder) : "",
      options: Array.isArray(f.options) ? f.options.map(String) : [],
      order: typeof f.order === "number" ? f.order : 0
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label));

  return cfg;
}

