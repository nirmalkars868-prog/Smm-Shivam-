import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, Key } from 'lucide-react';

export const ApiDocs: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const userApiKey = 'usr_api_key_47c211e9a';

  const copyKey = () => {
    navigator.clipboard.writeText(userApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Code2 className="w-6 h-6 text-blue-500" />
          API Documentation (v2 Standard)
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Connect your SMM panel, telegram bot, or custom scripts using standard SMM v2 HTTP API endpoints.
        </p>
      </div>

      {/* User API Key Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            Your Personal API Key
          </h3>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
            Keep Secret
          </span>
        </div>
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
          <span className="font-mono text-sm text-slate-200 select-all flex-1 truncate">{userApiKey}</span>
          <button
            onClick={copyKey}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>
      </div>

      {/* API Endpoint Docs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            API URL & Request Format
          </h3>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-blue-400">
            POST /api/v2
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Send HTTP POST requests with parameters encoded as <code className="text-slate-200">application/x-www-form-urlencoded</code> or <code className="text-slate-200">application/json</code>.
          </p>
        </div>

        {/* Action: Services */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">1. Fetch Services List</span>
          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`curl -X POST "${window.location.origin}/api/v2" \\
  -d "key=${userApiKey}" \\
  -d "action=services"`}
          </pre>
        </div>

        {/* Action: Add Order */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">2. Add Order</span>
          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`curl -X POST "${window.location.origin}/api/v2" \\
  -d "key=${userApiKey}" \\
  -d "action=add" \\
  -d "service=srv-1" \\
  -d "link=https://instagram.com/p/xxx" \\
  -d "quantity=1000"`}
          </pre>
        </div>

        {/* Action: Order Status */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">3. Check Order Status</span>
          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`curl -X POST "${window.location.origin}/api/v2" \\
  -d "key=${userApiKey}" \\
  -d "action=status" \\
  -d "order=ORD-9021"`}
          </pre>
        </div>

        {/* Action: User Balance */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">4. User Balance</span>
          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`curl -X POST "${window.location.origin}/api/v2" \\
  -d "key=${userApiKey}" \\
  -d "action=balance"`}
          </pre>
        </div>
      </div>
    </div>
  );
};
