import { ConvertedPage } from './converter.js';
export interface SitePageRecord {
    fk_site_id: number;
    section: string;
    title: string;
    description: string;
    url: string;
    headers: string;
    masterpage: string;
    template: string;
    style: string;
    login_required: boolean;
    user_level: boolean;
    where_value: string;
    page_notifications_on: boolean;
    menu_id: number;
    type: number;
    external_url: string | null;
    is_published: boolean;
}
/**
 * Convert a page to a site_pages record
 */
export declare function convertPageToRecord(page: ConvertedPage, siteId: number): SitePageRecord;
/**
 * Generate a single INSERT statement for a page
 */
export declare function generateInsertStatement(record: SitePageRecord): string;
/**
 * Generate SQL for all pages
 */
export declare function generateSQL(pages: ConvertedPage[], siteId: number): string;
/**
 * Generate SQL with transaction wrapper
 */
export declare function generateSQLWithTransaction(pages: ConvertedPage[], siteId: number): string;
//# sourceMappingURL=sqlGenerator.d.ts.map