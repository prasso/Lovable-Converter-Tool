import { resolveKey, replaceTranslationExpressions } from './i18nResolver.js';

export interface SeoData {
  meta_title: string | null;
  meta_description: string | null;
  meta_og_type: string | null;
  meta_og_image: string | null;
  meta_twitter_card: string | null;
  meta_twitter_title: string | null;
}

const emptySeo: SeoData = {
  meta_title: null,
  meta_description: null,
  meta_og_type: null,
  meta_og_image: null,
  meta_twitter_card: null,
  meta_twitter_title: null,
};

/**
 * Resolve a content string that may contain t() calls or template literals
 * with t() calls, using the provided translations.
 */
function resolveContent(
  content: string,
  translations: Record<string, unknown> | null,
): string {
  // First resolve simple t() calls
  let resolved = replaceTranslationExpressions(content, translations);

  // Handle template literals: {`${t('a')} ${t('b')} | Static`}
  // Pattern: {`...${t('key')}...`}
  const templateLiteralTRegex = /\$\{t\(\s*(['"])([\w.]+)\1\s*\)\}/g;
  resolved = resolved.replace(templateLiteralTRegex, (_match, _q: string, key: string) => {
    const val = resolveKey(key, translations);
    return val ?? key;
  });

  // Remove any remaining ${...} template interpolation scaffolding
  resolved = resolved.replace(/\$\{[^}]*\}/g, '');

  // Remove backtick and ${} remnants
  resolved = resolved.replace(/[`]/g, '');

  // Clean up extra whitespace
  resolved = resolved.replace(/\s+/g, ' ').trim();

  return resolved;
}

/**
 * Extract the text content from a JSX element's children, handling
 * expressions and template literals.
 */
function extractElementContent(innerHtml: string): string {
  // Remove JSX tags but keep text content
  return innerHtml
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Extract SEO metadata from a <Helmet> block in JSX content.
 * Returns null-valued SeoData if no Helmet block is found.
 */
export function extractSeoFromHelmet(
  content: string,
  translations: Record<string, unknown> | null,
): SeoData {
  // Find <Helmet>...</Helmet> block
  const helmetRegex = /<Helmet\b[^>]*>([\s\S]*?)<\/Helmet>/;
  const match = content.match(helmetRegex);
  if (!match) return { ...emptySeo };

  const helmetContent = match[1];
  const seo: SeoData = { ...emptySeo };

  // Extract <title>...</title>
  const titleMatch = helmetContent.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  if (titleMatch) {
    const rawTitle = extractElementContent(titleMatch[1]);
    seo.meta_title = resolveContent(rawTitle, translations) || null;
  }

  // Extract <meta> tags
  const metaRegex = /<meta\s+([^>]+?)\/?>/g;
  let metaMatch: RegExpExecArray | null;

  while ((metaMatch = metaRegex.exec(helmetContent)) !== null) {
    const attrs = metaMatch[1];

    // Parse attributes
    const nameMatch = attrs.match(/\bname=["']([^"']+)["']/);
    const propertyMatch = attrs.match(/\bproperty=["']([^"']+)["']/);

    // Extract content attribute — handle content={t('key')} and content="static"
    let rawContent: string | null = null;

    // Pattern 1: content={t('key.path')} or content={t("key.path")}
    const tContentMatch = attrs.match(/\bcontent=\{\s*t\(\s*(['"])([\w.]+)\1\s*\)\s*\}/);
    if (tContentMatch) {
      const key = tContentMatch[2];
      rawContent = `{t('${key}')}`;
    } else {
      // Pattern 2: content={t('key', { defaultValue: 'fallback' })}
      const tFallbackMatch = attrs.match(/\bcontent=\{\s*t\(\s*(['"])([\w.]+)\1\s*,\s*\{\s*defaultValue:\s*(['"])([^'"]*)\3\s*\}\s*\)\s*\}/);
      if (tFallbackMatch) {
        const key = tFallbackMatch[2];
        const fallback = tFallbackMatch[4];
        rawContent = `{t('${key}', { defaultValue: '${fallback}' })}`;
      } else {
        // Pattern 3: content="static string" or content='static string'
        const staticMatch = attrs.match(/\bcontent=["']([^"']*)["']/);
        if (staticMatch) {
          rawContent = staticMatch[1];
        } else {
          // Pattern 4: content={expression} — capture the full braced expression
          const exprMatch = attrs.match(/\bcontent=\{([^}]+)\}/);
          if (exprMatch) {
            rawContent = exprMatch[1];
          }
        }
      }
    }

    if (rawContent === null) continue;

    const attrName = nameMatch?.[1] ?? null;
    const attrProperty = propertyMatch?.[1] ?? null;
    const resolved = resolveContent(rawContent, translations);

    if (attrName === 'description') {
      seo.meta_description = resolved || null;
    } else if (attrProperty === 'og:type') {
      seo.meta_og_type = resolved || null;
    } else if (attrProperty === 'og:image') {
      seo.meta_og_image = resolved || null;
    } else if (attrName === 'twitter:card') {
      seo.meta_twitter_card = resolved || null;
    } else if (attrName === 'twitter:title') {
      seo.meta_twitter_title = resolved || null;
    } else if (attrProperty === 'og:title' && !seo.meta_title) {
      seo.meta_title = resolved || null;
    } else if (attrProperty === 'og:description' && !seo.meta_description) {
      seo.meta_description = resolved || null;
    }
  }

  return seo;
}
