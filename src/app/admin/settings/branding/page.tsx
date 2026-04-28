'use client';

import { useState, useEffect } from "react";
import { useBranding } from "@/components/providers/BrandingProvider";
import {
  updateBrandingConfig,
  uploadLogo,
  uploadFavicon,
  uploadLoginBackground
} from "@/lib/branding-service";
import { BrandingConfig, ThemeColors } from "@/lib/types";
import { 
  Palette, 
  Upload, 
  Save, 
  RefreshCcw, 
  Type, 
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Image,
  Shield,
  Monitor,
  Users,
  Layout
} from "lucide-react";

export default function BrandingSettingsPage() {
  const { branding, refreshBranding } = useBranding();
  const [config, setConfig] = useState<BrandingConfig>(branding);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<'logo' | 'favicon' | 'login_bg' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (branding) setConfig(branding);
  }, [branding]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateBrandingConfig(config);
      await refreshBranding();
      setMessage({ type: 'success', text: 'Branding updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update branding.' });
    } finally {
      setIsSaving(false);
    }
  };


  const updateLightColor = (key: keyof ThemeColors, value: string) => {
    setConfig(prev => ({
      ...prev,
      light_theme: { ...prev.light_theme, [key]: value }
    }));
  };

  const updateDarkColor = (key: keyof ThemeColors, value: string) => {
    setConfig(prev => ({
      ...prev,
      dark_theme: { ...prev.dark_theme, [key]: value }
    }));
  };

  const toggleScope = (key: keyof BrandingConfig['scope']) => {
    setConfig(prev => ({
      ...prev,
      scope: { ...prev.scope, [key]: !prev.scope[key] }
    }));
  };

  const handleUpload = async (type: 'logo' | 'favicon' | 'login_bg', file: File) => {
    setUploadingType(type);
    setMessage(null);
    try {
      let url: string;
      switch (type) {
        case 'logo': url = await uploadLogo(file); break;
        case 'favicon': url = await uploadFavicon(file); break;
        case 'login_bg': url = await uploadLoginBackground(file); break;
      }
      setConfig(prev => ({ 
        ...prev, 
        [type === 'logo' ? 'logo_url' : type === 'favicon' ? 'favicon_url' : 'login_background_url']: url 
      }));
      setMessage({ type: 'success', text: `${type.replace('_', ' ')} uploaded! Don't forget to save changes.` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to upload ${type.replace('_', ' ')}.` });
    } finally {
      setUploadingType(null);
    }
  };

  if (!mounted || !config?.light_theme || !config?.dark_theme) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const themeColors = activeTheme === 'light' ? config.light_theme : config.dark_theme;
  const updateColor = activeTheme === 'light' ? updateLightColor : updateDarkColor;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Branding Customization</h1>
          <p className="text-slate-500 font-medium mt-1">Personalize the system identity and visual theme.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:bg-slate-900 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Column 1: Visual Identity */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
              <Type className="w-5 h-5 text-blue-600" />
              Visual Identity
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase">System Name</span>
                <input
                  type="text"
                  value={config.system_name}
                  onChange={(e) => setConfig(prev => ({ ...prev, system_name: e.target.value }))}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none text-sm"
                  placeholder="e.g. QuickRide Booking"
                />
              </label>

              {/* Logo Upload */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">System Logo</span>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                    <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    {uploadingType === 'logo' && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <RefreshCcw className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="flex-1">
                    <div className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">Upload Logo</span>
                    </div>
                    <input 
                      type="file" className="hidden" accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && handleUpload('logo', e.target.files[0])}
                      disabled={uploadingType !== null}
                    />
                  </label>
                </div>
              </div>

              {/* Favicon Upload */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Favicon</span>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                    {config.favicon_url ? (
                      <img src={config.favicon_url} alt="Favicon" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-xs text-slate-400">ICO</span>
                    )}
                  </div>
                  <label className="flex-1">
                    <div className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">Upload Favicon</span>
                    </div>
                    <input 
                      type="file" className="hidden" accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && handleUpload('favicon', e.target.files[0])}
                      disabled={uploadingType !== null}
                    />
                  </label>
                </div>
              </div>

              {/* Login Background Upload */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Login Background</span>
                <div className="mt-2">
                  {config.login_background_url && (
                    <div className="w-full h-24 rounded-xl overflow-hidden mb-2">
                      <img src={config.login_background_url} alt="Login BG" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label>
                    <div className="cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                      <Image className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">Upload Login Background</span>
                    </div>
                    <input 
                      type="file" className="hidden" accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && handleUpload('login_bg', e.target.files[0])}
                      disabled={uploadingType !== null}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Scope Toggles */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-600" />
              Theme Scope
            </h2>
            <p className="text-xs text-slate-500">Apply branding to specific dashboards</p>
            
            <div className="space-y-3">
              {[
                { key: 'admin', label: 'Admin Dashboard', icon: Shield },
                { key: 'staff', label: 'Staff Dashboard', icon: Users },
                { key: 'client', label: 'Client Dashboard', icon: Layout },
                { key: 'public_pages', label: 'Public Pages', icon: Monitor },
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.scope[key as keyof typeof config.scope]}
                    onChange={() => toggleScope(key as keyof typeof config.scope)}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2 & 3: Theme Colors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                <Palette className="w-5 h-5 text-purple-600" />
                Theme Colors
              </h2>
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTheme('light')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTheme === 'light' 
                      ? 'bg-white text-amber-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => setActiveTheme('dark')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTheme === 'dark' 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Color inputs with simple picker */}
              {[
                { key: 'primary', label: 'Primary' },
                { key: 'secondary', label: 'Secondary' },
                { key: 'accent', label: 'Accent' },
                { key: 'background', label: 'Background' },
                { key: 'text', label: 'Text' },
                { key: 'success', label: 'Success' },
                { key: 'warning', label: 'Warning' },
                { key: 'error', label: 'Error' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeColors[key as keyof ThemeColors].startsWith('#') ? themeColors[key as keyof ThemeColors] : '#10b981'}
                      onChange={(e) => updateColor(key as keyof ThemeColors, e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-slate-200 shrink-0"
                    />
                    <input
                      type="text"
                      value={themeColors[key as keyof ThemeColors].toUpperCase()}
                      onChange={(e) => updateColor(key as keyof ThemeColors, e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Live Preview */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase mb-3 block">Live Preview</span>
              <div 
                className="p-6 rounded-xl space-y-4 transition-colors"
                style={{ backgroundColor: themeColors.background }}
              >
                <h3 className="text-xl font-bold" style={{ color: themeColors.text }}>Sample Heading</h3>
                <p style={{ color: themeColors.text, opacity: 0.7 }}>This is how your text will appear on the background.</p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="px-4 py-2 rounded-lg font-bold text-sm text-white"
                    style={{ backgroundColor: themeColors.primary }}
                  >
                    Primary
                  </button>
                  <button 
                    className="px-4 py-2 rounded-lg font-bold text-sm text-white"
                    style={{ backgroundColor: themeColors.secondary }}
                  >
                    Secondary
                  </button>
                  <button 
                    className="px-4 py-2 rounded-lg font-bold text-sm text-white"
                    style={{ backgroundColor: themeColors.accent }}
                  >
                    Accent
                  </button>
                  <span 
                    className="px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1"
                    style={{ backgroundColor: themeColors.success + '20', color: themeColors.success }}
                  >
                    ✓ Success
                  </span>
                  <span 
                    className="px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1"
                    style={{ backgroundColor: themeColors.warning + '20', color: themeColors.warning }}
                  >
                    ⚠ Warning
                  </span>
                  <span 
                    className="px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1"
                    style={{ backgroundColor: themeColors.error + '20', color: themeColors.error }}
                  >
                    ✕ Error
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
