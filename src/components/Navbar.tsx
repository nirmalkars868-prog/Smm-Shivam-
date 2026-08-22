import React, { useState, useRef } from 'react';
import {
  Zap,
  ShoppingBag,
  ListFilter,
  Layers,
  History,
  Code2,
  HelpCircle,
  Bell,
  ShieldAlert,
  Wallet,
  Settings,
  QrCode,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  ChevronRight,
  MessageSquare,
  DollarSign,
  RefreshCw,
  Users,
  Gift,
  Globe,
  Sliders,
  Volume2,
} from 'lucide-react';
import { User, AdminSettings as AdminSettingsType } from '../types';
import {
  subscribeVoicePlayer,
  startWelcomeSong,
  pauseWelcomeSong,
  resumeWelcomeSong,
  VoicePlayerState,
} from '../lib/welcomeVoiceEngine';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  userBalance: number;
  currency: string;
  setCurrency: (curr: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  userInfo: User | null;
  settings?: AdminSettingsType;
  onOpenAuth: () => void;
  onLogout: () => void;
  activePanelSlug?: string | null;
  onResetToMainPanel?: () => void;
  onSecretAdminUnlock?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isAdmin,
  setIsAdmin,
  userBalance,
  currency,
  setCurrency,
  theme,
  setTheme,
  userInfo,
  settings,
  onOpenAuth,
  onLogout,
  activePanelSlug,
  onResetToMainPanel,
  onSecretAdminUnlock,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [audioState, setAudioState] = useState<VoicePlayerState>({
    isPlaying: false,
    isPaused: false,
    hasStarted: false,
    volume: 0.95,
    title: '',
    mode: 'custom_audio',
    audioUrl: '',
    currentTime: 0,
    duration: 0,
  });

  React.useEffect(() => {
    const unsub = subscribeVoicePlayer((st) => {
      setAudioState(st);
    });
    return () => unsub();
  }, []);

  const handleHeaderAudioToggle = () => {
    if (audioState.isPlaying) {
      pauseWelcomeSong();
    } else if (audioState.isPaused) {
      resumeWelcomeSong();
    } else {
      startWelcomeSong({
        enabled: settings?.welcomeVoiceEnabled !== false,
        audioUrl: settings?.welcomeVoiceUrl || '',
        text: settings?.welcomeVoiceText || 'WELCOME TO SMM SHIVAM OFFICIAL',
        volume: settings?.welcomeVoiceVolume !== undefined ? settings.welcomeVoiceVolume : 0.95,
        mode: settings?.welcomeVoiceMode || (settings?.welcomeVoiceUrl ? 'custom_audio' : 'tts_speech'),
        name: settings?.welcomeVoiceName || 'SMM SHIVAM Official Audio',
      });
    }
  };

  const navTapCountRef = useRef(0);
  const lastNavTapTimeRef = useRef(0);

  const handleNavLogoTap = () => {
    const now = Date.now();
    if (now - lastNavTapTimeRef.current > 4000) {
      navTapCountRef.current = 1;
    } else {
      navTapCountRef.current += 1;
    }
    lastNavTapTimeRef.current = now;

    if (navTapCountRef.current >= 7) {
      navTapCountRef.current = 0;
      if (onSecretAdminUnlock) {
        onSecretAdminUnlock();
      } else {
        setIsAdmin(true);
        setCurrentTab('admin-overview');
      }
    }
  };

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: string;
  }

  const userNavItems: NavItem[] = [
    { id: 'new-order', label: 'New order', icon: ShoppingBag },
    { id: 'buy-child-panel', label: 'Buy Child Panel', icon: Globe, badge: '🔥 RESELLER' },
    { id: 'add-funds', label: 'Add funds (QR UPI)', icon: QrCode, badge: 'AUTO' },
    { id: 'referrals', label: 'Refer & Earn', icon: Gift, badge: 'PASSIVE ₹' },
    { id: 'mass-order', label: 'Mass order', icon: Layers },
    { id: 'orders', label: 'Orders', icon: History },
    { id: 'services', label: 'Services', icon: ListFilter },
    { id: 'api', label: 'API Key', icon: Code2 },
    { id: 'tickets', label: 'Support & Tickets', icon: HelpCircle },
    { id: 'updates', label: 'Updates & News', icon: Bell },
  ];

  const adminNavItems: NavItem[] = [
    { id: 'admin-overview', label: 'Overview', icon: Zap },
    { id: 'admin-child-panels', label: 'Child Panels (White-Label)', icon: Globe, badge: 'RESELLER' },
    { id: 'admin-tickets', label: 'Support Tickets', icon: MessageSquare, badge: 'LIVE' },
    { id: 'admin-referrals', label: 'Referrals & Withdrawals', icon: Gift, badge: 'NEW' },
    { id: 'admin-providers', label: 'API Providers', icon: Code2 },
    { id: 'admin-services', label: 'Manage Services', icon: ListFilter },
    { id: 'admin-orders', label: 'Manage Orders', icon: History },
    { id: 'admin-deposits', label: 'Approve Fund Requests', icon: QrCode, badge: 'NEW' },
    { id: 'admin-users', label: 'Users & Passwords', icon: Users },
    { id: 'admin-welcome-voice', label: 'Welcome Voice', icon: Volume2, badge: 'AUDIO' },
    { id: 'admin-logs', label: 'Sync Logs', icon: Bell },
    { id: 'admin-settings', label: 'Admin Settings', icon: Settings },
  ];

  const displayBalance =
    currency === 'INR' ? `₹${userBalance.toFixed(2)}` : `$${(userBalance / 86).toFixed(2)}`;

  const activeNavItems = isAdmin ? adminNavItems : userNavItems;
  const currentNav = activeNavItems.find((item) => item.id === currentTab) || activeNavItems[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-yellow-500/20 bg-black text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <div
            onClick={(e) => {
              handleNavLogoTap();
            }}
            className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer flex-shrink-0 select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-300 flex items-center justify-center text-black shadow-lg shadow-yellow-500/30 group-hover:scale-105 transition-transform font-black border border-yellow-300 flex-shrink-0 overflow-hidden active:scale-95">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName || 'Logo'} className="w-full h-full object-cover pointer-events-none" />
              ) : (
                <Zap className="w-5 h-5 fill-black text-black pointer-events-none" />
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="text-lg sm:text-2xl font-black tracking-wider text-yellow-400 uppercase flex items-center gap-1.5 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)]">
                <span>{settings?.siteName || 'SMM SHIVAM'}</span>
              </div>
              <div className="text-[9px] text-zinc-400 font-extrabold tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isAdmin ? 'ADMIN PANEL' : 'ONLINE PANEL'}</span>
              </div>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active White-Label Indicator if viewing a Child Panel */}
            {activePanelSlug && (
              <div className="hidden md:flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 rounded-xl px-2.5 py-1 text-xs text-sky-300">
                <Globe className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span className="font-bold">Child Panel: <span className="font-mono text-white">{activePanelSlug}</span></span>
                {onResetToMainPanel && (
                  <button
                    onClick={onResetToMainPanel}
                    className="ml-1 px-1.5 py-0.5 rounded bg-sky-500 text-black font-black text-[9px] hover:bg-sky-400"
                    title="Return to Main Admin Panel"
                  >
                    MAIN ADMIN
                  </button>
                )}
              </div>
            )}

            {/* Balance Badge */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-yellow-500/30 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-inner">
              <Wallet className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-400 font-normal leading-none">Balance</span>
                <span className="text-yellow-400 font-mono text-xs sm:text-sm font-bold">{displayBalance}</span>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="relative hidden xs:block">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-zinc-900 border border-yellow-500/30 rounded-xl px-2.5 py-1.5 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400 cursor-pointer"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>

            {/* Quick Audio / Music Header Toggle */}
            {settings?.welcomeVoiceEnabled !== false && (
              <button
                onClick={handleHeaderAudioToggle}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  audioState.isPlaying
                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-400 shadow-md shadow-yellow-500/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-yellow-400 hover:border-yellow-500/30'
                }`}
                title={audioState.isPlaying ? 'Pause Background Music' : 'Play Welcome Song'}
              >
                {audioState.isPlaying ? (
                  <>
                    <Volume2 className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="hidden sm:inline text-[11px]">Song ON</span>
                  </>
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Hamburger Menu Toggle Button (Match SMMDIP.COM style) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-xl bg-zinc-900 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-all cursor-pointer active:scale-95 shadow-md"
              title="Toggle Menu Sections"
              aria-label="Toggle Navigation Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* POPUP / DROPDOWN MENU (Exact design matching uploaded image) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
          {/* Click Backdrop to close */}
          <div className="absolute inset-0" onClick={() => setIsMenuOpen(false)} />

          {/* Right/Full Drawer Container matching screenshot */}
          <div className="relative z-10 bg-zinc-950 border-l border-yellow-500/20 w-full max-w-sm sm:max-w-md h-full flex flex-col shadow-2xl p-4 sm:p-5 overflow-y-auto animate-in slide-in-from-right duration-300">
            
            {/* Top Bar inside Menu */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-yellow-500 flex items-center justify-center text-black font-black">
                  <Zap className="w-4 h-4 fill-black text-black" />
                </div>
                <span className="text-base font-black text-yellow-400 uppercase tracking-wide">
                  SMM SHIVAM MENU
                </span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-yellow-400 border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currency & Balance Row (Exact match for top item in screenshot: ₹0.0242) */}
            <div className="mb-3 p-3 rounded-xl bg-zinc-900/90 border border-yellow-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-400 font-mono font-black text-base">
                <Wallet className="w-5 h-5 text-yellow-400 shrink-0" />
                <span>{displayBalance}</span>
              </div>

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-black border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-extrabold text-yellow-400 focus:outline-none cursor-pointer"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
              </select>
            </div>

            {/* User Account / Profile Box */}
            {userInfo ? (
              <div className="mb-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">{userInfo.username}</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">
                      {userInfo.whatsappNo ? `+${userInfo.whatsappNo}` : userInfo.email}
                    </div>
                  </div>
                </div>

                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase font-mono border border-yellow-500/30">
                  {userInfo.role}
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  setIsMenuOpen(false);
                }}
                className="mb-3 w-full py-2.5 px-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>SIGN IN / LOG IN</span>
              </button>
            )}

            {/* Panel Mode Switcher Tab (Only visible to authenticated Admin users) */}
            {userInfo && (userInfo.role === 'admin' || (userInfo.email && userInfo.email.toLowerCase().includes('shivamnirmalkar26'))) && (
              <div className="mb-3 grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-black">
                <button
                  onClick={() => {
                    setIsAdmin(false);
                    setCurrentTab('new-order');
                  }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    !isAdmin
                      ? 'bg-yellow-400 text-black font-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  USER PANEL
                </button>
                <button
                  onClick={() => {
                    setIsAdmin(true);
                    setCurrentTab('admin-overview');
                  }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    isAdmin
                      ? 'bg-yellow-400 text-black font-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ADMIN PANEL
                </button>
              </div>
            )}

            {/* STACKED VERTICAL MENU ITEMS (Exact single-line row style from image) */}
            <div className="flex-1 space-y-1.5">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 mb-1">
                {isAdmin ? 'ADMIN SECTIONS' : 'MENU SECTIONS'}
              </div>

              {activeNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-zinc-800 text-yellow-400 border-yellow-500/50 shadow-md font-black'
                        : 'bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 border-zinc-800/80 hover:text-yellow-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-zinc-400'}`} />
                      <span className="tracking-wide">{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          isActive
                            ? 'bg-yellow-400 text-black'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-yellow-400' : 'text-zinc-600'}`} />
                    )}
                  </button>
                );
              })}

              {/* Additional Account / Logout Items matching screenshot */}
              {userInfo && (
                <button
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer mt-3"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Logout</span>
                </button>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-zinc-900 mt-4 text-center text-[10px] text-zinc-500 font-mono">
              SMM Shivam Panel • Active Version 2.5
            </div>

          </div>
        </div>
      )}
    </header>
  );
};


