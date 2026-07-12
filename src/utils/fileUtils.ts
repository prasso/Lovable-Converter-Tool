import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Read a file and return its contents
 */
export function readFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Write content to a file
 */
export function writeFile(filePath: string, content: string): void {
  try {
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Check if a path exists
 */
export function pathExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Get all TypeScript/TSX files in a directory (recursive)
 */
export function getTSXFiles(dirPath: string): string[] {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...getTSXFiles(fullPath));
      } else if (extname(entry.name) === '.tsx' || extname(entry.name) === '.ts') {
        results.push(fullPath);
      }
    }
    return results;
  } catch (error) {
    throw new Error(`Failed to read directory ${dirPath}: ${error}`);
  }
}

/**
 * Check if a path is a directory
 */
export function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get the filename without extension
 */
export function getFileNameWithoutExt(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  return fileName.replace(/\.[^.]+$/, '');
}
