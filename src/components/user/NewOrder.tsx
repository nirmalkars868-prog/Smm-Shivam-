import React, { useState, useMemo } from 'react';
import { Category, Service, User, AdminSettings } from '../../types';
import { calculateOrderPrice, formatServiceRate } from '../../lib/pricing';
import {
  ShoppingBag,
  Zap,
  Info,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Link2,
  Layers,
  ArrowRight,
  MessageCircle,
  ExternalLink,
  Search,
} from 'lucide-react';

interface NewOrderProps {
  categories: Category[];
  services: Service[];
  currentUser?: User | null;
  userBalance: number;
  currency: string;
  settings?: AdminSettings;
  onOrderPlaced: () => void;
}

export const NewOrder: React.FC<NewOrderProps> = ({
  categories,
  services,
  currentUser,
  userBalance,
  currency,
  settings,
  onOrderPlaced,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [link, setLink] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<{
    id: string;
    serviceName: string;
    category: string;
    link: string;
    quantity: number;
    amount: string;
    whatsappUrl: string;
  } | null>(null);

  const activeUserId = currentUser?.id || localStorage.getItem('smm_panel_userId') || 'usr-demo';

  // Derive all unique categories directly from active services plus any defined categories
  const availableCategories = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string; count: number }>();

    // Register categories from services
    services.forEach((s) => {
      if (s.status === 'active' && s.category) {
        const catName = s.category.trim();
        const key = catName.toLowerCase();
        if (catMap.has(key)) {
          catMap.get(key)!.count++;
        } else {
          catMap.set(key, {
            id: 'cat-' + key.replace(/[^a-z0-9]/g, '-'),
            name: catName,
            count: 1,
          });
        }
      }
    });

    // Also include any explicitly configured categories
    categories.forEach((cat) => {
      if (cat.name) {
        const key = cat.name.trim().toLowerCase();
        if (!catMap.has(key)) {
          const count = services.filter(
            (s) => s.status === 'active' && s.category.trim().toLowerCase() === key
          ).length;
          if (count > 0) {
            catMap.set(key, {
              id: cat.id,
              name: cat.name.trim(),
              count,
            });
          }
        }
      }
    });

    return Array.from(catMap.values());
  }, [categories, services]);

  // Set default category and service on load
  React.useEffect(() => {
    if (availableCategories.length > 0) {
      if (
        !selectedCategory ||
        !availableCategories.some(
          (c) => c.name.toLowerCase() === selectedCategory.toLowerCase()
        )
      ) {
        setSelectedCategory(availableCategories[0].name);
      }
    }
  }, [availableCategories, selectedCategory]);

  const filteredServices = useMemo(() => {
    const activeServices = services.filter((s) => s.status === 'active');
    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase().trim();
      return activeServices.filter(
        (s) =>
          s.serviceName.toLowerCase().includes(q) ||
          String(s.providerServiceId).includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }
    if (!selectedCategory) return activeServices;
    return activeServices.filter(
      (s) => s.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [services, selectedCategory, serviceSearch]);

  React.useEffect(() => {
    if (filteredServices.length > 0) {
      // If current service is not in filtered list, select the first one
      if (!filteredServices.some((s) => s.id === selectedServiceId)) {
        setSelectedServiceId(filteredServices[0].id);
        setQuantity(filteredServices[0].min || 1000);
      }
    } else {
      setSelectedServiceId('');
    }
  }, [filteredServices, selectedServiceId]);

  const currentService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId);
  }, [services, selectedServiceId]);

  // Calculate charge using centralized pricing function
  const calculatedChargeINR = useMemo(() => {
    if (!currentService || !quantity) return 0;
    return calculateOrderPrice(currentService, quantity);
  }, [currentService, quantity]);

  const displayCharge =
    currency === 'INR'
      ? `₹${calculatedChargeINR.toFixed(2)}`
      : `$${(calculatedChargeINR / 86).toFixed(4)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentService) return;

    if (!link.trim()) {
      setMessage({ type: 'error', text: 'Please enter a target link or username' });
      return;
    }

    if (quantity < currentService.min || quantity > currentService.max) {
      setMessage({
        type: 'error',
        text: `Quantity must be between ${currentService.min.toLocaleString()} and ${currentService.max.toLocaleString()}`,
      });
      return;
    }

    if (calculatedChargeINR > userBalance) {
      setMessage({
        type: 'error',
        text: 'Insufficient account balance. Please add funds via QR UPI to proceed.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    setLastPlacedOrder(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          userEmail: currentUser?.email,
          username: currentUser?.username,
          whatsappNo: currentUser?.whatsappNo,
          userBalance: userBalance,
          serviceId: currentService.id,
          link: link.trim(),
          quantity: Number(quantity),
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to submit order');
      }

      // WhatsApp Redirection logic
      // Target number: 9516862395 (or admin configured order whatsapp number)
      const rawNumber = settings?.orderWhatsappNumber || '9516862395';
      const cleanDigits = rawNumber.replace(/\D/g, '');
      const waRecipient = cleanDigits.startsWith('91') ? cleanDigits : `91${cleanDigits}`;

      const userEmail = currentUser?.email || 'N/A';
      const userName = currentUser?.username || 'Customer';

      const whatsappMessage =
`🚀 *NEW SMM ORDER PLACED*
━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* #${data.order.id}
👤 *User:* ${userName}
📧 *Email:* ${userEmail}
📱 *WhatsApp No:* ${currentUser?.whatsappNo || 'N/A'}
📦 *Service:* ${currentService.serviceName}
📂 *Category:* ${currentService.category}
🔗 *Link:* ${link.trim()}
🔢 *Quantity:* ${Number(quantity).toLocaleString()}
💰 *Amount:* ${displayCharge}
⚡ *Status:* ${data.order.status}
⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
━━━━━━━━━━━━━━━━━━━━
Please verify and process this order. Thank you!`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${waRecipient}&text=${encodeURIComponent(whatsappMessage)}`;

      setLastPlacedOrder({
        id: data.order.id,
        serviceName: currentService.serviceName,
        category: currentService.category,
        link: link.trim(),
        quantity: Number(quantity),
        amount: displayCharge,
        whatsappUrl,
      });

      setMessage({
        type: 'success',
        text: `Order #${data.order.id} submitted successfully! Redirecting to WhatsApp...`,
      });

      // Trigger automatic WhatsApp redirect in new window/tab
      try {
        const opened = window.open(whatsappUrl, '_blank');
        if (!opened) {
          // If popup blocker blocked it, fallback to window.location or interactive button
          console.log('Popup blocked, WhatsApp URL available in confirmation card');
        }
      } catch (err) {
        console.warn('WhatsApp redirect window error:', err);
      }

      setLink('');
      onOrderPlaced();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred while submitting order' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-yellow-500/20 pb-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-yellow-400" />
            Place New Order
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select category, choose service, enter your target link and quantity.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border text-xs font-bold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* WhatsApp Order Confirmation Banner */}
      {lastPlacedOrder && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
              <span className="text-sm font-black text-emerald-300">
                Order Placed! WhatsApp Confirmation Ready
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
              Order #{lastPlacedOrder.id}
            </span>
          </div>

          <p className="text-xs text-zinc-300">
            Aapka order successfully place ho gaya hai. WhatsApp notification send karne ke liye niche diye gaye button par click karein:
          </p>

          <a
            href={lastPlacedOrder.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-black" />
            <span>Open WhatsApp with Order Details (9516862395)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form */}
        <div className="lg:col-span-2 bg-zinc-950 border border-yellow-500/20 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Quick Search */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Search Services
                </label>
                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch('')}
                    className="text-[11px] text-yellow-400 hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Type to search all imported services (e.g. Followers, Views, ID)..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                1. Category ({availableCategories.length} Available)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setServiceSearch('');
                }}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-yellow-400 focus:outline-none focus:border-yellow-400 cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name} ({cat.count} services)
                  </option>
                ))}
              </select>
            </div>

            {/* Service */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2 flex items-center justify-between">
                <span>2. Service ({filteredServices.length} options)</span>
                {currentService && (
                  <span className="text-[11px] text-emerald-400 font-mono font-normal">
                    Min: {currentService.min} / Max: {currentService.max}
                  </span>
                )}
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  const found = services.find((s) => s.id === e.target.value);
                  if (found) setQuantity(found.min);
                }}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400 cursor-pointer"
              >
                {filteredServices.length === 0 ? (
                  <option value="">No services match your filter</option>
                ) : (
                  filteredServices.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      #{srv.providerServiceId} - {srv.serviceName} ({formatServiceRate(srv, currency)} / 1k)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Description Box */}
            {currentService?.description && (
              <div className="bg-black/60 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" />
                  <span>Service Information & Instructions</span>
                </div>
                <p className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed font-sans">
                  {currentService.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
                  {currentService.refill && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> Auto Refill Available
                    </span>
                  )}
                  {currentService.cancel && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Clock className="w-3 h-3" /> Cancel Button Enabled
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800">
                    Min: {currentService.min.toLocaleString()} | Max: {currentService.max.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Link Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2 flex items-center justify-between">
                <span>3. Target Link / Username</span>
                <span className="text-[10px] text-zinc-500 font-normal">Must be Public URL</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="https://instagram.com/username or https://youtube.com/watch?v=..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400 font-mono"
                  required
                />
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2 flex items-center justify-between">
                <span>4. Quantity</span>
                {currentService && (
                  <span className="text-[10px] text-yellow-400 font-mono">
                    Limit: {currentService.min.toLocaleString()} - {currentService.max.toLocaleString()}
                  </span>
                )}
              </label>
              <div className="relative">
                <Layers className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  min={currentService?.min || 10}
                  max={currentService?.max || 100000}
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400 font-mono"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !currentService}
              className="w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-amber-300 text-black font-black py-4 px-6 rounded-2xl shadow-xl shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Order & WhatsApp...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Submit Order & Open WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Right Summary Card */}
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-yellow-400 border-b border-zinc-900 pb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Order Calculation Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Service ID</span>
                <span className="font-mono font-bold text-white">#{currentService?.providerServiceId || '---'}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Rate per 1000</span>
                <span className="font-mono font-bold text-white">
                  {currentService
                    ? currency === 'INR'
                      ? `₹${(currentService.sellingRate * (settings?.exchangeRateINR || 86)).toFixed(2)}`
                      : `$${currentService.sellingRate.toFixed(4)}`
                    : '---'}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Quantity</span>
                <span className="font-mono font-bold text-yellow-400">{(quantity || 0).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black uppercase text-white">Total Charge</span>
                <span className="text-2xl font-black font-mono text-yellow-400">{displayCharge}</span>
              </div>
            </div>

            <div className="p-3.5 bg-black rounded-2xl border border-zinc-800 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Your Balance:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {currency === 'INR' ? `₹${userBalance.toFixed(2)}` : `$${(userBalance / 86).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500">Balance After:</span>
                <span
                  className={`font-mono font-bold ${
                    userBalance - calculatedChargeINR >= 0 ? 'text-zinc-300' : 'text-rose-500'
                  }`}
                >
                  {currency === 'INR'
                    ? `₹${Math.max(0, userBalance - calculatedChargeINR).toFixed(2)}`
                    : `$${Math.max(0, (userBalance - calculatedChargeINR) / 86).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-start gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Order place hone par aapke registered email & order details ke sath WhatsApp redirect hoga.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
