import React, { useState, useMemo } from 'react';
import { Category, Service } from '../../types';
import { Search, Filter, ShieldCheck, Zap, Info, ArrowUpRight } from 'lucide-react';
import { formatServiceRate } from '../../lib/pricing';

interface ServicesListProps {
  categories: Category[];
  services: Service[];
  currency: string;
  onSelectService: (serviceId: string, categoryName: string) => void;
}

export const ServicesList: React.FC<ServicesListProps> = ({
  categories,
  services,
  currency,
  onSelectService,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [modalService, setModalService] = useState<Service | null>(null);

  const availableCategories = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string; count: number }>();

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

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesCat =
        selectedCat === 'all' || s.category.toLowerCase() === selectedCat.toLowerCase();
      const matchesSearch =
        s.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.providerServiceId.toString().includes(searchTerm) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [services, selectedCat, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Filter className="w-6 h-6 text-blue-500" />
            Services & Rates
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Explore live SMM services imported directly from top providers with instant delivery.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search service ID, name, or platform..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="all">All Categories ({services.length})</option>
          {availableCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Services Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-16">ID</th>
                <th className="py-3.5 px-4">Service Name</th>
                <th className="py-3.5 px-4">Rate per 1,000</th>
                <th className="py-3.5 px-4">Min / Max</th>
                <th className="py-3.5 px-4 text-center">Guarantees</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
              {filteredServices.length > 0 ? (
                filteredServices.map((srv) => {
                  const rateDisp = formatServiceRate(srv, currency);

                  return (
                    <tr key={srv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 font-bold">
                        #{srv.providerServiceId}
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="text-slate-100 font-semibold leading-snug">
                          {srv.serviceName}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                          Category: {srv.category}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {rateDisp}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {srv.min.toLocaleString()} / {srv.max.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {srv.refill ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                              Refill
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px]">
                              No Refill
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalService(srv)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            title="View Description"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectService(srv.id, srv.category)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all"
                          >
                            <span>Order</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 italic">
                    No services match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description Modal */}
      {modalService && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Zap className="w-4 h-4 text-blue-400" />
              #{modalService.providerServiceId} - {modalService.serviceName}
            </h3>

            <div className="space-y-2">
              <span className="text-slate-400 font-semibold block">Details & Speed</span>
              <p className="text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                {modalService.description ||
                  'High quality social media boosting service. Instant start with 24/7 automated delivery.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Min / Max Order</span>
                <span className="text-slate-200 font-mono font-bold">
                  {modalService.min.toLocaleString()} / {modalService.max.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Rate per 1000</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatServiceRate(modalService, currency)} / 1K
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setModalService(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSelectService(modalService.id, modalService.category);
                  setModalService(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold"
              >
                Order This Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
