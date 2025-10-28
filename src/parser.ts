import { readFile, getTSXFiles, getFileNameWithoutExt } from './utils/fileUtils.js';
import { join } from 'path';

export interface PageComponent {
  name: string;
  filePath: string;
  content: string;
  route?: string;
  title?: string;
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
 * Extract all page components from src/pages directory
 */
export function extractPageComponents(pagesDir: string): PageComponent[] {
  const files = getTSXFiles(pagesDir);
  const components: PageComponent[] = [];

  for (const filePath of files) {
    const content = readFile(filePath);
    const name = getFileNameWithoutExt(filePath);

    components.push({
      name,
      filePath,
      content,
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

  // Fallback to component name
  const componentMatch = content.match(/const\s+(\w+)\s*=/);
  if (componentMatch) {
    return componentMatch[1];
  }

  return 'Untitled';
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
  const pagesDir = join(appDir, 'src', 'pages');
  const appTsxPath = join(appDir, 'src', 'App.tsx');

  // Extract components
  const components = extractPageComponents(pagesDir);

  // Get route mappings
  let routeMap: Map<string, RouteMapping>;
  try {
    routeMap = parseRoutes(appTsxPath);
  } catch {
    routeMap = new Map();
  }

  // Enrich components with metadata
  return components.map(comp => {
    const route = routeMap.get(comp.name);
    const title = extractTitleFromComponent(comp.content);

    return {
      ...comp,
      route: route?.path || `/${comp.name.toLowerCase()}`,
      title,
    };
  });
}
