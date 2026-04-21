import { PageComponent } from './parser.js';
export interface ConvertedPage {
    name: string;
    title: string;
    route: string;
    html: string;
    requiresLogin: boolean;
}
/**
 * Convert React JSX to semantic HTML.
 * Expects component.content to already be the JSX body (extracted by parser).
 */
export declare function convertJSXToHTML(component: PageComponent): string;
/**
 * Extract plain text from JSX for preview
 */
export declare function extractTextFromJSX(content: string): string;
/**
 * Convert page component to database record format
 */
export declare function convertPageToRecord(component: PageComponent, siteId: number): ConvertedPage;
/**
 * Generate section name from component name
 */
export declare function generateSection(componentName: string): string;
//# sourceMappingURL=converter.d.ts.map