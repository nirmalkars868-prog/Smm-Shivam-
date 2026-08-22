import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  User as UserIcon,
  Phone,
  Mail,
  ShieldCheck,
  Tag,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { Ticket } from '../../types';
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

export const ManageTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTickets();

    if (rtdb) {
      const ticketsRef = ref(rtdb, 'smm_store/tickets');
      const unsubscribe = onValue(
        ticketsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const list = ensureArray<Ticket>(snapshot.val());
            setTickets(list);
            // If currently viewing a ticket, keep it synchronized in real-time
            if (selectedTicket) {
              const updated = list.find((t) => t.id === selectedTicket.id);
              if (updated) setSelectedTicket(updated);
            }
          }
        },
        (err) => {
          console.warn('ManageTickets RTDB listener warning:', err);
        }
      );
      return () => unsubscribe();
    }
  }, [selectedTicket?.id]);

  const fetchTickets = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/tickets');
      const data = await res.json();
      if (data.tickets) {
        setTickets(ensureArray<Ticket>(data.tickets));
      }
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'admin',
          text: replyText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReplyText('');
        if (data.ticket) {
          setSelectedTicket(data.ticket);
          setTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
        }
        showToast('success', 'Reply sent to user successfully!');
      } else {
        showToast('error', data.error || 'Failed to send reply');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Server connection error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.ticket) {
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(data.ticket);
          }
          setTickets((prev) => prev.map((t) => (t.id === ticketId ? data.ticket : t)));
        }
        showToast('success', `Ticket status updated to ${newStatus}`);
      } else {
        showToast('error', data.error || 'Failed to update status');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Server error');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this support ticket?')) return;

    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(null);
        }
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        showToast('success', 'Ticket deleted successfully');
      } else {
        showToast('error', data.error || 'Failed to delete ticket');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Server error');
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus =
      statusFilter === 'all' || ticket.status.toLowerCase() === statusFilter.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch =
      ticket.id.toLowerCase().includes(q) ||
      ticket.username.toLowerCase().includes(q) ||
      (ticket.userEmail && ticket.userEmail.toLowerCase().includes(q)) ||
      (ticket.whatsappNo && ticket.whatsappNo.includes(q)) ||
      ticket.subject.toLowerCase().includes(q) ||
      (ticket.orderId && ticket.orderId.toLowerCase().includes(q)) ||
      ticket.messages.some((m) => m.text.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const totalTickets = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const answeredCount = tickets.filter((t) => t.status === 'Answered').length;
  const closedCount = tickets.filter((t) => t.status === 'Closed').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3 h-3" />
            Open
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
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" />
            Answered
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
            User Support & Ticket Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Read and respond to user queries, order support requests, and payment inquiries with direct WhatsApp links.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={isRefreshing}
          className="self-start sm:self-auto bg-zinc-900 hover:bg-zinc-800 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400 shadow-lg shadow-yellow-500/10'
              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-zinc-400 mb-1">Total Tickets</div>
          <div className="text-2xl font-black font-mono">{totalTickets}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Open')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Open'
              ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
              : 'bg-zinc-950 border-rose-500/20 hover:border-rose-500/40 text-rose-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>Open (Need Reply)</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono">{openCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('In Progress')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'In Progress'
              ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-zinc-950 border-amber-500/20 hover:border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>In Progress</span>
            <Clock className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div className="text-2xl font-black font-mono">{inProgressCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Answered')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Answered'
              ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10'
              : 'bg-zinc-950 border-blue-500/20 hover:border-blue-500/40 text-blue-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>Answered</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono">{answeredCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Closed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Closed'
              ? 'bg-zinc-800 border-zinc-500 text-white shadow-lg'
              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
          }`}
        >
          <div className="text-[11px] font-bold uppercase text-zinc-400 mb-1 flex items-center justify-between">
            <span>Closed</span>
            <Check className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-black font-mono">{closedCount}</div>
        </div>
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
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="text-xs font-bold">{toastMsg.text}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-zinc-950 border border-yellow-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 shadow-lg">
        <div className="relative w-full flex-1">
          <Search className="w-4 h-4 text-yellow-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="ticket-search-input"
            type="text"
            placeholder="Search by User (Username, Email, WhatsApp), Ticket ID, Subject, Order ID, or Message content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-yellow-400 placeholder-zinc-600 focus:outline-none focus:border-yellow-400"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-zinc-400 hover:text-yellow-400 px-2 cursor-pointer"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Main Layout: List & Active Ticket Thread Modal/Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List Table (Columns 1 to 7 or full if none selected) */}
        <div className={`${selectedTicket ? 'lg:col-span-6' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-zinc-950 border border-yellow-500/20 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-black border-b border-zinc-800 flex items-center justify-between">
              <div className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-yellow-400" />
                <span>Ticket List ({filteredTickets.length})</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">Realtime Live Updates</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-900/60 border-b border-zinc-800 font-black text-yellow-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Ticket ID & Subject</th>
                    <th className="py-3 px-3">User & Contact</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Last Activity</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 font-bold">
                        <Sparkles className="w-8 h-8 text-yellow-500/30 mx-auto mb-2" />
                        {searchQuery ? `No tickets found matching "${searchQuery}"` : 'No support tickets found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t, idx) => {
                      const isSelected = selectedTicket?.id === t.id;
                      const cleanWa = (t.whatsappNo || '').replace(/\D/g, '');
                      const lastMessage = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;

                      return (
                        <tr
                          key={t.id ? `${t.id}-${idx}` : `t-${idx}`}
                          onClick={() => setSelectedTicket(t)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-yellow-500/10 border-l-4 border-yellow-400' : 'hover:bg-zinc-900/60'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-yellow-400 font-black text-[11px]">{t.id}</span>
                              {t.orderId && (
                                <span className="bg-zinc-800 text-zinc-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-zinc-700">
                                  {t.orderId}
                                </span>
                              )}
                            </div>
                            <div className="text-white font-bold text-xs truncate max-w-[200px] mt-0.5">{t.subject}</div>
                            {lastMessage && (
                              <div className="text-[10px] text-zinc-400 truncate max-w-[200px] mt-0.5">
                                <span className="font-semibold text-zinc-500">{lastMessage.sender === 'admin' ? 'Admin: ' : 'User: '}</span>
                                {lastMessage.text}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="text-white font-black flex items-center gap-1 text-[11px]">
                              <UserIcon className="w-3 h-3 text-yellow-400" />
                              <span>{t.username}</span>
                            </div>
                            {t.userEmail && <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">{t.userEmail}</div>}
                            {t.whatsappNo && (
                              <div className="mt-1">
                                <a
                                  href={`https://wa.me/${cleanWa}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors"
                                  title="Chat with user on WhatsApp"
                                >
                                  <Phone className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>+{t.whatsappNo}</span>
                                </a>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3">{getStatusBadge(t.status)}</td>

                          <td className="py-3 px-3 text-[10px] text-zinc-400 font-mono">
                            {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}{' '}
                            <span className="text-zinc-500">
                              {new Date(t.updatedAt || t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedTicket(t)}
                                className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-colors"
                              >
                                Open Chat
                              </button>
                              <button
                                onClick={() => handleDeleteTicket(t.id)}
                                className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete Ticket"
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
        </div>

        {/* Ticket Chat / Detail Panel */}
        {selectedTicket && (
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-zinc-950 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
              {/* Detail Header */}
              <div className="p-4 bg-black border-b border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-yellow-400 font-black text-sm">{selectedTicket.id}</span>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-white font-black text-base">{selectedTicket.subject}</div>

                {/* User Info Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">User</div>
                    <div className="font-black text-white">{selectedTicket.username}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Email</div>
                    <div className="text-zinc-300 truncate text-[11px]">{selectedTicket.userEmail || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">WhatsApp</div>
                    {selectedTicket.whatsappNo ? (
                      <a
                        href={`https://wa.me/${(selectedTicket.whatsappNo || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 font-bold font-mono hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>+{selectedTicket.whatsappNo}</span>
                      </a>
                    ) : (
                      <span className="text-zinc-500">N/A</span>
                    )}
                  </div>
                  {selectedTicket.orderId && (
                    <div className="col-span-2 sm:col-span-3 pt-1 border-t border-zinc-800 flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Order ID:</span>
                      <span className="font-mono text-yellow-400 font-bold text-xs">{selectedTicket.orderId}</span>
                    </div>
                  )}
                </div>

                {/* Status Quick Changer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-zinc-400">Change Status:</span>
                  <div className="flex items-center gap-1.5">
                    {(['Open', 'In Progress', 'Answered', 'Closed'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(selectedTicket.id, st)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                          selectedTicket.status === st
                            ? 'bg-yellow-500 text-black font-black shadow-md'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Messages Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/50">
                {selectedTicket.messages.map((msg, idx) => {
                  const isAdmin = msg.sender === 'admin';

                  return (
                    <div key={idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className={`text-[10px] font-black uppercase ${isAdmin ? 'text-yellow-400' : 'text-zinc-400'}`}>
                          {isAdmin ? 'Admin (Support)' : selectedTicket.username}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-lg ${
                          isAdmin
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-tr-none'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-3 bg-black border-t border-zinc-800">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Type your response to the user..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400 resize-none font-medium"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReply || !replyText.trim()}
                    className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black px-4 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 shrink-0 cursor-pointer shadow-lg shadow-yellow-500/20"
                  >
                    <Send className={`w-4 h-4 ${isSubmittingReply ? 'animate-pulse' : ''}`} />
                    <span className="text-[9px] uppercase">Reply</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
