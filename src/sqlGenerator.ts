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
}

/**
 * Generate a section name from component name
 */
function generateSection(componentName: string): string {
  return componentName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert a page to a site_pages record
 */
export function convertPageToRecord(
  page: ConvertedPage,
  siteId: number
): SitePageRecord {
  return {
    fk_site_id: siteId,
    section: generateSection(page.name),
    title: page.title,
    description: page.html,
    url: page.route.replace(/^\//, ''), // Remove leading slash
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
  ];

  const columnList = columns.join(', ');
  const valueList = values.join(', ');

  return `INSERT INTO site_pages (${columnList})\nVALUES (${valueList});`;
}

/**
 * Generate SQL for all pages
 */
export function generateSQL(pages: ConvertedPage[], siteId: number): string {
  const statements: string[] = [];

  // Add header comment
  statements.push('-- Generated SQL for Prasso Site Pages');
  statements.push(`-- Site ID: ${siteId}`);
  statements.push(`-- Generated: ${new Date().toISOString()}`);
  statements.push('-- WARNING: Review before executing in production');
  statements.push('');

  // Generate INSERT for each page
  for (const page of pages) {
    const record = convertPageToRecord(page, siteId);
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
export function generateSQLWithTransaction(pages: ConvertedPage[], siteId: number): string {
  const sql = generateSQL(pages, siteId);

  return `BEGIN TRANSACTION;

${sql}

COMMIT;`;
}
