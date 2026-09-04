import React from 'react';
import { Calendar, Trophy } from 'lucide-react';
import { ANNOUNCEMENTS } from '../data/platformData';

export const NewsUpdatesView: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-[#6D28D9] text-xs font-bold uppercase">
              Updates & Events
            </span>
            <span className="text-xs text-slate-500 font-medium">Changelog</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111827] tracking-tight">
            News & Release Notes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Stay informed on seasonal events, new game releases, and performance optimizations.
          </p>
        </div>
      </div>

      {/* Featured Tournament Card */}
      <div className="relative rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 sm:p-8 overflow-hidden shadow-md">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-md bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-bold uppercase flex items-center gap-1.5 w-fit mb-3">
            <Trophy className="w-3.5 h-3.5" />
            <span>Featured Event</span>
          </span>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Season 3 Cyber Cup Tournament
          </h2>
          <p className="text-sm text-purple-100 mt-2 leading-relaxed">
            The championship bracket is now live! Compete in Neon Drift, Cyber Samurai, and Zombie Escape. Top 10 high-scorers share a 50,000 XP prize pool plus exclusive badges.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-purple-200">
            <span>📅 Aug 21 - Sep 15, 2026</span>
            <span>•</span>
            <span className="font-semibold text-amber-300">5,420 Active Competitors</span>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {ANNOUNCEMENTS.map((ann) => (
          <div
            key={ann.id}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-purple-200 shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-[#6D28D9] border border-purple-100 uppercase">
                  {ann.category}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{ann.date}</span>
                </span>
                <span className="text-xs text-slate-400">• {ann.readTime}</span>
              </div>
              <h3 className="font-bold text-base text-[#111827]">{ann.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{ann.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

