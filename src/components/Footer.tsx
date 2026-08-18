import React from 'react';
import { Zap, ShieldCheck, Code2, Lock, MessageSquare } from 'lucide-react';

export const Footer: React.FC<{ setCurrentTab: (tab: string) => void }> = ({ setCurrentTab }) => {
  return (
    <footer className="border-t border-yellow-500/20 bg-black text-zinc-400 text-xs py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-400 font-black text-lg">
              <Zap className="w-5 h-5 text-yellow-400 fill-current" />
              <span>SMM SHIVAM</span>
            </div>
            <p className="text-zinc-500 leading-relaxed text-[11px]">
              Premium Social Media Marketing (SMM) Panel. High speed automated service delivery, UPI QR code deposit system, and 24/7 WhatsApp customer support.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-yellow-400 block">Quick Navigation</span>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => setCurrentTab('new-order')} className="hover:text-yellow-400 transition-colors cursor-pointer">
                  Place New Order
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('services')} className="hover:text-yellow-400 transition-colors cursor-pointer">
                  Services & Rates
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('add-funds')} className="hover:text-yellow-400 transition-colors cursor-pointer">
                  Add Funds (QR UPI)
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-yellow-400 block">Support & WhatsApp</span>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a
                  href="https://wa.me/919516862495"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 text-emerald-400 font-bold transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-emerald-400" />
                  <span>WhatsApp: 9516862495</span>
                </a>
              </li>
              <li className="text-zinc-500">Instant UTR Verification</li>
              <li className="text-zinc-500">24/7 Live Customer Help</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-yellow-400 block">Security & API</span>
            <div className="bg-zinc-950 border border-yellow-500/20 p-3 rounded-xl space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                <Lock className="w-3.5 h-3.5 text-yellow-400" />
                <span>Secure Provider API Proxy</span>
              </div>
              <p className="text-zinc-500 text-[10px]">
                All SMM provider API keys are stored server-side and protected from browser exposure.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <div>© {new Date().getFullYear()} SMM SHIVAM PANEL. All rights reserved.</div>
          <div className="flex items-center gap-4 text-zinc-400 font-medium">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span className="text-yellow-400 font-bold">WhatsApp: 9516862495</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

