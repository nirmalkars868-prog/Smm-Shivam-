import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  Search,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Percent,
  DollarSign,
  Zap,
  Sparkles,
  PlusCircle,
  Trash2,
  X,
  Layers,
  Check,
} from 'lucide-react';
import { Service, Category, Provider } from '../../types';

interface ManageServicesProps {
  currency: string;
}

export const ManageServices: React.FC<ManageServicesProps> = ({ currency }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // New Custom Service Form State
  const [newServiceForm, setNewServiceForm] = useState({
    serviceName: '',
    category: '',
    newCategoryName: '',
    providerId: 'manual',
    providerServiceId: '',
    providerRate: 0.10,
    sellingRate: 0.25,
    min: 10,
    max: 100000,
    refill: true,
    cancel: true,
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Edit Service Form State
  const [editForm, setEditForm] = useState<Partial<Service>>({});

  // Bulk Margin State
  const [marginPct, setMarginPct] = useState<string>('20');
  const [isUpdatingMargin, setIsUpdatingMargin] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services');
      const data = await res.json();
      setServices(data.services || []);
      setCategories(data.categories || []);
      setProviders(data.providers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory =
      newServiceForm.category === 'NEW_CATEGORY'
        ? newServiceForm.newCategoryName.trim()
        : newServiceForm.category.trim();

    if (!newServiceForm.serviceName.trim()) {
      showToast('error', 'Please enter a service name');
      return;
    }
    if (!finalCategory) {
      showToast('error', 'Please select or enter a category');
      return;
    }

    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newServiceForm,
          category: finalCategory,
          providerRate: Number(newServiceForm.providerRate),
          sellingRate: Number(newServiceForm.sellingRate),
          min: Number(newServiceForm.min),
          max: Number(newServiceForm.max),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Custom Service "${data.service.serviceName}" created successfully!`);
        setShowAddModal(false);
        setNewServiceForm({
          serviceName: '',
          category: '',
          newCategoryName: '',
          providerId: 'manual',
          providerServiceId: '',
          providerRate: 0.10,
          sellingRate: 0.25,
          min: 10,
          max: 100000,
          refill: true,
          cancel: true,
          description: '',
          status: 'active',
        });
        fetchServices();
      } else {
        showToast('error', data.error || 'Failed to create service');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error creating service');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const res = await fetch(`/api/admin/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Service #${editingService.providerServiceId} updated successfully!`);
        setEditingService(null);
        fetchServices();
      } else {
        showToast('error', data.error || 'Failed to update service');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating service');
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!window.confirm(`Are you sure you want to delete "${service.serviceName}" (#${service.providerServiceId})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Service #${service.providerServiceId} deleted!`);
        fetchServices();
      } else {
        showToast('error', data.error || 'Failed to delete service');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error deleting service');
    }
  };

  const handleApplyBulkMargin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(marginPct);
    if (isNaN(pct) || pct < 0) {
      showToast('error', 'Please enter a valid non-negative profit margin percentage');
      return;
    }

    if (!window.confirm(`Are you sure you want to apply ${pct}% Profit Margin to ALL ${services.length} services?`)) {
      return;
    }

    setIsUpdatingMargin(true);
    try {
      const res = await fetch('/api/admin/services/bulk-margin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marginPercentage: pct }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Successfully applied ${pct}% profit margin to ALL ${data.updatedCount} services!`);
        fetchServices();
      } else {
        showToast('error', data.error || 'Failed to apply profit margin');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error updating profit margin');
    } finally {
      setIsUpdatingMargin(false);
    }
  };

  const toggleStatus = async (service: Service) => {
    const nextStatus = service.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchServices();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.providerServiceId.toString().includes(searchTerm) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const fmt = (val: number) => {
    if (currency === 'INR') return `₹${val.toFixed(2)}`;
    return `$${(val / 86).toFixed(4)}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-yellow-500/20 pb-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <ListFilter className="w-6 h-6 text-yellow-400" />
            Manage Services & Custom Prices
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Admin can add custom services manually, set custom selling prices, apply bulk margins, and toggle status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setNewServiceForm({
                serviceName: '',
                category: categories[0]?.name || 'Instagram Followers',
                newCategoryName: '',
                providerId: 'manual',
                providerServiceId: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
                providerRate: 0.10,
                sellingRate: 0.25,
                min: 10,
                max: 50000,
                refill: true,
                cancel: true,
                description: '',
                status: 'active',
              });
              setShowAddModal(true);
            }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-yellow-500/20 transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4 fill-black" />
            <span>Add Custom Service</span>
          </button>

          <button
            onClick={fetchServices}
            className="bg-zinc-900 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
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
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="text-xs font-bold">{toastMsg.text}</span>
        </div>
      )}

      {/* Global Profit Margin Control Card */}
      <div className="bg-zinc-950 border border-yellow-500/30 p-5 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
          <div>
            <h2 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2">
              <Percent className="w-4 h-4 text-yellow-400" />
              <span>Bulk Set Profit Margin % for ALL Services</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Automatically calculates selling price = Provider Cost + (Provider Cost × Profit Margin %).
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-extrabold text-zinc-500 mr-1">Presets:</span>
            {[10, 20, 30, 50, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMarginPct(p.toString())}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  marginPct === p.toString()
                    ? 'bg-yellow-500 text-black font-extrabold shadow-md'
                    : 'bg-black text-zinc-400 border border-zinc-800 hover:text-yellow-400'
                }`}
              >
                +{p}%
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleApplyBulkMargin} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3.5 top-2.5 text-yellow-400 font-bold text-xs">%</span>
            <input
              type="number"
              min="0"
              max="1000"
              step="1"
              value={marginPct}
              onChange={(e) => setMarginPct(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl pl-8 pr-4 py-2.5 text-xs font-mono font-extrabold text-yellow-400 focus:outline-none focus:border-yellow-400"
              placeholder="e.g. 20 for 20%"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingMargin}
            className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black font-black px-6 py-2.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-black text-black" />
            <span>{isUpdatingMargin ? 'Applying Margin...' : `Apply ${marginPct || 0}% Profit Margin To All`}</span>
          </button>
        </form>
      </div>

      {/* Filters Bar: Search & Category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative bg-zinc-950 border border-yellow-500/20 p-2 rounded-2xl">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-yellow-400" />
          <input
            type="text"
            placeholder="Search service by ID, name, or platform category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="bg-zinc-950 border border-yellow-500/20 p-2 rounded-2xl flex items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
          >
            <option value="ALL">All Categories ({services.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black border-b border-zinc-800 font-black text-yellow-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Service ID</th>
                <th className="py-3.5 px-4">Service Details</th>
                <th className="py-3.5 px-4">Provider / Cost</th>
                <th className="py-3.5 px-4">Selling Rate</th>
                <th className="py-3.5 px-4 text-emerald-400">Profit / 1k</th>
                <th className="py-3.5 px-4">Min / Max</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium font-mono text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-bold">
                    Loading services...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-bold">
                    No services found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((srv) => {
                  const profitPer1k = srv.sellingRate - srv.providerRate;
                  return (
                    <tr key={srv.id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 text-yellow-400 font-mono font-bold">#{srv.providerServiceId}</td>
                      <td className="py-3.5 px-4 max-w-xs font-sans">
                        <div className="text-white font-bold truncate">{srv.serviceName}</div>
                        <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{srv.category}</span>
                          {srv.refill && <span className="text-emerald-400 font-bold text-[9px]">Refill ✓</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-bold font-sans">
                        <div>{fmt(srv.providerRate)}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{srv.providerId || 'manual'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-yellow-400 text-sm">{fmt(srv.sellingRate)}</td>
                      <td className="py-3.5 px-4 font-black text-emerald-400">+{fmt(profitPer1k)}</td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {srv.min} - {srv.max}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <button
                          onClick={() => toggleStatus(srv)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase transition-colors cursor-pointer ${
                            srv.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {srv.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Edit Service & Price"
                            onClick={() => {
                              setEditingService(srv);
                              setEditForm({
                                serviceName: srv.serviceName,
                                category: srv.category,
                                providerRate: srv.providerRate,
                                sellingRate: srv.sellingRate,
                                min: srv.min,
                                max: srv.max,
                                refill: srv.refill,
                                cancel: srv.cancel,
                                description: srv.description,
                                status: srv.status,
                              });
                            }}
                            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 text-zinc-300 hover:text-yellow-400 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete Service"
                            onClick={() => handleDeleteService(srv)}
                            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 text-zinc-300 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
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

      {/* Add Custom Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-yellow-400" />
                <span>Add Custom Service (Admin Manual Entry)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">Service Name *</label>
                <input
                  type="text"
                  value={newServiceForm.serviceName}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, serviceName: e.target.value })}
                  placeholder="e.g. Instagram High Quality Followers [Non-Drop Refill]"
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-bold uppercase">Category *</label>
                  <select
                    value={newServiceForm.category}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, category: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-yellow-400"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="NEW_CATEGORY">+ Create New Category</option>
                  </select>
                </div>

                {newServiceForm.category === 'NEW_CATEGORY' && (
                  <div>
                    <label className="block text-yellow-400 mb-1 font-bold uppercase">New Category Name *</label>
                    <input
                      type="text"
                      value={newServiceForm.newCategoryName}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, newCategoryName: e.target.value })}
                      placeholder="e.g. Threads Followers"
                      className="w-full bg-black border border-yellow-500/40 rounded-xl p-3 text-yellow-400 font-bold focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-zinc-300 mb-1 font-bold uppercase">API Provider</label>
                  <select
                    value={newServiceForm.providerId}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, providerId: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-yellow-400"
                  >
                    <option value="manual">Manual / Self Fulfilled (No API)</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-bold uppercase">Provider Cost / 1k ($ USD)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newServiceForm.providerRate}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, providerRate: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-zinc-300 font-mono font-bold focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-yellow-400 mb-1 font-black uppercase">Selling Price / 1k ($ USD) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newServiceForm.sellingRate}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, sellingRate: Number(e.target.value) })}
                    className="w-full bg-black border border-yellow-500/40 rounded-xl p-3 text-yellow-400 font-mono font-black text-sm focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-bold uppercase">Min Quantity</label>
                  <input
                    type="number"
                    value={newServiceForm.min}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, min: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-bold uppercase">Max Quantity</label>
                  <input
                    type="number"
                    value={newServiceForm.max}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, max: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-zinc-300 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newServiceForm.refill}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, refill: e.target.checked })}
                    className="rounded bg-black border-zinc-800 text-yellow-500 focus:ring-0"
                  />
                  <span>Auto-Refill Available</span>
                </label>

                <label className="flex items-center gap-2 text-zinc-300 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newServiceForm.cancel}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, cancel: e.target.checked })}
                    className="rounded bg-black border-zinc-800 text-yellow-500 focus:ring-0"
                  />
                  <span>Cancel Button Available</span>
                </label>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">Service Description / Instructions</label>
                <textarea
                  rows={3}
                  value={newServiceForm.description}
                  onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
                  placeholder="Enter link format instructions (e.g. Public profile link only, start time 0-1 hr)..."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-300 font-bold rounded-xl cursor-pointer hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl cursor-pointer shadow-lg shadow-yellow-500/20 active:scale-95"
                >
                  Create Custom Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-yellow-400" />
                <span>Edit Service: #{editingService.providerServiceId}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">Service Name</label>
                <input
                  type="text"
                  value={editForm.serviceName || ''}
                  onChange={(e) => setEditForm({ ...editForm, serviceName: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">Category</label>
                <input
                  type="text"
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold uppercase">Provider Cost / 1k ($ USD)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.providerRate ?? editingService.providerRate}
                    onChange={(e) => setEditForm({ ...editForm, providerRate: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-zinc-300 font-mono font-bold focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-yellow-400 mb-1 font-black uppercase">Selling Price / 1k ($ USD) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editForm.sellingRate ?? editingService.sellingRate}
                    onChange={(e) => setEditForm({ ...editForm, sellingRate: Number(e.target.value) })}
                    className="w-full bg-black border border-yellow-500/40 rounded-xl p-3 text-yellow-400 font-mono font-black text-sm focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-bold uppercase">Min Quantity</label>
                  <input
                    type="number"
                    value={editForm.min ?? editingService.min}
                    onChange={(e) => setEditForm({ ...editForm, min: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-bold uppercase">Max Quantity</label>
                  <input
                    type="number"
                    value={editForm.max ?? editingService.max}
                    onChange={(e) => setEditForm({ ...editForm, max: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-yellow-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">Service Description / Instructions</label>
                <textarea
                  rows={3}
                  value={editForm.description ?? editingService.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-xl cursor-pointer hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl cursor-pointer shadow-lg shadow-yellow-500/20 active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
