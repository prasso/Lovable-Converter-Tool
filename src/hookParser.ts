import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getTSXFiles } from './utils/fileUtils.js';

export interface HookFilter {
  column: string;
  operator: string;
  value: unknown;
}

export interface DynamicFilter {
  column: string;
  operator: string;
  paramVar: string;
  condition: string;
}

export interface HookInfo {
  resourceName: string;
  staticFilters: HookFilter[];
  dynamicFilters: DynamicFilter[];
  sort: Array<{ column: string; ascending: boolean }>;
  isSingle: boolean;
}

export interface HookCallInfo {
  hookName: string;
  dataVar: string;
  isLoadingVar: string | null;
  errorVar: string | null;
  params: string[];
}

/**
 * Find a hook file by exported function name in src/hooks/.
 */
export function findHookFile(appDir: string, hookName: string): string | null {
  const hooksDir = join(appDir, 'src', 'hooks');
  if (!existsSync(hooksDir)) return null;

  const files = getTSXFiles(hooksDir);
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    // Match: export function useTours( or export const useTours =
    const exportRegex = new RegExp(`export\\s+(?:function\\s+${hookName}\\b|const\\s+${hookName}\\s*=)`);
    if (exportRegex.test(content)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Parse a hook file to extract database query information.
 * Looks for database.from('table').select().eq().order() chains.
 */
export function parseHookFile(filePath: string): HookInfo | null {
  const content = readFileSync(filePath, 'utf-8');

  // Find database.from('resource')
  const fromRegex = /database\s*\.\s*from\(\s*['"]([^'"]+)['"]\s*\)/;
  const fromMatch = content.match(fromRegex);
  if (!fromMatch) return null;

  // database.from() converts _ to - in resource names
  const resourceName = fromMatch[1].replace(/_/g, '-');

  const staticFilters: HookFilter[] = [];
  const dynamicFilters: DynamicFilter[] = [];
  const sort: Array<{ column: string; ascending: boolean }> = [];
  let isSingle = false;

  // Find unconditional .eq('column', value) calls
  // These appear in the chain: database.from('tours').select('*').eq('is_active', true)
  const eqRegex = /\.eq\(\s*['"](\w+)['"]\s*,\s*(true|false|null|undefined|'[^']*'|"[^"]*"|[\w.]+)\s*\)/g;
  let eqMatch: RegExpExecArray | null;
  while ((eqMatch = eqRegex.exec(content)) !== null) {
    const column = eqMatch[1];
    const rawValue = eqMatch[2];

    // Parse the value
    let value: unknown;
    if (rawValue === 'true') value = true;
    else if (rawValue === 'false') value = false;
    else if (rawValue === 'null' || rawValue === 'undefined') value = null;
    else if (rawValue.startsWith("'") || rawValue.startsWith('"')) {
      value = rawValue.slice(1, -1);
    } else {
      // It's a variable reference — this is a dynamic filter
      // Check if there's a conditional around it
      const dynamicFilter: DynamicFilter = {
        column,
        operator: 'eq',
        paramVar: rawValue,
        condition: `${rawValue} && ${rawValue} !== 'all'`,
      };
      dynamicFilters.push(dynamicFilter);
      continue;
    }

    // Avoid duplicates
    if (!staticFilters.some(f => f.column === column && f.value === value)) {
      staticFilters.push({ column, operator: 'eq', value });
    }
  }

  // Find .order('column', { ascending: true/false }) calls
  const orderRegex = /\.order\(\s*['"](\w+)['"]\s*(?:,\s*\{\s*ascending:\s*(true|false)\s*\}\s*)?\)/g;
  let orderMatch: RegExpExecArray | null;
  while ((orderMatch = orderRegex.exec(content)) !== null) {
    const column = orderMatch[1];
    const ascending = orderMatch[2] !== 'false';
    if (!sort.some(s => s.column === column)) {
      sort.push({ column, ascending });
    }
  }

  // Check for .single() or .maybeSingle()
  if (/\.single\(\s*\)/.test(content)) {
    isSingle = true;
  }

  return { resourceName, staticFilters, dynamicFilters, sort, isSingle };
}

/**
 * Parse a component's raw source to find hook calls and map
 * variable names to hook names.
 *
 * Example input:
 *   const { data: tours, isLoading, error } = useTours(selectedCategory);
 *   const { data: dbCategories } = useTourCategories();
 *
 * Returns:
 *   [{ hookName: 'useTours', dataVar: 'tours', isLoadingVar: 'isLoading', errorVar: 'error', params: ['selectedCategory'] },
 *    { hookName: 'useTourCategories', dataVar: 'dbCategories', isLoadingVar: null, errorVar: null, params: [] }]
 */
export function parseHookCalls(rawSource: string): HookCallInfo[] {
  const results: HookCallInfo[] = [];

  // Match: const { data: varName, isLoading, error } = useHookName(params)
  // Also match: const { data: varName } = useHookName(params)
  // Also match without 'data:' prefix: const { data = useHookName(...) }
  const hookCallRegex = /const\s*\{\s*data:\s*(\w+)\s*,?\s*(isLoading)?\s*,?\s*(error)?\s*\}\s*=\s*(use\w+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = hookCallRegex.exec(rawSource)) !== null) {
    const dataVar = match[1];
    const isLoadingVar = match[2] ? match[2].trim() : null;
    const errorVar = match[3] ? match[3].trim() : null;
    const hookName = match[4];
    const paramsRaw = match[5].trim();
    const params = paramsRaw ? paramsRaw.split(',').map(p => p.trim()).filter(Boolean) : [];

    results.push({ hookName, dataVar, isLoadingVar, errorVar, params });
  }

  return results;
}

/**
 * Build the API URL for a hook, including static filters and sort.
 * Dynamic filters are returned separately for Alpine.js conditional logic.
 */
export function buildApiUrl(hookInfo: HookInfo): { baseUrl: string; dynamicParams: DynamicFilter[] } {
  const params: string[] = [];

  if (hookInfo.staticFilters.length > 0) {
    const filtersJson = JSON.stringify(hookInfo.staticFilters);
    params.push(`filters=${encodeURIComponent(filtersJson)}`);
  }

  if (hookInfo.sort.length > 0) {
    const sortStr = hookInfo.sort
      .map(s => `${s.ascending ? '' : '-'}${s.column}`)
      .join(',');
    params.push(`sort=${sortStr}`);
  }

  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  return {
    baseUrl: `/api/${hookInfo.resourceName}${queryString}`,
    dynamicParams: hookInfo.dynamicFilters,
  };
}
