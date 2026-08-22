import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Shield,
  Wallet,
  DollarSign,
  TrendingUp,
  Users,
  ShoppingBag,
  Settings,
  RefreshCw,
  Search,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sliders,
  AlertTriangle,
  Lock,
  Unlock,
  Building,
  CreditCard,
  Percent,
  SlidersHorizontal,
} from 'lucide-react';
import { ChildPanel, ChildPanelPermissions, ChildPanelBranding, ChildPanelPricing, ChildPanelPurchaseRequest } from '../../types';

interface ManageChildPanelsProps {
  currency?: string;
  onSwitchToPanelPreview?: (panelSlug: string) => void;
}

export const ManageChildPanels: React.FC<ManageChildPanelsProps> = ({
  currency = 'INR',
  onSwitchToPanelPreview,
}) => {
  const [childPanels, setChildPanels] = useState<ChildPanel[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<ChildPanelPurchaseRequest[]>([]);
  const [adminViewTab, setAdminViewTab] = useState<'requests' | 'panels'>('requests');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [requestFilter, setRequestFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('all');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Margin Control State
  const [marginSectionOpen, setMarginSectionOpen] = useState<boolean>(true);
  const [savingMarginRules, setSavingMarginRules] = useState<boolean>(false);
  const [applyMarginToAllExisting, setApplyMarginToAllExisting] = useState<boolean>(false);
  const [marginRulesForm, setMarginRulesForm] = useState({
    adminMarginPercentage: 15,
    defaultOwnerMarginPercentage: 25,
    minMarginPercentage: 5,
    maxMarginPercentage: 300,
    childPanelPriceINR: 499,
  });

  // Password visibility map & copied tooltip
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Action handling states
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectingRequest, setRejectingRequest] = useState<ChildPanelPurchaseRequest | null>(null);
  const [adminRejectNote, setAdminRejectNote] = useState<string>('');

  const [selectedPanel, setSelectedPanel] = useState<ChildPanel | null>(null);
  const [panelOrders, setPanelOrders] = useState<any[]>([]);
  const [panelUsers, setPanelUsers] = useState<any[]>([]);
  const [panelStats, setPanelStats] = useState<any>(null);
  const [statsTimeframe, setStatsTimeframe] = useState<string>('all');

  // Wallet form state
  const [walletAmount, setWalletAmount] = useState<number>(100);
  const [walletAction, setWalletAction] = useState<'add' | 'reduce'>('add');

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    subdomain: '',
    customDomain: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: 'password123',
    ownerWhatsapp: '919516862495',
    adminMarginPercent: 15,
    defaultMarginPercent: 25,
    minAllowedMarginPercent: 5,
    maxAllowedMarginPercent: 300,
    walletBalance: 0,
    upiId: '9770571091@ybl',
    theme: 'cyberpunk-neon',
    permissions: {
      brandingCustomization: true,
      apiAccess: true,
      pricingCustomization: true,
      paymentCustomization: true,
      categoryServiceSelection: true,
    },
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    name?: string;
    subdomain?: string;
    customDomain?: string;
    ownerName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    ownerWhatsapp?: string;
    permissions?: ChildPanelPermissions;
    pricing?: ChildPanelPricing;
  }>({});

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const togglePasswordVisibility = (panelId: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [panelId]: !prev[panelId] }));
  };

  const fetchMarginRules = async () => {
    try {
      const res = await fetch('/api/admin/child-panels/margin-rules');
      const data = await res.json();
      if (data) {
        setMarginRulesForm({
          adminMarginPercentage: data.childPanelAdminMarginPercentage ?? 15,
          defaultOwnerMarginPercentage: data.childPanelDefaultOwnerMarginPercentage ?? 25,
          minMarginPercentage: data.childPanelMinMarginPercentage ?? 5,
          maxMarginPercentage: data.childPanelMaxMarginPercentage ?? 300,
          childPanelPriceINR: data.childPanelPriceINR ?? 499,
        });
      }
    } catch (e) {}
  };

  const handleSaveMarginRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingMarginRules(true);
      const res = await fetch('/api/admin/child-panels/margin-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...marginRulesForm,
          applyToAllExistingPanels: applyMarginToAllExisting,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice({
          type: 'success',
          message: data.message || `Admin Child Panel margin set to ${marginRulesForm.adminMarginPercentage}% successfully!`,
        });
        fetchChildPanels();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to save margin rules' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to save margin rules' });
    } finally {
      setSavingMarginRules(false);
    }
  };

  const fetchChildPanels = async () => {
    try {
      setLoading(true);
      const [resPanels, resRequests] = await Promise.all([
        fetch('/api/admin/child-panels'),
        fetch('/api/child-panel-requests'),
      ]);

      const dataPanels = await resPanels.json();
      const dataRequests = await resRequests.json();

      if (dataPanels.childPanels) {
        setChildPanels(dataPanels.childPanels);
      }
      if (dataRequests.requests) {
        setPurchaseRequests(dataRequests.requests);
      }
      fetchMarginRules();
    } catch (err) {
      console.warn('Error loading child panels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildPanels();
  }, []);

  const handleApproveRequest = async (request: ChildPanelPurchaseRequest) => {
    try {
      setProcessingRequestId(request.id);
      const res = await fetch(`/api/admin/child-panel-requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: 'Approved by Main Admin' }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setActionNotice({ type: 'error', message: data.error || 'Failed to approve request' });
      } else {
        setActionNotice({
          type: 'success',
          message: `✅ Purchase approved! User "${request.username}" is now a Child Owner with panel "${request.requestedPanelName}".`,
        });
        fetchChildPanels();
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: e?.message || 'Approval error' });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleOpenRejectModal = (request: ChildPanelPurchaseRequest) => {
    setRejectingRequest(request);
    setAdminRejectNote('Invalid payment UTR or payment not received.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    try {
      setProcessingRequestId(rejectingRequest.id);
      const res = await fetch(`/api/admin/child-panel-requests/${rejectingRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: adminRejectNote }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setActionNotice({ type: 'error', message: data.error || 'Failed to reject request' });
      } else {
        setActionNotice({
          type: 'success',
          message: `Child panel purchase request for "${rejectingRequest.username}" was rejected.`,
        });
        setRejectModalOpen(false);
        setRejectingRequest(null);
        fetchChildPanels();
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: e?.message || 'Rejection error' });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCreateChildPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.slug) {
      setActionNotice({ type: 'error', message: 'Panel Name and Slug are required.' });
      return;
    }

    try {
      const res = await fetch('/api/admin/child-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          slug: createForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          subdomain: createForm.subdomain || `${createForm.slug}.smmshivam.com`,
          customDomain: createForm.customDomain,
          ownerName: createForm.ownerName || `${createForm.name} Owner`,
          ownerEmail: createForm.ownerEmail || `${createForm.slug}_owner@smmshivam.com`,
          ownerPassword: createForm.ownerPassword || 'password123',
          ownerWhatsapp: createForm.ownerWhatsapp,
          walletBalance: Number(createForm.walletBalance) || 0,
          permissions: createForm.permissions,
          branding: {
            panelName: createForm.name,
            theme: createForm.theme,
            accentColor: '#38bdf8',
          },
          contact: {
            whatsappNumber: createForm.ownerWhatsapp,
            supportWhatsapp: createForm.ownerWhatsapp,
            supportEmail: createForm.ownerEmail,
          },
          payment: {
            upiId: createForm.upiId,
            minDepositINR: 10,
          },
          pricing: {
            adminMarginPercent: Number(createForm.adminMarginPercent) || marginRulesForm.adminMarginPercentage || 15,
            defaultMarginPercent: Number(createForm.defaultMarginPercent) || marginRulesForm.defaultOwnerMarginPercentage || 25,
            minAllowedMarginPercent: Number(createForm.minAllowedMarginPercent) || marginRulesForm.minMarginPercentage || 5,
            maxAllowedMarginPercent: Number(createForm.maxAllowedMarginPercent) || marginRulesForm.maxMarginPercentage || 300,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setActionNotice({ type: 'error', message: data.error || 'Failed to create child panel' });
        return;
      }

      setActionNotice({ type: 'success', message: data.message || 'Child panel created successfully!' });
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        slug: '',
        subdomain: '',
        customDomain: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: 'password123',
        ownerWhatsapp: '919516862495',
        adminMarginPercent: marginRulesForm.adminMarginPercentage || 15,
        defaultMarginPercent: marginRulesForm.defaultOwnerMarginPercentage || 25,
        minAllowedMarginPercent: marginRulesForm.minMarginPercentage || 5,
        maxAllowedMarginPercent: marginRulesForm.maxMarginPercentage || 300,
        walletBalance: 0,
        upiId: '9770571091@ybl',
        theme: 'cyberpunk-neon',
        permissions: {
          brandingCustomization: true,
          apiAccess: true,
          pricingCustomization: true,
          paymentCustomization: true,
          categoryServiceSelection: true,
        },
      });
      fetchChildPanels();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Server request error' });
    }
  };

  const handleUpdateChildPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPanel) return;

    try {
      const res = await fetch(`/api/admin/child-panels/${selectedPanel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setActionNotice({ type: 'error', message: data.error || 'Update failed' });
        return;
      }

      setActionNotice({ type: 'success', message: 'Child panel updated successfully!' });
      setIsEditOpen(false);
      fetchChildPanels();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Update failed' });
    }
  };

  const handleToggleStatus = async (panel: ChildPanel) => {
    const newStatus = panel.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/admin/child-panels/${panel.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: `Child panel "${panel.name}" is now ${newStatus.toUpperCase()}!`,
        });
        fetchChildPanels();
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: 'Status toggle failed' });
    }
  };

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPanel) return;

    try {
      const res = await fetch(`/api/admin/child-panels/${selectedPanel.id}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: walletAmount, action: walletAction }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setActionNotice({ type: 'error', message: data.error || 'Wallet transaction failed' });
        return;
      }

      setActionNotice({
        type: 'success',
        message: `₹${walletAmount} ${walletAction === 'add' ? 'credited to' : 'debited from'} ${selectedPanel.name}!`,
      });
      setIsWalletOpen(false);
      fetchChildPanels();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Wallet transaction failed' });
    }
  };

  const handleDelete = async (panel: ChildPanel) => {
    if (!window.confirm(`Are you sure you want to delete child panel "${panel.name}"? This action is permanent.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/child-panels/${panel.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ type: 'success', message: `Child panel "${panel.name}" deleted.` });
        fetchChildPanels();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to delete' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: 'Delete failed' });
    }
  };

  const openDetailsModal = async (panel: ChildPanel) => {
    setSelectedPanel(panel);
    setIsDetailsOpen(true);
    try {
      const res = await fetch(`/api/admin/child-panels/${panel.id}`);
      const data = await res.json();
      if (data.orders) setPanelOrders(data.orders);
      if (data.users) setPanelUsers(data.users);
      if (data.stats) setPanelStats(data.stats);
    } catch (err) {
      console.warn('Failed to load child panel details:', err);
    }
  };

  const handleStatsTimeframeChange = async (timeframe: string) => {
    setStatsTimeframe(timeframe);
    if (!selectedPanel) return;
    try {
      const res = await fetch(`/api/admin/child-panels/${selectedPanel.id}/stats?timeframe=${timeframe}`);
      const data = await res.json();
      if (data.stats) setPanelStats(data.stats);
    } catch (e) {}
  };

  const filteredPanels = childPanels.filter((p) => {
    if (!p) return false;
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subdomain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customDomain?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate platform totals
  const totalPanels = childPanels.length;
  const activePanels = childPanels.filter((p) => p.status === 'active').length;
  const totalChildOrders = childPanels.reduce((sum, p) => sum + (p.totalOrdersCount || 0), 0);
  const totalChildRevenue = childPanels.reduce((sum, p) => sum + (p.totalRevenueINR || 0), 0);
  const totalMainAdminProfit = childPanels.reduce((sum, p) => sum + (p.totalMainAdminProfitINR || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alert Notifications */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Admin Protection Notice Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border border-yellow-500/30 text-yellow-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-500/30 font-black">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-sm text-white flex items-center gap-2">
              <span>White-Label Child Panel System</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                100% ISOLATED ARCHITECTURE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Child Panel Owners can customize their logo, name, WhatsApp, theme, and margins. Main Admin panel settings and branding are completely protected and will never change.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMarginSectionOpen(!marginSectionOpen)}
            className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-bold text-xs rounded-xl border border-yellow-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Admin Margin Rules</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-yellow-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE CHILD PANEL</span>
          </button>
        </div>
      </div>

      {/* Main Admin Margin Rules Setup Box */}
      {marginSectionOpen && (
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-yellow-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-black">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Main Admin Child Panel Margin & Pricing Rules</h3>
                <p className="text-[11px] text-zinc-400">
                  Set how much profit margin you (Main Admin) earn on every order processed via child reseller panels.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-lg bg-yellow-400/10 text-yellow-400 font-mono font-bold text-xs border border-yellow-400/20">
                Wholesale + Retail Layering
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveMarginRules} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Main Admin Margin */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30">
                <label className="text-[11px] font-bold text-emerald-400 block mb-1 flex items-center justify-between">
                  <span>Admin Wholesale Margin %</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.5"
                    required
                    value={marginRulesForm.adminMarginPercentage}
                    onChange={(e) =>
                      setMarginRulesForm({ ...marginRulesForm, adminMarginPercentage: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-400"
                  />
                  <span className="absolute right-3 top-1.5 text-zinc-400 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Your pure admin profit per child order</p>
              </div>

              {/* Default Child Owner Margin */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-purple-500/30">
                <label className="text-[11px] font-bold text-purple-300 block mb-1 flex items-center justify-between">
                  <span>Default Child Markup %</span>
                  <Percent className="w-3.5 h-3.5" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.5"
                    required
                    value={marginRulesForm.defaultOwnerMarginPercentage}
                    onChange={(e) =>
                      setMarginRulesForm({ ...marginRulesForm, defaultOwnerMarginPercentage: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm font-bold focus:outline-none focus:border-purple-400"
                  />
                  <span className="absolute right-3 top-1.5 text-zinc-400 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Default selling markup for reseller</p>
              </div>

              {/* Min Allowed Margin */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Min Allowed Margin %</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marginRulesForm.minMarginPercentage}
                    onChange={(e) =>
                      setMarginRulesForm({ ...marginRulesForm, minMarginPercentage: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm font-bold focus:outline-none focus:border-yellow-400"
                  />
                  <span className="absolute right-3 top-1.5 text-zinc-400 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Reseller lowest allowed markup</p>
              </div>

              {/* Max Allowed Margin */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Max Allowed Margin %</label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={marginRulesForm.maxMarginPercentage}
                    onChange={(e) =>
                      setMarginRulesForm({ ...marginRulesForm, maxMarginPercentage: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm font-bold focus:outline-none focus:border-yellow-400"
                  />
                  <span className="absolute right-3 top-1.5 text-zinc-400 font-bold text-xs">%</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Reseller highest allowed markup</p>
              </div>

              {/* Child Panel Setup Price */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-amber-500/30">
                <label className="text-[11px] font-bold text-amber-400 block mb-1 flex items-center justify-between">
                  <span>Panel Purchase Price (₹)</span>
                  <DollarSign className="w-3.5 h-3.5" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={marginRulesForm.childPanelPriceINR}
                    onChange={(e) =>
                      setMarginRulesForm({ ...marginRulesForm, childPanelPriceINR: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-1.5 text-zinc-400 font-bold text-xs">₹</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">One-time / monthly setup fee</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyMarginToAllExisting}
                  onChange={(e) => setApplyMarginToAllExisting(e.target.checked)}
                  className="accent-yellow-400 w-4 h-4"
                />
                <span>Apply this Admin Margin ({marginRulesForm.adminMarginPercentage}%) to ALL existing child panels right now</span>
              </label>

              <button
                type="submit"
                disabled={savingMarginRules}
                className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs shadow-lg shadow-yellow-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {savingMarginRules ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>Save Admin Margin Rules</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Tab Switcher: Active Panels vs Purchase Requests */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setAdminViewTab('panels')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            adminViewTab === 'panels'
              ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Active Child Panels ({childPanels.length})</span>
        </button>

        <button
          onClick={() => setAdminViewTab('requests')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer relative ${
            adminViewTab === 'requests'
              ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Buy Panel Requests ({purchaseRequests.length})</span>
          {purchaseRequests.filter((r) => r.status === 'Pending').length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black animate-pulse">
              {purchaseRequests.filter((r) => r.status === 'Pending').length} Pending
            </span>
          )}
        </button>
      </div>

      {adminViewTab === 'requests' ? (
        /* PURCHASE REQUESTS TABLE VIEW */
        <div className="space-y-6">
          {/* Child Panel Buyers Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Total Panel Buyers</span>
                <Users className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">{purchaseRequests.length}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Total purchase requests</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-amber-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Pending Approvals</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {purchaseRequests.filter((r) => r.status === 'Pending').length}
                </div>
                <div className="text-[10px] text-amber-300 font-bold mt-0.5">Action required</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Approved Panels</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {purchaseRequests.filter((r) => r.status === 'Approved').length}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Active Resellers</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Total Revenue Collected</span>
                <DollarSign className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-yellow-400 font-mono">
                  ₹{purchaseRequests
                    .filter((r) => r.status === 'Approved')
                    .reduce((acc, r) => acc + (r.amount || 499), 0)
                    .toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">From child panels</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
              <button
                onClick={() => setRequestFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  requestFilter === 'all' ? 'bg-yellow-400 text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({purchaseRequests.length})
              </button>
              <button
                onClick={() => setRequestFilter('Pending')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  requestFilter === 'Pending' ? 'bg-amber-400 text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pending ({purchaseRequests.filter((r) => r.status === 'Pending').length})
              </button>
              <button
                onClick={() => setRequestFilter('Approved')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  requestFilter === 'Approved' ? 'bg-emerald-500 text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Approved ({purchaseRequests.filter((r) => r.status === 'Approved').length})
              </button>
              <button
                onClick={() => setRequestFilter('Rejected')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  requestFilter === 'Rejected' ? 'bg-rose-500 text-white font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Rejected ({purchaseRequests.filter((r) => r.status === 'Rejected').length})
              </button>
            </div>

            <button
              onClick={fetchChildPanels}
              disabled={loading}
              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-yellow-400 transition-colors"
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-yellow-400' : ''}`} />
            </button>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-800 text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5">User Details</th>
                    <th className="px-4 py-3.5">WhatsApp No</th>
                    <th className="px-4 py-3.5">Password</th>
                    <th className="px-4 py-3.5">Requested Panel</th>
                    <th className="px-4 py-3.5">Slug / Domain</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">UTR / Ref Number</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Submitted</th>
                    <th className="px-4 py-3.5 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-medium">
                  {purchaseRequests
                    .filter((r) => requestFilter === 'all' || r.status === requestFilter)
                    .map((req) => {
                      const cleanWa = (req.whatsappNo || '').replace(/\D/g, '');
                      const showReqPass = !!showPasswordMap[`req-${req.id}`];
                      const reqPass = req.password || 'Saved on signup';

                      return (
                        <tr key={req.id} className="hover:bg-zinc-900/50 transition-colors">
                          {/* User Details */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white text-sm">{req.username}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{req.userEmail}</div>
                            <div className="text-[10px] text-zinc-600 font-mono">ID: {req.userId || req.id}</div>
                          </td>

                          {/* WhatsApp Column */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {req.whatsappNo ? (
                              <a
                                href={`https://wa.me/${cleanWa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-xl font-mono font-bold text-xs transition-colors"
                                title="Chat with user on WhatsApp"
                              >
                                <span>+{req.whatsappNo}</span>
                              </a>
                            ) : (
                              <span className="text-zinc-600 font-mono text-[10px]">Not set</span>
                            )}
                          </td>

                          {/* Password Column */}
                          <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                            {req.password ? (
                              <div className="flex items-center gap-1.5">
                                <span className="bg-black px-2 py-1 rounded-lg border border-zinc-800 text-yellow-300 font-bold text-xs select-all">
                                  {showReqPass ? req.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowPasswordMap((prev) => ({
                                      ...prev,
                                      [`req-${req.id}`]: !prev[`req-${req.id}`],
                                    }))
                                  }
                                  className="text-zinc-400 hover:text-yellow-400 p-0.5"
                                  title={showReqPass ? 'Hide Password' : 'Show Password'}
                                >
                                  {showReqPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(req.password || '', `req-pwd-${req.id}`)}
                                  className="text-zinc-400 hover:text-emerald-400 p-0.5"
                                  title="Copy Password"
                                >
                                  {copiedKey === `req-pwd-${req.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-[10px]">Registered User</span>
                            )}
                          </td>

                          {/* Requested Panel Name */}
                          <td className="px-4 py-3.5">
                            <div className="font-black text-white">{req.requestedPanelName}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">ID: {req.id}</div>
                          </td>

                          {/* Slug / Domain */}
                          <td className="px-4 py-3.5 font-mono">
                            <div className="text-yellow-400 font-bold">/panel/{req.requestedSlug}</div>
                            {req.requestedDomain && (
                              <div className="text-[10px] text-emerald-400">🌐 {req.requestedDomain}</div>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-black text-emerald-400 text-sm">₹{req.amount}</div>
                          </td>

                          {/* UTR */}
                          <td className="px-4 py-3.5 font-mono">
                            <div className="px-2.5 py-1 rounded bg-black/60 border border-zinc-800 text-zinc-200 inline-block font-bold text-xs">
                              {req.utr}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            {req.status === 'Approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/40">
                                <CheckCircle className="w-3 h-3" /> Approved
                              </span>
                            ) : req.status === 'Rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/40">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold border border-amber-500/40 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {req.adminNote && (
                              <div className="text-[10px] text-zinc-400 mt-1 italic max-w-xs truncate">
                                Note: {req.adminNote}
                              </div>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 text-zinc-400 text-[11px] whitespace-nowrap">
                            {new Date(req.createdAt).toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {req.status === 'Pending' ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={processingRequestId === req.id}
                                    onClick={() => handleApproveRequest(req)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                    title="Approve Payment and Create Child Panel"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={processingRequestId === req.id}
                                    onClick={() => handleOpenRejectModal(req)}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/40 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                    title="Reject Payment"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                  {cleanWa && (
                                    <a
                                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                                        `Hello ${req.username}, checking your Child Panel "${req.requestedPanelName}" purchase request for ₹${req.amount} (UTR: ${req.utr}).`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                      title="Chat with user on WhatsApp"
                                    >
                                      <Smartphone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </>
                              ) : req.status === 'Approved' ? (
                                <>
                                  {cleanWa && (
                                    <a
                                      href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                                        `Hello ${req.username},\n\n🎉 Your Child Panel "${req.requestedPanelName}" is APPROVED & ACTIVE!\n\n🌐 Live Panel Link: https://${window.location.host}/panel/${req.requestedSlug}\n📧 Your Login Email: ${req.userEmail}\n🔑 Password: ${req.password || 'Your account password'}\n\nYou can now log in, configure your UPI QR code, set profit margins, and start selling services!`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/40 transition-colors"
                                      title="Send panel login info on WhatsApp"
                                    >
                                      <Smartphone className="w-3 h-3" /> WhatsApp Details
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onSwitchToPanelPreview) onSwitchToPanelPreview(req.requestedSlug);
                                      else window.open(`/panel/${req.requestedSlug}`, '_blank');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-bold border border-sky-500/30 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Panel
                                  </button>
                                </>
                              ) : (
                                <span className="text-zinc-600 text-xs">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {purchaseRequests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                        <p className="text-sm font-bold text-zinc-400">No Child Panel purchase requests</p>
                        <p className="text-xs text-zinc-600 mt-1">Users can submit requests via the "Buy Child Panel" page.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metric Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Total Child Panels</span>
                <Building className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">{totalPanels}</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">{activePanels} Active</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Child Panel Orders</span>
                <ShoppingBag className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">{totalChildOrders}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Processed orders</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Child Gross Sales</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-purple-400 font-mono">₹{totalChildRevenue.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Customer turnover</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>Main Admin Profit</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-400 font-mono">₹{totalMainAdminProfit.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">From Child Orders</div>
              </div>
            </div>

            <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                <span>API Proxy Mode</span>
                <Key className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="mt-3">
                <div className="text-sm font-black text-yellow-400">Option A + Option B</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Auto-forwarding enabled</div>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search panels, domains, owner emails..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterStatus === 'all' ? 'bg-yellow-400 text-black font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({childPanels.length})
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterStatus === 'active' ? 'bg-emerald-500 text-black font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Active ({activePanels})
                </button>
                <button
                  onClick={() => setFilterStatus('disabled')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filterStatus === 'disabled' ? 'bg-rose-500 text-white font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Disabled ({childPanels.length - activePanels})
                </button>
              </div>

              <button
                onClick={fetchChildPanels}
                disabled={loading}
                className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-yellow-400 transition-colors"
                title="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-yellow-400' : ''}`} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Child Panels List Table / Cards */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3.5">Child Panel</th>
                <th className="px-4 py-3.5">Owner Credentials (Email & Password)</th>
                <th className="px-4 py-3.5">Domain / URL</th>
                <th className="px-4 py-3.5">Wallet Balance</th>
                <th className="px-4 py-3.5">Margins (Admin / Reseller)</th>
                <th className="px-4 py-3.5">Orders / Users</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-medium">
              {filteredPanels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                    <Globe className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm font-bold text-zinc-400">No Child Panels found</p>
                    <p className="text-xs text-zinc-600 mt-1">Click "CREATE CHILD PANEL" above to launch a new white-label reseller.</p>
                  </td>
                </tr>
              ) : (
                filteredPanels.map((panel) => {
                  const isActive = panel.status === 'active';
                  const isPasswordVisible = !!showPasswordMap[panel.id];
                  const passwordValue = (panel as any).ownerPassword || 'password123';
                  const adminMargin = panel.pricing?.adminMarginPercent ?? marginRulesForm.adminMarginPercentage ?? 15;
                  const resellerMargin = panel.pricing?.defaultMarginPercent ?? 25;

                  return (
                    <tr key={panel.id} className="hover:bg-zinc-900/50 transition-colors">
                      {/* Name & Theme */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border"
                            style={{
                              backgroundColor: `${panel.branding.accentColor || '#38bdf8'}20`,
                              borderColor: `${panel.branding.accentColor || '#38bdf8'}50`,
                              color: panel.branding.accentColor || '#38bdf8',
                            }}
                          >
                            {panel.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-white text-sm flex items-center gap-1.5">
                              <span>{panel.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                                {panel.slug}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                              <span>Theme: {panel.branding.theme || 'cyberpunk-neon'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner Details & Credentials */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="text-white font-bold text-xs flex items-center gap-1.5">
                            <span>{panel.ownerName}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-yellow-400 font-mono">
                              ID: {panel.ownerUserId || panel.id.slice(0, 8)}
                            </span>
                          </div>

                          {/* Email with copy */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400 text-[10px] font-mono select-all">{panel.ownerEmail}</span>
                            <button
                              onClick={() => copyToClipboard(panel.ownerEmail, `email-${panel.id}`)}
                              className="text-zinc-500 hover:text-yellow-400 p-0.5"
                              title="Copy Email"
                            >
                              {copiedKey === `email-${panel.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Password with reveal & copy */}
                          <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2 py-0.5 rounded-lg border border-zinc-800 w-fit">
                            <Lock className="w-2.5 h-2.5 text-yellow-400" />
                            <span className="text-yellow-300 text-[10px] font-mono select-all">
                              {isPasswordVisible ? passwordValue : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(panel.id)}
                              className="text-zinc-400 hover:text-white p-0.5 ml-1"
                              title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isPasswordVisible ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(passwordValue, `pwd-${panel.id}`)}
                              className="text-zinc-400 hover:text-yellow-400 p-0.5"
                              title="Copy Password"
                            >
                              {copiedKey === `pwd-${panel.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>

                          {/* WhatsApp */}
                          <div className="text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                            <span>WA:</span>
                            <a
                              href={`https://wa.me/${(panel.ownerWhatsapp || panel.contact.whatsappNumber || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              +{panel.ownerWhatsapp || panel.contact.whatsappNumber}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Domains */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="space-y-0.5">
                          <div className="text-sky-400 flex items-center gap-1 text-[11px]">
                            <span>{panel.subdomain}</span>
                          </div>
                          {panel.customDomain && (
                            <div className="text-emerald-400 text-[10px] flex items-center gap-1">
                              <span>🌐 {panel.customDomain}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-zinc-500 font-mono">/panel/{panel.slug}</div>
                        </div>
                      </td>

                      {/* Wallet Balance */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="font-mono font-black text-sm text-yellow-400">
                            ₹{(panel.walletBalance || 0).toFixed(2)}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPanel(panel);
                              setIsWalletOpen(true);
                            }}
                            className="p-1 rounded-lg bg-zinc-900 hover:bg-yellow-500/20 text-zinc-400 hover:text-yellow-400 border border-zinc-800 transition-colors"
                            title="Credit / Debit Wallet"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Margin % (Admin + Reseller) */}
                      <td className="px-4 py-3.5 font-mono space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                            +{adminMargin}% Admin
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                            +{resellerMargin}% Reseller
                          </span>
                        </div>
                      </td>

                      {/* Orders & Users */}
                      <td className="px-4 py-3.5">
                        <div className="text-[11px] font-mono">
                          <div className="text-white">{panel.totalOrdersCount || 0} orders</div>
                          <div className="text-zinc-400">{panel.totalUsersCount || 0} customers</div>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(panel)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-400'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-emerald-500/20 hover:text-emerald-400'
                          }`}
                          title={`Click to ${isActive ? 'Disable' : 'Enable'} panel`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          <span>{panel.status}</span>
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Preview Button */}
                          <button
                            onClick={() => {
                              if (onSwitchToPanelPreview) {
                                onSwitchToPanelPreview(panel.slug);
                              } else {
                                window.open(`/?panel=${panel.slug}`, '_blank');
                              }
                            }}
                            className="p-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-all cursor-pointer"
                            title="Preview Child Panel White-Label"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Details & Isolated Stats */}
                          <button
                            onClick={() => openDetailsModal(panel)}
                            className="p-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-all cursor-pointer"
                            title="View Isolated Analytics & Orders"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Settings */}
                          <button
                            onClick={() => {
                              setSelectedPanel(panel);
                              setEditForm({
                                name: panel.name,
                                subdomain: panel.subdomain,
                                customDomain: panel.customDomain,
                                ownerName: panel.ownerName,
                                ownerEmail: panel.ownerEmail,
                                ownerPassword: (panel as any).ownerPassword || 'password123',
                                ownerWhatsapp: panel.ownerWhatsapp || panel.contact?.whatsappNumber || '',
                                permissions: { ...panel.permissions },
                                pricing: {
                                  adminMarginPercent: panel.pricing?.adminMarginPercent ?? marginRulesForm.adminMarginPercentage ?? 15,
                                  defaultMarginPercent: panel.pricing?.defaultMarginPercent ?? 25,
                                  minAllowedMarginPercent: panel.pricing?.minAllowedMarginPercent ?? 5,
                                  maxAllowedMarginPercent: panel.pricing?.maxAllowedMarginPercent ?? 300,
                                  serviceCustomPrices: { ...(panel.pricing?.serviceCustomPrices || {}) },
                                },
                              });
                              setIsEditOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-all cursor-pointer"
                            title="Edit Permissions & Settings"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(panel)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                            title="Delete Child Panel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE CHILD PANEL MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center font-black">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Create White-Label Child Panel</h3>
                  <p className="text-xs text-zinc-400">Launch a brand new isolated reseller panel</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateChildPanel} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Panel Name */}
                <div>
                  <label className="text-zinc-300 block mb-1">Child Panel Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 16);
                      setCreateForm({
                        ...createForm,
                        name,
                        slug: createForm.slug || slug,
                        subdomain: createForm.subdomain || `${slug}.smmshivam.com`,
                      });
                    }}
                    placeholder="e.g. ABC Digital SMM"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                {/* Subdomain Slug */}
                <div>
                  <label className="text-zinc-300 block mb-1">Subdomain Slug (Unique ID) *</label>
                  <input
                    type="text"
                    required
                    value={createForm.slug}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        subdomain: `${e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')}.smmshivam.com`,
                      })
                    }
                    placeholder="e.g. abcdigital"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>

                {/* Subdomain Full */}
                <div>
                  <label className="text-zinc-300 block mb-1">Subdomain URL</label>
                  <input
                    type="text"
                    value={createForm.subdomain}
                    onChange={(e) => setCreateForm({ ...createForm, subdomain: e.target.value })}
                    placeholder="e.g. abcdigital.smmshivam.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sky-400 font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>

                {/* Custom Domain */}
                <div>
                  <label className="text-zinc-300 block mb-1">Custom Domain (Optional)</label>
                  <input
                    type="text"
                    value={createForm.customDomain}
                    onChange={(e) => setCreateForm({ ...createForm, customDomain: e.target.value })}
                    placeholder="e.g. smm.abcdigital.in"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              {/* Owner Credentials Section */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="text-xs font-black text-yellow-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>Child Panel Owner Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Owner Full Name</label>
                    <input
                      type="text"
                      value={createForm.ownerName}
                      onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Owner Email (Login ID) *</label>
                    <input
                      type="email"
                      required
                      value={createForm.ownerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                      placeholder="e.g. rahul@abcdigital.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Owner Password</label>
                    <input
                      type="text"
                      value={createForm.ownerPassword}
                      onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                      placeholder="Initial Password"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Owner WhatsApp Number</label>
                    <input
                      type="text"
                      value={createForm.ownerWhatsapp}
                      onChange={(e) => setCreateForm({ ...createForm, ownerWhatsapp: e.target.value })}
                      placeholder="e.g. 919516862495"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Margins */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1">Default Profit Margin %</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={createForm.defaultMarginPercent}
                      onChange={(e) => setCreateForm({ ...createForm, defaultMarginPercent: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Initial Wallet Balance (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.walletBalance}
                    onChange={(e) => setCreateForm({ ...createForm, walletBalance: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-yellow-400 font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Default Theme</label>
                  <select
                    value={createForm.theme}
                    onChange={(e) => setCreateForm({ ...createForm, theme: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-yellow-400"
                  >
                    <option value="cyberpunk-neon">Cyberpunk Neon</option>
                    <option value="emerald-luxury">Emerald Luxury</option>
                    <option value="royal-purple">Royal Purple</option>
                    <option value="sunset-amber">Sunset Amber</option>
                    <option value="ice-sapphire">Ice Sapphire</option>
                    <option value="clean-light">Clean Slate</option>
                    <option value="default-dark">Default Dark</option>
                  </select>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                <div className="text-xs font-black text-zinc-300 uppercase tracking-wide">
                  Main Admin Granted Permissions
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.permissions.brandingCustomization}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          permissions: { ...createForm.permissions, brandingCustomization: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Logo & Branding Edit</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.permissions.pricingCustomization}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          permissions: { ...createForm.permissions, pricingCustomization: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Profit Margin Control</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.permissions.paymentCustomization}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          permissions: { ...createForm.permissions, paymentCustomization: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Custom UPI & QR Details</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.permissions.apiAccess}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          permissions: { ...createForm.permissions, apiAccess: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Custom External API (Option B)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black hover:from-yellow-300 hover:to-amber-400 shadow-lg shadow-yellow-500/20"
                >
                  Launch Child Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHILD PANEL MODAL */}
      {isEditOpen && selectedPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center font-black">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Edit Child Panel ({selectedPanel.name})</h3>
                  <p className="text-xs text-zinc-400">Update panel routing and administrator permissions</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateChildPanel} className="space-y-4 text-xs font-semibold">
              {/* Routing & Domain */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1">Panel Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Subdomain</label>
                  <input
                    type="text"
                    value={editForm.subdomain || ''}
                    onChange={(e) => setEditForm({ ...editForm, subdomain: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sky-400 font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1">Custom Domain</label>
                  <input
                    type="text"
                    value={editForm.customDomain || ''}
                    onChange={(e) => setEditForm({ ...editForm, customDomain: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              {/* Owner Account Credentials Section */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-yellow-500/30 space-y-3">
                <div className="text-xs font-black text-yellow-400 uppercase tracking-wide flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Child Owner Login & Credentials</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-normal">Syncs directly with Reseller User Account</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Owner Email (Login ID) *</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={editForm.ownerEmail || ''}
                        onChange={(e) => setEditForm({ ...editForm, ownerEmail: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editForm.ownerEmail || '', 'edit-email')}
                        className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-yellow-400"
                        title="Copy Email"
                      >
                        {copiedKey === 'edit-email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Owner Password *</label>
                    <div className="relative">
                      <input
                        type={showPasswordMap['edit-pwd'] ? 'text' : 'password'}
                        required
                        value={editForm.ownerPassword || ''}
                        onChange={(e) => setEditForm({ ...editForm, ownerPassword: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-yellow-300 font-mono focus:outline-none focus:border-yellow-400 pr-16"
                      />
                      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('edit-pwd')}
                          className="text-zinc-400 hover:text-white"
                          title={showPasswordMap['edit-pwd'] ? 'Hide' : 'Show'}
                        >
                          {showPasswordMap['edit-pwd'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(editForm.ownerPassword || '', 'edit-pwd')}
                          className="text-zinc-400 hover:text-yellow-400"
                          title="Copy Password"
                        >
                          {copiedKey === 'edit-pwd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Owner Full Name</label>
                    <input
                      type="text"
                      value={editForm.ownerName || ''}
                      onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Owner WhatsApp</label>
                    <input
                      type="text"
                      value={editForm.ownerWhatsapp || ''}
                      onChange={(e) => setEditForm({ ...editForm, ownerWhatsapp: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
              </div>

              {/* Profit Margins for this Panel */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-purple-500/30 space-y-3">
                <div className="text-xs font-black text-purple-400 uppercase tracking-wide flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Panel Profit Margin Settings</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-emerald-400 block mb-1 font-bold">Admin Margin %</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step="0.5"
                        value={editForm.pricing?.adminMarginPercent ?? 15}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            pricing: { ...editForm.pricing!, adminMarginPercent: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                      />
                      <span className="absolute right-3 top-2 text-zinc-500 font-mono">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-purple-300 block mb-1 font-bold">Reseller Markup %</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step="0.5"
                        value={editForm.pricing?.defaultMarginPercent ?? 25}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            pricing: { ...editForm.pricing!, defaultMarginPercent: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-400"
                      />
                      <span className="absolute right-3 top-2 text-zinc-500 font-mono">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Min Allowed %</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editForm.pricing?.minAllowedMarginPercent ?? 5}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            pricing: { ...editForm.pricing!, minAllowedMarginPercent: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                      <span className="absolute right-3 top-2 text-zinc-500 font-mono">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Max Allowed %</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={10}
                        max={1000}
                        value={editForm.pricing?.maxAllowedMarginPercent ?? 300}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            pricing: { ...editForm.pricing!, maxAllowedMarginPercent: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                      <span className="absolute right-3 top-2 text-zinc-500 font-mono">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions Control */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                <div className="text-xs font-black text-yellow-400 uppercase tracking-wide">
                  Enforced Permissions
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.permissions?.brandingCustomization ?? true}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          permissions: { ...editForm.permissions!, brandingCustomization: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Logo & Branding Edit</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.permissions?.pricingCustomization ?? true}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          permissions: { ...editForm.permissions!, pricingCustomization: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Profit Margin Control</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.permissions?.paymentCustomization ?? true}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          permissions: { ...editForm.permissions!, paymentCustomization: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Custom UPI & QR Details</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.permissions?.apiAccess ?? true}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          permissions: { ...editForm.permissions!, apiAccess: e.target.checked },
                        })
                      }
                      className="accent-yellow-400 w-4 h-4"
                    />
                    <span className="text-white">Allow Custom External API (Option B)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black hover:from-yellow-300 hover:to-amber-400 shadow-lg shadow-yellow-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WALLET BALANCE ADJUSTMENT MODAL */}
      {isWalletOpen && selectedPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black text-white">Adjust Reseller Wallet</h3>
              </div>
              <button
                onClick={() => setIsWalletOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <div className="text-zinc-400">Child Panel: <span className="text-white font-bold">{selectedPanel.name}</span></div>
              <div className="text-zinc-400 mt-1">Current Balance: <span className="text-yellow-400 font-mono font-bold">₹{(selectedPanel.walletBalance || 0).toFixed(2)}</span></div>
            </div>

            <form onSubmit={handleWalletSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWalletAction('add')}
                  className={`py-2 rounded-xl font-black transition-all ${
                    walletAction === 'add'
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  + Credit (Add)
                </button>
                <button
                  type="button"
                  onClick={() => setWalletAction('reduce')}
                  className={`py-2 rounded-xl font-black transition-all ${
                    walletAction === 'reduce'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  - Debit (Reduce)
                </button>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  required
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWalletOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-yellow-400 text-black font-black hover:bg-yellow-300"
                >
                  Confirm Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED ISOLATED ANALYTICS & ORDERS DRAWER */}
      {isDetailsOpen && selectedPanel && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-end animate-in fade-in">
          <div className="relative bg-zinc-950 border-l border-zinc-800 w-full max-w-3xl h-full flex flex-col shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedPanel.name} (Analytics & Data)</h3>
                  <p className="text-xs text-zinc-400 font-mono">{selectedPanel.subdomain}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Child Owner Account & Credentials Card */}
            <div className="my-4 p-4 rounded-2xl bg-zinc-900 border border-yellow-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-xs text-white uppercase tracking-wider">Owner Login & Panel Credentials</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-mono border border-yellow-400/20">
                  User ID: {selectedPanel.ownerUserId || selectedPanel.id.slice(0, 8)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Email */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block font-semibold">Reseller Login Email</span>
                    <span className="font-mono text-white text-xs select-all">{selectedPanel.ownerEmail}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedPanel.ownerEmail, 'detail-email')}
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-yellow-400"
                    title="Copy Email"
                  >
                    {copiedKey === 'detail-email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block font-semibold">Reseller Password</span>
                    <span className="font-mono text-yellow-300 text-xs select-all">
                      {showPasswordMap['detail-pwd'] ? ((selectedPanel as any).ownerPassword || 'password123') : '••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePasswordVisibility('detail-pwd')}
                      className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                      title={showPasswordMap['detail-pwd'] ? 'Hide Password' : 'Show Password'}
                    >
                      {showPasswordMap['detail-pwd'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard((selectedPanel as any).ownerPassword || 'password123', 'detail-pwd')}
                      className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-yellow-400"
                      title="Copy Password"
                    >
                      {copiedKey === 'detail-pwd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* WhatsApp & Contact */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block font-semibold">Owner WhatsApp</span>
                    <a
                      href={`https://wa.me/${(selectedPanel.ownerWhatsapp || selectedPanel.contact?.whatsappNumber || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-emerald-400 text-xs hover:underline"
                    >
                      +{selectedPanel.ownerWhatsapp || selectedPanel.contact?.whatsappNumber}
                    </a>
                  </div>
                </div>

                {/* Active Margins */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block font-semibold">Profit Margins</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-emerald-400 font-bold font-mono text-xs">
                        +{selectedPanel.pricing?.adminMarginPercent ?? 15}% Admin
                      </span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-purple-300 font-bold font-mono text-xs">
                        +{selectedPanel.pricing?.defaultMarginPercent ?? 25}% Reseller
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeframe Filter Bar */}
            <div className="my-4 flex items-center justify-between gap-2 p-1.5 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-bold">
              {['today', 'yesterday', '7days', '30days', 'all'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleStatsTimeframeChange(tf)}
                  className={`flex-1 py-1.5 rounded-lg uppercase text-[10px] tracking-wider transition-all ${
                    statsTimeframe === tf
                      ? 'bg-yellow-400 text-black font-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tf === '7days' ? 'Last 7 Days' : tf === '30days' ? 'Last 30 Days' : tf}
                </button>
              ))}
            </div>

            {/* Stats Overview */}
            {panelStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Orders</span>
                  <div className="text-lg font-black text-white font-mono mt-1">{panelStats.totalOrders}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Total Turnover</span>
                  <div className="text-lg font-black text-sky-400 font-mono mt-1">₹{panelStats.totalSales}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Reseller Profit</span>
                  <div className="text-lg font-black text-purple-400 font-mono mt-1">₹{panelStats.totalChildProfit}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Main Admin Margin</span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-1">₹{panelStats.totalProfit - panelStats.totalChildProfit}</div>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span>Isolated Orders ({panelOrders.length})</span>
                <span className="text-[10px] text-zinc-500 font-mono">Realtime Child Customers</span>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 text-zinc-400 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5">Order ID</th>
                        <th className="px-3 py-2.5">User</th>
                        <th className="px-3 py-2.5">Service</th>
                        <th className="px-3 py-2.5">Selling Price</th>
                        <th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 font-medium">
                      {panelOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                            No orders placed on this child panel yet.
                          </td>
                        </tr>
                      ) : (
                        panelOrders.map((ord: any) => (
                          <tr key={ord.id} className="hover:bg-zinc-900/40">
                            <td className="px-3 py-2 font-mono font-bold text-yellow-400">{ord.id}</td>
                            <td className="px-3 py-2 font-bold text-white">{ord.userName || ord.userId}</td>
                            <td className="px-3 py-2 truncate max-w-xs text-zinc-300">{ord.serviceName}</td>
                            <td className="px-3 py-2 font-mono font-bold text-emerald-400">₹{ord.sellingPrice}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-zinc-800 text-zinc-300">
                                {ord.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Customers Section */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span>Registered Customers ({panelUsers.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {panelUsers.length === 0 ? (
                  <div className="col-span-2 text-center text-zinc-500 text-xs py-4">No users registered under this child panel yet.</div>
                ) : (
                  panelUsers.map((u: any) => (
                    <div key={u.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{u.username}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{u.email}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-yellow-400 font-bold text-xs">₹{(u.balance || 0).toFixed(2)}</div>
                        <div className="text-[9px] text-zinc-500">Balance</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CHILD PANEL REQUEST MODAL */}
      {rejectModalOpen && rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Reject Purchase Request</h3>
                  <p className="text-xs text-zinc-400">User: {rejectingRequest.username}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Panel:</span>
                  <span className="font-bold text-white">{rejectingRequest.requestedPanelName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Slug:</span>
                  <span className="font-mono text-yellow-400">/panel/{rejectingRequest.requestedSlug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">UTR / Ref:</span>
                  <span className="font-mono text-white">{rejectingRequest.utr}</span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Reason for Rejection (Optional Note)</label>
                <textarea
                  value={adminRejectNote}
                  onChange={(e) => setAdminRejectNote(e.target.value)}
                  placeholder="e.g. Payment UTR not verified or amount not credited."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-xs placeholder-zinc-500 outline-none focus:border-rose-400 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processingRequestId === rejectingRequest.id}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black transition-all disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
