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

/** API response for analysis endpoints (GET/POST) */
export interface AnalysisResponse {
  name: string;
  source: string;
  summary: string | null;
  hash: string | null;
  analyzedAt: string | null;
  model: string | null;
}

/** User-editable config fields */
export interface AppConfig {
  claudeRootDir?: string;
  customSkillDir?: string;
  customSkillDirs?: string[];
  projects?: Array<{ name: string; path: string }>;
  port?: number;
}

/** A registered project */
export interface ProjectInfo {
  name: string;
  path: string;
  skillsDir: string;
  globalEnabledCount: number;
  projectEnabledCount: number;
}

/** A skill in project context */
export interface ProjectSkill {
  name: string;
  description: string;
  path: string;
  source: 'global' | 'project';
  enabled: boolean;
}

/** Response from GET /api/projects/:name/skills */
export interface ProjectSkillsResponse {
  globalSkills: ProjectSkill[];
  projectSkills: ProjectSkill[];
}

/** A single search result item */
export interface SearchResult {
  name: string;
  description: string;
  path: string;
  source: string;
  enabled: boolean;
}

/** Response from GET /api/skills/search */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

/** Full config response including read-only API detection fields */
export interface AppConfigResponse extends AppConfig {
  apiConfigDetected: boolean;
  apiModel: string | null;
}
