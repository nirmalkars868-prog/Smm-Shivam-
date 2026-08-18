import React, { useState } from 'react';
import { Layers, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const MassOrder: React.FC = () => {
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setContent('');
    }, 4000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-500" />
          Mass Order Editor
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Submit bulk orders at once using format: <code className="text-blue-400">service_id | link | quantity</code>
        </p>
      </div>

      {submitted && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          <span>Mass orders placed successfully! Check your Orders History tab for tracking.</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              One order per line (service_id | link | quantity)
            </label>
            <textarea
              rows={8}
              placeholder={`1001 | https://instagram.com/post_1 | 1000\n1001 | https://instagram.com/post_2 | 2500\n2001 | https://youtube.com/watch?v=xyz | 5000`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span>Total parsed order lines: <strong className="text-white font-mono">{lines.length}</strong></span>
            <span>Status: Ready for batch submission</span>
          </div>

          <button
            type="submit"
            disabled={lines.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Submit {lines.length} Mass Orders</span>
          </button>
        </form>
      </div>
    </div>
  );
};
