import React, { useState } from 'react';
import { Trophy, Medal, Search } from 'lucide-react';
import { TOP_PLAYERS } from '../data/platformData';
import { GameItem } from '../data/games';

interface LeaderboardViewProps {
  games: GameItem[];
  onSelectGame: (game: GameItem) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = () => {
  const [searchFilter, setSearchFilter] = useState('');

  const filteredPlayers = TOP_PLAYERS.filter(p => {
    if (searchFilter && !p.username.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Banner */}
      <div className="relative rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-[#6D28D9] text-xs font-bold uppercase">
              Live Standings
            </span>
            <span className="text-xs text-slate-500 font-medium">Hall of Fame</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111827] tracking-tight">
            Global Leaderboards
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Compete across all 30 titles to climb the ranks, earn high scores, and claim your spot among top gamers.
          </p>
        </div>
      </div>

      {/* Podium Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rank 2 */}
        {TOP_PLAYERS[1] && (
          <div className="order-2 md:order-1 rounded-3xl bg-white border border-slate-200/80 p-6 flex flex-col items-center text-center relative overflow-hidden shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center mb-3 text-base">
              #2
            </div>
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-300 mb-3 shadow-xs">
              <img src={TOP_PLAYERS[1].avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-bold text-base text-[#111827]">{TOP_PLAYERS[1].username}</h3>
            <span className="text-xs text-[#6D28D9] font-medium mt-0.5">{TOP_PLAYERS[1].game}</span>
            <div className="mt-3 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm font-bold text-slate-800">
              {TOP_PLAYERS[1].score.toLocaleString()} PTS
            </div>
          </div>
        )}

        {/* Rank 1 (Gold Winner) */}
        {TOP_PLAYERS[0] && (
          <div className="order-1 md:order-2 rounded-3xl bg-white border-2 border-amber-400 p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-3 right-3 text-amber-600 text-xs font-bold flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>CHAMPION</span>
            </div>
            <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-400 text-amber-700 font-bold flex items-center justify-center mb-3 text-lg shadow-xs">
              👑 #1
            </div>
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-amber-400 mb-3 shadow-sm">
              <img src={TOP_PLAYERS[0].avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-display font-black text-lg text-[#111827]">{TOP_PLAYERS[0].username}</h3>
            <span className="text-xs text-[#6D28D9] font-medium mt-0.5">{TOP_PLAYERS[0].game}</span>
            <div className="mt-3 px-4 py-1.5 rounded-xl bg-amber-50 border border-amber-200 font-mono text-base font-bold text-amber-700 shadow-xs">
              {TOP_PLAYERS[0].score.toLocaleString()} PTS
            </div>
          </div>
        )}

        {/* Rank 3 */}
        {TOP_PLAYERS[2] && (
          <div className="order-3 md:order-3 rounded-3xl bg-white border border-slate-200/80 p-6 flex flex-col items-center text-center relative overflow-hidden shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-300 text-amber-800 font-bold flex items-center justify-center mb-3 text-base">
              #3
            </div>
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-amber-300 mb-3 shadow-xs">
              <img src={TOP_PLAYERS[2].avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-bold text-base text-[#111827]">{TOP_PLAYERS[2].username}</h3>
            <span className="text-xs text-[#6D28D9] font-medium mt-0.5">{TOP_PLAYERS[2].game}</span>
            <div className="mt-3 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm font-bold text-slate-800">
              {TOP_PLAYERS[2].score.toLocaleString()} PTS
            </div>
          </div>
        )}
      </div>

      {/* Filter and Table */}
      <div className="rounded-3xl bg-white border border-slate-200/80 overflow-hidden p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-bold text-lg text-[#111827] flex items-center gap-2">
            <Medal className="w-5 h-5 text-[#6D28D9]" />
            <span>Leaderboard Standings</span>
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search players..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#111827] placeholder-slate-400 outline-none focus:border-[#6D28D9]"
              />
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Game</th>
                <th className="py-3 px-4">Badge</th>
                <th className="py-3 px-4 text-right">High Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.map((player) => (
                <tr key={player.rank} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded-md ${
                      player.rank === 1 ? 'bg-amber-100 text-amber-800' :
                      player.rank === 2 ? 'bg-slate-200 text-slate-700' :
                      player.rank === 3 ? 'bg-amber-50 text-amber-700' :
                      'text-slate-500'
                    }`}>
                      #{player.rank}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-[#111827] text-xs">{player.username}</div>
                        <div className="text-[10px] text-slate-500">Level {player.level}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#6D28D9]">{player.game}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{player.badge}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 text-sm">
                    {player.score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

