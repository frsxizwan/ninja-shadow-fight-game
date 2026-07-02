import { useState, useEffect } from "react";
import { UNITY_SCRIPTS } from "./components/UnityScripts";
import { GameSimulator } from "./components/GameSimulator";
import { UpgradeStore } from "./components/UpgradeStore";
import { SetupGuide } from "./components/SetupGuide";
import { UpgradeOption, PlayerStats } from "./types/game";
import {
  Coins,
  Heart,
  Zap,
  Sword,
  TrendingUp,
  Sparkles,
  BookOpen,
  Code2,
  Copy,
  Check,
  Smartphone,
  Info,
  ExternalLink,
  Cpu,
} from "lucide-react";

const DEFAULT_UPGRADES: UpgradeOption[] = [
  {
    id: "MaxHealth",
    name: "Iron Skin (Max Health)",
    description: "Hardens the ninja's durability to withstand critical heavy impacts.",
    cost: 50,
    level: 0,
    maxLevel: 5,
    baseValue: 100,
    upgradeValue: 15,
    statKey: "maxHealth",
    icon: "Heart",
  },
  {
    id: "MovementSpeed",
    name: "Wind Step (Run Speed)",
    description: "Increases run velocities and enhances air acceleration mechanics.",
    cost: 40,
    level: 0,
    maxLevel: 5,
    baseValue: 6,
    upgradeValue: 0.8,
    statKey: "movementSpeed",
    icon: "Zap",
  },
  {
    id: "AttackDamage",
    name: "Shadow Edge (Blade Damage)",
    description: "Grinds the katana edge to deal heavy damage across all combat chains.",
    cost: 60,
    level: 0,
    maxLevel: 5,
    baseValue: 10,
    upgradeValue: 4,
    statKey: "lightAttackDamage",
    icon: "Sword",
  },
  {
    id: "ComboMultiplier",
    name: "Dragon Flow (Combo Multiplier)",
    description: "Multiplies overall damage outputs based on successful chain counts.",
    cost: 75,
    level: 0,
    maxLevel: 5,
    baseValue: 0,
    upgradeValue: 0.1,
    statKey: "comboMultiplier",
    icon: "TrendingUp",
  },
];

const calculatePlayerStats = (upgradeList: UpgradeOption[]): PlayerStats => {
  const stats: PlayerStats = {
    maxHealth: 100,
    currentHealth: 100,
    movementSpeed: 6,
    jumpForce: 13,
    lightAttackDamage: 10,
    heavyAttackDamage: 25,
    comboMultiplier: 0,
  };

  upgradeList.forEach((upg) => {
    const added = upg.level * upg.upgradeValue;
    if (upg.id === "MaxHealth") {
      stats.maxHealth = upg.baseValue + added;
      stats.currentHealth = stats.maxHealth;
    } else if (upg.id === "MovementSpeed") {
      stats.movementSpeed = upg.baseValue + added;
    } else if (upg.id === "AttackDamage") {
      stats.lightAttackDamage = upg.baseValue + added;
      stats.heavyAttackDamage = 25 + added;
    } else if (upg.id === "ComboMultiplier") {
      stats.comboMultiplier = upg.baseValue + added;
    }
  });

  return stats;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"play" | "code" | "upgrades" | "guide">("play");
  const [coins, setCoins] = useState<number>(150); // Give player some starting coins
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>(DEFAULT_UPGRADES);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(calculatePlayerStats(DEFAULT_UPGRADES));

  // Code Viewer state
  const [selectedScriptIndex, setSelectedScriptIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Recalculate stats whenever upgrades level up
  useEffect(() => {
    setPlayerStats(calculatePlayerStats(upgrades));
  }, [upgrades]);

  const addCoins = (amount: number) => {
    setCoins((prev) => prev + amount);
  };

  const spendCoins = (amount: number) => {
    setCoins((prev) => prev - amount);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root">
      {/* Top Navigation Bar Header */}
      <header className="bg-slate-950 border-b border-slate-900 sticky top-0 z-50 px-6 py-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/15 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-lg md:text-xl tracking-tight text-white uppercase">
                Shadow Blade
              </h1>
              <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-800">
                MOBILE SDK V2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              2D Side-Scrolling Mobile Fighting Game Architecture Hub
            </p>
          </div>
        </div>

        {/* Global Stats Overlay */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-xs">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">ENGINE:</span>
            <span className="text-emerald-400 font-bold">UNITY 2D / URP</span>
          </div>

          <div className="h-6 w-[1px] bg-slate-900" />

          <div className="flex items-center gap-2.5 bg-amber-950/20 px-3 py-1.5 border border-amber-900/40 rounded-lg">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold text-amber-200">{coins} COINS</span>
          </div>
        </div>
      </header>

      {/* Main Grid Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: Sidebar Active Stats */}
        <section className="lg:col-span-1 space-y-6">
          {/* Active Ninja Stats card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="font-sans font-bold text-sm text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              Active Ninja Tuning
            </h3>

            <div className="space-y-4 font-mono text-xs">
              {/* Max Health level */}
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" /> Durability (HP)
                </span>
                <span className="text-slate-100 font-bold">{playerStats.maxHealth} HP</span>
              </div>

              {/* Run Speed */}
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Run Speed (m/s)
                </span>
                <span className="text-slate-100 font-bold">{playerStats.movementSpeed.toFixed(1)}m/s</span>
              </div>

              {/* Slash Damage */}
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Sword className="w-3.5 h-3.5 text-rose-400" /> Base Katana DMG
                </span>
                <span className="text-slate-100 font-bold">{playerStats.lightAttackDamage} DMG</span>
              </div>

              {/* Combo multiplier */}
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Combo Multiplier
                </span>
                <span className="text-slate-100 font-bold">+{Math.round(playerStats.comboMultiplier * 100)}%</span>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-normal">
              Earn coins in the <strong>Dojo</strong> or <strong>Boss Fight</strong> levels to level up these stats. Upgraded tuning updates your combat sandbox instantly.
            </div>
          </div>

          {/* Core Code Architect Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-sans font-bold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-4 h-4 text-rose-400" /> Unity SDK Manifest
            </h3>
            
            <p className="text-[11px] text-slate-400 leading-normal">
              Each script is engineered as a standard component decoupling logic for high modularity:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Acceleration & Drag Physics</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>3-Hit Mecanim Combo Buffer</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Reaction-Time AI Patrol State</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Multi-Phase Boss AI Enrage</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Shield Blocking Mitigations</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Tabs Dashboard */}
        <section className="lg:col-span-3 flex flex-col space-y-6">
          {/* Navigation Control Tabs */}
          <div className="flex bg-slate-900/80 p-1 border border-slate-800 rounded-xl font-mono text-xs md:text-sm">
            <button
              onClick={() => setActiveTab("play")}
              className={`flex-1 py-3 text-center rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "play"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-btn-play"
            >
              <Smartphone className="w-4 h-4" />
              Play Dojo Simulator
            </button>

            <button
              onClick={() => setActiveTab("upgrades")}
              className={`flex-1 py-3 text-center rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "upgrades"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-btn-upgrades"
            >
              <Coins className="w-4 h-4" />
              Upgrade Sandbox
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 py-3 text-center rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "code"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-btn-code"
            >
              <Code2 className="w-4 h-4" />
              Unity C# Scripts
            </button>

            <button
              onClick={() => setActiveTab("guide")}
              className={`flex-1 py-3 text-center rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "guide"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab-btn-guide"
            >
              <BookOpen className="w-4 h-4" />
              Setup Blueprint
            </button>
          </div>

          {/* TAB WINDOW 1: Playable Sandbox */}
          {activeTab === "play" && (
            <GameSimulator playerStats={playerStats} addCoins={addCoins} />
          )}

          {/* TAB WINDOW 2: Stats Upgrades Shop */}
          {activeTab === "upgrades" && (
            <UpgradeStore
              coins={coins}
              spendCoins={spendCoins}
              upgrades={upgrades}
              onUpgradePurchased={setUpgrades}
            />
          )}

          {/* TAB WINDOW 3: Active C# Scripts Browser */}
          {activeTab === "code" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col" id="code-browser-root">
              {/* Selector Tabs for specific files */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex gap-2 overflow-x-auto scroller-thin">
                {UNITY_SCRIPTS.map((script, idx) => (
                  <button
                    key={script.name}
                    onClick={() => setSelectedScriptIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-[11px] whitespace-nowrap transition-all border ${
                      selectedScriptIndex === idx
                        ? "bg-rose-950/40 border-rose-800 text-rose-300"
                        : "bg-slate-900 border-slate-800/60 text-slate-400 hover:text-slate-200"
                    }`}
                    id={`script-tab-selector-${idx}`}
                  >
                    {script.name}
                  </button>
                ))}
              </div>

              {/* Code Panel Header info */}
              <div className="p-5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-mono text-base font-bold text-slate-100 flex items-center gap-2">
                    {UNITY_SCRIPTS[selectedScriptIndex].name}
                    <span className="text-[9px] font-sans font-bold bg-rose-950 text-rose-400 border border-rose-900/50 px-2 py-0.5 rounded uppercase">
                      {UNITY_SCRIPTS[selectedScriptIndex].category} component
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {UNITY_SCRIPTS[selectedScriptIndex].description}
                  </p>
                </div>

                <button
                  onClick={() => handleCopyCode(UNITY_SCRIPTS[selectedScriptIndex].code)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 hover:bg-slate-850 hover:text-slate-100 active:scale-95 transition-all self-start sm:self-center"
                  id="copy-csharp-code-btn"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied Script!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy C# Script</span>
                    </>
                  )}
                </button>
              </div>

              {/* Syntax Code Editor box */}
              <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto border-t border-slate-950 h-[480px] overflow-y-auto">
                <pre className="text-emerald-400 leading-relaxed">
                  <code>{UNITY_SCRIPTS[selectedScriptIndex].code}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB WINDOW 4: Step by Step Setup Blueprint */}
          {activeTab === "guide" && <SetupGuide />}
        </section>
      </main>

      {/* Footer Branding Credit */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-slate-500 font-mono text-[11px] flex flex-col md:flex-row items-center justify-between gap-4">
        <p>© 2026 SHADOW BLADE COMBAT HUB. REGISTERED TRADEMARKS OWNED BY INDIE GAME LABS.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://unity.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            Unity Engine Docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
