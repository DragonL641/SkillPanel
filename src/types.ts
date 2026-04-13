/** Custom skill metadata */
export interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
  hash: string;
  absolutePath?: string;
}

/** Custom skill directory tree node */
export interface TreeNode {
  type: 'dir' | 'skill';
  name: string;
  path: string;
  children?: TreeNode[];
  skill?: SkillMeta;
}

/** A single skill exposed by a plugin */
export interface PluginSkill {
  name: string;
  description: string;
  path: string;
}

/** A plugin and its skills */
export interface PluginInfo {
  name: string;
  displayName: string;
  installPath: string;
  version: string;
  lastUpdated: string;
  skills: PluginSkill[];
}

/** Summary statistics */
export interface Summary {
  customTotal: number;
  customEnabled: number;
  pluginTotal: number;
  grandTotal: number;
}

/** AI analysis result for a skill */
export interface SkillAnalysis {
  summary: string;
  analyzedAt: string;
}

/** User-editable config fields */
export interface AppConfig {
  claudeRootDir?: string;
  customSkillDir?: string;
  port?: number;
}

/** Full config response including read-only API detection fields */
export interface AppConfigResponse extends AppConfig {
  apiConfigDetected: boolean;
  apiModel: string | null;
}
