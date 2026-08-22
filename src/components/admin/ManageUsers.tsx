import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Search,
  UserCheck,
  PlusCircle,
  MinusCircle,
  Ban,
  CheckCircle2,
  ShieldAlert,
  DollarSign,
  AlertTriangle,
  Check,
  MessageSquare,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Users,
  Copy,
  Calendar,
  KeyRound,
  Lock,
} from 'lucide-react';
import { User } from '../../types';
import { rtdb, ref, onValue, set, remove } from '../../lib/firebaseClient';

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

interface ManageUsersProps {
  currency: string;
}

export const ManageUsers: React.FC<ManageUsersProps> = ({ currency }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmBlockUser, setConfirmBlockUser] = useState<User | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [fundAction, setFundAction] = useState<'add' | 'reduce'>('add');
  const [fundAmount, setFundAmount] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();

    if (rtdb) {
      const usersRef = ref(rtdb, 'smm_store/users');
      const unsubscribe = onValue(
        usersRef,
        (snap) => {
          if (snap.exists()) {
            const list = ensureArray<User>(snap.val());
            setUsers(list);
          }
        },
        (err) => {
          console.warn('ManageUsers RTDB listener warning:', err);
        }
      );
      return () => unsubscribe();
    }
  }, []);

  const fetchUsers = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('success', 'Password copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(fundAmount),
          action: fundAction,
          currency: currency,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (rtdb && data.user) {
          try {
            await set(ref(rtdb, `users/${data.user.id}`), data.user);
            await set(ref(rtdb, `smm_store/users/${data.user.id}`), data.user);
          } catch (rtdbErr: any) {
            console.warn('Optional client RTDB write warning:', rtdbErr?.message || rtdbErr);
          }
        }
        showToast(
          'success',
          `${fundAction === 'add' ? 'Added' : 'Deducted'} ${currency === 'INR' ? '₹' : '$'}${fundAmount} for ${selectedUser.username}`
        );
        setSelectedUser(null);
        setFundAmount('50');
        fetchUsers();
      } else {
        showToast('error', data.error || 'Failed to update balance');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', e.message || 'Server error while updating balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser || !newPasswordValue.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${passwordUser.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPasswordValue.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (rtdb && data.user) {
          try {
            await set(ref(rtdb, `users/${data.user.id}`), data.user);
            await set(ref(rtdb, `smm_store/users/${data.user.id}`), data.user);
          } catch (rtdbErr: any) {
            console.warn('Optional client RTDB write warning:', rtdbErr?.message || rtdbErr);
          }
        }
        showToast('success', `Password successfully updated for ${passwordUser.username}!`);
        setPasswordUser(null);
        setNewPasswordValue('');
        fetchUsers();
      } else {
        showToast('error', data.error || 'Failed to update password');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', e.message || 'Server error while updating password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteToggleBlockUser = async () => {
    if (!confirmBlockUser) return;
    const userToToggle = confirmBlockUser;
    const newStatus = userToToggle.status === 'blocked' ? 'active' : 'blocked';
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${userToToggle.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (rtdb && data.user) {
          try {
            await set(ref(rtdb, `users/${data.user.id}`), data.user);
            await set(ref(rtdb, `smm_store/users/${data.user.id}`), data.user);
          } catch (rtdbErr: any) {
            console.warn('Optional client RTDB write warning:', rtdbErr?.message || rtdbErr);
          }
        }
        showToast(
          'success',
          `User ${userToToggle.username} is now ${newStatus === 'blocked' ? 'BLOCKED' : 'ACTIVE'}`
        );
        setConfirmBlockUser(null);
        fetchUsers();
      } else {
        showToast('error', data.error || 'Failed to update user status');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', e.message || 'Server error while updating status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    const userToDelete = confirmDeleteUser;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (rtdb) {
          try {
            await remove(ref(rtdb, `users/${userToDelete.id}`));
            await remove(ref(rtdb, `smm_store/users/${userToDelete.id}`));
          } catch (rtdbErr: any) {
            console.warn('Optional client RTDB remove warning:', rtdbErr?.message || rtdbErr);
          }
        }
        showToast('success', `User ${userToDelete.username} deleted successfully!`);
        setConfirmDeleteUser(null);
        fetchUsers();
      } else {
        showToast('error', data.error || 'Failed to delete user');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', e.message || 'Server error while deleting user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearAllUsers = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users/clear-all', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message || 'All test users cleared successfully!');
        setShowClearAllModal(false);
        fetchUsers();
      } else {
        showToast('error', data.error || 'Failed to clear users');
      }
    } catch (e: any) {
      console.error(e);
      showToast('error', e.message || 'Server error while clearing users');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (val: number) => {
    if (currency === 'INR') {
      return `₹${val.toFixed(2)}`;
    }
    return `$${(val / 86).toFixed(2)}`;
  };

  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const filteredUsers = React.useMemo(() => {
    const deduped: User[] = [];
    const seen = new Set<string>();
    for (const u of users) {
      if (!u) continue;
      const key = u.id ? String(u.id).trim() : (u.email ? String(u.email).toLowerCase().trim() : '');
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      deduped.push(u);
    }

    if (!searchQuery.trim()) return deduped;
    const q = searchQuery.toLowerCase().trim();
    return deduped.filter(
      (u) =>
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.whatsappNo && u.whatsappNo.toLowerCase().includes(q)) ||
        (u.password && u.password.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const totalRegistered = users.length;
  const activeCount = users.filter((u) => u.status !== 'blocked').length;
  const blockedCount = users.filter((u) => u.status === 'blocked').length;
  const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);

  return (
    <div id="manage-users-container" className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="border-b border-yellow-500/20 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-yellow-400" />
            Manage Users, Passwords & Signup Details
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registered user passwords, WhatsApp numbers, email addresses, joined dates & wallet balances.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="refresh-users-btn"
            onClick={fetchUsers}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-yellow-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            id="clear-all-test-users-btn"
            onClick={() => setShowClearAllModal(true)}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
            title="Remove all demo and registered users to make app 100% fresh"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clean All Users (Fresh Reset)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-yellow-500/20 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Total Users</span>
            <Users className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">{totalRegistered}</div>
        </div>

        <div className="bg-zinc-950 border border-emerald-500/20 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">{activeCount}</div>
        </div>

        <div className="bg-zinc-950 border border-rose-500/20 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Blocked</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400 font-mono">{blockedCount}</div>
        </div>

        <div className="bg-zinc-950 border border-yellow-500/20 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Total Balance</span>
            <DollarSign className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl font-black text-yellow-400 font-mono">{fmt(totalBalance)}</div>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {toastMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="text-xs font-bold">{toastMsg.text}</span>
        </div>
      )}

      {/* User Search Bar */}
      <div className="bg-zinc-950 border border-yellow-500/20 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
        <Search className="w-5 h-5 text-yellow-400 flex-shrink-0" />
        <input
          id="user-search-input"
          type="text"
          placeholder="Search by username, email, WhatsApp number, password, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-zinc-400 hover:text-yellow-400 px-2 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black border-b border-zinc-800 font-black text-yellow-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4">WhatsApp No</th>
                <th className="py-3.5 px-4">Password</th>
                <th className="py-3.5 px-4">Balance</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Manage Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-bold">
                    <Sparkles className="w-8 h-8 text-yellow-500/40 mx-auto mb-2" />
                    {searchQuery ? `No users matching "${searchQuery}"` : 'No registered users found. Platform is fresh & clean!'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr, idx) => {
                  const isBlocked = usr.status === 'blocked';
                  const isAdmin = usr.role === 'admin' || usr.id === 'usr-admin' || usr.username === 'yourshivamff_';
                  const showPass = !!visiblePasswords[usr.id];
                  const cleanWa = (usr.whatsappNo || '').replace(/\D/g, '');

                  return (
                    <tr key={usr.id ? `${usr.id}-${idx}` : `usr-${idx}`} className="hover:bg-zinc-900/60 transition-colors">
                      {/* User details */}
                      <td className="py-3.5 px-4">
                        <div className="text-white font-black flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-yellow-400" />
                          <span>{usr.username}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-mono ${
                              isAdmin
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-black'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {usr.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-medium">{usr.email}</div>
                        <div className="text-[9px] text-zinc-600 font-mono mt-0.5">ID: {usr.id}</div>
                      </td>

                      {/* Join Date Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span>{formatJoinedDate(usr.createdAt)}</span>
                        </div>
                      </td>

                      {/* WhatsApp Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {usr.whatsappNo ? (
                          <a
                            href={`https://wa.me/${cleanWa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-xl font-mono font-bold text-xs transition-colors"
                            title="Click to Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>+{usr.whatsappNo}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-[10px] font-mono">Not set</span>
                        )}
                      </td>

                      {/* Password Column with Copy & Change button (Clear text for Admin) */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        {usr.password ? (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-black px-2.5 py-1 rounded-xl border border-yellow-500/30 text-yellow-300 font-bold text-xs select-all">
                              {visiblePasswords[usr.id] === false ? '••••••••' : usr.password}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(usr.id)}
                              className="text-zinc-400 hover:text-yellow-400 p-1 cursor-pointer transition-colors"
                              title={visiblePasswords[usr.id] === false ? 'Show Password' : 'Hide Password'}
                            >
                              {visiblePasswords[usr.id] === false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(usr.password || '', usr.id)}
                              className="text-zinc-400 hover:text-emerald-400 p-1 cursor-pointer transition-colors"
                              title="Copy Password"
                            >
                              {copiedId === usr.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setPasswordUser(usr);
                                setNewPasswordValue(usr.password || '');
                              }}
                              className="text-zinc-500 hover:text-yellow-400 p-1 cursor-pointer transition-colors"
                              title="Reset or Change Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                            <span>OAuth Auth</span>
                            <button
                              onClick={() => {
                                setPasswordUser(usr);
                                setNewPasswordValue('');
                              }}
                              className="text-zinc-500 hover:text-yellow-400 p-1 cursor-pointer transition-colors"
                              title="Set Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-yellow-400 text-sm whitespace-nowrap">
                        {fmt(usr.balance)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-300 whitespace-nowrap">{fmt(usr.totalSpent)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isBlocked ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            <span>BLOCKED</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>ACTIVE</span>
                          </span>
                        )}
                      </td>

                      {/* Manage Balance Action Buttons (Add / Deduct) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUser(usr);
                              setFundAction('add');
                            }}
                            title="Add Funds to User"
                            className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 rounded-xl font-black text-xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                            <span>Add</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUser(usr);
                              setFundAction('reduce');
                            }}
                            title="Reduce / Deduct Funds from User"
                            className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 rounded-xl font-black text-xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
                          >
                            <MinusCircle className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                            <span>Deduct</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions: Block / Unblock + Delete User */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirmBlockUser(usr)}
                            className={`px-2.5 py-1.5 rounded-xl font-black text-xs cursor-pointer transition-all flex items-center gap-1 border shadow-md active:scale-95 ${
                              isBlocked
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 font-extrabold'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700 font-bold'
                            }`}
                          >
                            {isBlocked ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 fill-black text-black" />
                                <span>Unblock</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-rose-400" />
                                <span>Block</span>
                              </>
                            )}
                          </button>

                          {!isAdmin && (
                            <button
                              onClick={() => setConfirmDeleteUser(usr)}
                              title="Delete this user account"
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 rounded-xl cursor-pointer transition-all active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Adjustment Modal (Add / Deduct) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  <span>
                    {fundAction === 'add' ? 'Credit Balance' : 'Deduct Balance'}: {selectedUser.username}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Current Balance: <strong className="text-yellow-400">{fmt(selectedUser.balance)}</strong>
                </p>
              </div>
            </div>

            {/* Action Switcher Tabs (Add vs Deduct) */}
            <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-2xl border border-zinc-800 text-xs font-black">
              <button
                type="button"
                onClick={() => setFundAction('add')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  fundAction === 'add'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Funds (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setFundAction('reduce')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  fundAction === 'reduce'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5" />
                <span>Deduct (-)</span>
              </button>
            </div>

            <form onSubmit={handleUpdateBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Amount in {currency} ({currency === 'INR' ? '₹' : '$'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-yellow-400 font-bold font-mono focus:outline-none focus:border-yellow-400 text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2.5 font-black rounded-xl cursor-pointer shadow-lg transition-all ${
                    fundAction === 'add'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  {isSubmitting ? 'Updating...' : fundAction === 'add' ? 'Add Funds Now' : 'Deduct Balance Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset / Edit Modal */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-yellow-400" />
                  <span>Update Password: {passwordUser.username}</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Email: {passwordUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  New Password for User
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-yellow-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-yellow-400 font-bold font-mono focus:outline-none focus:border-yellow-400 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPasswordValue.trim()}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl cursor-pointer text-xs shadow-lg transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Block / Unblock */}
      {confirmBlockUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 border-b border-zinc-900 pb-3">
              <ShieldAlert className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-black text-white uppercase">
                  {confirmBlockUser.status === 'blocked' ? 'Unblock User Account' : 'Block User Account'}
                </h3>
                <p className="text-[11px] text-zinc-400">User: {confirmBlockUser.username}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 font-medium leading-relaxed">
              {confirmBlockUser.status === 'blocked'
                ? `Are you sure you want to UNBLOCK user "${confirmBlockUser.username}"? They will regain ability to place orders.`
                : `Are you sure you want to BLOCK user "${confirmBlockUser.username}"? They will be prohibited from placing new orders.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBlockUser(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteToggleBlockUser}
                className={`px-4 py-2 font-black rounded-xl cursor-pointer text-xs shadow-lg transition-all ${
                  confirmBlockUser.status === 'blocked'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {isSubmitting
                  ? 'Processing...'
                  : confirmBlockUser.status === 'blocked'
                  ? 'Yes, Unblock User'
                  : 'Yes, Block User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Single User */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 border-b border-zinc-900 pb-3">
              <Trash2 className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-black text-white uppercase">Delete User Account</h3>
                <p className="text-[11px] text-zinc-400">User: {confirmDeleteUser.username}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 font-medium leading-relaxed">
              Are you sure you want to permanently delete user account <strong className="text-yellow-400">{confirmDeleteUser.username}</strong> ({confirmDeleteUser.email})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl cursor-pointer text-xs shadow-lg transition-all"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All Users (Fresh Reset) */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 border-b border-zinc-900 pb-3">
              <RotateCcw className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-black text-white uppercase">Purge All Registered Users</h3>
                <p className="text-[11px] text-zinc-400">Fresh Platform Reset</p>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs leading-relaxed space-y-1">
              <p className="font-bold">⚠️ Warning:</p>
              <p>
                This will remove all demo and registered customer accounts so your app starts 100% fresh. Your primary Admin account (<span className="font-mono font-bold text-yellow-400">yourshivamff_</span>) will remain untouched and active.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleClearAllUsers}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl cursor-pointer text-xs shadow-lg transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Purging Users...' : 'Yes, Purge All Users'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
