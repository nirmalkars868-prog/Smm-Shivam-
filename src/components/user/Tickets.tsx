import React, { useState } from 'react';
import { HelpCircle, Send, MessageSquare, CheckCircle2 } from 'lucide-react';

export const Tickets: React.FC = () => {
  const [subject, setSubject] = useState('Order Issue');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      setOrderId('');
    }, 4000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-500" />
          24/7 Support Tickets
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Have a question or order issue? Submit a ticket for rapid support assistance.
        </p>
      </div>

      {submitted && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          <span>Ticket submitted successfully! Support agent will respond shortly.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            Create Ticket
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Order Issue">Order Issue (Refill / Speed / Cancel)</option>
                <option value="Payment Issue">Payment Deposit Issue</option>
                <option value="API Integration">API Integration Support</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Order ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. ORD-9021"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Message</label>
              <textarea
                rows={5}
                placeholder="Describe your query or request details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Submit Ticket</span>
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3 h-fit">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Ticket Guidelines</h3>
          <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <li>• Include your Order ID if ticket is regarding a specific service.</li>
            <li>• Refills take 1-6 hours to trigger on average.</li>
            <li>• Please refrain from opening duplicate tickets for the same order.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
