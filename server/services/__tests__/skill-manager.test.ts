import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveSkillDir,
  enableSkill,
  disableSkill,
  deleteSkill,
  batchToggleSkills,
} from '../skill-manager.js';
import type { AppConfig } from '../../config.js';
import { ValidationError, NotFoundError, ConflictError } from '../../errors.js';

// Helper: create a minimal valid AppConfig pointing at temp directories
function makeConfig(tmpRoot: string): AppConfig {
  const customSkillDir = path.join(tmpRoot, 'skills');
  const claudeRootDir = path.join(tmpRoot, 'claude');
  fs.mkdirSync(customSkillDir, { recursive: true });
  fs.mkdirSync(path.join(claudeRootDir, 'skills'), { recursive: true });
  return {
    customSkillDir,
    customSkillDirs: [customSkillDir],
    claudeRootDir,
    port: 3210,
    claudeSkillsDir: path.join(claudeRootDir, 'skills'),
    claudePluginsDir: path.join(claudeRootDir, 'plugins'),
    projects: [],
    groups: [],
  };
}

// Helper: create a skill directory with SKILL.md
function createSkill(parentDir: string, name: string): string {
  const skillDir = path.join(parentDir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\ndescription: test\n---\n# Test');
  return skillDir;
}

describe('resolveSkillDir', () => {
  it('resolves a valid relative path within customSkillDir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    const config = makeConfig(tmp);
    const result = resolveSkillDir(config, 'my-skill');
    expect(result).toBe(path.resolve(config.customSkillDir, 'my-skill'));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('resolves nested paths within customSkillDir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    const config = makeConfig(tmp);
    const result = resolveSkillDir(config, 'category/sub-skill');
    expect(result).toBe(path.resolve(config.customSkillDir, 'category/sub-skill'));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('throws ValidationError for path traversal with ..', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    const config = makeConfig(tmp);
    expect(() => resolveSkillDir(config, '../etc/passwd')).toThrow(ValidationError);
    expect(() => resolveSkillDir(config, '../etc/passwd')).toThrow('path traversal');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('throws ValidationError for deeply nested path traversal', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    const config = makeConfig(tmp);
    expect(() => resolveSkillDir(config, 'foo/../../bar')).toThrow(ValidationError);
    expect(() => resolveSkillDir(config, 'foo/../../../etc/passwd')).toThrow(ValidationError);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('throws ValidationError for absolute path outside customSkillDir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    const config = makeConfig(tmp);
    expect(() => resolveSkillDir(config, '/etc/passwd')).toThrow(ValidationError);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('throws ValidationError for mixed traversal attempts', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    const config = makeConfig(tmp);
    expect(() => resolveSkillDir(config, 'skill/../../../outside')).toThrow(ValidationError);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('enableSkill', () => {
  let tmp: string;
  let config: AppConfig;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    config = makeConfig(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('creates a symlink for a valid skill directory', () => {
    createSkill(config.customSkillDir, 'my-skill');
    enableSkill(config, 'my-skill');

    const symlinkPath = path.join(config.claudeSkillsDir, 'my-skill');
    const stat = fs.lstatSync(symlinkPath);
    expect(stat.isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(symlinkPath)).toBe(
      path.resolve(config.customSkillDir, 'my-skill'),
    );
  });

  it('throws NotFoundError if skill directory lacks SKILL.md', () => {
    const dir = path.join(config.customSkillDir, 'no-skill');
    fs.mkdirSync(dir, { recursive: true });
    expect(() => enableSkill(config, 'no-skill')).toThrow(NotFoundError);
  });

  it('throws NotFoundError if skill directory does not exist', () => {
    expect(() => enableSkill(config, 'nonexistent')).toThrow(NotFoundError);
  });

  it('is idempotent — calling twice does not throw', () => {
    createSkill(config.customSkillDir, 'my-skill');
    enableSkill(config, 'my-skill');
    expect(() => enableSkill(config, 'my-skill')).not.toThrow();
  });

  it('throws ConflictError if a non-symlink file blocks the symlink path', () => {
    createSkill(config.customSkillDir, 'my-skill');
    // Place a regular file where the symlink would go
    const blockingPath = path.join(config.claudeSkillsDir, 'my-skill');
    fs.writeFileSync(blockingPath, 'blocking');
    expect(() => enableSkill(config, 'my-skill')).toThrow(ConflictError);
  });

  it('rejects path traversal attempts', () => {
    expect(() => enableSkill(config, '../outside')).toThrow(ValidationError);
  });
});

describe('disableSkill', () => {
  let tmp: string;
  let config: AppConfig;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    config = makeConfig(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('removes an existing symlink', () => {
    createSkill(config.customSkillDir, 'my-skill');
    enableSkill(config, 'my-skill');

    const symlinkPath = path.join(config.claudeSkillsDir, 'my-skill');
    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);

    disableSkill(config, 'my-skill');
    expect(fs.existsSync(symlinkPath)).toBe(false);
  });

  it('does not throw when symlink does not exist', () => {
    expect(() => disableSkill(config, 'never-existed')).not.toThrow();
  });

  it('throws ConflictError if a non-symlink file exists at symlink path', () => {
    createSkill(config.customSkillDir, 'my-skill');
    const blockingPath = path.join(config.claudeSkillsDir, 'my-skill');
    fs.writeFileSync(blockingPath, 'not-a-symlink');
    expect(() => disableSkill(config, 'my-skill')).toThrow(ConflictError);
  });

  it('rejects path traversal attempts', () => {
    expect(() => disableSkill(config, '../outside')).toThrow(ValidationError);
  });
});

describe('deleteSkill', () => {
  let tmp: string;
  let config: AppConfig;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    config = makeConfig(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('deletes the skill directory', () => {
    createSkill(config.customSkillDir, 'to-delete');
    const skillDir = path.join(config.customSkillDir, 'to-delete');
    expect(fs.existsSync(skillDir)).toBe(true);

    deleteSkill(config, 'to-delete');
    expect(fs.existsSync(skillDir)).toBe(false);
  });

  it('removes symlink before deleting directory', () => {
    createSkill(config.customSkillDir, 'linked-skill');
    enableSkill(config, 'linked-skill');

    const symlinkPath = path.join(config.claudeSkillsDir, 'linked-skill');
    expect(fs.existsSync(symlinkPath)).toBe(true);

    deleteSkill(config, 'linked-skill');
    expect(fs.existsSync(symlinkPath)).toBe(false);
  });

  it('throws NotFoundError for nonexistent directory', () => {
    expect(() => deleteSkill(config, 'nonexistent')).toThrow(NotFoundError);
  });

  it('throws NotFoundError for directory without SKILL.md', () => {
    const dir = path.join(config.customSkillDir, 'empty-dir');
    fs.mkdirSync(dir, { recursive: true });
    expect(() => deleteSkill(config, 'empty-dir')).toThrow(NotFoundError);
  });

  it('rejects path traversal attempts', () => {
    expect(() => deleteSkill(config, '../outside')).toThrow(ValidationError);
  });
});

describe('batchToggleSkills', () => {
  let tmp: string;
  let config: AppConfig;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-test-'));
    config = makeConfig(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('enables multiple valid skills', () => {
    createSkill(config.customSkillDir, 'a');
    createSkill(config.customSkillDir, 'b');
    const result = batchToggleSkills(config, ['a', 'b'], 'enable');
    expect(result.ok).toBe(true);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(0);
  });

  it('collects failures without aborting the batch', () => {
    createSkill(config.customSkillDir, 'valid');
    const result = batchToggleSkills(config, ['valid', 'nonexistent'], 'enable');
    expect(result.succeeded).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].path).toBe('nonexistent');
  });

  it('disables previously enabled skills', () => {
    createSkill(config.customSkillDir, 'c');
    enableSkill(config, 'c');
    const result = batchToggleSkills(config, ['c'], 'disable');
    expect(result.succeeded).toBe(1);
    expect(result.failed).toHaveLength(0);
    expect(fs.existsSync(path.join(config.claudeSkillsDir, 'c'))).toBe(false);
  });
});
