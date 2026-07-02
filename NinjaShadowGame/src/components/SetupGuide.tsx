import React from "react";
import { BookOpen, Settings, Play, ShieldAlert, ShoppingBag, Terminal } from "lucide-react";

export const SetupGuide: React.FC = () => {
  return (
    <div className="space-y-8 text-slate-300" id="unity-integration-guide">
      {/* Overview Block */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="font-sans font-bold text-lg text-slate-100">Unity Mobile 2D Setup Guide</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          This comprehensive guide outlines the exact production steps to import, link, and compile the 10 core C# scripts inside Unity. The architecture uses a decoupled 2D physics pattern ideal for high-performance side-scrollers on Android (GLES3/Vulkan) and iOS (Metal).
        </p>
      </div>

      {/* Accordion Guide Sections */}
      <div className="space-y-6">
        {/* Section 1: Project Setup */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h4 className="font-sans font-semibold text-slate-100 text-sm md:text-base">1. Initial Project Configuration</h4>
          </div>
          <ul className="space-y-3 text-xs md:text-sm leading-relaxed list-disc list-inside">
            <li>
              <strong>Create Project:</strong> Open Unity Hub and create a new project using the <code className="text-cyan-400 font-mono px-1 bg-slate-950 rounded">2D (URP)</code> template. This configures the Universal Render Pipeline for mobile performance.
            </li>
            <li>
              <strong>Resolution Aspect Ratio:</strong> Set your Game window aspect ratio to a simulation preset such as <code className="text-cyan-400 font-mono px-1 bg-slate-950 rounded">1920x1080 Landscape</code> or <code className="text-cyan-400 font-mono px-1 bg-slate-950 rounded">9:16 Portrait Fallback</code> to align virtual screen joysticks perfectly.
            </li>
            <li>
              <strong>Create Folders:</strong> Create the folder directory structure inside <code className="text-amber-400 font-mono">Assets/</code>:
              <pre className="mt-2 p-3 bg-slate-950 rounded text-xs font-mono text-emerald-400 border border-slate-900 overflow-x-auto">
{`Assets/
  ├── _Project/
  │    ├── Scripts/
  │    ├── Prefabs/
  │    ├── Animations/
  │    └── Scenes/`}
              </pre>
            </li>
            <li>
              <strong>Physics Settings:</strong> In <code className="text-cyan-400 font-mono">Project Settings - Physics 2D</code>, set the gravity vector to <code className="text-cyan-400 font-mono">Y: -28.0</code> for arcade heavy weight fall feel rather than the slow default floaty -9.81.
            </li>
          </ul>
        </div>

        {/* Section 2: Component Assignment & Linkages */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h4 className="font-sans font-semibold text-slate-100 text-sm md:text-base">2. Scene Hierarchy & Layer Setups</h4>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mb-3 font-sans">
            Set up the following GameObjects in your scene hierarchy and attach their corresponding components.
          </p>
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-900">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">A. Player Prefab</span>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-xs text-slate-300">
                <li>Create an empty GameObject named <code className="text-amber-400">Player</code>, assign Tag <code className="text-cyan-400 font-mono">"Player"</code> and Layer <code className="text-cyan-400 font-mono">"Player"</code>.</li>
                <li>Attach a <code className="text-teal-400">Rigidbody2D</code>: Set <em>Collision Detection</em> to <strong>Continuous</strong>, and lock Z rotation.</li>
                <li>Attach a <code className="text-teal-400">BoxCollider2D</code> or CapsuleCollider2D to serve as the physical body volume.</li>
                <li>Attach <code className="text-yellow-400 font-mono">PlayerController.cs</code>, <code className="text-yellow-400 font-mono">CombatSystem.cs</code>, and <code className="text-yellow-400 font-mono">HealthSystem.cs</code>.</li>
                <li>Create an empty child GameObject called <code className="text-emerald-400">AttackPoint</code>. Position it slightly forward in front of the player body. Link this to the <em>Attack Point</em> variable in <code className="text-yellow-400">CombatSystem</code>.</li>
              </ol>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-900">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase">B. Enemy Prefab & Boss Prefab</span>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-xs text-slate-300">
                <li>Create an empty GameObject named <code className="text-rose-400">Enemy</code>, Layer to <code className="text-rose-400 font-mono">"Enemy"</code>.</li>
                <li>Attach a <code className="text-teal-400">Rigidbody2D</code> and a <code className="text-teal-400">Collider2D</code>.</li>
                <li>Attach <code className="text-yellow-400 font-mono">EnemyAI.cs</code> and <code className="text-yellow-400 font-mono">HealthSystem.cs</code>.</li>
                <li>For the Boss: Attach <code className="text-yellow-400 font-mono">BossAI.cs</code> instead of EnemyAI. Set HealthSystem base health to <code className="text-cyan-400 font-mono">350+</code>.</li>
              </ol>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-900">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">C. Global Managers</span>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-xs text-slate-300">
                <li>Create empty GameObjects named <code className="text-amber-400">_GameManager</code>, <code className="text-amber-400">_EffectManager</code>, and <code className="text-amber-400">_UpgradeSystem</code>.</li>
                <li>Attach their respective scripts. Since they are designed as Singletons (<code className="text-cyan-400 font-mono">Instance</code> pattern), they will persist automatically across scenes via code.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Section 3: Animator Parameters */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
            <Play className="w-4 h-4 text-cyan-400" />
            <h4 className="font-sans font-semibold text-slate-100 text-sm md:text-base">3. Mecanim Animator Setup</h4>
          </div>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4 font-sans">
            To ensure C# script strings call the animator correctly without triggering missing transition errors, configure these exact parameters inside your Animator window:
          </p>
          <div className="overflow-x-auto bg-slate-950 border border-slate-900 rounded-lg p-3">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 px-3">Parameter Name</th>
                  <th className="py-1.5 px-3">Type</th>
                  <th className="py-1.5 px-3">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">Speed</td>
                  <td className="py-1.5 px-3">Float</td>
                  <td className="py-1.5 px-3">Blends between Idle & Run states based on Rigidbody velocity</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">IsGrounded</td>
                  <td className="py-1.5 px-3">Bool</td>
                  <td className="py-1.5 px-3">True if groundcheck overlap circle detects Ground layer</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">ComboStep</td>
                  <td className="py-1.5 px-3">Int</td>
                  <td className="py-1.5 px-3">Drives 3-hit combo chain. (0=None, 1=Slash1, 2=Slash2, 3=Finisher)</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">LightAttack</td>
                  <td className="py-1.5 px-3">Trigger</td>
                  <td className="py-1.5 px-3">Triggers swing clip entry instantly</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">HeavyAttack</td>
                  <td className="py-1.5 px-3">Trigger</td>
                  <td className="py-1.5 px-3">Triggers a heavy lunge sweep animation</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">HitStun</td>
                  <td className="py-1.5 px-3">Trigger</td>
                  <td className="py-1.5 px-3">Fires recoil/recoil staggering flinch animations on damage</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">Death</td>
                  <td className="py-1.5 px-3">Trigger</td>
                  <td className="py-1.5 px-3">Triggers a standard death fall down overlay</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-3 text-cyan-400">IsBlocking</td>
                  <td className="py-1.5 px-3">Bool</td>
                  <td className="py-1.5 px-3">Enables/disables defensive sword block guard pose loop</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-cyan-400">Enraged</td>
                  <td className="py-1.5 px-3">Bool</td>
                  <td className="py-1.5 px-3">Used on the Boss Animator to switch to Phase 2 animations</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-amber-400 bg-amber-950/20 border border-amber-900/50 rounded-lg p-3">
            <strong>CRITICAL STEP:</strong> Remember to create <em>Animation Events</em> on your Slash/Heavy Attack frames. Click on the sword swing frame inside the Animation Window, add an Event, and write the method name exactly as <code className="text-slate-100 font-mono">OnAttackImpactFrame</code>. For resetting movement, place another event at the end of the swing clip naming it <code className="text-slate-100 font-mono">OnAttackFinished</code>.
          </div>
        </div>

        {/* Section 4: Mobile Touch Layout */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h4 className="font-sans font-semibold text-slate-100 text-sm md:text-base">4. Mobile UI & Virtual Joystick Config</h4>
          </div>
          <ul className="space-y-2 text-xs md:text-sm leading-relaxed list-decimal list-inside">
            <li>Create a new Canvas: <code className="text-cyan-400 font-mono">GameObject - UI - Canvas</code>. Change <em>UI Scale Mode</em> to <strong>Scale With Screen Size</strong>, matching 1920x1080.</li>
            <li>Create the virtual buttons on the bottom-right corner of the canvas. Attach an <strong>Event Trigger</strong> component to the Block button.</li>
            <li>Add <code className="text-cyan-400 font-mono">Pointer Down</code> and <code className="text-cyan-400 font-mono">Pointer Up</code> events, linking them to <code className="text-yellow-400">MobileInputHandler.Instance.OnBlockButtonState(true/false)</code>.</li>
            <li>For attack/jump buttons, link their standard UI <code className="text-cyan-400 font-mono">OnClick()</code> events directly to the handler's respective press methods (<code className="text-yellow-400">OnLightAttackPressed</code>, etc).</li>
          </ul>
        </div>

        {/* Section 5: Cross-platform Builds */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <h4 className="font-sans font-semibold text-slate-100 text-sm md:text-base">5. Android APK & iOS Xcode Compiling</h4>
          </div>
          <div className="space-y-4 text-xs md:text-sm leading-relaxed">
            <div>
              <span className="text-cyan-400 font-bold uppercase font-mono text-xs block">Android APK Export (Google Play ready)</span>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300">
                <li>Go to <code className="text-cyan-400 font-mono">File - Build Settings</code>, select **Android** and click **Switch Platform**.</li>
                <li>In **Player Settings**: Set your <em>Company Name</em>, <em>Product Name</em>, and assign a launcher icon.</li>
                <li>Under <strong>Other Settings</strong>: Change <em>Scripting Backend</em> to <code className="text-emerald-400">IL2CPP</code> (required by Google Play Store for 64-bit packages).</li>
                <li>Set Target Architectures to both <code className="text-cyan-400 font-mono">ARMv7</code> and <code className="text-cyan-400 font-mono">ARM64</code>.</li>
                <li>Click **Build**, select your target directory, and compile the final <code className="text-emerald-400">.apk</code> file.</li>
              </ul>
            </div>

            <div className="border-t border-slate-800/80 pt-3">
              <span className="text-rose-400 font-bold uppercase font-mono text-xs block">iOS Export (App Store via Xcode)</span>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300">
                <li>Go to Build Settings, select **iOS** and click **Switch Platform**.</li>
                <li>In Player Settings: Provide a unique <code className="text-cyan-400 font-mono">Bundle Identifier</code> (e.g., <em>com.yourname.shadowblade</em>).</li>
                <li>Ensure **Signing & Capabilities** has a valid Apple Developer Profile associated.</li>
                <li>Click **Build** to output an Xcode Project folder.</li>
                <li>Open the folder on a macOS machine, load the <code className="text-cyan-400 font-mono">.xcodeproj</code> in Xcode, connect your testing iPhone, select "Generic iOS Device", and hit **Product - Archive** to build the App Store compilation package.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
