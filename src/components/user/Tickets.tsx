import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Ticket, User, AdminSettings } from '../../types';
import { rtdb, ref, onValue } from '../../lib/firebaseClient';

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

interface TicketsProps {
  currentUser?: User | null;
  settings?: AdminSettings;
}

export const Tickets: React.FC<TicketsProps> = ({ currentUser, settings }) => {
  const [subject, setSubject] = useState('Order Issue');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userId = currentUser?.id || localStorage.getItem('smm_panel_userId') || 'usr-demo';

  useEffect(() => {
    fetchMyTickets();

    if (rtdb) {
      const ticketsRef = ref(rtdb, 'smm_store/tickets');
      const unsubscribe = onValue(
        ticketsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const allTickets = ensureArray<Ticket>(snapshot.val());
            const myTickets = allTickets.filter(
              (t) =>
                t.userId === userId ||
                (currentUser?.email && t.userEmail && t.userEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                (currentUser?.username && t.username && t.username.toLowerCase() === currentUser.username.toLowerCase())
            );
            setUserTickets(myTickets);

            if (selectedTicket) {
              const updated = myTickets.find((t) => t.id === selectedTicket.id);
              if (updated) setSelectedTicket(updated);
            }
          }
        },
        () => {}
      );
      return () => unsubscribe();
    }
  }, [userId, currentUser?.email, selectedTicket?.id]);

  const fetchMyTickets = async () => {
    try {
      const res = await fetch(`/api/tickets?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.tickets) {
        setUserTickets(ensureArray<Ticket>(data.tickets));
      }
    } catch (e) {
      console.warn('Error fetching user tickets:', e);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          username: currentUser?.username || 'Customer',
          userEmail: currentUser?.email || '',
          whatsappNo: currentUser?.whatsappNo || '',
          subject,
          orderId: orderId.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Ticket submitted successfully! Support agent will respond shortly.');
        setMessage('');
        setOrderId('');
        if (data.ticket) {
          setUserTickets((prev) => [data.ticket, ...prev]);
          setSelectedTicket(data.ticket);
        }
        fetchMyTickets();
      } else {
        showToast('error', data.error || 'Failed to submit ticket');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Server connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendUserReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsReplying(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          text: replyMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReplyMessage('');
        if (data.ticket) {
          setSelectedTicket(data.ticket);
          setUserTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
        }
        showToast('success', 'Reply sent successfully!');
      } else {
        showToast('error', data.error || 'Failed to send reply');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Server connection error');
    } finally {
      setIsReplying(false);
    }
  };

  const cleanAdminWa = (settings?.whatsappNumber || '9516862495').replace(/\D/g, '');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" />
            Open (Pending)
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" />
            In Progress
          </span>
        );
      case 'Answered':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" />
            Answered (New Reply)
          </span>
        );
      case 'Closed':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 w-fit">
            <Check className="w-3 h-3" />
            Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-yellow-500/20 pb-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-yellow-400" />
            24/7 Support Tickets
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Need help with an order, payment, or API integration? Create a ticket and our support team will respond quickly.
          </p>
        </div>

        {/* WhatsApp Fast Support Link */}
        <a
          href={`https://wa.me/91${cleanAdminWa}?text=${encodeURIComponent(
            `Hello SMM SHIVAM Support! My username is ${currentUser?.username || 'Customer'}. I need help with support.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start sm:self-auto bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <Phone className="w-4 h-4 text-black fill-black" />
          <span>Chat on WhatsApp (+91 {cleanAdminWa})</span>
        </a>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xl animate-in fade-in duration-200 ${
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket Creation Form (Left column) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-yellow-400 border-b border-zinc-800 pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
              Create New Support Ticket
            </h3>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-400 cursor-pointer"
                >
                  <option value="Order Issue">Order Issue (Speed / Refill / Cancel)</option>
                  <option value="Payment Issue">Payment Deposit & UTR Verification</option>
                  <option value="Service Inquiry">Service Quality / Inquiry</option>
                  <option value="API Integration">API Integration Support</option>
                  <option value="Other">Other Query</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">
                  Order ID <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORD-10294"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1.5">Your Issue / Message</label>
                <textarea
                  rows={4}
                  placeholder="Describe your issue in detail (order link, problem description, etc.)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400 resize-none leading-relaxed font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black py-3 px-6 rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 text-xs uppercase cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
              </button>
            </form>
          </div>

          {/* Quick Guidelines Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-2.5">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Ticket Resolution Rules
            </h4>
            <ul className="text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
              <li>• Always include your <strong>Order ID</strong> for faster refill/speed handling.</li>
              <li>• Refill tasks take 1 to 6 hours depending on provider server queues.</li>
              <li>• Do not create duplicate tickets for the same order.</li>
            </ul>
          </div>
        </div>

        {/* User Tickets List & Conversation Viewer (Right column) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active Ticket Chat Box */}
          {selectedTicket ? (
            <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[560px]">
              <div className="p-4 bg-black border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-yellow-400 font-black text-xs">{selectedTicket.id}</span>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <div className="text-white font-black text-sm mt-0.5">{selectedTicket.subject}</div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs text-zinc-400 hover:text-yellow-400 underline font-bold cursor-pointer"
                >
                  Close Chat
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/60">
                {selectedTicket.messages.map((msg, idx) => {
                  const isAdmin = msg.sender === 'admin';

                  return (
                    <div key={idx} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className={`text-[10px] font-black uppercase ${isAdmin ? 'text-yellow-400' : 'text-zinc-400'}`}>
                          {isAdmin ? 'SMM SHIVAM Support (Admin)' : 'You'}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-lg ${
                          isAdmin
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-tl-none'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-100 font-medium rounded-tr-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* User Reply Form */}
              <form onSubmit={handleSendUserReply} className="p-3 bg-black border-t border-zinc-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isReplying || !replyMessage.trim()}
                    className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black px-4 rounded-xl text-xs uppercase cursor-pointer shrink-0 flex items-center gap-1 shadow-lg shadow-yellow-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-black text-yellow-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  Your Support Tickets History ({userTickets.length})
                </h3>
                <button
                  onClick={fetchMyTickets}
                  className="text-xs text-yellow-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {userTickets.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2">
                  <MessageSquare className="w-10 h-10 text-yellow-500/20 mx-auto" />
                  <p className="text-xs font-bold">You haven't opened any support tickets yet.</p>
                  <p className="text-[11px] text-zinc-600">Submit the form on the left if you need any assistance.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTickets.map((t, idx) => {
                    const lastMsg = t.messages[t.messages.length - 1];

                    return (
                      <div
                        key={t.id ? `${t.id}-${idx}` : `ticket-${idx}`}
                        onClick={() => setSelectedTicket(t)}
                        className="bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-yellow-500/40 p-4 rounded-2xl transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-yellow-400 font-bold text-xs">{t.id}</span>
                            {t.orderId && (
                              <span className="bg-zinc-800 text-zinc-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-700">
                                {t.orderId}
                              </span>
                            )}
                          </div>
                          {getStatusBadge(t.status)}
                        </div>

                        <div className="text-xs font-bold text-white">{t.subject}</div>

                        {lastMsg && (
                          <div className="text-[11px] text-zinc-400 truncate">
                            <span className="font-semibold text-zinc-500">
                              {lastMsg.sender === 'admin' ? 'Admin: ' : 'You: '}
                            </span>
                            {lastMsg.text}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-900 font-mono">
                          <span>Updated: {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}</span>
                          <span className="text-yellow-400 font-bold flex items-center gap-0.5">
                            View Conversation <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
