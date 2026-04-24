import { PageComponent } from './parser.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface ConvertedPage {
  name: string;
  title: string;
  route: string;
  html: string;
  requiresLogin: boolean;
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
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
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
 * Find a component file by name in common directories
 */
function findComponentFile(appDir: string, componentName: string): string | null {
  // Common component directories
  const searchDirs = [
    join(appDir, 'src/components'),
    join(appDir, 'src/components/ui'),
    join(appDir, 'src/lib/components'),
    join(appDir, 'components'),
  ];
  
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      
      const baseName = file.name.replace(/\.(tsx?|jsx?)$/, '');
      if (baseName === componentName) {
        return join(dir, file.name);
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
function expandCustomComponents(jsx: string, appDir: string): string {
  // Match both self-closing and paired component tags
  // This regex matches: <ComponentName ...attrs /> or <ComponentName ...attrs>...</ComponentName>
  const componentRegex = /<([A-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\s*\/?>(?:[\s\S]*?<\/\1>)?/g;
  let out = '';
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  
  while ((match = componentRegex.exec(jsx)) !== null) {
    const componentName = match[1];
    const fullMatch = match[0];
    
    // Skip known HTML elements and special components
    if (['svg', 'path', 'circle', 'rect', 'polygon', 'line', 'polyline', 'ellipse', 'g', 'defs', 'clipPath', 'use', 'symbol', 'image', 'pattern', 'mask', 'filter', 'feGaussianBlur', 'feBlend', 'animate', 'animateTransform', 'text', 'tspan', 'foreignObject'].includes(componentName.toLowerCase())) {
      out += jsx.slice(lastEnd, match.index) + fullMatch;
      lastEnd = match.index + fullMatch.length;
      continue;
    }
    
    // Handle common UI components by converting them to their underlying elements
    const uiComponentExpansion = expandUIComponent(fullMatch, componentName);
    if (uiComponentExpansion) {
      out += jsx.slice(lastEnd, match.index) + uiComponentExpansion;
      lastEnd = match.index + fullMatch.length;
      continue;
    }
    
    const componentFile = findComponentFile(appDir, componentName);
    if (componentFile) {
      const componentJSX = extractComponentJSX(componentFile);
      if (componentJSX) {
        // Recursively expand nested components
        const expandedJSX = expandCustomComponents(componentJSX, appDir);
        out += jsx.slice(lastEnd, match.index) + expandedJSX;
        lastEnd = match.index + fullMatch.length;
        continue;
      }
    }
    
    // If we can't expand it, keep the original
    out += jsx.slice(lastEnd, match.index) + fullMatch;
    lastEnd = match.index + fullMatch.length;
  }
  
  out += jsx.slice(lastEnd);
  return out;
}

/**
 * Convert UI components to their underlying HTML elements
 * This is a post-processing step that handles remaining UI components
 */
function convertUIComponentsToHTML(html: string): string {
  // Convert <Input ... /> to <input ... />
  html = html.replace(/<Input\b([^>]*)\/>/g, '<input$1/>');
  
  // Convert <Button ... /> to <button ... ></button>
  html = html.replace(/<Button\b([^>]*)\/>/g, '<button$1></button>');
  
  // Convert <Button ...>...</Button> to <button ...>...</button>
  html = html.replace(/<Button\b/g, '<button');
  html = html.replace(/<\/Button>/g, '</button>');
  
  // Convert <Label ... /> to <label ... ></label>
  html = html.replace(/<Label\b([^>]*)\/>/g, '<label$1></label>');
  
  // Convert <Label ...>...</Label> to <label ...>...</label>
  html = html.replace(/<Label\b/g, '<label');
  html = html.replace(/<\/Label>/g, '</label>');
  
  // Convert <Textarea ... /> to <textarea ... ></textarea>
  html = html.replace(/<Textarea\b([^>]*)\/>/g, '<textarea$1></textarea>');
  
  // Convert <Textarea ...>...</Textarea> to <textarea ...>...</textarea>
  html = html.replace(/<Textarea\b/g, '<textarea');
  html = html.replace(/<\/Textarea>/g, '</textarea>');
  
  // Convert <Switch ... /> to <input type="checkbox" ... />
  html = html.replace(/<Switch\b([^>]*)\/>/g, '<input type="checkbox"$1/>');
  
  // Convert <Checkbox ... /> to <input type="checkbox" ... />
  html = html.replace(/<Checkbox\b([^>]*)\/>/g, '<input type="checkbox"$1/>');
  
  // Convert <Check ... /> to a simple span (lucide-react icon)
  html = html.replace(/<Check\b([^>]*)\/>/g, '<span$1></span>');
  
  // Convert <Loader2 ... /> to a simple span (lucide-react icon)
  html = html.replace(/<Loader2\b([^>]*)\/>/g, '<span$1></span>');
  
  return html;
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
 * Convert React JSX to semantic HTML.
 * Expects component.content to already be the JSX body (extracted by parser).
 */
export function convertJSXToHTML(component: PageComponent, appDir?: string): string {
  const jsxContent = component.content;

  // If no JSX content was extracted, create basic HTML
  if (!jsxContent || jsxContent.trim() === '') {
    return `<div class="page-content"><h1>${component.title || component.name}</h1></div>`;
  }

  let html = jsxContent;

  // Expand custom components like <GuestSignInForm /> by finding their source files
  if (appDir) {
    html = expandCustomComponents(html, appDir);
  }

  // Convert UI components to HTML elements
  html = convertUIComponentsToHTML(html);

  // Expand {arr.map((item) => ( <tpl/> ))} by reading `const arr = [...]`
  // from the raw source and cloning the template per item.
  if (component.rawContent) {
    html = expandMapExpressions(html, component.rawContent);
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
  html = html.replace(/src=\{[^}]*\}/g, 'src="#"');
  html = html.replace(/href=\{[^}]*\}/g, 'href="#"');
  html = html.replace(/to=\{[^}]*\}/g, 'href="#"');

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
  html = html.replace(/\s+(key|style|width|height|onClick|onChange|onSubmit|ref)=(?=\s|>|\/)/g, '');
  html = html.replace(/\s+(key|style|width|height|onClick|onChange|onSubmit|ref)=""/g, '');

  // Remove dangling map/iteration scaffolding left after brace removal
  // e.g. "(action, i) => (" or ")) " outside tags
  html = html.replace(/\(\s*[a-zA-Z_][\w,\s]*\)\s*=>\s*\(/g, '');
  html = html.replace(/\)\s*\)/g, '');

  // Convert self-closing non-void tags (e.g. <span />) to paired tags
  const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
  html = html.replace(/<(\w+)([^>]*?)\/>/g, (_m, tag: string, attrs: string) => {
    return voidTags.has(tag.toLowerCase())
      ? `<${tag}${attrs} />`
      : `<${tag}${attrs}></${tag}>`;
  });

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
  appDir?: string
): ConvertedPage {
  const html = convertJSXToHTML(component, appDir);
  const requiresLogin = component.name !== 'NotFound' && component.name !== 'Index';

  return {
    name: component.name,
    title: component.title || component.name,
    route: component.route || `/${component.name.toLowerCase()}`,
    html,
    requiresLogin,
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
