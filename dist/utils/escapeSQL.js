/**
 * Escape a string for safe use in SQL queries
 */
export function escapeSQLString(value) {
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
export function escapeSQLHTML(html) {
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
export function escapeSQLBoolean(value) {
    return value ? '1' : '0';
}
/**
 * Escape integer for SQL
 */
export function escapeSQLInt(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    return String(Math.floor(value));
}
/**
 * Validate SQL string to prevent injection
 */
export function validateSQLString(value) {
    // Check for dangerous SQL keywords at the start
    const dangerousPatterns = /^(\s)*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|EXEC|EXECUTE)/i;
    return !dangerousPatterns.test(value);
}
//# sourceMappingURL=escapeSQL.js.map