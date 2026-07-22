import { PageComponent } from './parser.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getTSXFiles } from './utils/fileUtils.js';
import { replaceTranslationExpressions } from './i18nResolver.js';
import { extractSeoFromHelmet, type SeoData } from './seoExtractor.js';
import { convertEventHandlersToAlpine, processAlpineConversion } from './alpineGenerator.js';

export interface ConvertedPage {
  name: string;
  title: string;
  route: string;
  html: string;
  requiresLogin: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_og_type: string | null;
  meta_og_image: string | null;
  meta_twitter_card: string | null;
  meta_twitter_title: string | null;
}

/**
 * Find the index of the matching closing bracket for the opener at `openIdx`.
 * Tracks strings/template literals so brackets inside them don't affect depth.
 * Returns -1 if unbalanced.
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
 * Locate `const IDENT[: Type] = [ ... ]` in the source and return the array
 * body (text between the outer [ and ]). Returns null if not found.
 */
function findConstArrayBody(source: string, name: string): string | null {
  const re = new RegExp(`\\bconst\\s+${name}\\b\\s*(?::[^=]+)?=\\s*\\[`, 'g');
  const m = re.exec(source);
  if (!m) return null;
  const openIdx = source.indexOf('[', m.index + m[0].length - 1);
  if (openIdx === -1) return null;
  const closeIdx = findMatchingBracket(source, openIdx, '[', ']');
  if (closeIdx === -1) return null;
  return source.slice(openIdx + 1, closeIdx);
}

/**
 * Parse an array body (text between `[` and `]`) into a list of objects,
 * extracting string fields and JSX fields (parenthesized expressions).
 */
function parseObjectArrayItems(arrayBody: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  let i = 0;
  while (i < arrayBody.length) {
    while (i < arrayBody.length && arrayBody[i] !== '{') i++;
    if (i >= arrayBody.length) break;
    const end = findMatchingBracket(arrayBody, i, '{', '}');
    if (end === -1) break;
    const body = arrayBody.slice(i + 1, end);
    items.push(parseObjectLiteral(body));
    i = end + 1;
  }
  return items;
}

function parseObjectLiteral(body: string): Record<string, string> {
  const obj: Record<string, string> = {};
  // String values: key: "value"  or  key: 'value'
  const strRe = /(\w+)\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(body)) !== null) {
    obj[m[1]] = (m[2] ?? m[3] ?? '').replace(/\\(.)/g, '$1');
  }
  // Parenthesized JSX values: key: ( ... )
  const parenRe = /(\w+)\s*:\s*\(/g;
  while ((m = parenRe.exec(body)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = findMatchingBracket(body, openIdx, '(', ')');
    if (closeIdx !== -1) {
      obj[m[1]] = body.slice(openIdx + 1, closeIdx).trim();
    }
  }
  return obj;
}

/**
 * Expand {IDENT.map((param[, idx]) => ( TEMPLATE ))} expressions in the JSX
 * by looking up the array `IDENT` in the raw source file and cloning the
 * template once per item, substituting `{param.key}` and `={param.key}`
 * occurrences.
 */
function expandMapExpressions(jsx: string, rawSource: string): string {
  const mapRe = /\{\s*(\w+)\.map\s*\(\s*\(\s*(\w+)(?:\s*,\s*\w+)?\s*\)\s*=>\s*\(/g;
  let out = '';
  let lastEnd = 0;
  let m: RegExpExecArray | null;

  while ((m = mapRe.exec(jsx)) !== null) {
    const arrName = m[1];
    const paramName = m[2];
    const tplOpen = m.index + m[0].length - 1; // position of '(' before template
    const tplClose = findMatchingBracket(jsx, tplOpen, '(', ')');
    if (tplClose === -1) continue;
    const template = jsx.slice(tplOpen + 1, tplClose);

    // After the template there should be `)` closing `.map(` then `}` closing `{`
    let j = tplClose + 1;
    while (j < jsx.length && /\s/.test(jsx[j])) j++;
    if (jsx[j] !== ')') continue;
    j++;
    while (j < jsx.length && /\s/.test(jsx[j])) j++;
    if (jsx[j] !== '}') continue;
    const wholeEnd = j + 1;

    const arrBody = findConstArrayBody(rawSource, arrName);
    if (arrBody == null) continue;
    const items = parseObjectArrayItems(arrBody);
    if (items.length === 0) continue;

    const expanded = items
      .map(item => substituteItem(template, paramName, item))
      .join('\n');

    out += jsx.slice(lastEnd, m.index) + expanded;
    lastEnd = wholeEnd;
    // Re-seek regex past the end of the expansion in the original string
    mapRe.lastIndex = wholeEnd;
  }
  out += jsx.slice(lastEnd);
  return out;
}

function expandInlineArrayMapExpressions(jsx: string): string {
  let out = '';
  let cursor = 0;

  while (cursor < jsx.length) {
    const start = jsx.indexOf('{[', cursor);
    if (start === -1) {
      out += jsx.slice(cursor);
      break;
    }

    const arrayOpen = start + 1;
    const arrayClose = findMatchingBracket(jsx, arrayOpen, '[', ']');
    if (arrayClose === -1) {
      out += jsx.slice(cursor, start + 2);
      cursor = start + 2;
      continue;
    }

    const mapMatch = /^\s*\.map\s*\(\s*\(\s*(\w+)(?:\s*,\s*\w+)?\s*\)\s*=>\s*\(/.exec(jsx.slice(arrayClose + 1));
    if (!mapMatch) {
      out += jsx.slice(cursor, arrayClose + 1);
      cursor = arrayClose + 1;
      continue;
    }

    const paramName = mapMatch[1];
    const templateOpen = arrayClose + 1 + mapMatch[0].length - 1;
    const templateClose = findMatchingBracket(jsx, templateOpen, '(', ')');
    if (templateClose === -1) {
      out += jsx.slice(cursor, start + 2);
      cursor = start + 2;
      continue;
    }

    let end = templateClose + 1;
    while (end < jsx.length && /\s/.test(jsx[end])) end++;
    if (jsx[end] !== ')') {
      out += jsx.slice(cursor, start + 2);
      cursor = start + 2;
      continue;
    }
    end++;
    while (end < jsx.length && /\s/.test(jsx[end])) end++;
    if (jsx[end] !== '}') {
      out += jsx.slice(cursor, start + 2);
      cursor = start + 2;
      continue;
    }

    const items = parseObjectArrayItems(jsx.slice(arrayOpen + 1, arrayClose));
    if (items.length === 0) {
      out += jsx.slice(cursor, start + 2);
      cursor = start + 2;
      continue;
    }

    const template = jsx.slice(templateOpen + 1, templateClose);
    out += jsx.slice(cursor, start) + items.map(item => substituteItem(template, paramName, item)).join('\n');
    cursor = end + 1;
  }

  return out;
}

function substituteItem(
  template: string,
  paramName: string,
  item: Record<string, string>,
): string {
  let t = template;
  for (const key of Object.keys(item)) {
    const val = item[key];
    // Attribute form: ={param.key}  -> ="value"
    t = t.replace(
      new RegExp(`=\\{\\s*${paramName}\\.${key}\\s*\\}`, 'g'),
      `="${val.replace(/"/g, '&quot;')}"`,
    );
    // Text form: {param.key} -> value
    t = t.replace(
      new RegExp(`\\{\\s*${paramName}\\.${key}\\s*\\}`, 'g'),
      val,
    );
  }
  return t;
}

/**
 * Remove balanced curly-brace expressions, including nested ones.
 * Regex alone cannot handle nested braces reliably, so we walk the string.
 */
function stripBracedExpressions(input: string): string {
  let out = '';
  let depth = 0;
  let strChar: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (strChar) {
      if (ch === '\\') { i++; continue; }
      if (ch === strChar) { strChar = null; }
      // Any string inside a JSX expression (depth > 0) should be removed with the expression.
      if (depth > 0) {
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      strChar = ch;
      if (depth === 0) {
        out += ch;
      }
      continue;
    }
    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      if (depth > 0) {
        depth--;
        continue;
      }
    }
    if (depth === 0) {
      out += ch;
    }
  }
  return out;
}

/**
 * Find a component file by name in common directories (recursively through src/components)
 */
function findComponentFile(appDir: string, componentName: string): string | null {
  const searchDirs = [
    join(appDir, 'src/components'),
    join(appDir, 'src/components/ui'),
    join(appDir, 'src/lib/components'),
    join(appDir, 'components'),
  ];
  
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    
    const files = getTSXFiles(dir);
    for (const filePath of files) {
      const baseName = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') ?? '';
      if (baseName === componentName) {
        return filePath;
      }
    }
  }
  
  return null;
}

/**
 * Extract JSX content from a component file
 */
function extractComponentJSX(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8');
  
  // Use the same extraction logic as in parser.ts
  const returnRegex = /\breturn\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = returnRegex.exec(content)) !== null) {
    const parenIdx = match.index + match[0].length - 1;
    const closeIdx = findMatchingBracket(content, parenIdx, '(', ')');
    if (closeIdx !== -1) {
      const body = content.slice(parenIdx + 1, closeIdx);
      if (/<[A-Za-z]/.test(body)) {
        return body.trim();
      }
    }
  }
  
  // Components that use a bare return with a self-closing JSX element
  const bareReturnMatch = content.match(/\breturn\s+(<([A-Za-z][\w.]*)[^>]*\/>)\s*;?/);
  if (bareReturnMatch) {
    return bareReturnMatch[1];
  }
  
  // Fallback: find any top-level JSX-looking block
  const jsxMatch = content.match(/<([A-Za-z][\w.]*)[^>]*>[\s\S]*<\/\1>/);
  if (jsxMatch) {
    return jsxMatch[0];
  }
  
  return '';
}

/**
 * Expand custom component references like <GuestSignInForm /> by finding their source files
 * and replacing them with their JSX content
 */
const svgTags = new Set(['svg', 'path', 'circle', 'rect', 'polygon', 'line', 'polyline', 'ellipse', 'g', 'defs', 'clipPath', 'use', 'symbol', 'image', 'pattern', 'mask', 'filter', 'feGaussianBlur', 'feBlend', 'animate', 'animateTransform', 'text', 'tspan', 'foreignObject']);

function isShadcnUIPath(filePath: string): boolean {
  return filePath.includes('/ui/') || filePath.includes('/shadcn/');
}

function expandCustomComponents(jsx: string, appDir: string): string {
  const componentRegex = /<([A-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\s*\/?>(?:[\s\S]*?<\/\1>)?/g;
  let out = '';
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  
  while ((match = componentRegex.exec(jsx)) !== null) {
    const componentName = match[1];
    const fullMatch = match[0];
    
    if (svgTags.has(componentName.toLowerCase())) {
      out += jsx.slice(lastEnd, match.index) + fullMatch;
      lastEnd = match.index + fullMatch.length;
      continue;
    }
    
    const componentFile = findComponentFile(appDir, componentName);
    if (componentFile && !isShadcnUIPath(componentFile)) {
      const componentJSX = extractComponentJSX(componentFile);
      if (componentJSX) {
        const expandedJSX = expandCustomComponents(componentJSX, appDir);
        out += jsx.slice(lastEnd, match.index) + expandedJSX;
        lastEnd = match.index + fullMatch.length;
        continue;
      }
    }
    
    out += jsx.slice(lastEnd, match.index) + fullMatch;
    lastEnd = match.index + fullMatch.length;
  }
  
  out += jsx.slice(lastEnd);
  return convertUIComponentsToHTML(out);
}

/**
 * Convert UI components to their underlying HTML elements
 * This is a post-processing step that handles remaining UI components
 */
function componentAttributes(attrs: string, classes: string, remove: string[] = []): string {
  const classMatch = attrs.match(/\s+className=(?:"([^"]*)"|'([^']*)')/);
  const existingClasses = classMatch?.[1] ?? classMatch?.[2] ?? '';
  let output = attrs.replace(/\s+className=(?:"[^"]*"|'[^']*')/g, '');

  for (const prop of remove) {
    output = output.replace(new RegExp(`\\s+${prop}=(?:"[^"]*"|'[^']*'|\\{[^}]*\\})`, 'g'), '');
  }

  return ` className="${[classes, existingClasses].filter(Boolean).join(' ')}"${output}`;
}

function convertUIComponentsToHTML(html: string): string {
  const cardClasses = 'rounded-xl border bg-card text-card-foreground shadow';
  const inputClasses = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';
  const labelClasses = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
  const buttonBaseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed';
  const buttonVariants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };
  const buttonSizes: Record<string, string> = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-8',
    icon: 'h-9 w-9',
  };

  const cardHeaderClasses = 'flex flex-col space-y-1.5 p-6';
  const cardTitleClasses = 'font-semibold leading-none tracking-tight';
  const cardDescriptionClasses = 'text-sm text-muted-foreground';
  const cardContentClasses = 'p-6 pt-0';
  const cardFooterClasses = 'flex items-center p-6 pt-0';
  const skeletonClasses = 'animate-pulse rounded-md bg-muted';

  html = html.replace(/<Card\b([^>]*)>([\s\S]*?)<\/Card>/g, (_match, attrs: string, content: string) =>
    `<div${componentAttributes(attrs, cardClasses)}>${content}</div>`);
  html = html.replace(/<Card\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<div${componentAttributes(attrs, cardClasses)}></div>`);
  html = html.replace(/<CardHeader\b([^>]*)>([\s\S]*?)<\/CardHeader>/g, (_match, attrs: string, content: string) =>
    `<div${componentAttributes(attrs, cardHeaderClasses)}>${content}</div>`);
  html = html.replace(/<CardHeader\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<div${componentAttributes(attrs, cardHeaderClasses)}></div>`);
  html = html.replace(/<CardTitle\b([^>]*)>([\s\S]*?)<\/CardTitle>/g, (_match, attrs: string, content: string) =>
    `<div${componentAttributes(attrs, cardTitleClasses)}>${content}</div>`);
  html = html.replace(/<CardTitle\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<div${componentAttributes(attrs, cardTitleClasses)}></div>`);
  html = html.replace(/<CardDescription\b([^>]*)>([\s\S]*?)<\/CardDescription>/g, (_match, attrs: string, content: string) =>
    `<div${componentAttributes(attrs, cardDescriptionClasses)}>${content}</div>`);
  html = html.replace(/<CardDescription\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<div${componentAttributes(attrs, cardDescriptionClasses)}></div>`);
  html = html.replace(/<CardContent\b([^>]*)>([\s\S]*?)<\/CardContent>/g, (_match, attrs: string, content: string) =>
    `<div${componentAttributes(attrs, cardContentClasses)}>${content}</div>`);
  html = html.replace(/<CardContent\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<div${componentAttributes(attrs, cardContentClasses)}></div>`);
  html = html.replace(/<CardFooter\b([^>]*)>([\s\S]*?)<\/CardFooter>/g, (_match, attrs: string, content: string) =>
    `<div${componentAttributes(attrs, cardFooterClasses)}>${content}</div>`);
  html = html.replace(/<CardFooter\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<div${componentAttributes(attrs, cardFooterClasses)}></div>`);
  html = html.replace(/<Skeleton\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<div${componentAttributes(attrs, skeletonClasses)}></div>`);
  html = html.replace(/<Input\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<input${componentAttributes(attrs, inputClasses)} />`);
  html = html.replace(/<Label\b([^>]*)>([\s\S]*?)<\/Label>/g, (_match, attrs: string, content: string) =>
    `<label${componentAttributes(attrs, labelClasses)}>${content}</label>`);
  html = html.replace(/<Label\b([^>]*)\/>/g, (_match, attrs: string) =>
    `<label${componentAttributes(attrs, labelClasses)}></label>`);
  html = html.replace(/<Button\b([^>]*)>([\s\S]*?)<\/Button>/g, (_match, attrs: string, content: string) => {
    const variant = attrs.match(/\s+variant=["']([^"']+)["']/)?.[1] ?? 'default';
    const size = attrs.match(/\s+size=["']([^"']+)["']/)?.[1] ?? 'default';
    const classes = [buttonBaseClasses, buttonVariants[variant] ?? buttonVariants.default, buttonSizes[size] ?? buttonSizes.default].join(' ');
    return `<button${componentAttributes(attrs, classes, ['variant', 'size', 'asChild'])}>${content}</button>`;
  });
  html = html.replace(/<Button\b([^>]*)\/>/g, (_match, attrs: string) => {
    const variant = attrs.match(/\s+variant=["']([^"']+)["']/)?.[1] ?? 'default';
    const size = attrs.match(/\s+size=["']([^"']+)["']/)?.[1] ?? 'default';
    const classes = [buttonBaseClasses, buttonVariants[variant] ?? buttonVariants.default, buttonSizes[size] ?? buttonSizes.default].join(' ');
    return `<button${componentAttributes(attrs, classes, ['variant', 'size', 'asChild'])}></button>`;
  });
  html = html.replace(/<Textarea\b([^>]*)\/>/g, '<textarea$1></textarea>');
  html = html.replace(/<Textarea\b/g, '<textarea');
  html = html.replace(/<\/Textarea>/g, '</textarea>');
  html = html.replace(/<Switch\b([^>]*)\/>/g, '<input type="checkbox"$1/>');
  html = html.replace(/<Checkbox\b([^>]*)\/>/g, '<input type="checkbox"$1/>');
  html = html.replace(/<Check\b([^>]*)\/>/g, '<span$1></span>');
  html = html.replace(/<Loader2\b([^>]*)\/>/g, '<span$1></span>');

  return html;
}

function renderStaticExpressions(html: string, rawSource: string): string {
  const values = new Map<string, string | boolean>();
  const stateRegex = /const\s+\[\s*(\w+)\s*,[^\]]*\]\s*=\s*useState(?:<[^>]*>)?\(\s*(?:(["'])(.*?)\2|(true|false))\s*\)/g;
  let stateMatch: RegExpExecArray | null;

  while ((stateMatch = stateRegex.exec(rawSource)) !== null) {
    values.set(stateMatch[1], stateMatch[3] ?? stateMatch[4] === 'true');
  }

  return html.replace(/\{\s*(\w+)\s*===\s*(["'])(.*?)\2\s*\?\s*(["'])(.*?)\4\s*:\s*(["'])(.*?)\6\s*\}/g, (_match, name: string, _quote: string, expected: string, _trueQuote: string, whenTrue: string, _falseQuote: string, whenFalse: string) => {
    const value = values.get(name);
    return value === expected ? whenTrue : whenFalse;
  }).replace(/\{\s*(\w+)\s*\?\s*(["'])(.*?)\2\s*:\s*(["'])(.*?)\4\s*\}/g, (_match, name: string, _trueQuote: string, whenTrue: string, _falseQuote: string, whenFalse: string) =>
    values.get(name) === true ? whenTrue : whenFalse);
}

/**
 * Expand common UI components to their underlying HTML elements
 */
function expandUIComponent(fullMatch: string, componentName: string): string | null {
  switch (componentName) {
    case 'Input':
      // Convert <Input ...props /> to <input ...props />
      return fullMatch.replace(/^<Input\b/, '<input').replace(/\/>$/, '/>');
    
    case 'Button':
      // Convert <Button ...props /> to <button ...props /> or <button ...props>...</button>
      if (fullMatch.includes('/>')) {
        return fullMatch.replace(/^<Button\b/, '<button').replace(/\/>$/, '></button>');
      }
      return fullMatch.replace(/^<Button\b/, '<button').replace(/<\/Button>$/, '</button>');
    
    case 'Label':
      // Convert <Label ...props /> to <label ...props /> or <label ...props>...</label>
      if (fullMatch.includes('/>')) {
        return fullMatch.replace(/^<Label\b/, '<label').replace(/\/>$/, '></label>');
      }
      return fullMatch.replace(/^<Label\b/, '<label').replace(/<\/Label>$/, '</label>');
    
    case 'Textarea':
      // Convert <Textarea ...props /> to <textarea ...props /> or <textarea ...props>...</textarea>
      if (fullMatch.includes('/>')) {
        return fullMatch.replace(/^<Textarea\b/, '<textarea').replace(/\/>$/, '></textarea>');
      }
      return fullMatch.replace(/^<Textarea\b/, '<textarea').replace(/<\/Textarea>$/, '</textarea>');
    
    case 'Switch':
      // Convert <Switch ...props /> to <input type="checkbox" ...props />
      return fullMatch.replace(/^<Switch\b([^>]*)\/?>/, '<input type="checkbox"$1/>');
    
    case 'Checkbox':
      // Convert <Checkbox ...props /> to <input type="checkbox" ...props />
      return fullMatch.replace(/^<Checkbox\b([^>]*)\/?>/, '<input type="checkbox"$1/>');
    
    default:
      return null;
  }
}

/**
 * Collect all lucide-react icon names from the page source, iconResolver.ts,
 * and all component files in src/components/.
 */
function collectIconNames(rawContent: string, appDir?: string): Set<string> {
  const iconNames = new Set<string>();

  // Parse imports from the page's raw content
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(rawContent)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
    names.forEach(n => { if (n && n !== 'type' && n !== 'LucideIcon' && /^[A-Z]/.test(n)) iconNames.add(n); });
  }

  if (appDir) {
    // Check iconResolver.ts for ICON_MAP
    const resolverPath = join(appDir, 'src', 'lib', 'iconResolver.ts');
    if (existsSync(resolverPath)) {
      const resolverContent = readFileSync(resolverPath, 'utf-8');
      const mapMatch = resolverContent.match(/ICON_MAP[^{]*\{([^}]+)\}/);
      if (mapMatch) {
        const names = mapMatch[1].match(/\b([A-Z]\w+)\b/g);
        if (names) names.forEach(n => iconNames.add(n));
      }
    }

    // Scan all component files for lucide-react imports
    const componentsDir = join(appDir, 'src', 'components');
    if (existsSync(componentsDir)) {
      const files = getTSXFiles(componentsDir);
      for (const filePath of files) {
        const content = readFileSync(filePath, 'utf-8');
        let impMatch: RegExpExecArray | null;
 const impRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
        while ((impMatch = impRegex.exec(content)) !== null) {
          const names = impMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
          names.forEach(n => { if (n && n !== 'type' && n !== 'LucideIcon' && /^[A-Z]/.test(n)) iconNames.add(n); });
        }
      }
    }
  }

  return iconNames;
}

/**
 * Replace lucide-react icon components with placeholder spans.
 * <Sparkles className="h-3.5 w-3.5" /> → <span class="icon h-3.5 w-3.5" data-icon="sparkles"></span>
 */
function replaceIconComponents(html: string, rawContent: string, appDir?: string): string {
  const iconNames = collectIconNames(rawContent, appDir);

  for (const iconName of iconNames) {
    // Match <IconName className="..." /> or <IconName class="..." />
    const iconRegex = new RegExp(`<${iconName}\\b([^>]*?)\\s*/?>`, 'g');
    html = html.replace(iconRegex, (_match, attrs: string) => {
      const classMatch = attrs.match(/(?:className|class)=["']([^"']*)['"]/);
      const classAttr = classMatch ? classMatch[1] : '';
      const otherAttrs = attrs.replace(/(?:className|class)=["'][^"']*['"]/g, '').trim();
      const otherAttrStr = otherAttrs ? ` ${otherAttrs}` : '';
      return `<span class="icon ${classAttr}"${otherAttrStr} data-icon="${iconName.toLowerCase()}"></span>`;
    });

    // Remove closing tags for non-self-closing usage
    html = html.replace(new RegExp(`</${iconName}>`, 'g'), '');
  }

  return html;
}

/**
 * Convert React JSX to semantic HTML.
 * Expects component.content to already be the JSX body (extracted by parser).
 */
export function convertJSXToHTML(
  component: PageComponent,
  appDir?: string,
  translations?: Record<string, unknown> | null,
): string {
  const jsxContent = component.content;

  // If no JSX content was extracted, create basic HTML
  if (!jsxContent || jsxContent.trim() === '') {
    return `<div class="page-content"><h1>${component.title || component.name}</h1></div>`;
  }

  let html = jsxContent;

  // Convert React event handlers to Alpine.js @click/@change/@submit
  html = convertEventHandlersToAlpine(html);

  // Strip remaining event handlers (onError, onLoad, etc.)
  html = html.replace(/\s+on[A-Z]\w+=\{(?:[^{}]|\{[^{}]*\})*\}/g, '');

  // Resolve i18n translation keys: {t('key.path')} → "English text"
  html = replaceTranslationExpressions(html, translations ?? null);

  // Convert UI components to HTML elements
  html = convertUIComponentsToHTML(html);

  // Expand custom components like <GuestSignInForm /> by finding their source files
  if (appDir) {
    html = expandCustomComponents(html, appDir);
  }

  // Replace lucide-react icons with placeholder spans
  html = replaceIconComponents(html, component.rawContent, appDir);

  html = expandInlineArrayMapExpressions(html);

  // Expand {arr.map((item) => ( <tpl/> ))} by reading `const arr = [...]`
  // from the raw source and cloning the template per item.
  if (component.rawContent) {
    html = expandMapExpressions(html, component.rawContent);
  }

  // Convert hook-based dynamic data to Alpine.js (x-for, x-show, x-data)
  if (appDir && component.rawContent) {
    html = processAlpineConversion(html, component.rawContent, appDir, translations ?? null);
  }

  // Resolve static ternary expressions from useState defaults
  if (component.rawContent) {
    html = renderStaticExpressions(html, component.rawContent);
  }

  // Strip JSX comments: {/* ... */}
  html = html.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // Convert React <Link to="..."> to <a href="...">
  html = html.replace(/<Link\b/g, '<a');
  html = html.replace(/<\/Link>/g, '</a>');
  html = html.replace(/\bto="/g, 'href="');

  // Convert JSX className to class
  html = html.replace(/className=/g, 'class=');

  // Handle common dynamic attribute patterns BEFORE stripping braces
  // Skip Alpine.js bound attributes (:src, :href) which use double quotes
  html = html.replace(/(?<![":])src=\{[^}]*\}/g, 'src="#"');
  html = html.replace(/(?<![":])href=\{[^}]*\}/g, 'href="#"');
  html = html.replace(/(?<![":])to=\{[^}]*\}/g, 'href="#"');

  // Handle form input dynamic attributes with appropriate defaults
  html = html.replace(/value=\{[^}]*\}/g, 'value=""');
  html = html.replace(/checked=\{[^}]*\}/g, '');
  html = html.replace(/disabled=\{[^}]*\}/g, '');
  html = html.replace(/maxLength=\{[^}]*\}/g, '');
  html = html.replace(/rows=\{[^}]*\}/g, 'rows="2"');
  html = html.replace(/onCheckedChange=\{[^}]*\}/g, '');
  html = html.replace(/onChange=\{[^}]*\}/g, '');
  html = html.replace(/onSubmit=\{[^}]*\}/g, '');
  html = html.replace(/aria-invalid=\{[^}]*\}/g, '');

  // Remove all braced expressions (handles nested braces like style={{ ... }})
  html = stripBracedExpressions(html);

  // Now clean attributes left with empty/dangling values
  // Preserve Alpine.js attributes (x-text, x-show, x-for, x-data, x-if, @click, :bind)
  html = html.replace(/\s+(key|style|width|height|on[A-Za-z]+)=(?=\s|>|\/)/g, '');
  html = html.replace(/\s+(key|style|width|height|on[A-Za-z]+)=""/g, '');

  // Remove dangling map/iteration scaffolding left after brace removal
  // e.g. "(action, i) => (", "))", or ")}" outside tags
  html = html.replace(/\(\s*[a-zA-Z_][\w,\s]*\)\s*=>\s*\(/g, '');
  html = html.replace(/\s*\)\s*\)\s*/g, ' ');
  html = html.replace(/\s*\)\s*\}\s*/g, ' ');
  html = html.replace(/\s*\}\s*\}\s*/g, ' ');

  html = html.replace(/<[a-z]\.[A-Za-z][\w.]*\b[^>]*\/?\s*>/g, '');

  // Convert self-closing non-void tags (e.g. <span />) to paired tags
  const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
  html = html.replace(/<(\w+)([^>]*?)\/>/g, (_m, tag: string, attrs: string) => {
    return voidTags.has(tag.toLowerCase())
      ? `<${tag}${attrs} />`
      : `<${tag}${attrs}></${tag}>`;
  });

  // Remove Helmet blocks with their meta/title children
  html = html.replace(/<Helmet\b[^>]*>[\s\S]*?<\/Helmet>/g, '');

  // Strip any remaining unresolved PascalCase component/icon tags while keeping their children
  html = html.replace(/<([A-Z][a-zA-Z0-9]*)[^>]*>([\s\S]*?)<\/\1>/g, '$2');
  html = html.replace(/<([A-Z][a-zA-Z0-9]*)[^>]*\/>/g, '');

  // Collapse excessive whitespace but preserve single spaces
  html = html.replace(/\s+/g, ' ').trim();
  html = html.replace(/>\s+</g, '><');

  // Wrap in page-content wrapper
  return `<div class="page-content">${html}</div>`;
}

/**
 * Extract plain text from JSX for preview
 */
export function extractTextFromJSX(content: string): string {
  let text = content;

  // Remove imports
  text = text.replace(/^import\s+.*?from\s+["'].*?["'];?\n/gm, '');

  // Remove JSX tags
  text = text.replace(/<[^>]+>/g, '');

  // Remove curly braces and code
  text = text.replace(/\{[^}]+\}/g, '');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text.substring(0, 200); // First 200 chars
}

/**
 * Convert page component to database record format
 */
export function convertPageToRecord(
  component: PageComponent,
  siteId: number,
  appDir?: string,
  translations?: Record<string, unknown> | null,
): ConvertedPage {
  // Extract SEO data from <Helmet> — use rawContent to find Helmet in any return block
  const seo: SeoData = extractSeoFromHelmet(component.rawContent || component.content, translations ?? null);

  const html = convertJSXToHTML(component, appDir, translations);
  const requiresLogin = component.isAuthenticated === true ||
    (component.name !== 'NotFound' && component.name !== 'Index' && component.name !== '__root' && component.name !== 'auth');

  return {
    name: component.name,
    title: component.title || component.name,
    route: component.route || `/${component.name.toLowerCase()}`,
    html,
    requiresLogin,
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    meta_og_type: seo.meta_og_type,
    meta_og_image: seo.meta_og_image,
    meta_twitter_card: seo.meta_twitter_card,
    meta_twitter_title: seo.meta_twitter_title,
  };
}

/**
 * Generate section name from component name
 */
export function generateSection(componentName: string): string {
  // Convert camelCase to Title Case
  return componentName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
