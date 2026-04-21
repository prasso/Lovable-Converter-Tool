export interface PageComponent {
    name: string;
    filePath: string;
    /** Extracted JSX body of the component (what gets converted to HTML). */
    content: string;
    /** Full raw source of the .tsx file (used to resolve data arrays referenced by .map()). */
    rawContent: string;
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
 * Parse TanStack Router routes from route files
 */
export declare function parseTanStackRoutes(routesDir: string): Map<string, RouteMapping>;
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