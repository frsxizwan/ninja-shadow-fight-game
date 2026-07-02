export interface PlayerStats {
  maxHealth: number;
  currentHealth: number;
  movementSpeed: number;
  jumpForce: number;
  lightAttackDamage: number;
  heavyAttackDamage: number;
  comboMultiplier: number;
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  baseValue: number;
  upgradeValue: number;
  statKey: keyof PlayerStats;
  icon: string;
}

export interface UnityScriptFile {
  name: string;
  category: 'core' | 'combat' | 'ai' | 'utility';
  description: string;
  code: string;
}
