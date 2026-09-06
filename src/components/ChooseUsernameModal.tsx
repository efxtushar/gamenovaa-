import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ArrowRight, Dices, Sparkles, Check, AlertCircle } from 'lucide-react';
import { sound } from '../utils/soundEffects';
import { CUSTOMIZATION_ITEMS } from '../data/customizationItems';

interface ChooseUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (username: string) => void;
}

const STARTER_AVATARS = CUSTOMIZATION_ITEMS
  .filter(item => item.category === 'avatar')
  .slice(0, 6);

const RANDOM_NAMES = [
  'NovaPilot', 'NeonPhantom', 'CyberGlitch', 'PixelHunter', 
  'VortexStriker', 'HyperPulse', 'ShadowRacer', 'ApexLegend', 
  'TurboStrike', 'StarVanguard', 'MatrixRider', 'QuantumDash'
];

export const ChooseUsernameModal: React.FC<ChooseUsernameModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { createLocalProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    STARTER_AVATARS[0]?.id || 'avatar_nova_pilot'
  );
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(
    STARTER_AVATARS[0]?.previewValue || 'https://api.dicebear.com/7.x/bottts/svg?seed=nova_pilot'
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (!username) {
        const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        setUsername(randomName);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRandomize = () => {
    sound.playClick();
    const filtered = RANDOM_NAMES.filter(n => n !== username);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setUsername(pick);
    setError(null);
  };

  const handleSelectAvatar = (id: string, url: string) => {
    sound.playClick();
    setSelectedAvatarId(id);
    setSelectedAvatarUrl(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please choose a username.');
      return;
    }

    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (trimmed.length > 20) {
      setError('Username cannot exceed 20 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    // Immediately create the local profile without database or fake loading screens
    sound.playPowerUp();
    createLocalProfile(trimmed, selectedAvatarUrl, selectedAvatarId);

    if (onSuccess) {
      onSuccess(trimmed);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-7 overflow-y-auto max-h-[92dvh]">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-100 border border-purple-200 text-[#6D28D9] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg sm:text-xl text-[#111827] tracking-tight">
              Choose Username
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Set your local gamer handle to personalize your profile
            </p>
          </div>
        </div>

        {/* Live Avatar Preview & Avatar Choices */}
        <div className="mb-5 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Choose Avatar
            </span>
            <span className="text-[11px] font-mono text-purple-400">
              {STARTER_AVATARS.find(a => a.id === selectedAvatarId)?.name || 'Custom'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {STARTER_AVATARS.map((avatar) => {
              const isSelected = selectedAvatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleSelectAvatar(avatar.id, avatar.previewValue)}
                  className={`relative shrink-0 rounded-xl p-0.5 border-2 transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-purple-400 ring-2 ring-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-105'
                      : 'border-slate-800 hover:border-purple-400/60 opacity-80 hover:opacity-100'
                  }`}
                  title={avatar.name}
                >
                  <img
                    src={avatar.previewValue}
                    alt={avatar.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-lg bg-slate-800 object-cover"
                  />
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Gamer Handle <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="text-[11px] font-bold text-[#6D28D9] hover:text-[#5B21B6] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Generate Random Username"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Random</span>
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  {username.length} / 20
                </span>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                @
              </span>
              <input
                type="text"
                autoFocus
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                placeholder="e.g. ApexPilot"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#6D28D9] focus:ring-2 focus:ring-purple-100 text-xs text-[#111827] font-mono font-bold outline-none transition-all shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              3 to 20 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          {/* Validation Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
