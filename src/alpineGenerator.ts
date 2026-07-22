import { parseHookCalls, findHookFile, parseHookFile, buildApiUrl, type HookCallInfo, type HookInfo } from './hookParser.js';
import { resolveKey } from './i18nResolver.js';

/**
 * Find the index of the matching closing bracket for the opener at `openIdx`.
 */
function findMatchingBracket(
  source: string,
  openIdx: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  let i = openIdx;
  let strChar: string | null = null;
  while (i < source.length) {
    const ch = source[i];
    if (strChar) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === strChar) { strChar = null; i++; continue; }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      strChar = ch;
      i++;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * Convert React event handlers to Alpine.js @click handlers.
 * Pattern: onClick={() => functionName('arg')} → @click="functionName('arg')"
 * Pattern: onClick={() => window.location.reload()} → @click="window.location.reload()"
 */
export function convertEventHandlersToAlpine(html: string): string {
  // onClick={() => functionName(args)} → @click="functionName(args)"
  let result = html.replace(
    /\bonClick=\{\(\)\s*=>\s*([^}]+)\}/g,
    (_match, expr: string) => {
      const trimmed = expr.trim().replace(/\s+/g, ' ');
      return `@click="${trimmed}"`;
    },
  );

  // onChange, onSubmit — convert similarly
  result = result.replace(
    /\bonChange=\{\([^}]+\)\s*=>\s*([^}]+)\}/g,
    (_match, expr: string) => `@change="${expr.trim()}"`,
  );
  result = result.replace(
    /\bonSubmit=\{\([^}]+\)\s*=>\s*([^}]+)\}/g,
    (_match, expr: string) => `@submit.prevent="${expr.trim()}"`,
  );

  return result;
}

/**
 * Expand {Array.from({ length: N }).map((_, i) => (template))} to N static copies.
 */
function expandArrayFrom(html: string): string {
  const regex = /\{\s*Array\.from\(\s*\{\s*length:\s*(\d+)\s*\}\s*\)\.map\s*\(\s*\(\s*_\s*,\s*(\w+)\s*\)\s*=>\s*\(/g;
  let result = '';
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const count = parseInt(match[1], 10);
    const indexVar = match[2];
    const templateOpen = match.index + match[0].length - 1;
    const templateClose = findMatchingBracket(html, templateOpen, '(', ')');
    if (templateClose === -1) continue;

    let j = templateClose + 1;
    while (j < html.length && /\s/.test(html[j])) j++;
    if (html[j] !== ')') continue;
    j++;
    while (j < html.length && /\s/.test(html[j])) j++;
    if (html[j] !== '}') continue;
    const wholeEnd = j + 1;

    const template = html.slice(templateOpen + 1, templateClose);
    const copies: string[] = [];
    for (let i = 0; i < count; i++) {
      copies.push(template.replace(new RegExp(`\\{\\s*${indexVar}\\s*\\}`, 'g'), String(i)).replace(new RegExp(`key=\\{\\s*${indexVar}\\s*\\}`, 'g'), ''));
    }

    result += html.slice(lastEnd, match.index) + copies.join('\n');
    lastEnd = wholeEnd;
    regex.lastIndex = wholeEnd;
  }

  result += html.slice(lastEnd);
  return result;
}

/**
 * Convert a braced expression like {item.field} to an Alpine.js x-text binding.
 * If the expression is a dynamic t() call, convert to i18n lookup.
 * Returns the replacement string, or null if the expression can't be converted.
 */
function convertBracedExpr(expr: string, itemVar: string): string | null {
  const trimmed = expr.trim();

  // Dynamic t() call: t(`categories.${item.field}`) → i18n.categories[item.field]
  const dynamicTMatch = trimmed.match(/^t\(`(\w+)\.\$\{(\w+)\.(\w+)\}`\)$/);
  if (dynamicTMatch) {
    const section = dynamicTMatch[1];
    const varName = dynamicTMatch[2];
    const field = dynamicTMatch[3];
    if (varName === itemVar) {
      return `i18n.${section}[${varName}.${field}]`;
    }
  }

  // Simple field reference: item.field or item.field?.subfield
  if (new RegExp(`^${itemVar}\\.`).test(trimmed)) {
    return trimmed;
  }

  // Expression with fallback: item.field || 'default'
  const fallbackMatch = trimmed.match(new RegExp(`^${itemVar}\\.(\\w+)\\s*\\|\\|\\s*['"]([^'"]*)['"]$`));
  if (fallbackMatch) {
    return trimmed;
  }

  // tours.length or similar expressions referencing the item var
  if (trimmed.includes(itemVar + '.')) {
    return trimmed;
  }

  return null;
}

/**
 * Process a template from a .map() expression to convert braced expressions
 * to Alpine.js bindings (x-text, :attr, x-if).
 */
function processTemplate(template: string, itemVar: string): string {
  let result = template;

  // Remove key={...} attributes (moved to <template x-for>)
  result = result.replace(/\s+key=\{[^}]*\}/g, '');

  // Convert && conditionals: {expr && (<JSX>)} → <template x-if="expr"><JSX></template>
  const andRegex = /\{\s*([^{}]+?)\s*&&\s*\(/g;
  let andMatch: RegExpExecArray | null;
  while ((andMatch = andRegex.exec(result)) !== null) {
    const condition = andMatch[1].trim();
    const parenOpen = andMatch.index + andMatch[0].length - 1;
    const parenClose = findMatchingBracket(result, parenOpen, '(', ')');
    if (parenClose === -1) continue;

    let j = parenClose + 1;
    while (j < result.length && /\s/.test(result[j])) j++;
    if (result[j] !== '}') continue;
    const wholeEnd = j + 1;

    const innerJsx = result.slice(parenOpen + 1, parenClose).trim();
    const alpineCond = condition.replace(new RegExp(`${itemVar}\\.`, 'g'), `${itemVar}.`);

    const replacement = `<template x-if="${alpineCond}">${innerJsx}</template>`;
    result = result.slice(0, andMatch.index) + replacement + result.slice(wholeEnd);
    andRegex.lastIndex = andMatch.index + replacement.length;
  }

  // Convert ternary conditionals inside template: {cond ? (A) : (B)}
  // Simple two-branch ternary
  const ternaryRegex = /\{([^{}]+?)\s*\?\s*\(([\s\S]*?)\)\s*:\s*\(([\s\S]*?)\)\s*\}/g;
  result = result.replace(ternaryRegex, (_match, cond: string, branchA: string, branchB: string) => {
    const condition = cond.trim();
    return `<template x-if="${condition}">${branchA.trim()}</template><template x-if="!(${condition})">${branchB.trim()}</template>`;
  });

  // Convert attribute bindings: ={item.field} → :attr="item.field"
  // Match: attrName={itemVar.field} or attrName={itemVar.field?.subfield}
  result = result.replace(
    new RegExp(`(\\w+)=\\{(${itemVar}\\.[^}]+)\\}`, 'g'),
    (_match, attr: string, expr: string) => `:${attr}="${expr.trim()}"`,
  );

  // Convert template literal attributes: href={`prefix${item.field}`} → :href="'prefix' + item.field"
  result = result.replace(
    /(\w+)=\{`([^`]*)`\}/g,
    (_match, attr: string, template: string) => {
      const alpineExpr = template
        .replace(/\$\{([^}]+)\}/g, "' + $1 + '")
        .replace(/^' \+ /, '')
        .replace(/ \+ '$/, '');
      return `:${attr}="${alpineExpr}"`;
    },
  );

  // Convert standalone braced expressions to <span x-text="...">
  // {item.field} → <span x-text="item.field"></span>
  // {t(`categories.${item.field}`)} → <span x-text="i18n.categories[item.field]"></span>
  result = result.replace(
    /\{([^{}]+)\}/g,
    (match, expr: string) => {
      // Skip if it's already inside an Alpine.js attribute (x-text, x-if, x-show, x-for, :)
      // This regex only matches top-level braced expressions in text content
      const converted = convertBracedExpr(expr, itemVar);
      if (converted !== null) {
        return `<span x-text="${converted}"></span>`;
      }
      // If it can't be converted, leave it — stripBracedExpressions will handle it
      return match;
    },
  );

  return result;
}

/**
 * Find all {var.map((item) => (...))} expressions where var is a hook data variable,
 * and convert them to <template x-for> with Alpine.js bindings.
 */
export function convertHookMapsToAlpine(
  html: string,
  hookCalls: HookCallInfo[],
  appDir: string,
  translations: Record<string, unknown> | null,
): string {
  const hookDataVars = new Set(hookCalls.map(h => h.dataVar));
  if (hookDataVars.size === 0) return html;

  // Match {var.map((item) => (template))} or {var?.map((item) => (template))}
  const mapRegex = /\{\s*(\w+)\??\.map\s*\(\s*\(\s*(\w+)(?:\s*,\s*\w+)?\s*\)\s*=>\s*\(/g;
  let result = '';
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = mapRegex.exec(html)) !== null) {
    const varName = match[1];
    const itemVar = match[2];

    if (!hookDataVars.has(varName)) {
      continue;
    }

    const templateOpen = match.index + match[0].length - 1;
    const templateClose = findMatchingBracket(html, templateOpen, '(', ')');
    if (templateClose === -1) continue;

    let j = templateClose + 1;
    while (j < html.length && /\s/.test(html[j])) j++;
    if (html[j] !== ')') continue;
    j++;
    while (j < html.length && /\s/.test(html[j])) j++;
    if (html[j] !== '}') continue;
    const wholeEnd = j + 1;

    const rawTemplate = html.slice(templateOpen + 1, templateClose);
    const processedTemplate = processTemplate(rawTemplate, itemVar);

    const replacement = `<template x-for="${itemVar} in ${varName}" :key="${itemVar}.id">${processedTemplate}</template>`;

    result += html.slice(lastEnd, match.index) + replacement;
    lastEnd = wholeEnd;
    mapRegex.lastIndex = wholeEnd;
  }

  result += html.slice(lastEnd);
  return result;
}

/**
 * Map a React condition expression to an Alpine.js condition.
 */
function mapCondition(cond: string): string {
  let result = cond.trim();

  // isLoading → loading
  result = result.replace(/\bisLoading\b/g, 'loading');
  // error (truthy check) → error
  // tours && tours.length > 0 → tours.length > 0
  result = result.replace(/^(\w+)\s*&&\s*\1\.length\s*>\s*0$/, '$1.length > 0');
  // selectedCategory !== 'all' → selectedCategory !== 'all' (no change needed)

  return result;
}

/**
 * Convert ternary conditional chains to x-show blocks.
 * Pattern: {cond1 ? (A) : cond2 ? (B) : ... : (last)}
 */
export function convertConditionalsToAlpine(html: string, hookCalls: HookCallInfo[]): string {
  const loadingVar = hookCalls.find(h => h.isLoadingVar)?.isLoadingVar || 'isLoading';
  const errorVar = hookCalls.find(h => h.errorVar)?.errorVar || 'error';

  // Find braced expressions that contain ternary chains
  // We look for { followed by a condition and ?
  const braceRegex = /\{/g;
  let result = html;
  let braceMatch: RegExpExecArray | null;

  while ((braceMatch = braceRegex.exec(result)) !== null) {
    const braceOpen = braceMatch.index;
    // Find matching close brace
    let depth = 0;
    let strChar: string | null = null;
    let braceClose = -1;
    for (let i = braceOpen; i < result.length; i++) {
      const ch = result[i];
      if (strChar) {
        if (ch === '\\') { i++; continue; }
        if (ch === strChar) { strChar = null; }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { strChar = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { braceClose = i; break; }
      }
    }
    if (braceClose === -1) continue;

    const inner = result.slice(braceOpen + 1, braceClose);

    // Check if this is a ternary chain (contains ? at top level)
    if (!/\?/.test(inner)) continue;

    // Parse the ternary chain
    const branches = parseTernaryChain(inner);
    if (!branches || branches.length < 2) continue;

    // Build x-show blocks
    const xShowBlocks: string[] = [];
    const allConditions: string[] = [];

    for (let i = 0; i < branches.length; i++) {
      const { condition, branch } = branches[i];
      const cleanBranch = branch.trim();

      if (condition) {
        const alpineCond = mapCondition(condition);
        allConditions.push(alpineCond);

        // For the last branch with a condition, also add the negation of all previous
        const negation = allConditions.slice(0, -1).map(c => `!(${c})`).join(' && ');
        const fullCond = negation ? `${alpineCond} && ${negation}` : alpineCond;
        xShowBlocks.push(wrapInXShow(cleanBranch, fullCond));
      } else {
        // Else branch — negate all previous conditions
        const negation = allConditions.map(c => `!(${c})`).join(' && ');
        xShowBlocks.push(wrapInXShow(cleanBranch, negation || 'true'));
      }
    }

    const replacement = xShowBlocks.join('\n');
    result = result.slice(0, braceOpen) + replacement + result.slice(braceClose + 1);
    braceRegex.lastIndex = braceOpen + replacement.length;
  }

  return result;
}

/**
 * Wrap JSX content in a div with x-show, or add x-show to the root element
 * if it's a single tag.
 */
function wrapInXShow(jsx: string, condition: string): string {
  const trimmed = jsx.trim();

  // If it starts with <> (React fragment), convert to div
  if (trimmed.startsWith('<>') && trimmed.endsWith('</>')) {
    const inner = trimmed.slice(2, -3).trim();
    return `<div x-show="${condition}">${inner}</div>`;
  }

  // If it's a single opening tag, add x-show to it
  const singleTagMatch = trimmed.match(/^<(\w+)(\s[^>]*)>([\s\S]*)<\/\1>$/);
  if (singleTagMatch) {
    const tag = singleTagMatch[1];
    const attrs = singleTagMatch[2] || '';
    const inner = singleTagMatch[3];
    return `<${tag} x-show="${condition}"${attrs}>${inner}</${tag}>`;
  }

  // Default: wrap in a div
  return `<div x-show="${condition}">${trimmed}</div>`;
}

/**
 * Parse a ternary chain string into branches.
 * Returns array of { condition: string | null, branch: string }.
 */
function parseTernaryChain(content: string): Array<{ condition: string | null; branch: string }> | null {
  const branches: Array<{ condition: string | null; branch: string }> = [];
  let pos = 0;

  while (pos < content.length) {
    // Find the next ? at the top level (not inside parens, brackets, strings)
    let qPos = -1;
    let depth = 0;
    let strChar: string | null = null;
    for (let i = pos; i < content.length; i++) {
      const ch = content[i];
      if (strChar) {
        if (ch === '\\') { i++; continue; }
        if (ch === strChar) { strChar = null; }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { strChar = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      if (ch === '?' && depth === 0) { qPos = i; break; }
    }

    if (qPos === -1) {
      // No more ternary operators — this is the else branch
      // But only if we already have branches
      if (branches.length === 0) return null;
      const rest = content.slice(pos).trim();
      if (rest) {
        // The else branch should start with : followed by (...)
        const elseMatch = rest.match(/^:\s*\(([\s\S]*)\)\s*$/);
        if (elseMatch) {
          branches.push({ condition: null, branch: elseMatch[1].trim() });
        }
      }
      break;
    }

    // Extract condition (everything from pos to ?)
    const condition = content.slice(pos, qPos).trim();

    // After ?, find the branch (should be wrapped in parens)
    let afterQ = qPos + 1;
    while (afterQ < content.length && /\s/.test(content[afterQ])) afterQ++;
    if (content[afterQ] !== '(') return null;

    const branchClose = findMatchingBracket(content, afterQ, '(', ')');
    if (branchClose === -1) return null;

    const branch = content.slice(afterQ + 1, branchClose).trim();
    branches.push({ condition, branch });

    // Move past the branch
    pos = branchClose + 1;
    // Skip whitespace and :
    while (pos < content.length && (/\s/.test(content[pos]) || content[pos] === ':')) {
      if (content[pos] === ':') { pos++; break; }
      pos++;
    }
  }

  return branches.length >= 2 ? branches : null;
}

/**
 * Extract i18n sections needed by dynamic t() calls in the HTML.
 * Looks for t(`section.${var}`) patterns and returns the corresponding
 * sections from the translations object.
 */
function extractNeededI18nSections(
  html: string,
  translations: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!translations) return {};

  const needed: Record<string, unknown> = {};
  const sectionRegex = /t\(`(\w+)\.\$\{[^}]+\}`\)/g;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(html)) !== null) {
    const section = match[1];
    if (translations[section] !== undefined && !needed[section]) {
      needed[section] = translations[section];
    }
  }

  return needed;
}

/**
 * Generate the Alpine.js x-data object string with state variables,
 * i18n data, and init() method with fetch calls.
 */
function generateAlpineData(
  html: string,
  hookCalls: HookCallInfo[],
  appDir: string,
  translations: Record<string, unknown> | null,
): string {
  const stateLines: string[] = [];
  const initLines: string[] = [];

  // Add state from useState defaults (parse from raw source — handled by caller)
  // For now, add hook data variables
  for (const call of hookCalls) {
    // Initialize data var as empty array (or null for single-item hooks)
    const hookFile = findHookFile(appDir, call.hookName);
    const hookInfo = hookFile ? parseHookFile(hookFile) : null;
    const initialValue = hookInfo?.isSingle ? 'null' : '[]';
    stateLines.push(`${call.dataVar}: ${initialValue}`);

    if (call.isLoadingVar) {
      stateLines.push(`${call.isLoadingVar}: true`);
    }
    if (call.errorVar) {
      stateLines.push(`${call.errorVar}: null`);
    }

    // Generate fetch call for init()
    if (hookInfo) {
      const { baseUrl, dynamicParams } = buildApiUrl(hookInfo);
      const dataVar = call.dataVar;
      const loadingVar = call.isLoadingVar || '';
      const errorVar = call.errorVar || '';

      // Build fetch with dynamic filter support
      if (dynamicParams.length > 0) {
        // Need conditional URL building
        const dynamicParts = dynamicParams.map(df => {
          return `if (this.${df.paramVar} && this.${df.paramVar} !== 'all') url += '&${df.column}=' + this.${df.paramVar};`;
        }).join(' ');

        initLines.push(`try {
  let url = '${baseUrl}'${dynamicParts}
  const res = await fetch(url);
  this.${dataVar} = await res.json();${loadingVar ? ` this.${loadingVar} = false;` : ''}
} catch(e) {${errorVar ? ` this.${errorVar} = e;` : ''}${loadingVar ? ` this.${loadingVar} = false;` : ''} }`);
      } else {
        initLines.push(`try {
  const res = await fetch('${baseUrl}');
  this.${dataVar} = await res.json();${loadingVar ? ` this.${loadingVar} = false;` : ''}
} catch(e) {${errorVar ? ` this.${errorVar} = e;` : ''}${loadingVar ? ` this.${loadingVar} = false;` : ''} }`);
      }
    }
  }

  // Add i18n sections needed by dynamic t() calls
  const i18nSections = extractNeededI18nSections(html, translations);
  if (Object.keys(i18nSections).length > 0) {
    stateLines.push(`i18n: ${JSON.stringify(i18nSections)}`);
  }

  // Build the x-data object
  const stateStr = stateLines.join(',\n  ');
  const initStr = initLines.join('\n  ');

  return `{
  ${stateStr},
  async init() {
    ${initStr}
  }
}`;
}

/**
 * Add x-data attribute to the root element of the HTML.
 */
function addAlpineToRoot(html: string, xData: string): string {
  // Find the first opening tag
  const tagMatch = html.match(/^(<(\w+)\b)/);
  if (!tagMatch) return html;

  // Insert x-data after the tag name
  const insertPos = tagMatch[1].length;
  return html.slice(0, insertPos) + ` x-data='${xData}'` + html.slice(insertPos);
}

/**
 * Main entry point: process the HTML to add Alpine.js for dynamic data.
 * Returns the HTML with x-data, x-for, x-show, and x-text bindings.
 */
export function processAlpineConversion(
  html: string,
  rawSource: string,
  appDir: string,
  translations: Record<string, unknown> | null,
): string {
  // Parse hook calls from the component source
  const hookCalls = parseHookCalls(rawSource);
  if (hookCalls.length === 0) return html;

  let result = html;

  // Expand Array.from({ length: N }).map() to static copies
  result = expandArrayFrom(result);

  // Convert hook-based .map() to <template x-for>
  result = convertHookMapsToAlpine(result, hookCalls, appDir, translations);

  // Convert ternary conditional chains to x-show blocks
  result = convertConditionalsToAlpine(result, hookCalls);

  // Generate and add x-data to the root element
  const xData = generateAlpineData(result, hookCalls, appDir, translations);
  result = addAlpineToRoot(result, xData);

  return result;
}
