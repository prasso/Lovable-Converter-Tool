/**
 * Escape a string for safe use in SQL queries
 */
export function escapeSQLString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  // Escape single quotes by doubling them
  const escaped = value.replace(/'/g, "''");
  
  // Wrap in single quotes
  return `'${escaped}'`;
}

/**
 * Escape HTML content for SQL insertion
 */
export function escapeSQLHTML(html: string): string {
  if (!html) {
    return 'NULL';
  }

  // Remove problematic characters and escape for SQL
  let cleaned = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return escapeSQLString(cleaned);
}

/**
 * Escape boolean for SQL
 */
export function escapeSQLBoolean(value: boolean): string {
  return value ? '1' : '0';
}

/**
 * Escape integer for SQL
 */
export function escapeSQLInt(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return String(Math.floor(value));
}

/**
 * Validate SQL string to prevent injection
 */
export function validateSQLString(value: string): boolean {
  // Check for dangerous SQL keywords at the start
  const dangerousPatterns = /^(\s)*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|EXEC|EXECUTE)/i;
  return !dangerousPatterns.test(value);
}
