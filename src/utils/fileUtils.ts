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
 * Get all TypeScript/TSX files in a directory
 */
export function getTSXFiles(dirPath: string): string[] {
  try {
    const files = readdirSync(dirPath);
    return files
      .filter(file => extname(file) === '.tsx' || extname(file) === '.ts')
      .map(file => join(dirPath, file));
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
