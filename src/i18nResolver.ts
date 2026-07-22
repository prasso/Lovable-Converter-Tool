import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Load the English translation JSON from common locations in a React app.
 * Returns the parsed object or null if no translation file is found.
 */
export function loadTranslations(appDir: string): Record<string, unknown> | null {
  const candidates = [
    join(appDir, 'src', 'i18n', 'locales', 'en.json'),
    join(appDir, 'src', 'locales', 'en.json'),
    join(appDir, 'src', 'i18n', 'en.json'),
    join(appDir, 'public', 'locales', 'en', 'translation.json'),
    join(appDir, 'public', 'locales', 'en.json'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        return JSON.parse(readFileSync(candidate, 'utf-8'));
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Resolve a dotted key path (e.g. "catalog.title") against the translations
 * object. Returns the leaf string value or null if not found.
 */
export function resolveKey(
  key: string,
  translations: Record<string, unknown> | null,
): string | null {
  if (!translations) return null;

  const parts = key.split('.');
  let current: unknown = translations;

  for (const part of parts) {
    if (current === null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : null;
}

/**
 * Resolve a translation key, falling back to `defaultValue` if the key is
 * not found and `translations` is available. If translations are null,
 * returns null so the caller can decide what to do.
 */
function resolveWithFallback(
  key: string,
  translations: Record<string, unknown> | null,
  defaultValue?: string,
): string | null {
  const resolved = resolveKey(key, translations);
  if (resolved !== null) return resolved;
  if (defaultValue !== undefined) return defaultValue;
  return null;
}

/**
 * Replace interpolation placeholders like {{name}} in a translation string.
 * We don't have runtime values, so replace with empty string.
 */
function interpolate(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, '');
}

/**
 * Replace {t('key.path')} and {t("key.path")} expressions in the HTML with
 * the resolved English translation string. Also handles the optional second
 * argument: {t('key', { defaultValue: 'fallback' })}.
 *
 * Template-literal forms like {t(`categories.${var}`)} are left untouched
 * since they contain dynamic interpolation that can't be resolved at
 * conversion time.
 */
export function replaceTranslationExpressions(
  html: string,
  translations: Record<string, unknown> | null,
): string {
  // Match {t('key')} or {t("key")} with optional second arg { defaultValue: '...' }
  // Key can contain dots, underscores, and alphanumerics
  const tRegex = /\{\s*t\(\s*(['"])([\w.]+)\1\s*(?:,\s*\{\s*defaultValue:\s*(['"])([^'"]*)\3\s*\}\s*)?\)\s*\}/g;

  let result = html.replace(tRegex, (_match, _q1: string, key: string, _dq: string | undefined, fallback: string | undefined) => {
    const resolved = resolveWithFallback(key, translations, fallback);
    if (resolved !== null) {
      return interpolate(resolved);
    }
    // Can't resolve — leave the key as visible text
    return key;
  });

  // Also handle template-literal t() calls that are fully static:
  // {t(`key`)} (no ${} interpolation inside)
  const templateLiteralRegex = /\{\s*t\(\s*`([^`${}]+)`\s*\)\s*\}/g;
  result = result.replace(templateLiteralRegex, (_match, key: string) => {
    const resolved = resolveWithFallback(key, translations);
    if (resolved !== null) {
      return interpolate(resolved);
    }
    return key;
  });

  return result;
}
