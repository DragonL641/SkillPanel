import { describe, it, expect } from 'vitest';
import zhCN from '../../public/locales/zh-CN/translation.json';
import en from '../../public/locales/en/translation.json';

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n translation key consistency', () => {
  const zhKeys = new Set(collectKeys(zhCN));
  const enKeys = new Set(collectKeys(en));

  it('should have the same keys in zh-CN and en', () => {
    const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));
    const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k));

    expect(missingInEn, `Keys missing in en: ${missingInEn.join(', ')}`).toEqual([]);
    expect(missingInZh, `Keys missing in zh-CN: ${missingInZh.join(', ')}`).toEqual([]);
  });

  it('should not have empty values in en', () => {
    const enFlat = collectKeys(en);
    const emptyKeys = enFlat.filter((key) => {
      const parts = key.split('.');
      let obj: Record<string, unknown> = en;
      for (const part of parts) {
        obj = obj[part] as Record<string, unknown>;
      }
      return !obj || (typeof obj === 'string' && obj.trim() === '');
    });
    expect(emptyKeys, `Empty values in en: ${emptyKeys.join(', ')}`).toEqual([]);
  });
});
