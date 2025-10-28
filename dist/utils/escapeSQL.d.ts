/**
 * Escape a string for safe use in SQL queries
 */
export declare function escapeSQLString(value: string | null | undefined): string;
/**
 * Escape HTML content for SQL insertion
 */
export declare function escapeSQLHTML(html: string): string;
/**
 * Escape boolean for SQL
 */
export declare function escapeSQLBoolean(value: boolean): string;
/**
 * Escape integer for SQL
 */
export declare function escapeSQLInt(value: number | null | undefined): string;
/**
 * Validate SQL string to prevent injection
 */
export declare function validateSQLString(value: string): boolean;
//# sourceMappingURL=escapeSQL.d.ts.map