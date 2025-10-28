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
export declare function parseRoutes(appTsxPath: string): Map<string, RouteMapping>;
/**
 * Extract all page components from src/pages directory
 */
export declare function extractPageComponents(pagesDir: string): PageComponent[];
/**
 * Extract the main heading/title from a React component
 */
export declare function extractTitleFromComponent(content: string): string;
/**
 * Extract imports from a component to understand dependencies
 */
export declare function extractImports(content: string): string[];
/**
 * Check if component uses authentication/requires login
 */
export declare function requiresLogin(componentName: string, content: string): boolean;
/**
 * Parse all pages and enrich with metadata
 */
export declare function parseAllPages(appDir: string): PageComponent[];
//# sourceMappingURL=parser.d.ts.map