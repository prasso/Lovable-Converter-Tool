/**
 * Read a file and return its contents
 */
export declare function readFile(filePath: string): string;
/**
 * Write content to a file
 */
export declare function writeFile(filePath: string, content: string): void;
/**
 * Check if a path exists
 */
export declare function pathExists(filePath: string): boolean;
/**
 * Get all TypeScript/TSX files in a directory
 */
export declare function getTSXFiles(dirPath: string): string[];
/**
 * Check if a path is a directory
 */
export declare function isDirectory(filePath: string): boolean;
/**
 * Get the filename without extension
 */
export declare function getFileNameWithoutExt(filePath: string): string;
//# sourceMappingURL=fileUtils.d.ts.map