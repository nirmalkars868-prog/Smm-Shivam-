import React, { useState, useRef } from 'react';
import {
  Zap,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  Clock,
  QrCode,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Award,
  Phone,
  Mail,
  Lock,
  User as UserIcon,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Service, Category, AdminSettings as AdminSettingsType, User } from '../../types';
import { auth, rtdb, ref, get, set, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../../lib/firebaseClient';

interface ChildPanelLandingProps {
  panelSlug: string;
  childPanelInfo?: any;
  settings?: AdminSettingsType;
  services?: Service[];
  categories?: Category[];
  currency?: string;
  currentUser?: User | null;
  onAuthSuccess: (user: User) => void;
  onEnterDashboard?: () => void;
  onSecretAdminUnlock?: () => void;
}

export const ChildPanelLanding: React.FC<ChildPanelLandingProps> = ({
  panelSlug,
  childPanelInfo,
  settings,
  services = [],
  categories = [],
  currency = 'INR',
  currentUser,
  onAuthSuccess,
  onEnterDashboard,
  onSecretAdminUnlock,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const secretTapCountRef = useRef(0);
  const lastSecretTapTimeRef = useRef(0);

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastSecretTapTimeRef.current > 4000) {
      secretTapCountRef.current = 1;
    } else {
      secretTapCountRef.current += 1;
    }
    lastSecretTapTimeRef.current = now;

    if (secretTapCountRef.current >= 7) {
      secretTapCountRef.current = 0;
      if (onSecretAdminUnlock) {
        onSecretAdminUnlock();
      }
    }
  };
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNo, setWhatsappNo] = useState('');
  const [password, setPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Service search & filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const brandName = childPanelInfo?.branding?.panelName || childPanelInfo?.name || settings?.siteName || 'SMM SHIVAM';
  const logoUrl = childPanelInfo?.branding?.logoUrl || settings?.logoUrl || '';
  const themeName = childPanelInfo?.branding?.theme || settings?.theme || 'cyberpunk-neon';
  const accentColor = childPanelInfo?.branding?.accentColor || '#38bdf8';
  const whatsappNumber = childPanelInfo?.contact?.whatsappNumber || childPanelInfo?.contact?.supportWhatsapp || settings?.whatsappNumber || '9516862395';
  const cleanWaNumber = whatsappNumber.replace(/[^0-9]/g, '') || '9516862395';
  const footerText = childPanelInfo?.branding?.footerText || `© ${new Date().getFullYear()} ${brandName}. All rights reserved. Powered by SMM Automation.`;

  const filteredServices = services.filter((s) => {
    const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      s.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.id).includes(searchQuery);
    return matchCat && matchSearch;
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const identifier = loginIdentifier.trim();
    const pass = loginPassword.trim();

    if (!identifier || !pass) {
      setErrorMsg('Please enter both Email/Username and Password.');
      return;
    }

    setIsSubmitting(true);

    try {
      let resolvedEmail = identifier;
      if (!resolvedEmail.includes('@')) {
        // Look up by username in RTDB or backend
        try {
          const userRes = await fetch(`/api/user/me?userId=${encodeURIComponent(identifier)}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.user && userData.user.email) {
              resolvedEmail = userData.user.email;
            } else {
              resolvedEmail = `${identifier.toLowerCase()}@smmshivam.com`;
            }
          } else {
            resolvedEmail = `${identifier.toLowerCase()}@smmshivam.com`;
          }
        } catch {
          resolvedEmail = `${identifier.toLowerCase()}@smmshivam.com`;
        }
      }

      const cred = await signInWithEmailAndPassword(auth, resolvedEmail, pass);
      if (!cred?.user) {
        throw new Error('Authentication failed.');
      }

      // Fetch user profile
      let userProfile: User | null = null;
      if (rtdb) {
        const snap = await get(ref(rtdb, `users/${cred.user.uid}`));
        if (snap.exists()) {
          userProfile = snap.val() as User;
        }
      }

      if (!userProfile) {
        const res = await fetch(`/api/user/me?userId=${cred.user.uid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user) userProfile = data.user;
        }
      }

      const finalUser: User = userProfile || {
        id: cred.user.uid,
        firebaseUid: cred.user.uid,
        username: cred.user.displayName || resolvedEmail.split('@')[0],
        email: resolvedEmail,
        whatsappNo: cleanWaNumber,
        balance: 0,
        totalSpent: 0,
        role: 'user',
        childPanelId: childPanelInfo?.id || panelSlug,
        apiKey: 'usr_key_' + Math.random().toString(36).substring(2, 12),
        status: 'active',
        referralCode: 'REF' + cred.user.uid.substring(0, 5).toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      setSuccessMsg(`Welcome back, ${finalUser.username}!`);
      setTimeout(() => {
        onAuthSuccess(finalUser);
      }, 500);
    } catch (err: any) {
      console.error('Child panel login error:', err);
      let msg = err.message || 'Login failed. Please check credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanWhatsapp = whatsappNo.trim();
    const cleanPass = password.trim();

    if (!cleanUsername || !cleanEmail || !cleanWhatsapp || !cleanPass) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (!cred?.user) {
        throw new Error('Registration failed.');
      }

      const firebaseUid = cred.user.uid;
      const refCode = cleanUsername.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'REF' + Math.floor(1000 + Math.random() * 9000);
      const userApiKey = 'usr_key_' + Math.random().toString(36).substring(2, 12);

      const newUserProfile: User = {
        id: firebaseUid,
        firebaseUid,
        username: cleanUsername,
        email: cleanEmail,
        whatsappNo: cleanWhatsapp,
        password: cleanPass,
        balance: 0,
        totalSpent: 0,
        role: 'user',
        childPanelId: childPanelInfo?.id || panelSlug,
        apiKey: userApiKey,
        status: 'active',
        referralCode: refCode,
        referredByReferralCode: referralCode.trim().toUpperCase() || undefined,
        referralBalance: 0,
        totalReferralEarnings: 0,
        totalReferralWithdrawn: 0,
        createdAt: new Date().toISOString(),
      };

      // Save to RTDB
      if (rtdb) {
        await set(ref(rtdb, `users/${firebaseUid}`), newUserProfile).catch(() => {});
        await set(ref(rtdb, `smm_store/users/${firebaseUid}`), newUserProfile).catch(() => {});
      }

      // Sync with server store
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserProfile),
      }).catch(() => {});

      setSuccessMsg('Account created successfully! Entering dashboard...');
      setTimeout(() => {
        onAuthSuccess(newUserProfile);
      }, 600);
    } catch (err: any) {
      console.error('Child panel signup error:', err);
      let msg = err.message || 'Signup failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Please log in.';
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100 font-sans selection:bg-yellow-500 selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-black/80 border-b border-zinc-800/80 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-300 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-yellow-500/20 overflow-hidden border border-yellow-300">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
              ) : (
                <Zap className="w-5 h-5 fill-black text-black" />
              )}
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black tracking-wider text-yellow-400 uppercase flex items-center gap-1.5 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">
                <span>{brandName}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-extrabold tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>AUTHENTIC RESELLER PORTAL</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <button
                onClick={onEnterDashboard}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs shadow-lg shadow-yellow-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Dashboard ({currentUser.username})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs shadow-md shadow-yellow-500/20 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <section className="relative overflow-hidden py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
        {/* Background glow elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Branded Hero Welcome */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black tracking-wide uppercase shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>OFFICIAL HIGH-SPEED SMM NETWORK</span>
            </div>

            {/* MANDATORY EXACT WELCOME TEXT */}
            <div
              onClick={handleSecretTap}
              onTouchEnd={handleSecretTap}
              className="space-y-2 cursor-pointer select-none"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase drop-shadow-md pointer-events-none">
                <span className="text-yellow-400 block">{brandName}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 block text-2xl sm:text-3xl lg:text-4xl mt-1">
                  WELCOME TO OUR DIGITAL WORLD
                </span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-300 max-w-xl font-normal leading-relaxed pointer-events-none">
                Supercharge your social presence with instant delivery, verified high-retention engagement, automated 24/7 order processing, and zero-drop guarantees.
              </p>
            </div>

            {/* Feature highlights chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-left space-y-1">
                <div className="w-7 h-7 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-white">Instant Fulfillment</div>
                <div className="text-[11px] text-zinc-400">Automated API dispatch</div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-left space-y-1">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-white">Auto QR / UPI</div>
                <div className="text-[11px] text-zinc-400">Instant balance topup</div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-left space-y-1 col-span-2 sm:col-span-1">
                <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-white">24/7 WhatsApp</div>
                <div className="text-[11px] text-zinc-400">Dedicated panel support</div>
              </div>
            </div>

            {/* Direct WhatsApp connect */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <a
                href={`https://wa.me/91${cleanWaNumber}?text=${encodeURIComponent(`Hi ${brandName}, I need assistance with your SMM panel services.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Contact Panel Support: +91 {cleanWaNumber}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
              </a>
            </div>
          </div>

          {/* Right Column: Branded Interactive Login / Signup Form */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/95 border border-yellow-500/30 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl relative">
              {/* Top Form Header with Logo */}
              <div className="text-center pb-4 border-b border-zinc-800">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 mx-auto flex items-center justify-center text-yellow-400 mb-2.5 overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
                  ) : (
                    <Zap className="w-6 h-6 text-yellow-400" />
                  )}
                </div>
                <h2 className="text-lg font-black text-white tracking-wide uppercase">{brandName}</h2>
                <p className="text-xs text-zinc-400 font-medium">Digital SMM Member Gateway</p>
              </div>

              {/* Login / Sign Up Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 my-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-yellow-500 text-black shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Member Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-yellow-500 text-black shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Error & Success Messages */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* LOGIN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Username or Email</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Enter username or email"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 pl-9 font-mono"
                      />
                      <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 pl-9 pr-10 font-mono"
                      />
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-sm shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to {brandName}</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* SIGNUP FORM */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Username *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Choose username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 pl-9 font-mono"
                      />
                      <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Email Address *</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 pl-9 font-mono"
                      />
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">WhatsApp Number *</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="10-digit WhatsApp No"
                        value={whatsappNo}
                        onChange={(e) => setWhatsappNo(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 pl-9 font-mono"
                      />
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Create Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 pl-9 pr-10 font-mono"
                      />
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 font-semibold block mb-1">Referral Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="Optional ref code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 font-mono uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-sm shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Register Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Services & Pricing Showcase Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>Available Services & Live Rates</span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Browse top-tier Instagram, YouTube, Telegram & TikTok engagement rates on {brandName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 pl-9 font-sans w-52 sm:w-64"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            </div>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 cursor-pointer font-sans"
              >
                <option value="all">All Categories ({services.length})</option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Services Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800 font-black">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Rate / 1000</th>
                  <th className="py-3 px-4 text-center">Min / Max</th>
                  <th className="py-3 px-4 text-center">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredServices.slice(0, 15).map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-zinc-500 font-bold">{s.id}</td>
                    <td className="py-3 px-4 font-semibold text-white max-w-xs">{s.serviceName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-yellow-400 text-sm">
                      {currency === 'INR' ? `₹${s.sellingRate.toFixed(2)}` : `$${(s.sellingRate / 86).toFixed(3)}`}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-zinc-400 text-[11px]">
                      {s.min.toLocaleString()} - {s.max.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setAuthMode('signup');
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        className="px-3 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-black font-bold text-[11px] transition-all cursor-pointer border border-yellow-500/30"
                      >
                        Order Now
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-medium">
                      No services match your search filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-yellow-500 flex items-center justify-center text-black font-black text-[10px]">
            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : '⚡'}
          </div>
          <span className="font-bold text-white text-sm uppercase tracking-wider">{brandName}</span>
        </div>
        <p>{footerText}</p>
      </footer>
    </div>
  );
};
