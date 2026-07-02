import React, { useEffect, useRef, useState } from "react";
import { PlayerStats, UpgradeOption } from "../types/game";
import { Play, RotateCcw, Volume2, VolumeX, Shield, Swords, Sparkles, AlertTriangle } from "lucide-react";

interface GameSimulatorProps {
  playerStats: PlayerStats;
  addCoins: (amount: number) => void;
}

// Simple Web Audio API Synthesizer for high-fidelity combat feedback
class SoundSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialize to bypass browser autoplay blocks
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playSwing(isHeavy = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(isHeavy ? 150 : 250, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + (isHeavy ? 0.25 : 0.15));

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isHeavy ? 0.25 : 0.15));

    osc.start();
    osc.stop(this.ctx.currentTime + (isHeavy ? 0.25 : 0.15));
  }

  playHit(isHeavy = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // White Noise for impact crunch
    const bufferSize = this.ctx.sampleRate * (isHeavy ? 0.18 : 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to make it sound punchy
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isHeavy ? 300 : 500, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(isHeavy ? 0.35 : 0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isHeavy ? 0.18 : 0.08));

    noiseNode.start();
    noiseNode.stop(this.ctx.currentTime + (isHeavy ? 0.18 : 0.08));

    // Bass thump for heavy attacks
    if (isHeavy) {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(90, this.ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
      subGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      subOsc.start();
      subOsc.stop(this.ctx.currentTime + 0.2);
    }
  }

  playBlock() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playJump() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playDeath() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(20, this.ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

const synth = new SoundSynth();

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  opacity: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Entity {
  id: string;
  type: "enemy" | "boss";
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  maxHealth: number;
  health: number;
  state: "patrol" | "chase" | "attack" | "stagger" | "retreat";
  isFacingRight: boolean;
  patrolMin: number;
  patrolMax: number;
  attackCooldown: number;
  lastAttackTime: number;
  reactionTimer: number;
  staggerTimer: number;
  phase?: number;
  auraActive?: boolean;
}

export const GameSimulator: React.FC<GameSimulatorProps> = ({ playerStats, addCoins }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Simulation Game State
  const [gameState, setGameState] = useState<"start" | "playing" | "win" | "lose">("start");
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  // Key stats overlay
  const [playerHP, setPlayerHP] = useState(playerStats.maxHealth);
  const [bossHP, setBossHP] = useState<number | null>(null);
  const [bossMaxHP, setBossMaxHP] = useState<number | null>(null);

  // Virtual inputs state for UI highlight
  const [joystickActive, setJoystickActive] = useState<"left" | "right" | null>(null);
  const [blockActive, setBlockActive] = useState(false);

  // Game Engine Refs (to prevent closure stale variables)
  const engineRef = useRef({
    player: {
      x: 150,
      y: 0, // grounded relative to ground level
      width: 45,
      height: 70,
      vx: 0,
      vy: 0,
      isGrounded: true,
      isFacingRight: true,
      isBlocking: false,
      isAttacking: false,
      attackType: "none" as "light" | "heavy" | "none",
      comboStep: 0,
      attackFrame: 0,
      attackActive: false,
      staggerTimer: 0,
      health: playerStats.maxHealth,
      maxHealth: playerStats.maxHealth,
      speed: playerStats.movementSpeed,
      jumpForce: playerStats.jumpForce,
      lightDmg: playerStats.lightAttackDamage,
      heavyDmg: playerStats.heavyAttackDamage,
      comboMult: playerStats.comboMultiplier,
      iFrames: 0,
    },
    cameraX: 0,
    shakeTime: 0,
    shakeMagnitude: 0,
    hitStopTimer: 0,
    entities: [] as Entity[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    groundLevel: 320,
    worldWidth: 1500,
    bossSpawned: false,
    textIdCounter: 0,
    keys: {} as Record<string, boolean>,
  });

  // Sync player stats from props instantly
  useEffect(() => {
    const e = engineRef.current;
    const prevMax = e.player.maxHealth;
    e.player.maxHealth = playerStats.maxHealth;
    // Keep relative health ratio or full heal
    if (prevMax !== playerStats.maxHealth) {
      e.player.health = playerStats.maxHealth;
      setPlayerHP(e.player.health);
    }
    e.player.speed = playerStats.movementSpeed;
    e.player.jumpForce = playerStats.jumpForce;
    e.player.lightDmg = playerStats.lightAttackDamage;
    e.player.heavyDmg = playerStats.heavyAttackDamage;
    e.player.comboMult = playerStats.comboMultiplier;
  }, [playerStats]);

  // Audio preference sync
  useEffect(() => {
    synth.enabled = soundOn;
  }, [soundOn]);

  // Reset Game Loop
  const initGame = (withBoss = false) => {
    const e = engineRef.current;
    e.player.x = 100;
    e.player.y = e.groundLevel - e.player.height;
    e.player.vx = 0;
    e.player.vy = 0;
    e.player.isGrounded = true;
    e.player.isBlocking = false;
    e.player.isAttacking = false;
    e.player.comboStep = 0;
    e.player.staggerTimer = 0;
    e.player.health = playerStats.maxHealth;
    setPlayerHP(e.player.health);
    e.cameraX = 0;
    e.shakeTime = 0;
    e.hitStopTimer = 0;
    e.particles = [];
    e.floatingTexts = [];
    e.bossSpawned = withBoss;

    // Spawn starting entities
    const entitiesList: Entity[] = [];

    if (!withBoss) {
      // Spawn 3 standard patrolling ninjas
      entitiesList.push({
        id: "enemy-1",
        type: "enemy",
        x: 450,
        y: e.groundLevel - 65,
        width: 40,
        height: 65,
        vx: 0,
        vy: 0,
        maxHealth: 80,
        health: 80,
        state: "patrol",
        isFacingRight: false,
        patrolMin: 300,
        patrolMax: 600,
        attackCooldown: 120, // frames
        lastAttackTime: 0,
        reactionTimer: 0,
        staggerTimer: 0,
      });

      entitiesList.push({
        id: "enemy-2",
        type: "enemy",
        x: 800,
        y: e.groundLevel - 65,
        width: 40,
        height: 65,
        vx: 0,
        vy: 0,
        maxHealth: 90,
        health: 90,
        state: "patrol",
        isFacingRight: false,
        patrolMin: 650,
        patrolMax: 950,
        attackCooldown: 100,
        lastAttackTime: 0,
        reactionTimer: 0,
        staggerTimer: 0,
      });

      entitiesList.push({
        id: "enemy-3",
        type: "enemy",
        x: 1200,
        y: e.groundLevel - 65,
        width: 40,
        height: 65,
        vx: 0,
        vy: 0,
        maxHealth: 100,
        health: 100,
        state: "patrol",
        isFacingRight: false,
        patrolMin: 1000,
        patrolMax: 1400,
        attackCooldown: 80,
        lastAttackTime: 0,
        reactionTimer: 0,
        staggerTimer: 0,
      });
      setBossHP(null);
    } else {
      // Spawn Boss
      entitiesList.push({
        id: "boss-1",
        type: "boss",
        x: 900,
        y: e.groundLevel - 95,
        width: 60,
        height: 95,
        vx: 0,
        vy: 0,
        maxHealth: 350,
        health: 350,
        state: "patrol",
        isFacingRight: false,
        patrolMin: 700,
        patrolMax: 1100,
        attackCooldown: 90,
        lastAttackTime: 0,
        reactionTimer: 0,
        staggerTimer: 0,
        phase: 1,
        auraActive: false,
      });
      setBossHP(350);
      setBossMaxHP(350);
    }

    e.entities = entitiesList;
    setCoinsEarned(0);
    setEnemiesDefeated(0);
    setComboCount(0);
    setGameState("playing");
  };

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = engineRef.current.keys;
      keys[e.key.toLowerCase()] = true;

      // Single triggers
      if (gameState === "playing") {
        if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
          triggerJump();
        }
        if (e.key.toLowerCase() === "j") {
          triggerLightAttack();
        }
        if (e.key.toLowerCase() === "k") {
          triggerHeavyAttack();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = engineRef.current.keys;
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  // Command Execution Hooks (Inputs)
  const triggerJump = () => {
    const p = engineRef.current.player;
    if (p.isGrounded && !p.isBlocking && p.staggerTimer <= 0) {
      p.vy = -p.jumpForce * 1.1; // scale velocity
      p.isGrounded = false;
      synth.playJump();
      spawnDustParticles(p.x + p.width / 2, eGroundHeight(), "#888", 8);
    }
  };

  const triggerLightAttack = () => {
    const p = engineRef.current.player;
    if (p.isBlocking || p.staggerTimer > 0) return;

    const now = Date.now();
    // 3-hit combo window logic
    let nextStep = 1;
    if (p.isAttacking && p.attackType === "light") {
      // Input buffer / Animation cancel window
      if (p.attackFrame > 8) {
        nextStep = (p.comboStep % 3) + 1;
      } else {
        return; // Too early, lock action
      }
    }

    p.isAttacking = true;
    p.attackType = "light";
    p.comboStep = nextStep;
    p.attackFrame = 0;
    p.attackActive = true;
    synth.playSwing(nextStep === 3);

    // Dynamic stats trackers
    setComboCount((prev) => prev + 1);
    setComboTimer(2.0); // 2 second threshold
  };

  const triggerHeavyAttack = () => {
    const p = engineRef.current.player;
    if (p.isBlocking || p.staggerTimer > 0) return;
    if (p.isAttacking && p.attackFrame <= 12) return; // wait till ready

    p.isAttacking = true;
    p.attackType = "heavy";
    p.comboStep = 0;
    p.attackFrame = 0;
    p.attackActive = true;
    synth.playSwing(true);

    // Give a forward combat lunge force!
    p.vx = p.isFacingRight ? 13 : -13;

    setComboCount((prev) => prev + 1);
    setComboTimer(2.5);
  };

  // Particle Generators
  const spawnDustParticles = (x: number, y: number, color: string, count: number) => {
    const pArr = engineRef.current.particles;
    for (let i = 0; i < count; i++) {
      pArr.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4,
        radius: Math.random() * 3 + 1,
        color,
        alpha: 0.8,
        life: 0,
        maxLife: Math.random() * 20 + 10,
      });
    }
  };

  const spawnHitParticles = (x: number, y: number, isHeavy: boolean) => {
    const pArr = engineRef.current.particles;
    const color = isHeavy ? "#ff4a4a" : "#ffa33b";
    const count = isHeavy ? 20 : 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isHeavy ? 9 : 5) + 2;
      pArr.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: Math.random() * (isHeavy ? 4 : 2) + 1,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 30 + 15,
      });
    }
  };

  const spawnBlockParticles = (x: number, y: number) => {
    const pArr = engineRef.current.particles;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.random() - 0.5) * Math.PI; // Face outwards
      const speed = Math.random() * 6 + 3;
      pArr.push({
        x,
        y,
        vx: Math.sin(angle) * speed,
        vy: -Math.abs(Math.cos(angle) * speed),
        radius: Math.random() * 2 + 1,
        color: "#ffffff",
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 15 + 8,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, size = 18) => {
    const e = engineRef.current;
    e.textIdCounter++;
    e.floatingTexts.push({
      id: e.textIdCounter,
      x,
      y,
      text,
      color,
      fontSize: size,
      opacity: 1,
      vy: -1.5,
    });
  };

  const eGroundHeight = () => {
    return engineRef.current.groundLevel;
  };

  // Main Simulation Loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const e = engineRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (gameState !== "playing") {
        animId = requestAnimationFrame(tick);
        return;
      }

      // 1. HIT STOP (Freeze frame time multiplier)
      if (e.hitStopTimer > 0) {
        e.hitStopTimer--;
        // Just draw current state with subtle overlay
        drawGame(ctx, canvas);
        animId = requestAnimationFrame(tick);
        return;
      }

      // 2. INPUT UPDATES (Player Controls)
      const p = e.player;
      let moveDir = 0;
      
      // Keyboard input horizontal overrides
      if (e.keys["a"] || e.keys["arrowleft"]) {
        moveDir = -1;
      } else if (e.keys["d"] || e.keys["arrowright"]) {
        moveDir = 1;
      }

      // Joystick touch overlay simulation
      if (joystickActive === "left") moveDir = -1;
      if (joystickActive === "right") moveDir = 1;

      // Blocking logic
      const blockKey = e.keys["l"] || e.keys["shift"] || blockActive;
      p.isBlocking = blockKey && p.isGrounded && p.staggerTimer <= 0 && !p.isAttacking;

      // 3. PHYSICS & MOVEMENT
      if (p.staggerTimer > 0) {
        p.staggerTimer--;
        // Friction slide while hit-stunned
        p.vx *= 0.85;
      } else if (p.isBlocking) {
        p.vx *= 0.5; // lock movement
      } else if (!p.isAttacking) {
        const targetVx = moveDir * (p.speed * 1.3); // Scale velocity for arcade speed
        const rate = Math.abs(targetVx) > 0.01 ? 0.25 : 0.35; // Acceleration / drag multiplier
        p.vx = p.vx + (targetVx - p.vx) * rate;

        if (moveDir !== 0) {
          p.isFacingRight = moveDir > 0;
        }
      } else {
        // Attack deceleration
        if (p.attackType === "light") {
          p.vx *= 0.7; // Slow down during attacks
        } else {
          p.vx *= 0.93; // Heavy lunge slide
        }
      }

      // Apply Gravity
      if (!p.isGrounded) {
        p.vy += 0.9; // Gravity scale
        if (p.vy > 18) p.vy = 18;
      }

      // Update positions
      p.x += p.vx;
      p.y += p.vy;

      // Ground Collisions
      const currentGround = e.groundLevel - p.height;
      if (p.y >= currentGround) {
        p.y = currentGround;
        p.vy = 0;
        if (!p.isGrounded) {
          p.isGrounded = true;
          // Spawn landing dust
          spawnDustParticles(p.x + p.width / 2, e.groundLevel, "#aaa", 5);
        }
      }

      // Limit World Boundaries
      if (p.x < 0) p.x = 0;
      if (p.x > e.worldWidth - p.width) p.x = e.worldWidth - p.width;

      // 4. COMBAT ANIMATION TIMINGS & HITBOX RESOLUTION
      if (p.isAttacking) {
        p.attackFrame++;
        // Hit-frame trigger window (typically middle of swing)
        const hitFrameCheck = p.attackType === "light" ? 6 : 10;
        const totalDuration = p.attackType === "light" ? 14 : 22;

        if (p.attackFrame === hitFrameCheck && p.attackActive) {
          p.attackActive = false; // trigger once per click
          resolvePlayerHits();
        }

        if (p.attackFrame >= totalDuration) {
          p.isAttacking = false;
          p.attackType = "none";
        }
      }

      // Update Invincibility frames
      if (p.iFrames > 0) p.iFrames--;

      // Update Combo window
      setComboTimer((prev) => {
        if (prev <= 0.016) {
          setComboCount(0);
          return 0;
        }
        return prev - 0.016;
      });

      // 5. ENEMY STATE MACHINE LOGIC
      e.entities.forEach((ent) => {
        if (ent.health <= 0) return;

        // Apply friction/gravity to entities
        ent.vx *= 0.85;
        ent.vy += 0.8;
        ent.y += ent.vy;
        if (ent.y >= e.groundLevel - ent.height) {
          ent.y = e.groundLevel - ent.height;
          ent.vy = 0;
        }

        // Stagger handle
        if (ent.staggerTimer > 0) {
          ent.staggerTimer--;
          ent.x += ent.vx;
          return;
        }

        // State evaluation
        const playerCenter = p.x + p.width / 2;
        const entCenter = ent.x + ent.width / 2;
        const distanceToPlayer = Math.abs(playerCenter - entCenter);

        ent.reactionTimer++;

        // Evaluate state every 15 frames to feel realistic
        if (ent.reactionTimer >= 15) {
          ent.reactionTimer = 0;

          const detectionRange = ent.type === "boss" ? 500 : 300;
          const attackRange = ent.type === "boss" ? 85 : 55;

          if (distanceToPlayer <= attackRange) {
            ent.state = "attack";
          } else if (distanceToPlayer <= detectionRange) {
            // Low health retreat check
            if (ent.health / ent.maxHealth < 0.25 && ent.type === "enemy") {
              ent.state = "retreat";
            } else {
              ent.state = "chase";
            }
          } else {
            ent.state = "patrol";
          }
        }

        // Execute behaviors
        if (ent.state === "patrol") {
          const targetX = ent.isFacingRight ? ent.patrolMax : ent.patrolMin;
          const distToTarget = Math.abs(ent.x - targetX);
          if (distToTarget < 15) {
            ent.isFacingRight = !ent.isFacingRight;
          }
          ent.vx = ent.isFacingRight ? (ent.type === "boss" ? 3.5 : 2.0) : (ent.type === "boss" ? -3.5 : -2.0);
        } else if (ent.state === "chase") {
          ent.isFacingRight = playerCenter > entCenter;
          const dir = ent.isFacingRight ? 1 : -1;
          const speed = ent.type === "boss" ? (ent.phase === 2 ? 6.0 : 4.0) : 3.5;
          ent.vx = dir * speed;
        } else if (ent.state === "retreat") {
          ent.isFacingRight = playerCenter < entCenter; // Back away facing player
          const dir = playerCenter > entCenter ? -1 : 1;
          ent.vx = dir * 2.5;
        } else if (ent.state === "attack") {
          ent.isFacingRight = playerCenter > entCenter;
          ent.vx = 0;

          // Process enemy attack cooldown
          if (ent.lastAttackTime <= 0) {
            ent.lastAttackTime = ent.attackCooldown;
            // Initiate swing animation state inside simulation
            resolveEnemyHit(ent);
          }
        }

        if (ent.lastAttackTime > 0) {
          ent.lastAttackTime--;
        }

        // Apply velocities
        ent.x += ent.vx;

        // Force bounds
        if (ent.x < 0) ent.x = 0;
        if (ent.x > e.worldWidth - ent.width) ent.x = e.worldWidth - ent.width;
      });

      // 6. PROCESS PARTICLES & FLOATING TEXTS
      e.particles = e.particles.filter((part) => {
        part.x += part.vx;
        part.y += part.vy;
        part.vy += 0.08; // subtle gravity on sparks
        part.life++;
        part.alpha = 1 - part.life / part.maxLife;
        return part.life < part.maxLife;
      });

      e.floatingTexts = e.floatingTexts.filter((txt) => {
        txt.y += txt.vy;
        txt.opacity -= 0.02;
        return txt.opacity > 0;
      });

      // 7. SMOOTH CAMERA SYSTEM (With damping and bounds)
      const idealCameraX = p.x - canvas.width / 2 + p.width / 2;
      e.cameraX = e.cameraX + (idealCameraX - e.cameraX) * 0.1;
      // Clamp camera
      if (e.cameraX < 0) e.cameraX = 0;
      if (e.cameraX > e.worldWidth - canvas.width) e.cameraX = e.worldWidth - canvas.width;

      // Handle Shake Decay
      if (e.shakeTime > 0) {
        e.shakeTime--;
      }

      // Render Everything
      drawGame(ctx, canvas);

      animId = requestAnimationFrame(tick);
    };

    const resolvePlayerHits = () => {
      const e = engineRef.current;
      const p = e.player;
      const isHeavy = p.attackType === "heavy";
      
      // Calculate damage based on stats + multiplier
      const multiplier = 1 + p.comboMult;
      const baseDmg = isHeavy ? p.heavyDmg : p.lightDmg * (p.comboStep === 3 ? 1.5 : 1);
      const finalDmg = Math.round(baseDmg * multiplier);

      const playerCenter = p.x + p.width / 2;
      const attackRangeValue = isHeavy ? 100 : 70;
      const reachDirectionX = p.isFacingRight ? playerCenter + attackRangeValue : playerCenter - attackRangeValue;

      let hitAny = false;

      e.entities.forEach((ent) => {
        if (ent.health <= 0) return;

        const entCenter = ent.x + ent.width / 2;
        const isWithinX = p.isFacingRight 
          ? (entCenter >= playerCenter && entCenter <= playerCenter + attackRangeValue)
          : (entCenter <= playerCenter && entCenter >= playerCenter - attackRangeValue);

        const isWithinY = Math.abs((p.y + p.height / 2) - (ent.y + ent.height / 2)) < 80;

        if (isWithinX && isWithinY) {
          hitAny = true;
          ent.health -= finalDmg;
          
          // Stagger enemy
          ent.staggerTimer = isHeavy ? 35 : 20;
          ent.vx = p.isFacingRight ? (isHeavy ? 12 : 5) : (isHeavy ? -12 : -5);
          ent.vy = -2; // slight pop in air

          // Boss phase check
          if (ent.type === "boss") {
            setBossHP(ent.health);
            // Phase transition trigger at < 40% health
            if (ent.phase === 1 && ent.health / ent.maxHealth <= 0.40) {
              ent.phase = 2;
              ent.auraActive = true;
              e.hitStopTimer = 40; // Mega hit freeze
              e.shakeTime = 30;
              e.shakeMagnitude = 10;
              addFloatingText(ent.x + ent.width / 2, ent.y - 20, "PHASE 2: ENRAGED!", "#ef4444", 24);
              synth.playHit(true);
            }
          }

          // Sparks and Feedback
          spawnHitParticles(ent.x + ent.width / 2, ent.y + ent.height / 2, isHeavy);
          addFloatingText(
            ent.x + ent.width / 2, 
            ent.y - 10, 
            `-${finalDmg} HP${isHeavy ? " (Heavy)" : p.comboStep === 3 ? " (Combo Finisher!)" : ""}`, 
            isHeavy ? "#ff4242" : p.comboStep === 3 ? "#ffa126" : "#ffd747",
            isHeavy || p.comboStep === 3 ? 20 : 16
          );

          // Trigger hit stop and screenshake
          e.hitStopTimer = isHeavy ? 8 : 4;
          e.shakeTime = isHeavy ? 15 : 6;
          e.shakeMagnitude = isHeavy ? 7 : 3;

          synth.playHit(isHeavy);

          // Death check
          if (ent.health <= 0) {
            ent.health = 0;
            setEnemiesDefeated((prev) => prev + 1);
            const rewardCoins = ent.type === "boss" ? 150 : 25;
            setCoinsEarned((prev) => prev + rewardCoins);
            addCoins(rewardCoins);
            addFloatingText(ent.x + ent.width / 2, ent.y - 40, `+${rewardCoins} Coins!`, "#34d399", 22);
            synth.playDeath();
            spawnDustParticles(ent.x + ent.width / 2, ent.y + ent.height, "#333", 15);

            // Check Win Condition
            const activeEnemies = e.entities.filter(it => it.health > 0);
            if (activeEnemies.length === 0) {
              setGameState("win");
            }
          }
        }
      });

      if (!hitAny) {
        // missed attack
      }
    };

    const resolveEnemyHit = (ent: Entity) => {
      const e = engineRef.current;
      const p = e.player;
      if (p.health <= 0) return;

      const playerCenter = p.x + p.width / 2;
      const entCenter = ent.x + ent.width / 2;
      const dist = Math.abs(playerCenter - entCenter);

      // Simple swing visual timer simulation
      setTimeout(() => {
        if (gameState !== "playing" || ent.health <= 0 || ent.staggerTimer > 0) return;

        const updatedDist = Math.abs((p.x + p.width / 2) - (ent.x + ent.width / 2));
        const attackRange = ent.type === "boss" ? 95 : 60;

        if (updatedDist <= attackRange && p.iFrames <= 0) {
          // Check block mitigation
          if (p.isBlocking && ((ent.x < p.x && !p.isFacingRight) || (ent.x > p.x && p.isFacingRight))) {
            // Successfully blocked!
            p.iFrames = 25; // short immunities
            spawnBlockParticles(p.x + (p.isFacingRight ? p.width : 0), p.y + p.height / 2);
            addFloatingText(p.x + p.width / 2, p.y - 15, "BLOCKED!", "#ffffff", 18);
            synth.playBlock();
            e.shakeTime = 5;
            e.shakeMagnitude = 2;
          } else {
            // Hit!
            const rawDmg = ent.type === "boss" ? (ent.phase === 2 ? 30 : 18) : 12;
            p.health -= rawDmg;
            if (p.health < 0) p.health = 0;
            setPlayerHP(p.health);

            p.staggerTimer = 22;
            p.iFrames = 30; // i-frames
            // Recoil knockback
            p.vx = ent.x < p.x ? 8 : -8;
            p.vy = -3;

            spawnHitParticles(p.x + p.width / 2, p.y + p.height / 2, true);
            addFloatingText(p.x + p.width / 2, p.y - 10, `-${rawDmg} HP`, "#ef4444", 20);
            synth.playHit(true);

            e.shakeTime = 18;
            e.shakeMagnitude = 6;

            if (p.health <= 0) {
              setGameState("lose");
              synth.playDeath();
            }
          }
        }
      }, 250); // Swing wind-up latency
    };

    // Draw Pipeline
    const drawGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const e = engineRef.current;
      const p = e.player;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save context for screen shake
      ctx.save();
      if (e.shakeTime > 0) {
        const dx = (Math.random() - 0.5) * e.shakeMagnitude;
        const dy = (Math.random() - 0.5) * e.shakeMagnitude;
        ctx.translate(dx, dy);
      }

      // Camera Offset Shift
      ctx.translate(-e.cameraX, 0);

      // DRAW BACKGROUND (Parallax grids and silhouettes)
      drawParallaxSky(ctx, canvas, e.cameraX);
      drawDojoEnvironment(ctx, e.worldWidth, e.groundLevel);

      // DRAW ENTITIES (Enemies, Boss)
      e.entities.forEach((ent) => {
        if (ent.health <= 0) return;
        drawCharacter(ctx, ent.x, ent.y, ent.width, ent.height, ent.isFacingRight, ent.type, ent.state, ent.staggerTimer > 0, ent);
      });

      // DRAW PLAYER
      drawCharacter(ctx, p.x, p.y, p.width, p.height, p.isFacingRight, "player", p.isBlocking ? "block" : p.isAttacking ? "attack" : "idle", p.staggerTimer > 0, p);

      // DRAW PARTICLES
      e.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // DRAW FLOATING DAMAGE TEXTS
      e.floatingTexts.forEach((txt) => {
        ctx.save();
        ctx.globalAlpha = txt.opacity;
        ctx.fillStyle = txt.color;
        ctx.font = `bold ${txt.fontSize}px 'JetBrains Mono', monospace`;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.textAlign = "center";
        ctx.fillText(txt.text, txt.x, txt.y);
        ctx.restore();
      });

      // Restore Screen Shake context
      ctx.restore();
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [gameState, joystickActive, blockActive]);

  // Canvas Drawing Helpers
  const drawParallaxSky = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, camX: number) => {
    // Ground level backdrop gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, "#0a0a14"); // Void pitch dark
    skyGrad.addColorStop(0.7, "#141424"); // Deep twilight crimson tint
    skyGrad.addColorStop(1, "#1c142c"); // Dark velvet
    ctx.fillStyle = skyGrad;
    ctx.fillRect(camX, 0, canvas.width, canvas.height);

    // Parallax Mountain silhouettes
    ctx.fillStyle = "#110e1a";
    ctx.beginPath();
    // Far hills
    let mountainOffset = -camX * 0.15;
    ctx.moveTo(mountainOffset, 320);
    ctx.lineTo(mountainOffset + 150, 180);
    ctx.lineTo(mountainOffset + 300, 320);
    ctx.lineTo(mountainOffset + 480, 210);
    ctx.lineTo(mountainOffset + 650, 320);
    ctx.lineTo(mountainOffset + 900, 150);
    ctx.lineTo(mountainOffset + 1200, 320);
    ctx.lineTo(mountainOffset + 1500, 190);
    ctx.lineTo(mountainOffset + 1800, 320);
    ctx.fill();

    // Medium layers hills
    ctx.fillStyle = "#171226";
    ctx.beginPath();
    let hillOffset = -camX * 0.35;
    ctx.moveTo(hillOffset - 50, 320);
    ctx.quadraticCurveTo(hillOffset + 200, 220, hillOffset + 450, 320);
    ctx.quadraticCurveTo(hillOffset + 700, 240, hillOffset + 950, 320);
    ctx.quadraticCurveTo(hillOffset + 1200, 200, hillOffset + 1600, 320);
    ctx.fill();
  };

  const drawDojoEnvironment = (ctx: CanvasRenderingContext2D, worldWidth: number, groundLevel: number) => {
    // Draw Torii Gate & Dojos in background
    ctx.strokeStyle = "#1a162b";
    ctx.lineWidth = 6;
    ctx.fillStyle = "#141021";

    // Draw some stylized pillars/gates
    for (let x = 200; x < worldWidth; x += 350) {
      // Draw standard support pillars
      ctx.fillRect(x, groundLevel - 150, 12, 150);
      ctx.fillRect(x + 120, groundLevel - 150, 12, 150);
      // Top Crossbar (Torii style)
      ctx.fillRect(x - 20, groundLevel - 155, 172, 14);
      ctx.fillRect(x - 10, groundLevel - 165, 152, 6);
    }

    // DRAW THE COMBAT GROUND STAGE
    // Dark floor with high contrast wooden slats
    ctx.fillStyle = "#1e1a30";
    ctx.fillRect(0, groundLevel, worldWidth, 80);

    ctx.strokeStyle = "#ff3b5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundLevel);
    ctx.lineTo(worldWidth, groundLevel);
    ctx.stroke();

    // Draw floor wooden panel hashes
    ctx.strokeStyle = "#27223e";
    ctx.lineWidth = 1;
    for (let d = 30; d < worldWidth; d += 60) {
      ctx.beginPath();
      ctx.moveTo(d, groundLevel);
      ctx.lineTo(d - 15, groundLevel + 80);
      ctx.stroke();
    }
  };

  const drawCharacter = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isFacingRight: boolean,
    type: "player" | "enemy" | "boss" | "block" | "attack" | "idle",
    stateStr: string,
    isStaggered: boolean,
    rawObj: any
  ) => {
    ctx.save();

    // Stagger red flash
    if (isStaggered) {
      ctx.shadowColor = "#ff2222";
      ctx.shadowBlur = 15;
    } else if (type === "player") {
      ctx.shadowColor = "#00f3ff";
      ctx.shadowBlur = 10;
    } else if (type === "boss") {
      ctx.shadowColor = rawObj.phase === 2 ? "#ff4000" : "#a832ff";
      ctx.shadowBlur = rawObj.phase === 2 ? 18 : 12;
    } else {
      ctx.shadowColor = "#ff2f44";
      ctx.shadowBlur = 8;
    }

    // Facing Flip
    ctx.translate(x + w / 2, y + h / 2);
    if (!isFacingRight) {
      ctx.scale(-1, 1);
    }

    // DRAW SHADOW ON GROUND
    ctx.save();
    ctx.scale(1, 0.2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.beginPath();
    // Shadow size matches vertical height offset (jump depth)
    const shadowDist = eGroundHeight() - (y + h);
    const shadowScale = Math.max(0.2, 1 - shadowDist / 200);
    ctx.arc(0, h * 2.3 + shadowDist * 4, w * 0.7 * shadowScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Phase 2 Boss Flame Aura
    if (type === "boss" && rawObj.phase === 2) {
      ctx.save();
      const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, w * 1.5);
      grad.addColorStop(0, "rgba(255, 60, 0, 0.4)");
      grad.addColorStop(0.5, "rgba(255, 140, 0, 0.15)");
      grad.addColorStop(1, "rgba(255,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -10, w * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // DRAW BASE BODY SILHOUETTE
    ctx.fillStyle = type === "player" 
      ? "#05e1ff" 
      : type === "boss" 
        ? (rawObj.phase === 2 ? "#ff3e18" : "#8012e8")
        : "#e62e49";

    if (isStaggered) ctx.fillStyle = "#ffffff";

    // HEAD
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 10, 14, 0, Math.PI * 2);
    ctx.fill();

    // HEADBAND TAIL (Animated flowing behind)
    ctx.fillStyle = type === "player" ? "#ffffff" : "#ffa600";
    ctx.beginPath();
    ctx.moveTo(-12, -h / 2 + 8);
    const flowX = -28 - Math.sin(Date.now() * 0.012) * 5;
    ctx.quadraticCurveTo(-20, -h / 2 + 15, flowX, -h / 2 + 5);
    ctx.quadraticCurveTo(-18, -h / 2 - 2, -12, -h / 2 + 6);
    ctx.fill();

    // BODY (TORSO)
    ctx.fillStyle = isStaggered 
      ? "#ffffff" 
      : type === "player" 
        ? "#121d33" 
        : type === "boss" 
          ? "#230e38" 
          : "#2b0a11";
    ctx.strokeStyle = type === "player" 
      ? "#05e1ff" 
      : type === "boss" 
        ? (rawObj.phase === 2 ? "#ff3e18" : "#a832ff")
        : "#e62e49";
    ctx.lineWidth = 3;

    // Outer clothing robe
    ctx.beginPath();
    ctx.roundRect(-15, -h / 2 + 25, 30, h * 0.5, 6);
    ctx.fill();
    ctx.stroke();

    // SASH/BELT
    ctx.fillStyle = type === "player" ? "#00f0ff" : "#ff3c00";
    ctx.fillRect(-16, 5, 32, 6);

    // ARMS & WEAPON SWINGING Visuals
    ctx.save();
    if (stateStr === "attack") {
      // Swing slash trails
      ctx.strokeStyle = type === "player" ? "rgba(0, 242, 255, 0.75)" : "rgba(255, 62, 24, 0.75)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 48, -Math.PI / 4, Math.PI / 2);
      ctx.stroke();

      // Hand holding sword extended forward
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(15, -10, 12, 6);
    } else if (stateStr === "block") {
      // Arms crossed holding shield aura
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(8, -12, 10, 18);
      
      // Block Shield Ring overlay
      ctx.strokeStyle = "rgba(0, 247, 255, 0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(14, -5, 30, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    } else {
      // Default idle arms
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-8, -10, 6, 16);
      ctx.fillRect(4, -10, 6, 16);
    }
    ctx.restore();

    // LEGS / FEET
    ctx.fillStyle = type === "player" ? "#05e1ff" : "#ef4444";
    ctx.fillRect(-12, h / 2 - 10, 8, 12);
    ctx.fillRect(4, h / 2 - 10, 8, 12);

    ctx.restore();
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full" id="game-simulator-container">
      {/* Top Simulator Control Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
            <Swords className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-100 text-sm md:text-base">Gameplay & Feel Sandbox</h3>
            <p className="font-mono text-[10px] text-slate-400">COMBAT SYSTEM & PHYSICS SIMULATOR</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Audio toggle */}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Toggle Web Audio Synth"
            id="synth-sound-toggle"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={() => initGame(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            id="restart-standard-level"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Standard Dojo
          </button>

          <button
            onClick={() => initGame(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 border border-rose-900 text-xs text-rose-300 rounded-lg hover:bg-rose-900/50 transition-colors"
            id="spawn-boss-battle"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            Boss Battle
          </button>
        </div>
      </div>

      {/* Main Canvas and Play State Screen */}
      <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 md:p-6" ref={containerRef}>
        {gameState === "start" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-20 text-center px-4">
            <h2 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-amber-400 tracking-tight mb-2">
              SHADOW BLADE
            </h2>
            <p className="text-slate-300 text-sm max-w-md mb-6 font-sans">
              Experience the actual responsive C# physics, combo timings, blocks, hit-stops, and boss phase shifts directly in your browser.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => initGame(false)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-cyan-900/30 text-sm"
                id="start-normal-sim"
              >
                <Play className="w-4 h-4" /> Run Dojo Level
              </button>
              <button
                onClick={() => initGame(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-rose-900/30 text-sm"
                id="start-boss-sim"
              >
                <Sparkles className="w-4 h-4" /> Run Boss Fight
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-t border-slate-800 pt-4 text-[11px] text-slate-400 font-mono">
              <div>A / D / Left-Right → Move Left/Right</div>
              <div>Space / Up / W → Jump Ninja</div>
              <div>J key → Light Attack (Combo Step 1-2-3)</div>
              <div>K key → Heavy Lunge Slash</div>
              <div>L key / Shift → Shield/Block (80% Mitigation)</div>
              <div>Hover Joystick / Click buttons on Mobile</div>
            </div>
          </div>
        ) : null}

        {/* WIN SCREEN OVERLAY */}
        {gameState === "win" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 text-center px-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 mb-4 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold text-emerald-400 mb-2">VICTORY ACHIEVED!</h2>
            <p className="text-slate-300 text-sm max-w-md mb-6 font-mono">
              Cleared all opposing forces. Double rewards saved to persistent upgrade state!
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => initGame(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-200 text-sm font-bold rounded-lg hover:bg-slate-700 transition-all"
                id="win-restart-standard"
              >
                Replay Dojo
              </button>
              <button
                onClick={() => initGame(true)}
                className="px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-500 transition-all"
                id="win-restart-boss"
              >
                Face Boss Again
              </button>
            </div>
          </div>
        )}

        {/* LOSE SCREEN OVERLAY */}
        {gameState === "lose" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 text-center px-4">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center border border-rose-500/30 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold text-rose-500 mb-2">NINJA DEFEATED</h2>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              Your shield timing was slow or you didn't lunge in time. Upgrade your Max Health or damage to fight back.
            </p>
            <button
              onClick={() => initGame(engineRef.current.bossSpawned)}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all text-sm"
              id="lose-retry"
            >
              Retry Challenge
            </button>
          </div>
        )}

        {/* HUD Overlay inside simulator */}
        {gameState === "playing" && (
          <div className="absolute top-4 inset-x-4 flex justify-between pointer-events-none z-10 font-mono text-xs">
            {/* Player Health Bar */}
            <div className="flex flex-col gap-1 w-1/3">
              <div className="flex justify-between text-slate-200 font-bold text-[10px]">
                <span>NINJA HP (PLAYER)</span>
                <span>{Math.round(playerHP)} / {playerStats.maxHealth}</span>
              </div>
              <div className="h-3 bg-slate-900 border border-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-100"
                  style={{ width: `${(playerHP / playerStats.maxHealth) * 100}%` }}
                />
              </div>
            </div>

            {/* Middle Stats Combo Counter */}
            <div className="flex flex-col items-center justify-center">
              {comboCount > 0 && (
                <div className="flex flex-col items-center bg-slate-900/80 px-3 py-1 border border-slate-800 rounded animate-bounce text-center">
                  <span className="text-amber-400 font-black text-sm">{comboCount} HITS!</span>
                  <span className="text-[9px] text-slate-400">COMBO DAMAGE ACTIVE</span>
                </div>
              )}
            </div>

            {/* Boss / Enemy HUD */}
            <div className="flex flex-col gap-1 w-1/3 items-end">
              {bossHP !== null && (
                <div className="w-full flex flex-col gap-1">
                  <div className="flex justify-between text-rose-400 font-bold text-[10px]">
                    <span>RAID BOSS HEALTH</span>
                    <span>{Math.round(bossHP)} / {bossMaxHP}</span>
                  </div>
                  <div className="h-3 bg-slate-900 border border-slate-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-100"
                      style={{ width: `${(bossHP / (bossMaxHP || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {bossHP === null && (
                <div className="bg-slate-900/60 px-2 py-1 rounded text-[10px] text-slate-300">
                  Defeated: <span className="text-rose-400 font-bold">{enemiesDefeated}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={380}
          className="bg-slate-950 border border-slate-800 rounded-lg shadow-inner max-w-full"
        />
      </div>

      {/* MOBILE SCREEN PLAY GROUND SIMULATOR TOUCH CONTROLS */}
      <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Side: Joystick representation */}
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-slate-400">VIRTUAL JOYSTICK:</span>
          <div className="flex gap-2">
            <button
              onMouseDown={() => setJoystickActive("left")}
              onMouseUp={() => setJoystickActive(null)}
              onMouseLeave={() => setJoystickActive(null)}
              onTouchStart={() => setJoystickActive("left")}
              onTouchEnd={() => setJoystickActive(null)}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg select-none transition-all ${
                joystickActive === "left"
                  ? "bg-cyan-500 text-slate-950 scale-95 ring-4 ring-cyan-900"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              id="joystick-left-btn"
            >
              ◀
            </button>
            <button
              onMouseDown={() => setJoystickActive("right")}
              onMouseUp={() => setJoystickActive(null)}
              onMouseLeave={() => setJoystickActive(null)}
              onTouchStart={() => setJoystickActive("right")}
              onTouchEnd={() => setJoystickActive(null)}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg select-none transition-all ${
                joystickActive === "right"
                  ? "bg-cyan-500 text-slate-950 scale-95 ring-4 ring-cyan-900"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              id="joystick-right-btn"
            >
              ▶
            </button>
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:block">Move Left & Right</span>
        </div>

        {/* Right Side: Visual buttons */}
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400">TACTILE ACTION TRIGGER BUTTONS:</span>
          
          <button
            onClick={triggerJump}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg flex items-center gap-1 active:scale-95 transition-all"
            id="action-btn-jump"
          >
            Jump ⇧
          </button>

          <button
            onMouseDown={() => setBlockActive(true)}
            onMouseUp={() => setBlockActive(false)}
            onMouseLeave={() => setBlockActive(false)}
            onTouchStart={() => setBlockActive(true)}
            onTouchEnd={() => setBlockActive(false)}
            className={`px-3 py-2 border text-xs font-mono rounded-lg flex items-center gap-1 select-none transition-all ${
              blockActive 
                ? "bg-emerald-600 border-emerald-500 text-white scale-95" 
                : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
            }`}
            id="action-btn-block"
          >
            <Shield className="w-3.5 h-3.5" /> Block
          </button>

          <button
            onClick={triggerLightAttack}
            className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-900 text-rose-300 text-xs font-mono rounded-lg flex items-center gap-1 active:scale-95 transition-all"
            id="action-btn-light"
          >
            Light 🗡️
          </button>

          <button
            onClick={triggerHeavyAttack}
            className="px-3 py-2 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-900 text-amber-300 text-xs font-mono rounded-lg flex items-center gap-1 active:scale-95 transition-all"
            id="action-btn-heavy"
          >
            Heavy 💥
          </button>
        </div>
      </div>
    </div>
  );
};
