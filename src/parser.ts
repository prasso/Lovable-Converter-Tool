import { readFile, getTSXFiles, getFileNameWithoutExt, pathExists } from './utils/fileUtils.js';
import { join, relative } from 'path';

export interface PageComponent {
  name: string;
  filePath: string;
  /** Extracted JSX body of the component (what gets converted to HTML). */
  content: string;
  /** Full raw source of the .tsx file (used to resolve data arrays referenced by .map()). */
  rawContent: string;
  route?: string;
  title?: string;
  /** True when the file lives under an _authenticated (or similar) subdirectory */
  isAuthenticated?: boolean;
}

export interface RouteMapping {
  path: string;
  component: string;
}

/**
 * Parse App.tsx to extract route mappings
 */
export function parseRoutes(appTsxPath: string): Map<string, RouteMapping> {
  const content = readFile(appTsxPath);
  const routeMap = new Map<string, RouteMapping>();

  // Match Route elements: <Route path="/path" element={<Component />} />
  const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<(\w+)\s*\/>\}/g;
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    const path = match[1];
    const component = match[2];
    routeMap.set(component, { path, component });
  }

  return routeMap;
}

/**
 * Parse TanStack Router routes from route files
 */
export function parseTanStackRoutes(routesDir: string): Map<string, RouteMapping> {
  const routeMap = new Map<string, RouteMapping>();
  const files = getTSXFiles(routesDir);

  for (const filePath of files) {
    const content = readFile(filePath);
    // Use relative path (without extension) as the key to avoid basename collisions
    const relPath = relative(routesDir, filePath).replace(/\.[^.]+$/, '');
    const name = getFileNameWithoutExt(filePath);

    // Match createFileRoute patterns: export const Route = createFileRoute("/")({ ... })
    const routeRegex = /createFileRoute\(["']([^"']+)["']\)/;
    const match = content.match(routeRegex);

    if (match) {
      const path = match[1];
      routeMap.set(relPath, { path, component: name });
    } else {
      // Default route based on file name
      routeMap.set(relPath, { path: `/${name.toLowerCase()}`, component: name });
    }
  }

  return routeMap;
}

/**
 * Starting at the index of '(' in `source`, return the content between the
 * opening paren and its matching closing paren, tracking nested (),{},[],
 * and JS strings/template literals so we don't stop at a paren inside them.
 * Returns null if unbalanced.
 */
function extractBalancedParenContent(source: string, openIdx: number): string | null {
  if (source[openIdx] !== '(') return null;
  let depth = 0;
  let i = openIdx;
  let strChar: string | null = null; // '"' | "'" | '`'
  while (i < source.length) {
    const ch = source[i];
    if (strChar) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === strChar) { strChar = null; i++; continue; }
      // Skip template-literal ${...} safely by treating it like code; naive but adequate here
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      strChar = ch;
      i++;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return source.slice(openIdx + 1, i);
      }
    }
    i++;
  }
  return null;
}

/**
 * Find the JSX body of a React component by locating `return (` and extracting
 * the balanced-paren content. Works for both function and arrow components.
 */
function extractJSXContent(fileContent: string): string {
  const returnRegex = /\breturn\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = returnRegex.exec(fileContent)) !== null) {
    const parenIdx = match.index + match[0].length - 1;
    const body = extractBalancedParenContent(fileContent, parenIdx);
    if (body && /<[A-Za-z]/.test(body)) {
      return body.trim();
    }
  }

  // Fallback: find any top-level JSX-looking block
  const jsxMatch = fileContent.match(/<([A-Za-z][\w.]*)[^>]*>[\s\S]*<\/\1>/);
  if (jsxMatch) {
    return jsxMatch[0];
  }

  return '';
}

/**
 * Extract all page components from src/pages or src/routes directory
 */
export function extractPageComponents(pagesDir: string): PageComponent[] {
  const files = getTSXFiles(pagesDir);
  const components: PageComponent[] = [];

  for (const filePath of files) {
    const content = readFile(filePath);
    const name = getFileNameWithoutExt(filePath);
    // Relative key used for route map lookup (preserves subdirectory info)
    const relKey = relative(pagesDir, filePath).replace(/\.[^.]+$/, '');
    // Detect _authenticated (or similar protected) subdirectories by path segment
    const isAuthenticated = filePath.split('/').some(seg => seg.startsWith('_authenticated'));

    // Extract just the JSX content, not the entire file
    const jsxContent = extractJSXContent(content);

    components.push({
      name: relKey,
      filePath,
      content: jsxContent,
      rawContent: content,
      isAuthenticated,
    });
  }

  return components;
}

/**
 * Extract the main heading/title from a React component
 */
export function extractTitleFromComponent(content: string): string {
  // Look for h1 or h2 tags in JSX
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match) {
    return h1Match[1].trim();
  }

  const h2Match = content.match(/<h2[^>]*>([^<]+)<\/h2>/);
  if (h2Match) {
    return h2Match[1].trim();
  }

  return 'Untitled';
}

function extractIndexHtmlTitle(appDir: string): string | null {
  const indexPath = join(appDir, 'index.html');
  if (!pathExists(indexPath)) return null;

  const html = readFile(indexPath);
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Extract imports from a component to understand dependencies
 */
export function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:{[^}]+}|[\w\s,]+)\s+from\s+["']([^"']+)["']/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Check if component uses authentication/requires login
 */
export function requiresLogin(componentName: string, content: string): boolean {
  // Components like Dashboard, Inbox, Messages typically require login
  const protectedNames = ['Dashboard', 'Inbox', 'Messages', 'Groups', 'Conversation'];
  if (protectedNames.includes(componentName)) {
    return true;
  }

  // Check for auth-related patterns in content
  const authPatterns = /useAuth|requiresAuth|protected|login_required/i;
  return authPatterns.test(content);
}

/**
 * Parse all pages and enrich with metadata
 */
export function parseAllPages(appDir: string): PageComponent[] {
  // Check for both src/pages (React Router) and src/routes (TanStack Router)
  const pagesDir = join(appDir, 'src', 'pages');
  const routesDir = join(appDir, 'src', 'routes');
  const appTsxPath = join(appDir, 'src', 'App.tsx');

  // Extract components from either directory
  let components: PageComponent[] = [];
  
  try {
    components = extractPageComponents(pagesDir);
  } catch {
    // If src/pages doesn't exist, try src/routes
    try {
      components = extractPageComponents(routesDir);
    } catch {
      throw new Error(`Neither src/pages nor src/routes directory found in ${appDir}`);
    }
  }

  // Get route mappings - try both React Router and TanStack Router patterns
  let routeMap: Map<string, RouteMapping>;
  try {
    routeMap = parseRoutes(appTsxPath);
  } catch {
    try {
      routeMap = parseTanStackRoutes(routesDir);
    } catch {
      routeMap = new Map();
    }
  }

  const siteTitle = extractIndexHtmlTitle(appDir);

  // Enrich components with metadata
  return components.map(comp => {
    const route = routeMap.get(comp.name);
    const displayName = getFileNameWithoutExt(comp.filePath);
    const isRoot = route?.path === '/';
    const name = isRoot ? 'Index' : displayName;
    let title = extractTitleFromComponent(comp.content);
    if (isRoot && siteTitle && (!title || title === 'Untitled')) {
      title = siteTitle;
    }

    return {
      ...comp,
      name,
      route: route?.path || `/${displayName.toLowerCase()}`,
      title,
    };
  });
}
