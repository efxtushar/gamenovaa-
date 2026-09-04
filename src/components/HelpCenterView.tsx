import React from 'react';
import { Keyboard, Monitor, ShieldCheck } from 'lucide-react';

export const HelpCenterView: React.FC = () => {
  const faqs = [
    {
      q: 'How do I enable Fullscreen gaming?',
      a: 'Click "Play Now" on any game card. The launcher automatically engages fullscreen mode with smooth 60 FPS performance and responsive controls.'
    },
    {
      q: 'What keyboard controls are supported?',
      a: 'All games support standard WASD and Arrow Keys for navigation/movement, Spacebar for jumping/actions, and J/K/E for special interactions.'
    },
    {
      q: 'Are high scores and favorites saved?',
      a: 'Yes! Your high scores, recently played games, and bookmarked favorites are saved automatically in your browser and synced with your account.'
    },
    {
      q: 'Can I play on mobile touchscreens?',
      a: 'Yes. All 30 titles are built with HTML5 Canvas and feature responsive on-screen touch controls.'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-[#6D28D9] text-xs font-bold uppercase">
              Support & Docs
            </span>
            <span className="text-xs text-slate-500 font-medium">FAQ</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111827] tracking-tight">
            Help Center & FAQ
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Learn about browser controls, performance optimization, and account features.
          </p>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#6D28D9]">
            <Keyboard className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-[#111827]">Responsive Controls</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Zero-latency WASD and Arrow key buffering with automatic spacebar scrolling prevention.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#6D28D9]">
            <Monitor className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-[#111827]">60 FPS Rendering</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Hardware-accelerated HTML5 canvas engines running smoothly without plugins or downloads.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#6D28D9]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-[#111827]">Cloud Saves & Stats</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Instant local and cloud state synchronization for bookmarks, achievements, and high scores.
          </p>
        </div>
      </div>

      {/* FAQs */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <h2 className="font-bold text-lg text-[#111827]">Frequently Asked Questions</h2>
        <div className="divide-y divide-slate-100 space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className={i > 0 ? 'pt-4' : ''}>
              <h4 className="font-semibold text-sm text-[#111827] mb-1.5">{faq.q}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

