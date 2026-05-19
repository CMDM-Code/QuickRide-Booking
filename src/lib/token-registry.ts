import { ThemeTokens } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REGISTRY
// Single source of truth that drives the branding page UI.
// Add a new entry here to get a new color picker automatically.
// ─────────────────────────────────────────────────────────────────────────────

export type TokenGroup =
  | "Brand"
  | "Backgrounds"
  | "Text"
  | "Borders"
  | "Semantic"
  | "Layout Chrome";

export interface TokenDef {
  key: keyof ThemeTokens;
  label: string;
  group: TokenGroup;
  description?: string;
  /**
   * For text tokens, reference the background token key they sit on top of
   * (used for WCAG contrast calculation).
   */
  contrastAgainst?: keyof ThemeTokens;
}

export const TOKEN_REGISTRY: TokenDef[] = [
  // ── Brand ─────────────────────────────────────────────────
  {
    key: "primary",
    label: "Primary",
    group: "Brand",
    description: "Main interactive / CTA color",
    contrastAgainst: "bg_base",
  },
  {
    key: "primary_hover",
    label: "Primary Hover",
    group: "Brand",
    description: "Darker shade used on hover/active states",
    contrastAgainst: "bg_base",
  },
  {
    key: "secondary",
    label: "Secondary",
    group: "Brand",
    description: "Secondary interactive color",
    contrastAgainst: "bg_base",
  },
  {
    key: "accent",
    label: "Accent",
    group: "Brand",
    description: "Highlight / accent CTA",
    contrastAgainst: "bg_base",
  },

  // ── Backgrounds ────────────────────────────────────────────
  {
    key: "bg_base",
    label: "Page Background",
    group: "Backgrounds",
    description: "Main page canvas color",
  },
  {
    key: "bg_surface",
    label: "Card Surface",
    group: "Backgrounds",
    description: "Card and elevated panel background",
  },
  {
    key: "bg_subtle",
    label: "Subtle Background",
    group: "Backgrounds",
    description: "Input fields, table stripes, secondary containers",
  },
  {
    key: "bg_inverse",
    label: "Inverse Background",
    group: "Backgrounds",
    description: "Dark bar used for inverted/full-bleed sections",
  },

  // ── Text ───────────────────────────────────────────────────
  {
    key: "text_primary",
    label: "Primary Text",
    group: "Text",
    description: "Main headings and body copy",
    contrastAgainst: "bg_base",
  },
  {
    key: "text_secondary",
    label: "Secondary Text",
    group: "Text",
    description: "Sub-labels, metadata, supporting copy",
    contrastAgainst: "bg_surface",
  },
  {
    key: "text_muted",
    label: "Muted Text",
    group: "Text",
    description: "Placeholders and disabled text",
    contrastAgainst: "bg_surface",
  },
  {
    key: "text_inverse",
    label: "Inverse Text",
    group: "Text",
    description: "Text rendered on dark/primary backgrounds",
    contrastAgainst: "bg_inverse",
  },
  {
    key: "text_link",
    label: "Link Text",
    group: "Text",
    description: "Hyperlink and anchor color",
    contrastAgainst: "bg_base",
  },

  // ── Borders ────────────────────────────────────────────────
  {
    key: "border_subtle",
    label: "Subtle Border",
    group: "Borders",
    description: "Dividers and light card outlines",
  },
  {
    key: "border_default",
    label: "Default Border",
    group: "Borders",
    description: "Standard input and container borders",
  },
  {
    key: "border_strong",
    label: "Strong Border",
    group: "Borders",
    description: "Focus rings and selected/active outlines",
  },

  // ── Semantic ───────────────────────────────────────────────
  {
    key: "success",
    label: "Success",
    group: "Semantic",
    description: "Positive state — confirmations, checkmarks",
    contrastAgainst: "success_bg",
  },
  {
    key: "success_bg",
    label: "Success Background",
    group: "Semantic",
    description: "Badge / pill background for success",
  },
  {
    key: "warning",
    label: "Warning",
    group: "Semantic",
    description: "Cautionary state — alerts, notices",
    contrastAgainst: "warning_bg",
  },
  {
    key: "warning_bg",
    label: "Warning Background",
    group: "Semantic",
    description: "Badge / pill background for warnings",
  },
  {
    key: "error",
    label: "Error",
    group: "Semantic",
    description: "Destructive state — errors, failures",
    contrastAgainst: "error_bg",
  },
  {
    key: "error_bg",
    label: "Error Background",
    group: "Semantic",
    description: "Badge / pill background for errors",
  },
  {
    key: "info",
    label: "Info",
    group: "Semantic",
    description: "Informational state — tips, notices",
    contrastAgainst: "info_bg",
  },
  {
    key: "info_bg",
    label: "Info Background",
    group: "Semantic",
    description: "Badge / pill background for info",
  },

  // ── Layout Chrome ──────────────────────────────────────────
  {
    key: "sidebar_bg",
    label: "Sidebar Background",
    group: "Layout Chrome",
    description: "Admin/staff sidebar panel background",
  },
  {
    key: "sidebar_text",
    label: "Sidebar Text",
    group: "Layout Chrome",
    description: "Default nav item text in sidebar",
    contrastAgainst: "sidebar_bg",
  },
  {
    key: "sidebar_text_active",
    label: "Sidebar Active Text",
    group: "Layout Chrome",
    description: "Active/selected nav item text",
    contrastAgainst: "sidebar_item_active_bg",
  },
  {
    key: "sidebar_item_active_bg",
    label: "Sidebar Active Background",
    group: "Layout Chrome",
    description: "Background of the active nav item",
  },
  {
    key: "header_bg",
    label: "Header Background",
    group: "Layout Chrome",
    description: "Top navigation bar background",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GROUP METADATA — display order and icons
// ─────────────────────────────────────────────────────────────────────────────

export const GROUP_ORDER: TokenGroup[] = [
  "Brand",
  "Backgrounds",
  "Text",
  "Borders",
  "Semantic",
  "Layout Chrome",
];

/** Returns tokens from the registry grouped in display order */
export function getGroupedTokens(): Record<TokenGroup, TokenDef[]> {
  const grouped = {} as Record<TokenGroup, TokenDef[]>;
  for (const group of GROUP_ORDER) {
    grouped[group] = TOKEN_REGISTRY.filter((t) => t.group === group);
  }
  return grouped;
}

// ─────────────────────────────────────────────────────────────────────────────
// WCAG CONTRAST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a hex color (#rrggbb or #rgb) into [r, g, b] 0-255.
 * Returns null if the string is not a parseable hex color.
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const [r, g, b] = clean.split("").map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

/**
 * Convert sRGB channel (0-255) to linear light.
 */
function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of a hex color per WCAG 2.1.
 * Returns null if color is not parseable hex.
 */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two hex colors.
 * Returns null if either color is not parseable hex.
 */
export function contrastRatio(fg: string, bg: string): number | null {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG conformance level for normal-sized text.
 * AA requires ≥ 4.5, AAA requires ≥ 7.
 */
export function wcagLevel(ratio: number | null): "AAA" | "AA" | "fail" | "unknown" {
  if (ratio === null) return "unknown";
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "fail";
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESET PALETTES
// ─────────────────────────────────────────────────────────────────────────────

export interface Preset {
  name: string;
  emoji: string;
  light: Partial<ThemeTokens>;
  dark: Partial<ThemeTokens>;
}

export const PRESET_PALETTES: Preset[] = [
  {
    name: "Forest",
    emoji: "🌲",
    light: {
      primary: "#15803d",
      primary_hover: "#166534",
      secondary: "#3b82f6",
      accent: "#f59e0b",
      bg_base: "#f8fafc",
      bg_surface: "#ffffff",
      text_primary: "#0f172a",
      sidebar_bg: "#0f172a",
      sidebar_item_active_bg: "#15803d",
      header_bg: "#ffffff",
    },
    dark: {
      primary: "#22c55e",
      primary_hover: "#4ade80",
      secondary: "#60a5fa",
      accent: "#fbbf24",
      bg_base: "#0f172a",
      bg_surface: "#1e293b",
      text_primary: "#f8fafc",
      sidebar_bg: "#0f172a",
      sidebar_item_active_bg: "#22c55e",
      header_bg: "#1e293b",
    },
  },
  {
    name: "Ocean",
    emoji: "🌊",
    light: {
      primary: "#0369a1",
      primary_hover: "#075985",
      secondary: "#0891b2",
      accent: "#f97316",
      bg_base: "#f0f9ff",
      bg_surface: "#ffffff",
      text_primary: "#0c4a6e",
      sidebar_bg: "#0c4a6e",
      sidebar_item_active_bg: "#0369a1",
      header_bg: "#ffffff",
    },
    dark: {
      primary: "#38bdf8",
      primary_hover: "#7dd3fc",
      secondary: "#22d3ee",
      accent: "#fb923c",
      bg_base: "#0c1a2e",
      bg_surface: "#162032",
      text_primary: "#e0f2fe",
      sidebar_bg: "#0c1a2e",
      sidebar_item_active_bg: "#0369a1",
      header_bg: "#162032",
    },
  },
  {
    name: "Sunset",
    emoji: "🌅",
    light: {
      primary: "#dc2626",
      primary_hover: "#b91c1c",
      secondary: "#9333ea",
      accent: "#f59e0b",
      bg_base: "#fff7ed",
      bg_surface: "#ffffff",
      text_primary: "#1c1917",
      sidebar_bg: "#1c1917",
      sidebar_item_active_bg: "#dc2626",
      header_bg: "#ffffff",
    },
    dark: {
      primary: "#f87171",
      primary_hover: "#fca5a5",
      secondary: "#c084fc",
      accent: "#fbbf24",
      bg_base: "#1c1917",
      bg_surface: "#292524",
      text_primary: "#fafaf9",
      sidebar_bg: "#1c1917",
      sidebar_item_active_bg: "#dc2626",
      header_bg: "#292524",
    },
  },
  {
    name: "Slate",
    emoji: "🪨",
    light: {
      primary: "#475569",
      primary_hover: "#334155",
      secondary: "#64748b",
      accent: "#0ea5e9",
      bg_base: "#f8fafc",
      bg_surface: "#ffffff",
      text_primary: "#0f172a",
      sidebar_bg: "#0f172a",
      sidebar_item_active_bg: "#475569",
      header_bg: "#ffffff",
    },
    dark: {
      primary: "#94a3b8",
      primary_hover: "#cbd5e1",
      secondary: "#64748b",
      accent: "#38bdf8",
      bg_base: "#0f172a",
      bg_surface: "#1e293b",
      text_primary: "#f8fafc",
      sidebar_bg: "#0f172a",
      sidebar_item_active_bg: "#475569",
      header_bg: "#1e293b",
    },
  },
];
