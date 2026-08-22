import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal, fetchUserProfile } from './components/AuthModal';
import { auth, rtdb, ref, onValue, onAuthStateChanged, signOut } from './lib/firebaseClient';
import { SnowEffect } from './components/SnowEffect';

import { NewOrder } from './components/user/NewOrder';
import { ServicesList } from './components/user/ServicesList';
import { MassOrder } from './components/user/MassOrder';
import { OrdersHistory } from './components/user/OrdersHistory';
import { AddFunds } from './components/user/AddFunds';
import { ReferAndEarn } from './components/user/ReferAndEarn';
import { ApiDocs } from './components/user/ApiDocs';
import { Tickets } from './components/user/Tickets';
import { Updates } from './components/user/Updates';

import { VipSupportBanner } from './components/user/VipSupportBanner';
import { UserHeaderCards } from './components/user/UserHeaderCards';
import { FloatingSupportButtons } from './components/user/FloatingSupportButtons';
import { UserNoticeModal } from './components/user/UserNoticeModal';
import { TopAlertBanner } from './components/user/TopAlertBanner';

import { AdminOverview } from './components/admin/AdminOverview';
import { ManageTickets } from './components/admin/ManageTickets';
import { ApiProviders } from './components/admin/ApiProviders';
import { ManageServices } from './components/admin/ManageServices';
import { ManageOrders } from './components/admin/ManageOrders';
import { ManageUsers } from './components/admin/ManageUsers';
import { ManageDeposits } from './components/admin/ManageDeposits';
import { AdminReferrals } from './components/admin/AdminReferrals';
import { SyncLogs } from './components/admin/SyncLogs';
import { AdminSettings } from './components/admin/AdminSettings';
import { WelcomeVoice } from './components/admin/WelcomeVoice';
import { WelcomeVoicePlayer } from './components/user/WelcomeVoicePlayer';

import { Category, Order, Service, AdminSettings as AdminSettingsType, User } from './types';
import { BuyChildPanel } from './components/user/BuyChildPanel';
import { ChildOwnerDashboard } from './components/childowner/ChildOwnerDashboard';
import { ManageChildPanels } from './components/admin/ManageChildPanels';
import { ChildPanelLanding } from './components/childpanel/ChildPanelLanding';

function ensureArray<T = any>(data: any): T[] {
  if (!data) return [];
  let arr: T[] = [];
  if (Array.isArray(data)) {
    arr = data.filter(Boolean);
  } else if (typeof data === 'object') {
    arr = Object.values(data).filter(Boolean) as T[];
  }
  const map = new Map<string, T>();
  const withoutId: T[] = [];
  for (const item of arr) {
    if (item && typeof item === 'object' && 'id' in item && (item as any).id) {
      map.set(String((item as any).id), item);
    } else {
      withoutId.push(item);
    }
  }
  return Array.from(map.values()).concat(withoutId);
}

const getThemeClass = (themeName?: string) => {
  switch (themeName) {
    case 'cyberpunk-neon':
      return 'bg-[#060b18] text-slate-100';
    case 'emerald-luxury':
      return 'bg-[#030e09] text-slate-100';
    case 'royal-purple':
      return 'bg-[#0a0518] text-slate-100';
    case 'sunset-amber':
      return 'bg-[#120804] text-slate-100';
    case 'ice-sapphire':
      return 'bg-[#020b1a] text-slate-100';
    case 'clean-light':
      return 'bg-[#0f172a] text-slate-100';
    case 'default-dark':
    default:
      return 'bg-black text-slate-100';
  }
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  const [currentTab, setCurrentTab] = useState<string>('new-order');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userBalance, setUserBalance] = useState<number>(0.0);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<AdminSettingsType | undefined>(undefined);

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currency, setCurrency] = useState<string>('INR');
  const [theme, setTheme] = useState<string>('dark');
  const [activePanelSlug, setActivePanelSlug] = useState<string | null>(null);
  const [childBranding, setChildBranding] = useState<any | null>(null);
  const [childPanelInfo, setChildPanelInfo] = useState<any | null>(null);

  // Detect /panel/:slug or ?panel=:slug or custom domain
  const detectPanelFromUrl = () => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const match = path.match(/^\/panel\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      setActivePanelSlug(match[1]);
      return match[1];
    }
    const params = new URLSearchParams(window.location.search);
    const paramSlug = params.get('panel');
    if (paramSlug) {
      setActivePanelSlug(paramSlug);
      return paramSlug;
    }
    const host = window.location.hostname;
    if (host && !host.includes('localhost') && !host.includes('run.app') && !host.includes('vercel.app') && !host.includes('web.app')) {
      setActivePanelSlug(host);
      return host;
    }
    setActivePanelSlug(null);
    return null;
  };

  const fetchChildBranding = async (slug: string) => {
    try {
      const res = await fetch(`/api/panel/info?panel=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.isChildPanel && data.childPanel) {
        setChildPanelInfo(data.childPanel);
        setChildBranding(data.branding || data.childPanel.branding);
      } else if (data.branding) {
        setChildBranding(data.branding);
        setChildPanelInfo(data.childPanel || null);
      }
    } catch (e) {
      console.warn('Failed to load child branding:', e);
    }
  };

  useEffect(() => {
    const slug = detectPanelFromUrl();
    if (slug) {
      fetchChildBranding(slug);
    }
    const handlePop = () => {
      const s = detectPanelFromUrl();
      if (s) fetchChildBranding(s);
      else {
        setChildBranding(null);
        setChildPanelInfo(null);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Update Document Title and Favicon based on active branding
  useEffect(() => {
    const currentName = childBranding?.panelName || childPanelInfo?.name || settings?.siteName || 'SMM SHIVAM';
    document.title = `${currentName} | Digital World`;

    const faviconUrl = childBranding?.faviconUrl || settings?.faviconUrl;
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [childBranding, childPanelInfo, settings]);

  const handleSwitchPanel = (slug: string | null) => {
    if (slug) {
      window.history.pushState({}, '', `/panel/${slug}`);
      setActivePanelSlug(slug);
      fetchChildBranding(slug);
    } else {
      window.history.pushState({}, '', '/');
      setActivePanelSlug(null);
      setChildBranding(null);
      setChildPanelInfo(null);
    }
  };

  // Firebase Auth State Listener
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: If Firebase auth listener stalls, unblock loading screen after 1.5s
    const authTimeout = setTimeout(() => {
      if (isMounted) setIsAuthInitializing(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      clearTimeout(authTimeout);

      if (user) {
        setFirebaseUser(user);
        localStorage.setItem('smm_panel_userId', user.uid);
        setIsProfileLoading(true);

        try {
          const profile = await fetchUserProfile(user.uid);
          if (isMounted && profile) {
            setUserInfo(profile);
            setUserBalance(profile.balance || 0);

            const adminCheck =
              profile.role === 'admin' ||
              (user.email && user.email.toLowerCase().includes('shivamnirmalkar26'));

            if (adminCheck) {
              setIsAdmin(true);
            }
          }
        } catch (err) {
          console.warn('Error fetching profile from RTDB:', err);
        } finally {
          if (isMounted) {
            setIsProfileLoading(false);
            setIsAuthInitializing(false);
          }
        }
        fetchUserOrders(user.uid);
      } else {
        setFirebaseUser(null);
        setUserInfo(null);
        setIsAdmin(false);
        setUserBalance(0);
        setIsAuthInitializing(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // Listen to Settings from RTDB with REST API fallback
  useEffect(() => {
    try {
      const settingsRef = ref(rtdb, 'settings');
      const unsubscribe = onValue(
        settingsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setSettings(snapshot.val());
          }
        },
        (error) => {
          console.warn('Firebase RTDB settings listener fallback:', error.message);
          fetchSettingsFromApi();
        }
      );
      return () => unsubscribe();
    } catch (e) {
      fetchSettingsFromApi();
    }
  }, []);

  const fetchSettingsFromApi = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (e) {
      console.warn('Failed to load settings via API:', e);
    }
  };

  // Realtime Database listeners for Catalog
  useEffect(() => {
    try {
      // Listen to both smm_store and root nodes
      const smmStoreRef = ref(rtdb, 'smm_store');
      const servicesRef = ref(rtdb, 'services');
      const categoriesRef = ref(rtdb, 'categories');

      const unsubSmmStore = onValue(smmStoreRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val) {
            const parsedServices = ensureArray<Service>(val.services);
            const parsedCategories = ensureArray<Category>(val.categories);
            if (parsedServices.length > 0) setServices(parsedServices);
            if (parsedCategories.length > 0) setCategories(parsedCategories);
          }
        }
      });

      const unsubCat = onValue(categoriesRef, (snap) => {
        if (snap.exists()) {
          const cats = ensureArray<Category>(snap.val());
          if (cats.length > 0) setCategories(cats);
        }
      });

      const unsubSrv = onValue(servicesRef, (snap) => {
        if (snap.exists()) {
          const srvs = ensureArray<Service>(snap.val());
          if (srvs.length > 0) setServices(srvs);
        }
      });

      return () => {
        unsubSmmStore();
        unsubCat();
        unsubSrv();
      };
    } catch (e) {
      console.warn('RTDB Catalog listener error, fallback to REST API:', e);
      fetchInitialData();
    }
  }, []);

  // Initial and on-tab-change Data Fetch via REST API
  const fetchInitialData = async () => {
    try {
      const resSrv = await fetch('/api/services');
      if (!resSrv.ok) return;
      const dataSrv = await resSrv.json();

      if (dataSrv.categories && Array.isArray(dataSrv.categories) && dataSrv.categories.length > 0) {
        setCategories(dataSrv.categories);
      }
      if (dataSrv.services && Array.isArray(dataSrv.services) && dataSrv.services.length > 0) {
        setServices(dataSrv.services);
      }
      if (dataSrv.settings) setSettings(dataSrv.settings);
    } catch (error) {
      console.warn('Initial data load notice:', error);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [currentTab]);

  // Realtime User Balance & Profile Sync from RTDB
  useEffect(() => {
    if (!firebaseUser) return;
    try {
      const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
      const unsubUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const u = snapshot.val();
          setUserInfo(u);
          if (typeof u.balance === 'number') {
            setUserBalance(u.balance);
          }
        }
      });
      return () => unsubUser();
    } catch (e) {
      console.warn('Realtime balance listener fallback:', e);
    }
  }, [firebaseUser]);

  const activeUser = userInfo || (firebaseUser ? {
    id: firebaseUser.uid,
    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    whatsappNo: '9516862395',
    role: isAdmin ? 'admin' : 'user',
    balance: userBalance,
    referralCode: 'REF' + firebaseUser.uid.substring(0, 5).toUpperCase(),
    referralsCount: 0,
    referralEarnings: 0,
    createdAt: new Date().toISOString(),
  } : null);

  const fetchUserOrders = async (userId: string) => {
    try {
      const resOrd = await fetch(`/api/orders?userId=${userId}`);
      const dataOrd = await resOrd.json();
      if (dataOrd.orders) setOrders(dataOrd.orders);
    } catch (e) {
      console.warn('User orders fetch error:', e);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setUserInfo(user);
    setUserBalance(user.balance);
    const adminCheck = user.role === 'admin' || (user.email && user.email.toLowerCase().includes('shivamnirmalkar26'));
    if (adminCheck) {
      setIsAdmin(true);
      setCurrentTab('admin-overview');
    } else {
      setIsAdmin(false);
      setCurrentTab('new-order');
    }
    setIsAuthOpen(false);
    fetchInitialData();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('smm_panel_userId');
    setFirebaseUser(null);
    setUserInfo(null);
    setIsAdmin(false);
    setUserBalance(0);
    setIsAuthOpen(true);
  };

  const handleOrderPlaced = () => {
    fetchInitialData();
    if (firebaseUser) {
      fetchUserOrders(firebaseUser.uid);
    }
    setCurrentTab('orders');
  };

  const handleSelectServiceFromList = (serviceId: string, categoryName: string) => {
    setCurrentTab('new-order');
  };

  const handleSecretAdminUnlock = () => {
    const secretAdminUser: User = {
      id: 'usr-admin',
      username: 'yourshivamff_',
      email: 'admin@smmshivam.com',
      whatsappNo: '9516862495',
      balance: 500.0,
      totalSpent: 0,
      role: 'admin',
      apiKey: 'usr_api_key_88f910a2b',
      status: 'active',
      referralCode: 'ADMIN09',
      referralBalance: 0,
      totalReferralEarnings: 0,
      totalReferralWithdrawn: 0,
      referralEligible: true,
      createdAt: new Date().toISOString(),
    };
    setFirebaseUser({
      uid: 'usr-admin',
      email: 'admin@smmshivam.com',
      displayName: 'yourshivamff_',
    } as any);
    setUserInfo(secretAdminUser);
    setUserBalance(secretAdminUser.balance);
    setIsAdmin(true);
    setCurrentTab('admin-overview');
    setIsAuthOpen(false);
    localStorage.setItem('smm_panel_userId', secretAdminUser.id);
  };

  // While Firebase Auth is initializing, show a loading screen.
  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-400 font-medium">Initializing SMM Panel Session...</p>
        </div>
      </div>
    );
  }

  const effectiveSettings = childBranding
    ? {
        ...settings,
        siteName: childBranding.siteName || childBranding.panelName || settings?.siteName || 'SMM SHIVAM',
        theme: childBranding.theme || settings?.theme || 'cyberpunk-neon',
        accentColor: childBranding.accentColor || settings?.accentColor || '#eab308',
        upiId: childBranding.upiId || settings?.upiId || '9770571091@ybl',
        whatsappSupportNo: childBranding.whatsappNumber || childBranding.whatsappSupportNo || settings?.whatsappSupportNo || '9516862395',
      }
    : settings;

  const themeClassName = getThemeClass(effectiveSettings?.theme);

  // If visiting a Child Panel while unauthenticated, show the Branded Child Panel Customer Landing Page
  if (activePanelSlug && !firebaseUser) {
    return (
      <div className={`min-h-screen ${themeClassName} flex flex-col font-sans antialiased selection:bg-yellow-500 selection:text-black relative transition-colors duration-500`}>
        {/* Snow Particles Effect Toggle */}
        <SnowEffect enabled={effectiveSettings?.snowEffect ?? false} />

        {/* Active Child Panel Top Bar */}
        <div className="bg-gradient-to-r from-sky-950/90 via-indigo-950/90 to-purple-950/90 border-b border-sky-500/40 px-4 py-2.5 text-xs text-white flex flex-wrap items-center justify-between gap-2 shadow-lg relative z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-sky-400">🌐 White-Label Child Panel:</span>
            <span className="text-yellow-400 font-mono font-bold">{effectiveSettings?.siteName || activePanelSlug}</span>
            <span className="text-zinc-300 font-mono text-[11px]">(/panel/{activePanelSlug})</span>
          </div>
          <button
            onClick={() => handleSwitchPanel(null)}
            className="px-3 py-1 rounded-lg bg-black/70 hover:bg-black text-yellow-400 font-bold border border-yellow-500/40 text-[11px] transition-all cursor-pointer"
          >
            ✕ Back to Main Admin SMM SHIVAM Panel
          </button>
        </div>

        {/* Branded Child Panel Customer Landing Page */}
        <ChildPanelLanding
          panelSlug={activePanelSlug}
          childPanelInfo={childPanelInfo}
          settings={effectiveSettings}
          services={services}
          categories={categories}
          currency={currency}
          currentUser={activeUser}
          onAuthSuccess={handleAuthSuccess}
          onEnterDashboard={() => {}}
          onSecretAdminUnlock={handleSecretAdminUnlock}
        />

        {/* Optional Auth Modal */}
        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onAuthSuccess={handleAuthSuccess}
            allowClose={true}
            childPanelId={activePanelSlug}
            childPanelBranding={childBranding}
            settings={effectiveSettings}
            onTriggerSecretAdmin={handleSecretAdminUnlock}
          />
        )}

        {/* Global Welcome Voice Audio Player */}
        <WelcomeVoicePlayer settings={effectiveSettings} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClassName} flex flex-col font-sans antialiased selection:bg-yellow-500 selection:text-black relative transition-colors duration-500`}>
      {/* Snow Particles Effect Toggle */}
      <SnowEffect enabled={effectiveSettings?.snowEffect ?? false} />

      {/* Active Child Panel Floating Top Banner */}
      {activePanelSlug && (
        <div className="bg-gradient-to-r from-sky-950/90 via-indigo-950/90 to-purple-950/90 border-b border-sky-500/40 px-4 py-2.5 text-xs text-white flex flex-wrap items-center justify-between gap-2 shadow-lg relative z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-sky-400">🌐 White-Label Child Panel:</span>
            <span className="text-yellow-400 font-mono font-bold">{effectiveSettings?.siteName || activePanelSlug}</span>
            <span className="text-zinc-300 font-mono text-[11px]">(/panel/{activePanelSlug})</span>
          </div>
          <button
            onClick={() => handleSwitchPanel(null)}
            className="px-3 py-1 rounded-lg bg-black/70 hover:bg-black text-yellow-400 font-bold border border-yellow-500/40 text-[11px] transition-all cursor-pointer"
          >
            ✕ Back to Main Admin SMM SHIVAM Panel
          </button>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        userBalance={userBalance}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        setTheme={setTheme}
        userInfo={activeUser}
        settings={effectiveSettings}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        activePanelSlug={activePanelSlug}
        onResetToMainPanel={() => handleSwitchPanel(null)}
        onSecretAdminUnlock={handleSecretAdminUnlock}
      />

      {/* Persistent Top Announcement Banner */}
      {!isAdmin && <TopAlertBanner settings={effectiveSettings} onNavigateTab={(tab) => setCurrentTab(tab)} />}

      {/* Special Announcement / Notice Pop-up Modal on User Entry */}
      {!isAdmin && <UserNoticeModal settings={effectiveSettings} onNavigateTab={(tab) => setCurrentTab(tab)} />}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">
        {/* Profile Loading Notice (Non-blocking) */}
        {firebaseUser && isProfileLoading && !userInfo && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between text-yellow-400 text-xs">
            <span>Syncing user profile with Realtime Database...</span>
            <div className="w-3.5 h-3.5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* USER TABS */}
        {!isAdmin && (
          <>
            {/* VIP 24/7 Support Banner & User Welcome / Balance Header Cards */}
            <VipSupportBanner settings={effectiveSettings} />
            <UserHeaderCards
              username={activeUser?.username || 'digital_shivam__08'}
              balance={userBalance}
              currency={currency}
              exchangeRateINR={effectiveSettings?.exchangeRateINR || 86}
            />

            {currentTab === 'new-order' && (
              <NewOrder
                categories={categories}
                services={services}
                currentUser={activeUser}
                userBalance={userBalance}
                currency={currency}
                settings={effectiveSettings}
                childPanelId={activePanelSlug || activeUser?.childPanelId}
                onOrderPlaced={handleOrderPlaced}
              />
            )}
            {currentTab === 'buy-child-panel' && (
              <BuyChildPanel
                currentUser={activeUser}
                settings={settings}
                currency={currency}
                onOpenPortal={() => setCurrentTab('child-owner-portal')}
                onNavigateToPanel={(slug) => handleSwitchPanel(slug)}
              />
            )}
            {currentTab === 'child-owner-portal' && (
              <ChildOwnerDashboard
                childPanelId={activeUser?.childPanelId}
                currentUser={activeUser}
                currency={currency}
                onSwitchToLivePreview={(slug) => handleSwitchPanel(slug)}
              />
            )}
            {currentTab === 'services' && (
              <ServicesList
                categories={categories}
                services={services}
                currency={currency}
                onSelectService={handleSelectServiceFromList}
              />
            )}
            {currentTab === 'mass-order' && <MassOrder />}
            {currentTab === 'orders' && <OrdersHistory orders={orders} currency={currency} />}
            {currentTab === 'add-funds' && (
              <AddFunds
                currentUser={activeUser}
                userBalance={userBalance}
                currency={currency}
                settings={effectiveSettings}
                childPanelId={activePanelSlug || activeUser?.childPanelId}
                onBalanceUpdated={fetchInitialData}
              />
            )}
            {currentTab === 'referrals' && activeUser && (
              <ReferAndEarn currentUser={activeUser} />
            )}
            {currentTab === 'api' && <ApiDocs />}
            {currentTab === 'tickets' && <Tickets currentUser={activeUser} settings={effectiveSettings} />}
            {currentTab === 'updates' && <Updates />}
          </>
        )}

        {/* ADMIN TABS */}
        {isAdmin && (
          <>
            {currentTab === 'admin-overview' && <AdminOverview currency={currency} />}
            {currentTab === 'admin-child-panels' && (
              <ManageChildPanels
                currency={currency}
                onSwitchToPanelPreview={(slug) => handleSwitchPanel(slug)}
              />
            )}
            {currentTab === 'admin-tickets' && <ManageTickets />}
            {currentTab === 'admin-referrals' && <AdminReferrals />}
            {currentTab === 'admin-providers' && <ApiProviders />}
            {currentTab === 'admin-services' && <ManageServices currency={currency} />}
            {currentTab === 'admin-orders' && <ManageOrders currency={currency} />}
            {currentTab === 'admin-deposits' && <ManageDeposits />}
            {currentTab === 'admin-users' && <ManageUsers currency={currency} />}
            {currentTab === 'admin-welcome-voice' && (
              <WelcomeVoice
                settings={effectiveSettings}
                onSettingsUpdated={fetchInitialData}
              />
            )}
            {currentTab === 'admin-logs' && <SyncLogs />}
            {currentTab === 'admin-settings' && <AdminSettings />}
          </>
        )}
      </main>

      {/* Global Welcome Voice Audio Player (Plays for users upon opening/reloading website) */}
      <WelcomeVoicePlayer settings={effectiveSettings} />

      {/* Auth Login/Signup Modal */}
      <AuthModal
        isOpen={!firebaseUser || isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        allowClose={!!firebaseUser}
        childPanelId={activePanelSlug || undefined}
        childPanelBranding={childBranding}
        settings={effectiveSettings}
        onTriggerSecretAdmin={handleSecretAdminUnlock}
      />

      {/* Floating Support Buttons */}
      {!isAdmin && <FloatingSupportButtons settings={effectiveSettings} />}

      {/* Footer */}
      <Footer setCurrentTab={setCurrentTab} />
    </div>
  );
}
