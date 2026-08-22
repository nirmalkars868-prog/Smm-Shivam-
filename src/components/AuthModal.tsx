import React, { useState, useEffect, useRef } from 'react';
import { LogIn, UserPlus, Phone, Mail, Lock, User as UserIcon, X, Check, AlertTriangle, ShieldCheck, Gift } from 'lucide-react';
import { User } from '../types';
import { auth, rtdb, ref, get, set, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../lib/firebaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  initialReferralCode?: string;
  allowClose?: boolean;
  childPanelId?: string;
  childPanelBranding?: any;
  settings?: any;
  onTriggerSecretAdmin?: () => void;
}

export async function fetchUserProfile(uid: string, identifierOrEmail: string = ''): Promise<User | null> {
  const cleanIdOrEmail = (identifierOrEmail || '').trim();
  const lowerIdOrEmail = cleanIdOrEmail.toLowerCase();

  // 1. First, check Realtime Database directly at users/${uid}
  if (rtdb && uid) {
    try {
      const snap = await get(ref(rtdb, `users/${uid}`));
      if (snap.exists()) {
        const val = snap.val() as User;
        if (val) return val;
      }
    } catch (err) {
      console.warn('RTDB users/uid query warning:', err);
    }
  }

  // 2. Search smm_store/users array/object in Realtime Database
  if (rtdb) {
    try {
      const storeSnap = await get(ref(rtdb, 'smm_store/users'));
      if (storeSnap.exists()) {
        const usersList = storeSnap.val();
        let match: any = null;
        if (Array.isArray(usersList)) {
          match = usersList.find(
            (u: any) =>
              u &&
              (u.id === uid ||
               u.firebaseUid === uid ||
               (u.email && u.email.toLowerCase() === lowerIdOrEmail) ||
               (u.username && u.username.toLowerCase() === lowerIdOrEmail) ||
               (u.whatsappNo && u.whatsappNo === cleanIdOrEmail))
          );
        } else if (typeof usersList === 'object') {
          match = Object.values(usersList).find(
            (u: any) =>
              u &&
              (u.id === uid ||
               u.firebaseUid === uid ||
               (u.email && u.email.toLowerCase() === lowerIdOrEmail) ||
               (u.username && u.username.toLowerCase() === lowerIdOrEmail) ||
               (u.whatsappNo && u.whatsappNo === cleanIdOrEmail))
          );
        }

        if (match) {
          const updatedProfile: User = {
            ...match,
            id: uid || match.id,
            firebaseUid: uid || match.id,
          };
          if (rtdb && uid) {
            await set(ref(rtdb, `users/${uid}`), updatedProfile).catch(() => {});
          }
          await fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile),
          }).catch(() => {});
          return updatedProfile;
        }
      }
    } catch (err) {
      console.warn('RTDB smm_store/users query warning:', err);
    }
  }

  // 3. Query backend /api/user/me endpoint
  if (cleanIdOrEmail || uid) {
    try {
      const queryKey = uid || cleanIdOrEmail;
      const res = await fetch(`/api/user/me?userId=${encodeURIComponent(queryKey)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const updatedProfile: User = {
            ...data.user,
            id: uid || data.user.id,
          };
          if (rtdb && uid) {
            await set(ref(rtdb, `users/${uid}`), updatedProfile).catch(() => {});
          }
          await fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile),
          }).catch(() => {});
          return updatedProfile;
        }
      }
    } catch (err) {
      console.warn('Backend /api/user/me query warning:', err);
    }
  }

  // 4. If still not found and UID is present (authenticated via Firebase Auth), auto-create RTDB profile using UID
  if (uid) {
    const isAdminUser =
      lowerIdOrEmail.includes('shivamnirmalkar26') ||
      lowerIdOrEmail === 'admin@smmshivam.com' ||
      lowerIdOrEmail === 'yourshivamff_' ||
      lowerIdOrEmail === 'admin';

    const userEmail = cleanIdOrEmail.includes('@')
      ? cleanIdOrEmail
      : (isAdminUser ? 'shivamnirmalkar26@gmail.com' : `${cleanIdOrEmail || 'user'}@smmshivam.com`);

    const defaultUsername = cleanIdOrEmail
      ? (cleanIdOrEmail.includes('@') ? cleanIdOrEmail.split('@')[0] : cleanIdOrEmail)
      : (isAdminUser ? 'yourshivamff_' : 'user_' + uid.substring(0, 6));

    const autoCreatedProfile: User = {
      id: uid,
      username: isAdminUser ? 'yourshivamff_' : defaultUsername,
      email: userEmail,
      whatsappNo: '919516862495',
      balance: isAdminUser ? 500.0 : 0.0,
      totalSpent: isAdminUser ? 1245.5 : 0.0,
      role: isAdminUser ? 'admin' : 'user',
      apiKey: isAdminUser ? 'usr_api_key_88f910a2b' : 'usr_key_' + Math.random().toString(36).substring(2, 12),
      status: 'active',
      referralCode: isAdminUser ? 'ADMIN09' : (defaultUsername.toUpperCase().replace(/[^A-Z0-9]/g, '') || ('REF' + uid.substring(0, 4))),
      referralBalance: 0,
      totalReferralEarnings: 0,
      totalReferralWithdrawn: 0,
      createdAt: new Date().toISOString(),
    };

    if (rtdb) {
      try {
        await set(ref(rtdb, `users/${uid}`), autoCreatedProfile);
      } catch (err) {
        console.warn('Auto-create profile RTDB set warning:', err);
      }
    }

    try {
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoCreatedProfile),
      });
    } catch (err) {
      console.warn('Auto-create profile sync warning:', err);
    }

    return autoCreatedProfile;
  }

  return null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialReferralCode,
  allowClose = true,
  childPanelId,
  childPanelBranding,
  settings,
  onTriggerSecretAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('signup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Signup form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNo, setWhatsappNo] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode || 'ADMIN09');

  // Login form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Branding
  const displayBrandName = childPanelBranding?.siteName || settings?.siteName || 'SMM SHIVAM';
  const displayLogo = childPanelBranding?.logoUrl || settings?.logoUrl || '';

  const tapCountRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  const handleLogoTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    // If last tap was more than 4.5 seconds ago, reset counter
    if (now - lastTapTimeRef.current > 4500) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      if (onTriggerSecretAdmin) {
        onTriggerSecretAdmin();
      } else {
        // Fallback: create admin session profile and log in
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
        onAuthSuccess(secretAdminUser);
        onClose();
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams(window.location.search);
      const refFromUrl = params.get('ref') || initialReferralCode;
      if (refFromUrl) {
        setReferralCode(refFromUrl.trim().toUpperCase());
      } else if (!referralCode) {
        setReferralCode('ADMIN09');
      }
    }
  }, [isOpen, initialReferralCode]);

  if (!isOpen) return null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const finalRefCode = referralCode.trim().toUpperCase() || 'ADMIN09';
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanWhatsapp = whatsappNo.trim();
    const cleanPass = password.trim();

    if (!cleanUsername || !cleanEmail || !cleanWhatsapp || !cleanPass) {
      setErrorMsg('All fields are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if username or email is already registered
      try {
        const checkRes = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(cleanUsername)}&email=${encodeURIComponent(cleanEmail)}`
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.usernameTaken) {
            setErrorMsg('This username already registered');
            setIsSubmitting(false);
            return;
          }
          if (checkData.emailTaken) {
            setErrorMsg('An account with this email address already exists. Please log in.');
            setIsSubmitting(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Username availability check error:', e);
      }

      // Check RTDB users if available
      if (rtdb) {
        try {
          const storeSnap = await get(ref(rtdb, 'smm_store/users'));
          if (storeSnap.exists()) {
            const usersList = storeSnap.val();
            const arr = Array.isArray(usersList) ? usersList : Object.values(usersList || {});
            const exists = arr.some(
              (u: any) => u && u.username && u.username.trim().toLowerCase() === cleanUsername.toLowerCase()
            );
            if (exists) {
              setErrorMsg('This username already registered');
              setIsSubmitting(false);
              return;
            }
          }
        } catch (err) {
          console.warn('RTDB username uniqueness check warning:', err);
        }
      }

      // 1. Authenticate / Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (!cred?.user) {
        throw new Error('Failed to register user in Firebase Authentication.');
      }

      const firebaseUid = cred.user.uid;
      const myReferralCode = cleanUsername.toUpperCase().replace(/[^A-Z0-9]/g, '') || ('REF' + Math.floor(1000 + Math.random() * 9000));
      const userApiKey = 'usr_key_' + Math.random().toString(36).substring(2, 12);

      // 2. Build User Profile object with password for Admin Panel visibility
      const newUserProfile: User = {
        id: firebaseUid,
        username: cleanUsername,
        email: cleanEmail,
        whatsappNo: cleanWhatsapp,
        password: cleanPass,
        balance: 0,
        totalSpent: 0,
        role: 'user',
        childPanelId: childPanelId || undefined,
        apiKey: userApiKey,
        status: 'active',
        referralCode: myReferralCode,
        referredByReferralCode: finalRefCode,
        referralBalance: 0,
        totalReferralEarnings: 0,
        totalReferralWithdrawn: 0,
        createdAt: new Date().toISOString(),
      };

      // 3. Write user profile to Firebase Realtime Database
      if (rtdb) {
        await set(ref(rtdb, `users/${firebaseUid}`), newUserProfile).catch((err) => {
          console.warn('RTDB /users profile write notice:', err?.message || err);
        });
        await set(ref(rtdb, `smm_store/users/${firebaseUid}`), newUserProfile).catch((err) => {
          console.warn('RTDB /smm_store/users profile write notice:', err?.message || err);
        });
      }

      // 4. Sync profile to server memory store
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUserProfile),
        });
      } catch (syncErr: any) {
        console.warn('Backend user profile sync warning:', syncErr.message);
      }

      setSuccessMsg('Account created successfully! Logging you in...');
      setTimeout(() => {
        onAuthSuccess(newUserProfile);
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Signup error:', err);
      let msg = err.message || 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Please log in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const cleanIdentifier = loginIdentifier.trim();
      const cleanPassword = loginPassword.trim();

      if (!cleanIdentifier || !cleanPassword) {
        setErrorMsg('Please enter both Email/Username and Password.');
        setIsSubmitting(false);
        return;
      }

      let emailToUse = cleanIdentifier;
      const lowerIdent = cleanIdentifier.toLowerCase();
      const isAdminIdent =
        lowerIdent.includes('shivamnirmalkar26') ||
        lowerIdent === 'admin@smmshivam.com' ||
        lowerIdent === 'yourshivamff_' ||
        lowerIdent === 'admin';

      // If user entered a username or phone number (no @), resolve email first
      if (!cleanIdentifier.includes('@')) {
        const existingProfile = await fetchUserProfile('', cleanIdentifier);
        if (existingProfile && existingProfile.email) {
          emailToUse = existingProfile.email;
        } else if (isAdminIdent) {
          emailToUse = 'admin@smmshivam.com';
        } else {
          emailToUse = `${cleanIdentifier}@smmshivam.com`;
        }
      }

      // 1. Attempt login with primary email
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailToUse, cleanPassword);
      } catch (fbErr: any) {
        console.warn('Primary Firebase Auth login attempt notice:', fbErr?.code || fbErr?.message || fbErr);

        // If admin login failed and email was admin@smmshivam.com, retry with shivamnirmalkar26@gmail.com
        if (isAdminIdent && emailToUse === 'admin@smmshivam.com') {
          try {
            emailToUse = 'shivamnirmalkar26@gmail.com';
            userCredential = await signInWithEmailAndPassword(auth, emailToUse, cleanPassword);
          } catch (retryErr) {
            console.warn('Secondary admin login retry notice:', retryErr);
          }
        }

        // If user is not yet created in Firebase Auth (e.g. seeded admin or initial user profile), auto-register in Firebase Auth
        if (!userCredential && isAdminIdent) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, emailToUse, cleanPassword);
          } catch (createErr) {
            console.warn('Auto-register admin in Firebase Auth notice:', createErr);
          }
        }

        if (!userCredential) {
          const rawErr = String(fbErr?.code || fbErr?.message || fbErr).toLowerCase();
          let msg = 'Invalid username/email or password. Please check your credentials and try again.';
          if (rawErr.includes('invalid-credential') || rawErr.includes('wrong-password') || rawErr.includes('user-not-found')) {
            msg = 'Invalid username/email or password. Please check your credentials and try again.';
          } else if (rawErr.includes('invalid-email')) {
            msg = 'Invalid email address format. Please check your email or username.';
          } else if (rawErr.includes('too-many-requests')) {
            msg = 'Access temporarily disabled due to too many failed attempts. Please try again later.';
          }
          setErrorMsg(msg);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Get authenticated Firebase user from auth.currentUser
      const firebaseUser = auth.currentUser || userCredential.user;
      if (!firebaseUser) {
        setErrorMsg('Authentication failed.');
        setIsSubmitting(false);
        return;
      }

      const uid = firebaseUser.uid;
      const userEmail = firebaseUser.email || emailToUse;

      // 3. Use Firebase UID to load user's profile from Realtime Database
      const userProfile = await fetchUserProfile(uid, userEmail);

      // 4. If the Firebase user does not have a profile yet, show a proper "profile not found" message
      if (!userProfile) {
        setErrorMsg('User profile not found. Please contact support or create an account.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Welcome back, ${userProfile.username || 'User'}!`);
      setTimeout(() => {
        onAuthSuccess(userProfile);
        onClose();
      }, 800);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Server error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        {allowClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-zinc-400 hover:text-yellow-400 p-2 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with 7-Tap Secret Admin Unlock */}
        <div
          onClick={handleLogoTap}
          onTouchEnd={handleLogoTap}
          title="SMM SHIVAM"
          className="text-center mb-6 cursor-pointer select-none group active:opacity-90"
        >
          <div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-yellow-500/20 overflow-hidden group-active:scale-90 transition-transform pointer-events-none"
          >
            {displayLogo ? (
              <img src={displayLogo} alt={displayBrandName} className="w-full h-full object-cover pointer-events-none" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-black pointer-events-none" />
            )}
          </div>
          <h2
            className="text-xl font-black text-yellow-400 uppercase tracking-tight pointer-events-none"
          >
            {displayBrandName}
          </h2>
          <p className="text-xs text-zinc-300 font-bold tracking-wide uppercase mt-1 pointer-events-none">
            WELCOME TO OUR DIGITAL WORLD
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5 pointer-events-none">
            Sign up or Log in with your WhatsApp No, Email & Password
          </p>
        </div>

        {/* Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-black p-1.5 rounded-2xl border border-zinc-800 mb-6 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>SIGN UP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>LOG IN</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SIGNUP FORM */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4 text-xs">
            {/* Username */}
            <div>
              <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-yellow-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_smm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 pl-10 pr-4 text-yellow-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                WhatsApp Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-yellow-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 919876543210"
                  value={whatsappNo}
                  onChange={(e) => setWhatsappNo(e.target.value)}
                  className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 pl-10 pr-4 text-yellow-400 font-bold focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Include country code without + sign (e.g. 919876543210)</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-yellow-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 pl-10 pr-4 text-yellow-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-yellow-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 pl-10 pr-4 text-yellow-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <label className="block text-zinc-300 font-extrabold uppercase mb-1 flex items-center justify-between">
                <span>Referral Code <span className="text-yellow-400">*</span></span>
                <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Default: ADMIN09</span>
              </label>
              <div className="relative">
                <Gift className="w-4 h-4 text-yellow-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. ADMIN09"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-yellow-500/50 focus:border-yellow-400 rounded-xl py-3 pl-10 pr-4 text-yellow-400 font-black tracking-widest uppercase focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                Admin referral code is <strong className="text-yellow-400">ADMIN09</strong>. You can sign up with this or enter a friend's referral code.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm rounded-xl cursor-pointer shadow-lg shadow-yellow-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Account...' : 'CREATE ACCOUNT & SIGN UP'}</span>
            </button>
          </form>
        )}

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Email / WhatsApp / Username */}
            <div>
              <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                Email / WhatsApp / Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-yellow-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Enter Email, WhatsApp No or Username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 pl-10 pr-4 text-yellow-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-zinc-300 font-extrabold uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-yellow-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-800 focus:border-yellow-400 rounded-xl py-3 pl-10 pr-4 text-yellow-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm rounded-xl cursor-pointer shadow-lg shadow-yellow-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Logging In...' : 'LOG IN NOW'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
