import { ConvertedPage } from './converter.js';
import {
  escapeSQLString,
  escapeSQLHTML,
  escapeSQLBoolean,
  escapeSQLInt,
} from './utils/escapeSQL.js';

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
  meta_title: string | null;
  meta_description: string | null;
  meta_og_type: string | null;
  meta_og_image: string | null;
  meta_twitter_card: string | null;
  meta_twitter_title: string | null;
}

/**
 * Generate a display title from component name
 */
function generateTitle(componentName: string): string {
  const title = componentName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  if (title === 'Index') return 'Welcome';
  if (title === 'Home') return 'Dashboard';
  return title;
}

/**
 * Generate a lowercase, space-free section identifier unique to this site
 */
function generateSection(componentName: string, usedSections: Set<string>): string {
  let section = componentName.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  if (section === 'index') section = 'welcome';
  if (section === 'home') section = 'dashboard';
  if (!section) section = 'page';

  let unique = section;
  let suffix = 2;
  while (usedSections.has(unique)) {
    unique = `${section}${suffix++}`;
  }
  usedSections.add(unique);
  return unique;
}

/**
 * Convert a page to a site_pages record
 */
export function convertPageToRecord(
  page: ConvertedPage,
  siteId: number,
  usedSections: Set<string> = new Set()
): SitePageRecord {
  return {
    fk_site_id: siteId,
    section: generateSection(page.name, usedSections),
    title: page.title && page.title.trim() && page.title !== 'Untitled'
      ? page.title
      : generateTitle(page.name),
    description: page.html,
    url: '',
    headers: '',
    masterpage: 'sitepage.templates.blankpage',
    template: 'sitepage.templates.blankpage',
    style: '',
    login_required: page.requiresLogin,
    user_level: false,
    where_value: '',
    page_notifications_on: false,
    menu_id: -1,
    type: 1, // HTML content
    external_url: null,
    is_published: true,
    meta_title: page.meta_title,
    meta_description: page.meta_description,
    meta_og_type: page.meta_og_type,
    meta_og_image: page.meta_og_image,
    meta_twitter_card: page.meta_twitter_card,
    meta_twitter_title: page.meta_twitter_title,
  };
}

/**
 * Generate a single INSERT statement for a page
 */
export function generateInsertStatement(record: SitePageRecord): string {
  const columns = [
    'fk_site_id',
    'section',
    'title',
    'description',
    'url',
    'headers',
    'masterpage',
    'template',
    'style',
    'login_required',
    'user_level',
    'where_value',
    'page_notifications_on',
    'menu_id',
    'type',
    'external_url',
    'is_published',
    'meta_title',
    'meta_description',
    'meta_og_type',
    'meta_og_image',
    'meta_twitter_card',
    'meta_twitter_title',
  ];

  const values = [
    escapeSQLInt(record.fk_site_id),
    escapeSQLString(record.section),
    escapeSQLString(record.title),
    escapeSQLHTML(record.description),
    escapeSQLString(record.url),
    escapeSQLString(record.headers),
    escapeSQLString(record.masterpage),
    escapeSQLString(record.template),
    escapeSQLString(record.style),
    escapeSQLBoolean(record.login_required),
    escapeSQLBoolean(record.user_level),
    escapeSQLString(record.where_value),
    escapeSQLBoolean(record.page_notifications_on),
    escapeSQLInt(record.menu_id),
    escapeSQLInt(record.type),
    record.external_url ? escapeSQLString(record.external_url) : 'NULL',
    escapeSQLBoolean(record.is_published),
    escapeSQLString(record.meta_title),
    escapeSQLString(record.meta_description),
    escapeSQLString(record.meta_og_type),
    escapeSQLString(record.meta_og_image),
    escapeSQLString(record.meta_twitter_card),
    escapeSQLString(record.meta_twitter_title),
  ];

  const columnList = columns.join(', ');
  const valueList = values.join(', ');

  const updateColumns = columns.filter(col => col !== 'fk_site_id' && col !== 'section');
  const updateClause = updateColumns.map(col => `${col}=VALUES(${col})`).join(', ');

  return `INSERT INTO site_pages (${columnList})\nVALUES (${valueList})\nON DUPLICATE KEY UPDATE\n${updateClause};`;
}

/**
 * Generate SQL for all pages
 */
function generateSiteCssUpdate(siteId: number, css: string): string {
  const cssValue = escapeSQLString(`\n${css}`);
  const markerValue = escapeSQLString('%prasso-converter-shadcn-theme%');
  return `UPDATE sites\nSET app_specific_css = CONCAT(COALESCE(app_specific_css, ''), ${cssValue})\nWHERE id = ${escapeSQLInt(siteId)}\n  AND COALESCE(app_specific_css, '') NOT LIKE ${markerValue};`;
}

export function generateSQL(pages: ConvertedPage[], siteId: number, siteCss?: string | null): string {
  const statements: string[] = [];

  // Add header comment
  statements.push('-- Generated SQL for Prasso Site Pages');
  statements.push(`-- Site ID: ${siteId}`);
  statements.push(`-- Generated: ${new Date().toISOString()}`);
  statements.push('-- WARNING: Review before executing in production');
  statements.push('');

  if (siteCss) {
    statements.push(generateSiteCssUpdate(siteId, siteCss));
    statements.push('');
  }

  // Generate INSERT for each page
  const usedSections = new Set<string>();
  for (const page of pages) {
    const record = convertPageToRecord(page, siteId, usedSections);
    const insert = generateInsertStatement(record);
    statements.push(insert);
    statements.push('');
  }

  // Add summary comment
  statements.push(`-- Total pages: ${pages.length}`);

  return statements.join('\n');
}

/**
 * Generate SQL with transaction wrapper
 */
export function generateSQLWithTransaction(pages: ConvertedPage[], siteId: number, siteCss?: string | null): string {
  const sql = generateSQL(pages, siteId, siteCss);

  return `BEGIN TRANSACTION;

${sql}

COMMIT;`;
}
