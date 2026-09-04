import React from 'react';
import { CategoryItem } from '../data/categories';
import { Swords, Flame, Crosshair, Trophy, Sparkles, Gamepad2, Compass, Shield, Smile, ArrowRight } from 'lucide-react';
import { sound } from '../utils/soundEffects';

interface CategoryCardProps {
  category: CategoryItem;
  isSelected?: boolean;
  onSelect?: (categorySlug: string) => void;
  onSelectCategory?: (categoryName: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  isSelected = false, 
  onSelect, 
  onSelectCategory 
}) => {
  const getIcon = () => {
    const props = { className: "w-5 h-5" };
    switch (category.name) {
      case 'Action': return <Swords {...props} className="w-5 h-5 text-rose-500" />;
      case 'Racing': return <Flame {...props} className="w-5 h-5 text-amber-500" />;
      case 'Arcade': return <Gamepad2 {...props} className="w-5 h-5 text-purple-600" />;
      case 'Puzzle': return <Sparkles {...props} className="w-5 h-5 text-pink-500" />;
      case 'Sports': return <Trophy {...props} className="w-5 h-5 text-emerald-500" />;
      case 'Adventure': return <Compass {...props} className="w-5 h-5 text-blue-500" />;
      case 'Shooter': return <Crosshair {...props} className="w-5 h-5 text-indigo-500" />;
      case 'Strategy': return <Shield {...props} className="w-5 h-5 text-teal-500" />;
      default: return <Smile {...props} className="w-5 h-5 text-purple-500" />;
    }
  };

  const handleClick = () => {
    sound.playClick();
    if (onSelect) onSelect(category.name);
    if (onSelectCategory) onSelectCategory(category.name);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-2xl bg-white border p-4 sm:p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 ${
        isSelected
          ? 'border-[#6D28D9] ring-2 ring-[#6D28D9]/20 shadow-sm'
          : 'border-slate-200/80 hover:border-purple-300'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
            {getIcon()}
          </div>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-[#6B7280] group-hover:text-[#6D28D9] transition-colors">
            {category.gameCount || 3} Games
          </span>
        </div>

        <h3 className="font-display font-bold text-base text-[#111827] group-hover:text-[#6D28D9] transition-colors">
          {category.name}
        </h3>
        <p className="text-xs text-[#6B7280] mt-1 line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-[#6D28D9] transition-colors">
        <span>Browse Games</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform text-[#6D28D9]" />
      </div>
    </div>
  );
};

