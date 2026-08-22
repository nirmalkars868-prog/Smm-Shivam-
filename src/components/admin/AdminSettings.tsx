import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  QrCode,
  Phone,
  ShieldCheck,
  DollarSign,
  Bell,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Palette,
  Snowflake,
  RefreshCw,
  Sparkles,
  MessageCircle,
  Megaphone,
  Flame,
  Info,
  Eye,
  Layers,
} from 'lucide-react';
import { AdminSettings as AdminSettingsType } from '../../types';
import { rtdb, ref, onValue, set, cleanForFirebase } from '../../lib/firebaseClient';

const THEME_OPTIONS = [
  {
    id: 'default-dark',
    name: 'Midnight Gold',
    description: 'Deep black obsidian with luxurious yellow/gold accents',
    bg: 'bg-black',
    accent: 'bg-yellow-500',
    border: 'border-yellow-500/50',
    tag: 'DEFAULT',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    description: 'Futuristic ultra-dark with vibrant cyan and neon pink glow',
    bg: 'bg-[#0a0f1d]',
    accent: 'bg-cyan-400',
    border: 'border-cyan-500/50',
    tag: 'POPULAR',
  },
  {
    id: 'emerald-luxury',
    name: 'Emerald Luxury',
    description: 'Prestigious deep emerald green and sparkling mint tones',
    bg: 'bg-[#06140e]',
    accent: 'bg-emerald-400',
    border: 'border-emerald-500/50',
    tag: 'NEW',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Regal dark velvet indigo with glowing neon violet accents',
    bg: 'bg-[#0f091f]',
    accent: 'bg-purple-500',
    border: 'border-purple-500/50',
    tag: 'VIP',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    description: 'Warm cocoa dark palette with blazing orange sunset glow',
    bg: 'bg-[#180c06]',
    accent: 'bg-orange-500',
    border: 'border-orange-500/50',
    tag: 'HOT',
  },
  {
    id: 'ice-sapphire',
    name: 'Ice Sapphire',
    description: 'Deep oceanic midnight blue with crisp arctic ice highlights',
    bg: 'bg-[#051124]',
    accent: 'bg-sky-400',
    border: 'border-sky-500/50',
    tag: 'COOL',
  },
  {
    id: 'clean-light',
    name: 'Clean Light Slate',
    description: 'Crisp light slate background with high-contrast luxury UI',
    bg: 'bg-slate-100',
    accent: 'bg-amber-600',
    border: 'border-slate-300',
    tag: 'LIGHT',
  },
];

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettingsType>({
    siteName: 'SMM SHIVAM',
    logoUrl: '',
    whatsappNumber: '9516862495',
    orderWhatsappNumber: '9516862395',
    upiId: '9770571091@ybl',
    merchantId: 'SHIVAM_MERCHANT_9770',
    merchantSecret: '',
    autoVerifyMerchant: true,
    minDepositINR: 10,
    exchangeRateINR: 86,
    notice: '⚡ Welcome to SMM SHIVAM Panel! Scan QR Code to add funds instantly via UPI & WhatsApp auto-verification.',
    popupNoticeEnabled: true,
    popupNoticeTitle: '🔥 SPECIAL ANNOUNCEMENT & OFFER',
    popupNoticeText: 'Welcome to SMM SHIVAM Panel! Get extra bonuses on UPI Add Funds, lightning fast server speeds, and 24/7 WhatsApp customer support.',
    popupNoticeType: 'offer',
    popupNoticeButtonText: 'Add Funds Now',
    popupNoticeButtonLink: '#add-funds',
    topAlertBarEnabled: true,
    topAlertBarText: '⚡ SMM SHIVAM: Instant UPI Deposits Live | WhatsApp Support: +91 9516862495 | Best High-Speed SMM Services!',
    currency: 'USD',
    currencySymbol: '$',
    theme: 'default-dark',
    snowEffect: false,
  });

  const [loading, setLoading] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setSettings((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
            setErrorMsg('');
          }
        };
        img.src = (event.target?.result as string) || '';
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchSettings();

    if (rtdb) {
      const settingsRef = ref(rtdb, 'smm_store/settings');
      const unsubscribe = onValue(settingsRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val) {
            setSettings((prev) => ({ ...prev, ...val }));
          }
        }
      }, (err) => {
        console.warn('AdminSettings RTDB listener warning:', err);
      });
      return () => unsubscribe();
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // Backend API sync first (saves to memoryDb, local persistent file, and RTDB)
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        if (!res.ok) {
          throw new Error(`Server error (${res.status})`);
        }
      }

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error || 'Failed to save settings via server');
      }

      // Optional client-side RTDB sync
      if (rtdb) {
        try {
          const cleanSettingsData = cleanForFirebase(settings);
          await set(ref(rtdb, 'settings'), cleanSettingsData);
        } catch (rtdbErr: any) {
          console.warn('Optional client RTDB write warning:', rtdbErr);
        }
      }

      setSuccessMsg('Admin Settings, Theme & Preferences saved successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Are you sure you want to refresh all platform data (services, categories, providers catalog) to a clean fresh state?')) {
      return;
    }

    setResettingData(true);
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Platform catalog data refreshed to clean fresh state successfully!');
        fetchSettings();
      } else {
        setErrorMsg(data.error || 'Failed to refresh platform data');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error refreshing data');
    } finally {
      setResettingData(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-yellow-500/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <Settings className="w-6 h-6 text-yellow-400" />
            Admin Panel Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage themes, snow particle animation, WhatsApp order routing number, payment QR, and merchant controls.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetData}
          disabled={resettingData}
          className="bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 text-zinc-300 hover:text-yellow-400 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resettingData ? 'animate-spin' : ''}`} />
          <span>{resettingData ? 'Refreshing Data...' : 'Refresh Platform Data'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Theme & Visual Appearance Customizer */}
        <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2">
                <Palette className="w-4 h-4 text-yellow-400" />
                <span>Panel Visual Theme & Atmosphere</span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Choose the design archetype and color aesthetic for the entire panel.
              </p>
            </div>

            {/* Snow Effect Toggle */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <Snowflake className={`w-4 h-4 ${settings.snowEffect ? 'text-sky-300 animate-pulse' : 'text-zinc-500'}`} />
                <span className="text-xs font-bold text-zinc-200">Snow Effect</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.snowEffect || false}
                  onChange={(e) => setSettings({ ...settings, snowEffect: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-400"></div>
              </label>
            </div>
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {THEME_OPTIONS.map((th) => {
              const isSelected = (settings.theme || 'default-dark') === th.id;
              return (
                <button
                  type="button"
                  key={th.id}
                  onClick={() => setSettings({ ...settings, theme: th.id as any })}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-900 border-yellow-400 shadow-lg shadow-yellow-500/10 ring-2 ring-yellow-400/30'
                      : 'bg-black border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${th.accent} shadow-sm`} />
                      <span className="text-xs font-black text-white">{th.name}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                      {th.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">{th.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Order Redirection Routing Setup */}
        <div className="bg-zinc-950 border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Order Redirect Notification Setup</span>
            </h2>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Live Routing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Order WhatsApp Target Number</span>
              </label>
              <input
                type="text"
                value={settings.orderWhatsappNumber || '9516862395'}
                onChange={(e) => setSettings({ ...settings, orderWhatsappNumber: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-400"
                placeholder="e.g. 9516862395"
                required
              />
              <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                Jab bhi koi user new order place karega, system automatically user ka order details (Order ID, Email, Service, Quantity, Link, Price) ke saath is WhatsApp number (<strong className="text-emerald-400">{settings.orderWhatsappNumber || '9516862395'}</strong>) par redirect kar dega.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-yellow-400" />
                <span>Support / Deposit WhatsApp Number</span>
              </label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                placeholder="e.g. 9516862495"
                required
              />
              <p className="text-[10px] text-zinc-500 mt-1.5">
                Funds deposit requests aur general customer support ke liye use hota hai.
              </p>
            </div>
          </div>
        </div>

        {/* Branding & General Settings */}
        <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Settings className="w-4 h-4 text-yellow-400" />
            Site Branding & Notice Banner
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Panel Brand Name
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                USD to INR Exchange Rate
              </label>
              <input
                type="number"
                value={settings.exchangeRateINR}
                onChange={(e) => setSettings({ ...settings, exchangeRateINR: Number(e.target.value) })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Default Profit Margin %
              </label>
              <input
                type="number"
                value={settings.defaultProfitMarginPercentage ?? 20}
                onChange={(e) => setSettings({ ...settings, defaultProfitMarginPercentage: Number(e.target.value) })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400 font-mono"
                placeholder="e.g. 20"
                required
              />
            </div>
          </div>

          {/* Logo DP Upload / URL Section */}
          <div className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-yellow-400" />
                <span>Panel Logo / Profile DP Image</span>
              </label>
              {settings.logoUrl && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, logoUrl: '' })}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Remove Logo DP
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview Box */}
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-yellow-500/40 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg shadow-yellow-500/10">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Panel Logo DP" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-zinc-600" />
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <input
                  type="text"
                  value={settings.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="Paste Logo DP Image URL (https://...)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />

                <div className="flex items-center gap-2">
                  <label className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-zinc-500 font-medium">Supports JPG, PNG, WebP (Max 2MB)</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
              Top Announcement Notice Banner
            </label>
            <input
              type="text"
              value={settings.notice}
              onChange={(e) => setSettings({ ...settings, notice: e.target.value })}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
              required
            />
          </div>
        </div>

        {/* User Login Pop-up Announcement & Top Broadcast Alert Section */}
        <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-yellow-400" />
                <span>Special Announcement & User Login Pop-up Broadcast</span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Save special notices, instructions, or offers here. When users log in, this announcement pops up immediately at the top/center of their screen!
              </p>
            </div>

            {/* Pop-up Enable/Disable Toggle */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <Flame className={`w-4 h-4 ${settings.popupNoticeEnabled ? 'text-yellow-400 animate-pulse' : 'text-zinc-500'}`} />
                <span className="text-xs font-bold text-zinc-200">Pop-up on Login</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.popupNoticeEnabled ?? true}
                  onChange={(e) => setSettings({ ...settings, popupNoticeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Announcement Headline / Title
              </label>
              <input
                type="text"
                value={settings.popupNoticeTitle || ''}
                onChange={(e) => setSettings({ ...settings, popupNoticeTitle: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                placeholder="e.g. 🔥 SPECIAL OFFER: 10% BONUS ON UPI ADD FUNDS!"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Notice Visual Style / Badge
              </label>
              <select
                value={settings.popupNoticeType || 'offer'}
                onChange={(e) => setSettings({ ...settings, popupNoticeType: e.target.value as any })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="offer">🔥 Special Offer / Hot Deal (Gold & Amber)</option>
                <option value="info">ℹ️ Official Announcement / News (Cyan Blue)</option>
                <option value="warning">⚠️ Important Notice / Reminder (Amber Warning)</option>
                <option value="alert">🚨 Urgent Update / Server Status (Rose Red)</option>
              </select>
            </div>
          </div>

          {/* Announcement Textarea */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase mb-1 flex items-center justify-between">
              <span>Announcement Message / Special Text (Tez me likhe)</span>
              <span className="text-[10px] text-zinc-500 font-normal">Supports multi-line text & emojis</span>
            </label>
            <textarea
              rows={4}
              value={settings.popupNoticeText || ''}
              onChange={(e) => setSettings({ ...settings, popupNoticeText: e.target.value })}
              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 font-medium leading-relaxed focus:outline-none focus:border-yellow-400"
              placeholder="Yaha par koi bhi special notice, update, UPI discount offer, ya zaruri instruction likh kar save karein..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Action Button Text
              </label>
              <input
                type="text"
                value={settings.popupNoticeButtonText || ''}
                onChange={(e) => setSettings({ ...settings, popupNoticeButtonText: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
                placeholder="e.g. Add Funds Now or Order Now"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Action Button Link / Target
              </label>
              <input
                type="text"
                value={settings.popupNoticeButtonLink || ''}
                onChange={(e) => setSettings({ ...settings, popupNoticeButtonLink: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-yellow-400"
                placeholder="e.g. #add-funds, #services, or https://wa.me/919516862495"
              />
            </div>
          </div>

          {/* Top Marquee Alert Bar Toggle & Text */}
          <div className="pt-3 border-t border-zinc-900 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase block">
                  Top Persistent Announcement Banner
                </label>
                <p className="text-[10px] text-zinc-500">
                  Shows a continuous marquee/alert strip at the top of the customer dashboard.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.topAlertBarEnabled ?? true}
                  onChange={(e) => setSettings({ ...settings, topAlertBarEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>

            {settings.topAlertBarEnabled && (
              <input
                type="text"
                value={settings.topAlertBarText || ''}
                onChange={(e) => setSettings({ ...settings, topAlertBarText: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-yellow-300 font-medium focus:outline-none focus:border-yellow-400"
                placeholder="e.g. ⚡ SMM SHIVAM: Instant UPI Deposits Live | WhatsApp Support: +91 9516862495 | Best High-Speed SMM Services!"
              />
            )}
          </div>

          {/* Live Preview Box */}
          <div className="bg-black/60 border border-yellow-500/20 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase text-zinc-400">
              <span className="flex items-center gap-1.5 text-yellow-400">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Customer Pop-up Preview</span>
              </span>
              <span className="text-[10px] text-zinc-500">How users will see this on login</span>
            </div>

            <div className="p-4 bg-zinc-950 border border-yellow-500/40 rounded-2xl space-y-2 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  {settings.popupNoticeType || 'offer'}
                </span>
                <span className="text-xs font-black text-white">{settings.popupNoticeTitle || 'Announcement Title'}</span>
              </div>
              <p className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {settings.popupNoticeText || 'Your announcement message will appear here for all logged-in users.'}
              </p>
              {settings.popupNoticeButtonText && (
                <div className="pt-1">
                  <span className="inline-block px-3 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-lg uppercase">
                    {settings.popupNoticeButtonText} →
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment & Social Links Setup */}
        <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
            <QrCode className="w-4 h-4 text-yellow-400" />
            UPI QR Payment & Social Buttons Links Setup
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-yellow-400" />
                UPI ID for QR Code Generation
              </label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                placeholder="e.g. 9770571091@ybl"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Minimum Deposit Amount (₹ INR)
              </label>
              <input
                type="number"
                value={settings.minDepositINR}
                onChange={(e) => setSettings({ ...settings, minDepositINR: Number(e.target.value) })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                WhatsApp Chat Button URL
              </label>
              <input
                type="text"
                value={settings.whatsappChatUrl || ''}
                onChange={(e) => setSettings({ ...settings, whatsappChatUrl: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-yellow-400"
                placeholder="https://wa.me/919516862495"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                WhatsApp Channel URL
              </label>
              <input
                type="text"
                value={settings.whatsappChannelUrl || ''}
                onChange={(e) => setSettings({ ...settings, whatsappChannelUrl: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-yellow-400"
                placeholder="https://whatsapp.com/channel/..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Telegram Group/Channel URL
              </label>
              <input
                type="text"
                value={settings.telegramUrl || ''}
                onChange={(e) => setSettings({ ...settings, telegramUrl: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-sky-400 font-mono focus:outline-none focus:border-yellow-400"
                placeholder="https://t.me/..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                YouTube Channel URL
              </label>
              <input
                type="text"
                value={settings.youtubeUrl || ''}
                onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-red-400 font-mono focus:outline-none focus:border-yellow-400"
                placeholder="https://youtube.com/@..."
              />
            </div>
          </div>
        </div>

        {/* Merchant Auto-Verification Gateway */}
        <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-yellow-400" />
              Merchant Gateway & Auto Verification
            </h2>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoVerifyMerchant}
                onChange={(e) => setSettings({ ...settings, autoVerifyMerchant: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Merchant Gateway ID
              </label>
              <input
                type="text"
                value={settings.merchantId || ''}
                onChange={(e) => setSettings({ ...settings, merchantId: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                placeholder="e.g. SHIVAM_MERCHANT_9770"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Merchant Secret Key
              </label>
              <input
                type="password"
                value={settings.merchantSecret || ''}
                onChange={(e) => setSettings({ ...settings, merchantSecret: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-yellow-400"
                placeholder="••••••••••••••••"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-amber-300 text-black font-black py-4 px-6 rounded-2xl shadow-xl shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer active:scale-98"
        >
          <Save className="w-5 h-5 fill-black" />
          <span>{loading ? 'Saving Settings...' : 'Save All Admin Settings & Theme'}</span>
        </button>
      </form>
    </div>
  );
};

