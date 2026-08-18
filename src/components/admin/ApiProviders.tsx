import React, { useState, useEffect } from 'react';
import {
  Code2,
  RefreshCw,
  Download,
  Percent,
  CheckCircle2,
  AlertCircle,
  Play,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  Sparkles,
  Eye,
  Key,
  X,
  PlusCircle,
  Trash2,
  Globe,
} from 'lucide-react';
import { Provider, SyncLog, SyncSummary } from '../../types';

const DEFAULT_PROVIDER: Provider = {
  id: 'smmdip',
  name: 'SMMDIP Main Provider',
  apiUrl: 'https://smmdip.com/api/v2',
  apiKey: '',
  status: 'active',
  markupPercentage: 20,
  autoSync: true,
  autoSyncInterval: '6h',
  lastSyncAt: new Date().toISOString(),
  lastSyncStatus: 'success',
  lastSyncSummary: {
    checked: 16,
    newServices: 16,
    updatedServices: 0,
    inactiveServices: 0,
    errors: 0,
    message: 'Initial auto-import ready.',
    timestamp: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const ApiProviders: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([DEFAULT_PROVIDER]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(DEFAULT_PROVIDER);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiUrlInput, setApiUrlInput] = useState<string>(DEFAULT_PROVIDER.apiUrl);
  const [providerNameInput, setProviderNameInput] = useState<string>(DEFAULT_PROVIDER.name);
  const [markupInput, setMarkupInput] = useState<number>(20);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [autoSyncInterval, setAutoSyncInterval] = useState<'1h' | '6h' | '12h' | '24h'>('6h');

  // New Provider Modal
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newProvName, setNewProvName] = useState('');
  const [newProvUrl, setNewProvUrl] = useState('');
  const [newProvKey, setNewProvKey] = useState('');
  const [newProvMarkup, setNewProvMarkup] = useState(20);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number; balance?: string } | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(DEFAULT_PROVIDER.lastSyncSummary || null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProviders();
    fetchLogs();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (data.providers && data.providers.length > 0) {
        setProviders(data.providers);
        // Retain or select active provider
        const current = data.providers.find((p: Provider) => p.id === selectedProvider.id) || data.providers[0];
        setSelectedProvider(current);
        setProviderNameInput(current.name || DEFAULT_PROVIDER.name);
        setApiUrlInput(current.apiUrl || DEFAULT_PROVIDER.apiUrl);
        setApiKeyInput(''); // Masked
        setMarkupInput(current.markupPercentage ?? 20);
        setAutoSync(current.autoSync ?? true);
        setAutoSyncInterval(current.autoSyncInterval || '6h');
        if (current.lastSyncSummary) {
          setSyncSummary(current.lastSyncSummary);
        }
        return;
      }
    } catch (e) {
      console.warn('Backend provider fetch fallback:', e);
    }

    setProviders([DEFAULT_PROVIDER]);
    setSelectedProvider(DEFAULT_PROVIDER);
    setProviderNameInput(DEFAULT_PROVIDER.name);
    setApiUrlInput(DEFAULT_PROVIDER.apiUrl);
    setMarkupInput(DEFAULT_PROVIDER.markupPercentage ?? 20);
    setAutoSync(DEFAULT_PROVIDER.autoSync ?? true);
    setAutoSyncInterval(DEFAULT_PROVIDER.autoSyncInterval || '6h');
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      setSyncLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectProvider = (p: Provider) => {
    setSelectedProvider(p);
    setProviderNameInput(p.name);
    setApiUrlInput(p.apiUrl);
    setApiKeyInput('');
    setMarkupInput(p.markupPercentage ?? 20);
    setAutoSync(p.autoSync ?? true);
    setAutoSyncInterval(p.autoSyncInterval || '6h');
    setTestResult(null);
    if (p.lastSyncSummary) {
      setSyncSummary(p.lastSyncSummary);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setLoadingSave(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProvider.id,
          name: providerNameInput,
          apiUrl: apiUrlInput,
          apiKey: apiKeyInput, // Sent safely over backend API
          status: 'active',
          markupPercentage: markupInput,
          autoSync,
          autoSyncInterval,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save provider settings');
      }

      setMessage({ type: 'success', text: 'Provider configuration and API parameters saved successfully!' });
      setApiKeyInput('');
      fetchProviders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingSave(false);
    }
  };

  const handleCreateNewProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvName.trim() || !newProvUrl.trim()) {
      setMessage({ type: 'error', text: 'Provider name and API URL are required' });
      return;
    }

    try {
      const newId = 'prov-' + Date.now();
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          name: newProvName.trim(),
          apiUrl: newProvUrl.trim(),
          apiKey: newProvKey.trim(),
          status: 'active',
          markupPercentage: Number(newProvMarkup) || 20,
          autoSync: true,
          autoSyncInterval: '6h',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Provider "${newProvName}" added successfully!` });
        setShowAddProviderModal(false);
        setNewProvName('');
        setNewProvUrl('');
        setNewProvKey('');
        fetchProviders();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add provider' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteProvider = async (p: Provider) => {
    if (providers.length <= 1) {
      setMessage({ type: 'error', text: 'Cannot delete the only provider.' });
      return;
    }
    if (!window.confirm(`Are you sure you want to remove provider "${p.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/providers/${p.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Provider deleted successfully!' });
        fetchProviders();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete provider' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) return;
    setLoadingTest(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider.id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setLoadingTest(false);
    }
  };

  const handlePreviewImport = async () => {
    if (!selectedProvider) return;
    setLoadingPreview(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider.id}/preview`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data.preview);
        setShowPreviewModal(true);
      } else {
        throw new Error(data.error || 'Failed to generate preview');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedProvider) return;
    setLoadingImport(true);

    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider.id}/import`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setSyncSummary(data.summary);
        setShowPreviewModal(false);
        setMessage({
          type: 'success',
          text: `Service Import Complete! Imported ${data.summary.newServices} new services and updated ${data.summary.updatedServices} existing services.`,
        });
        fetchProviders();
        fetchLogs();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-yellow-500/20 pb-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <Code2 className="w-6 h-6 text-yellow-400" />
            API Providers & Synchronization
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manually enter API URL and API Key for any SMM Provider, test live connections, and sync services catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddProviderModal(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-yellow-500/20 transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4 fill-black" />
            <span>Add New Provider</span>
          </button>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {providers.map((p) => {
          const isSelected = selectedProvider.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectProvider(p)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                isSelected
                  ? 'bg-yellow-500 text-black border-yellow-400 shadow-md font-black'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{p.name}</span>
              {providers.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProvider(p);
                  }}
                  title="Remove Provider"
                  className="hover:text-rose-500 ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
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

      {selectedProvider && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Manual API Credentials: {selectedProvider.name}</span>
                </h3>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Active
                </span>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      Provider Label / Name *
                    </label>
                    <input
                      type="text"
                      value={providerNameInput}
                      onChange={(e) => setProviderNameInput(e.target.value)}
                      placeholder="e.g. SMMDIP, Peakerr, JAP"
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      API Endpoint URL (v2) *
                    </label>
                    <input
                      type="text"
                      value={apiUrlInput}
                      onChange={(e) => setApiUrlInput(e.target.value)}
                      placeholder="https://smmdip.com/api/v2"
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1 flex flex-wrap items-center justify-between gap-1">
                    <span>Provider API Key (Manual Entry)</span>
                    {selectedProvider.apiKey && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Saved ({selectedProvider.apiKey})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder={selectedProvider.apiKey ? `Saved: (${selectedProvider.apiKey}). Type new key to replace` : "Paste SMM Provider API Key here..."}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-yellow-400 font-mono placeholder-zinc-600 focus:outline-none focus:border-yellow-400 font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span>API key is securely encrypted & managed server-side.</span>
                  </p>
                </div>

                {/* Price Markup & Auto Sync */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      Provider Default Profit Margin (%)
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={markupInput}
                        onChange={(e) => setMarkupInput(Number(e.target.value))}
                        className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-yellow-400 font-mono font-bold focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      Auto Sync Frequency
                    </label>
                    <select
                      value={autoSyncInterval}
                      onChange={(e) => setAutoSyncInterval(e.target.value as any)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white font-bold focus:outline-none focus:border-yellow-400"
                    >
                      <option value="1h">Every 1 Hour</option>
                      <option value="6h">Every 6 Hours (Recommended)</option>
                      <option value="12h">Every 12 Hours</option>
                      <option value="24h">Once Every 24 Hours</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                  <button
                    type="submit"
                    disabled={loadingSave}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/20 cursor-pointer active:scale-95"
                  >
                    {loadingSave ? 'Saving API Credentials...' : 'Save API Configuration'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={loadingTest}
                    className="bg-zinc-900 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold px-4 py-3 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{loadingTest ? 'Testing API...' : 'Test Connection'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Test Result Card */}
            {testResult && (
              <div
                className={`p-5 rounded-3xl border ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-sm mb-1">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.success ? 'API Connection Successful!' : 'Connection Check Notice'}</span>
                </div>
                <p className="text-xs">{testResult.message}</p>
                {testResult.count !== undefined && (
                  <p className="text-xs font-mono font-bold mt-1 text-white">
                    Available Services on Provider: {testResult.count}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Catalog Sync & Actions */}
          <div className="space-y-6">
            <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-yellow-400 uppercase flex items-center gap-2 border-b border-zinc-900 pb-3">
                <Download className="w-4 h-4 text-yellow-400" />
                <span>Fetch Services From API</span>
              </h3>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect directly to {selectedProvider.name} API endpoint and pull all latest services, prices, and categories into your catalog.
              </p>

              <button
                type="button"
                onClick={handlePreviewImport}
                disabled={loadingPreview}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border border-yellow-500/30 font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{loadingPreview ? 'Fetching API Preview...' : 'Preview Provider Services'}</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={loadingImport}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/20 cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${loadingImport ? 'animate-spin' : ''}`} />
                <span>{loadingImport ? 'Importing Catalog...' : 'Import & Sync All Services'}</span>
              </button>
            </div>

            {/* Sync Summary */}
            {syncSummary && (
              <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-5 shadow-xl space-y-3">
                <h4 className="text-xs font-black uppercase text-zinc-300 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Last Sync Status</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-black p-2.5 rounded-xl border border-zinc-900">
                    <span className="text-zinc-500 block text-[10px]">NEW SERVICES</span>
                    <span className="text-emerald-400 font-bold">{syncSummary.newServices}</span>
                  </div>
                  <div className="bg-black p-2.5 rounded-xl border border-zinc-900">
                    <span className="text-zinc-500 block text-[10px]">UPDATED</span>
                    <span className="text-yellow-400 font-bold">{syncSummary.updatedServices}</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500">{syncSummary.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New Provider Modal */}
      {showAddProviderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-yellow-400" />
                <span>Add New API Provider</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProviderModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProvider} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">Provider Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Peakerr or Custom SMM"
                  value={newProvName}
                  onChange={(e) => setNewProvName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">API URL *</label>
                <input
                  type="text"
                  placeholder="https://example-smm.com/api/v2"
                  value={newProvUrl}
                  onChange={(e) => setNewProvUrl(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">API Key (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter API Key"
                  value={newProvKey}
                  onChange={(e) => setNewProvKey(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-yellow-400 font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-bold uppercase">Default Profit Margin %</label>
                <input
                  type="number"
                  value={newProvMarkup}
                  onChange={(e) => setNewProvMarkup(Number(e.target.value))}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowAddProviderModal(false)}
                  className="px-4 py-2.5 bg-zinc-800 text-zinc-300 font-bold rounded-xl cursor-pointer hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl cursor-pointer shadow-lg active:scale-95"
                >
                  Add Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                <Eye className="w-4 h-4 text-yellow-400" />
                <span>Import Preview ({previewData.totalAvailable} Services Found)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-zinc-900 text-xs font-mono pr-1">
              {previewData.sampleServices?.map((s: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="truncate">
                    <span className="text-yellow-400 font-bold mr-2">#{s.service}</span>
                    <span className="text-white font-sans font-medium">{s.name}</span>
                    <span className="text-zinc-500 text-[10px] block font-sans">{s.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-zinc-400 font-bold">${Number(s.rate).toFixed(4)}</div>
                    <div className="text-emerald-400 text-[10px] font-bold">
                      Sell: ${(Number(s.rate) * (1 + markupInput / 100)).toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
              <span className="text-[11px] text-zinc-400">
                Will calculate selling rates with +{markupInput}% profit margin.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={loadingImport}
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl cursor-pointer shadow-lg"
                >
                  {loadingImport ? 'Importing...' : 'Confirm & Sync Catalog'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
