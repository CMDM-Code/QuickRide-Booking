'use client';

import { useState, useEffect, useCallback } from "react";
import { useBranding, applyDraftTheme } from "@/components/providers/BrandingProvider";
import {
  updateBrandingConfig,
  uploadLogo,
  uploadFavicon,
  uploadLoginBackground,
  DEFAULT_BRANDING_CONFIG,
} from "@/lib/branding-service";
import { BrandingConfig, ThemeTokens } from "@/lib/types";
import {
  TOKEN_REGISTRY,
  GROUP_ORDER,
  getGroupedTokens,
  PRESET_PALETTES,
  contrastRatio,
  wcagLevel,
} from "@/lib/token-registry";
import {
  Palette, Upload, Save, RefreshCcw, Type, CheckCircle2,
  AlertCircle, Sun, Moon, Image, Shield, Monitor, Users,
  Layout, Undo2, RotateCcw, ChevronDown, ChevronUp,
} from "lucide-react";

const MAX_HISTORY = 20;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function isHex(v: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(v.trim());
}

function safeColorValue(v: string): string {
  return isHex(v) ? v : "#000000";
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRAST BADGE
// ─────────────────────────────────────────────────────────────────────────────

function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  const ratio = contrastRatio(fg, bg);
  const level = wcagLevel(ratio);
  if (level === "unknown") return null;

  const styles: Record<string, string> = {
    AAA: "bg-emerald-100 text-emerald-800",
    AA: "bg-blue-100 text-blue-800",
    fail: "bg-red-100 text-red-700",
  };

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${styles[level]}`}>
      {level === "fail" ? `⚠ ${ratio?.toFixed(1)}:1` : `✓ ${level} ${ratio?.toFixed(1)}:1`}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN EDITOR ROW
// ─────────────────────────────────────────────────────────────────────────────

function TokenRow({
  tokenDef,
  value,
  contrastBg,
  onChange,
}: {
  tokenDef: (typeof TOKEN_REGISTRY)[0];
  value: string;
  contrastBg?: string;
  onChange: (key: keyof ThemeTokens, value: string) => void;
}) {
  const displayValue = value.toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <input
        type="color"
        value={safeColorValue(value)}
        onChange={(e) => onChange(tokenDef.key, e.target.value)}
        className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 shrink-0 p-0.5"
        title={tokenDef.label}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 truncate">{tokenDef.label}</span>
          {tokenDef.contrastAgainst && contrastBg && (
            <ContrastBadge fg={value} bg={contrastBg} />
          )}
        </div>
        {tokenDef.description && (
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{tokenDef.description}</p>
        )}
      </div>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onChange(tokenDef.key, e.target.value)}
        className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shrink-0"
        placeholder="#000000"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN GROUP SECTION
// ─────────────────────────────────────────────────────────────────────────────

function TokenGroupSection({
  groupName,
  tokens,
  theme,
  onChange,
}: {
  groupName: string;
  tokens: (typeof TOKEN_REGISTRY);
  theme: ThemeTokens;
  onChange: (key: keyof ThemeTokens, value: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{groupName}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 py-1">
          {tokens.map((def) => (
            <TokenRow
              key={def.key}
              tokenDef={def}
              value={theme[def.key] ?? "#000000"}
              contrastBg={def.contrastAgainst ? theme[def.contrastAgainst] : undefined}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function BrandingSettingsPage() {
  const { branding, refreshBranding, isDarkMode } = useBranding();

  const [savedConfig, setSavedConfig] = useState<BrandingConfig>(branding);
  const [draftConfig, setDraftConfig] = useState<BrandingConfig>(branding);
  const [history, setHistory] = useState<BrandingConfig[]>([]);

  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<'logo' | 'favicon' | 'login_bg' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => { setMounted(true); }, []);

  // Sync when branding loads from provider
  useEffect(() => {
    if (branding) {
      setSavedConfig(branding);
      setDraftConfig(branding);
      setHistory([]);
    }
  }, [branding]);

  // Live preview — apply draft to CSS on every change
  useEffect(() => {
    if (!mounted) return;
    const tokens = activeTheme === 'light' ? draftConfig.light_theme : draftConfig.dark_theme;
    applyDraftTheme(tokens, isDarkMode);
  }, [draftConfig, activeTheme, mounted, isDarkMode]);

  // ── Token update ──────────────────────────────────────────
  const updateToken = useCallback((key: keyof ThemeTokens, value: string) => {
    setHistory((h) => [...h.slice(-MAX_HISTORY), draftConfig]);
    const themeKey = activeTheme === 'light' ? 'light_theme' : 'dark_theme';
    setDraftConfig((prev) => ({
      ...prev,
      [themeKey]: { ...prev[themeKey], [key]: value },
    }));
  }, [draftConfig, activeTheme]);

  // ── Actions ───────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateBrandingConfig(draftConfig);
      await refreshBranding();
      setSavedConfig(draftConfig);
      setHistory([]);
      setMessage({ type: 'success', text: 'Branding saved successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save branding.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleReset = () => {
    setDraftConfig(savedConfig);
    setHistory([]);
    const tokens = activeTheme === 'light' ? savedConfig.light_theme : savedConfig.dark_theme;
    applyDraftTheme(tokens, isDarkMode);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setDraftConfig(prev);
  };

  const applyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    setHistory((h) => [...h.slice(-MAX_HISTORY), draftConfig]);
    setDraftConfig((prev) => ({
      ...prev,
      light_theme: { ...prev.light_theme, ...preset.light },
      dark_theme: { ...prev.dark_theme, ...preset.dark },
    }));
  };

  const toggleScope = (key: keyof BrandingConfig['scope']) => {
    setDraftConfig((prev) => ({
      ...prev,
      scope: { ...prev.scope, [key]: !prev.scope[key] },
    }));
  };

  const handleUpload = async (type: 'logo' | 'favicon' | 'login_bg', file: File) => {
    setUploadingType(type);
    setMessage(null);
    try {
      let url: string;
      if (type === 'logo') url = await uploadLogo(file);
      else if (type === 'favicon') url = await uploadFavicon(file);
      else url = await uploadLoginBackground(file);
      const urlKey = type === 'logo' ? 'logo_url' : type === 'favicon' ? 'favicon_url' : 'login_background_url';
      setDraftConfig((prev) => ({ ...prev, [urlKey]: url }));
      setMessage({ type: 'success', text: `${type.replace('_', ' ')} uploaded — save to persist.` });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: 'error', text: `Failed to upload ${type.replace('_', ' ')}.` });
    } finally {
      setUploadingType(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────
  const hasUnsavedChanges = JSON.stringify(draftConfig) !== JSON.stringify(savedConfig);
  const activeThemeTokens = activeTheme === 'light' ? draftConfig.light_theme : draftConfig.dark_theme;
  const groupedTokens = getGroupedTokens();

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Branding Customization</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Personalize the system identity and visual theme.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo last change"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-30 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
            title="Reset to last saved"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-30 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-950 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
          >
            {isSaving ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Unsaved indicator ───────────────────────────────── */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          You have unsaved changes — they are being previewed live. Save to persist them.
        </div>
      )}

      {/* ── Toast message ───────────────────────────────────── */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">

        {/* ── Left column ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Visual Identity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-wider">
              <Type className="w-4 h-4 text-blue-500" />
              Visual Identity
            </h2>

            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase">System Name</span>
              <input
                type="text"
                value={draftConfig.system_name}
                onChange={(e) => setDraftConfig((p) => ({ ...p, system_name: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm"
                placeholder="e.g. QuickRide Booking"
              />
            </label>

            {/* Logo */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Logo</span>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                  {draftConfig.logo_url && <img src={draftConfig.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" />}
                  {uploadingType === 'logo' && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <RefreshCcw className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">Upload Logo</span>
                  <input type="file" className="hidden" accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload('logo', e.target.files[0])}
                    disabled={uploadingType !== null} />
                </label>
              </div>
            </div>

            {/* Favicon */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Favicon</span>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {draftConfig.favicon_url
                    ? <img src={draftConfig.favicon_url} alt="Favicon" className="w-full h-full object-contain p-0.5" />
                    : <span className="text-[10px] text-slate-400">ICO</span>}
                </div>
                <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">Upload Favicon</span>
                  <input type="file" className="hidden" accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload('favicon', e.target.files[0])}
                    disabled={uploadingType !== null} />
                </label>
              </div>
            </div>

            {/* Login BG */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Login Background</span>
              <div className="mt-2 space-y-2">
                {draftConfig.login_background_url && (
                  <div className="w-full h-20 rounded-xl overflow-hidden">
                    <img src={draftConfig.login_background_url} alt="Login BG" className="w-full h-full object-cover" />
                  </div>
                )}
                <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                  <Image className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">Upload Login Background</span>
                  <input type="file" className="hidden" accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload('login_bg', e.target.files[0])}
                    disabled={uploadingType !== null} />
                </label>
              </div>
            </div>
          </div>

          {/* Scope Toggles */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-emerald-500" />
              Theme Scope
            </h2>
            <p className="text-xs text-slate-500">Apply branding to specific dashboards</p>
            <div className="space-y-2.5">
              {[
                { key: 'admin', label: 'Admin Dashboard', icon: Shield },
                { key: 'staff', label: 'Staff Dashboard', icon: Users },
                { key: 'client', label: 'Client Dashboard', icon: Layout },
                { key: 'public_pages', label: 'Public Pages', icon: Monitor },
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={draftConfig.scope[key as keyof typeof draftConfig.scope]}
                    onChange={() => toggleScope(key as keyof typeof draftConfig.scope)}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preset Palettes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-wider">
              <Palette className="w-4 h-4 text-purple-500" />
              Preset Palettes
            </h2>
            <p className="text-xs text-slate-500">Apply a curated color set to both themes at once</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_PALETTES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left group"
                >
                  <span className="text-base">{preset.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{preset.name}</p>
                    <div className="flex gap-0.5 mt-1">
                      {['primary', 'secondary', 'accent'].map((k) => (
                        <div
                          key={k}
                          className="w-3 h-3 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: (preset.light as any)[k] }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: Token editors ─────────────────── */}
        <div className="space-y-5">

          {/* Theme switcher */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-wider">
              <Palette className="w-4 h-4 text-purple-500" />
              Theme Tokens
            </h2>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTheme('light')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTheme === 'light'
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Light
              </button>
              <button
                onClick={() => setActiveTheme('dark')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTheme === 'dark'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark
              </button>
            </div>
          </div>

          {/* Token groups */}
          {GROUP_ORDER.map((group) => (
            <TokenGroupSection
              key={group}
              groupName={group}
              tokens={groupedTokens[group]}
              theme={activeThemeTokens}
              onChange={updateToken}
            />
          ))}

          {/* Mini live preview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Live Preview</h3>
            <div
              className="p-5 rounded-xl space-y-4 transition-all"
              style={{ backgroundColor: activeThemeTokens.bg_base }}
            >
              <div style={{ backgroundColor: activeThemeTokens.sidebar_bg, width: 40, height: 80, borderRadius: 8, display: 'inline-block', verticalAlign: 'top', marginRight: 12 }} />
              <div style={{ display: 'inline-block', verticalAlign: 'top', maxWidth: 'calc(100% - 60px)' }}>
                <p className="text-sm font-bold mb-1" style={{ color: activeThemeTokens.text_primary }}>Sample Heading</p>
                <p className="text-xs mb-3" style={{ color: activeThemeTokens.text_secondary }}>Supporting text appears here.</p>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: activeThemeTokens.primary }}>Primary</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: activeThemeTokens.secondary }}>Secondary</button>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: activeThemeTokens.success_bg, color: activeThemeTokens.success }}>✓ Success</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: activeThemeTokens.error_bg, color: activeThemeTokens.error }}>✕ Error</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
