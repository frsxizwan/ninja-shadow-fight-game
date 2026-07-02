import React from "react";
import { UpgradeOption, PlayerStats } from "../types/game";
import { Coins, Heart, Zap, Sword, TrendingUp, Sparkles } from "lucide-react";

interface UpgradeStoreProps {
  coins: number;
  spendCoins: (amount: number) => void;
  upgrades: UpgradeOption[];
  onUpgradePurchased: (updatedUpgrades: UpgradeOption[]) => void;
}

export const UpgradeStore: React.FC<UpgradeStoreProps> = ({
  coins,
  spendCoins,
  upgrades,
  onUpgradePurchased,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Heart":
        return <Heart className="w-5 h-5 text-emerald-400" />;
      case "Zap":
        return <Zap className="w-5 h-5 text-cyan-400" />;
      case "Sword":
        return <Sword className="w-5 h-5 text-rose-400" />;
      case "TrendingUp":
        return <TrendingUp className="w-5 h-5 text-amber-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-slate-400" />;
    }
  };

  const handlePurchase = (option: UpgradeOption) => {
    if (coins >= option.cost && option.level < option.maxLevel) {
      spendCoins(option.cost);

      const updated = upgrades.map((item) => {
        if (item.id === option.id) {
          const nextLevel = item.level + 1;
          const nextCost = Math.round(item.cost * 1.6); // Scale cost exponentially
          return {
            ...item,
            level: nextLevel,
            cost: nextLevel === item.maxLevel ? 0 : nextCost,
          };
        }
        return item;
      });

      onUpgradePurchased(updated);
    }
  };

  return (
    <div className="space-y-6" id="upgrade-store-root">
      {/* Header Stat Board */}
      <div className="flex items-center justify-between p-6 bg-slate-950 border border-slate-800 rounded-xl">
        <div>
          <h3 className="font-sans font-extrabold text-base md:text-lg text-slate-100 flex items-center gap-2">
            Progression & Stat Sandbox Upgrader
          </h3>
          <p className="font-mono text-[11px] text-slate-400">
            PURCHASES SYNC INSTANTLY WITH COMBAT SANDBOX SIMULATOR
          </p>
        </div>

        <div className="flex items-center gap-3 bg-amber-950/20 px-4 py-2 border border-amber-900/50 rounded-lg shadow-inner">
          <Coins className="w-5 h-5 text-amber-400 animate-spin" />
          <div className="flex flex-col">
            <span className="font-mono text-xs text-amber-400 font-bold">COINS BALANCE</span>
            <span className="font-mono text-lg font-black text-amber-200">{coins}</span>
          </div>
        </div>
      </div>

      {/* Grid of upgrade items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {upgrades.map((option) => {
          const isMaxed = option.level >= option.maxLevel;
          const canAfford = coins >= option.cost;
          const addedValue = option.level * option.upgradeValue;
          const currentTotalValue = option.baseValue + addedValue;

          return (
            <div
              key={option.id}
              className={`flex flex-col bg-slate-900 border rounded-xl p-5 justify-between transition-all ${
                isMaxed 
                  ? "border-slate-800/50 opacity-90" 
                  : "border-slate-800 hover:border-slate-700 hover:shadow-lg"
              }`}
              id={`upgrade-card-${option.id}`}
            >
              <div className="space-y-3">
                {/* Icon & Title */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      {getIcon(option.icon)}
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-slate-100 text-sm md:text-base">
                        {option.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                    isMaxed 
                      ? "bg-slate-950 border-slate-800 text-slate-500" 
                      : "bg-cyan-950/30 border-cyan-800 text-cyan-300"
                  }`}>
                    {isMaxed ? "MAX LEVEL" : `LVL ${option.level} / ${option.maxLevel}`}
                  </span>
                </div>

                {/* Stat value visualization */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-950 flex justify-between items-center font-mono text-xs">
                  <span className="text-slate-400 uppercase text-[10px]">Active Stats:</span>
                  <div className="space-x-1.5 flex items-center">
                    <span className="text-slate-500">{option.baseValue}</span>
                    {addedValue > 0 && (
                      <span className="text-emerald-400 font-bold">+{addedValue}</span>
                    )}
                    <span className="text-slate-400">➔</span>
                    <span className="text-slate-100 font-bold">{currentTotalValue}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Trigger Button */}
              <button
                onClick={() => handlePurchase(option)}
                disabled={isMaxed || !canAfford}
                className={`w-full mt-4 py-2.5 px-4 rounded-lg font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 ${
                  isMaxed
                    ? "bg-slate-950 border border-slate-900 text-slate-600 cursor-not-allowed"
                    : !canAfford
                      ? "bg-slate-950 border border-slate-900 text-slate-500 hover:border-slate-800"
                      : "bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-900/10 hover:shadow-amber-900/20 active:scale-[0.98]"
                }`}
                id={`buy-upgrade-btn-${option.id}`}
              >
                {isMaxed ? (
                  "Upgrade Maxed Out"
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5" />
                    <span>Level Up — {option.cost} Coins</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
