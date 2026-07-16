import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const marker = '/* prasso-converter-shadcn-theme */';

export function generateShadcnThemeCSS(appDir: string): string | null {
  const stylesheetPath = [
    join(appDir, 'src', 'styles.css'),
    join(appDir, 'src', 'index.css'),
    join(appDir, 'src', 'app.css'),
  ].find(existsSync);

  if (!stylesheetPath) return null;

  const stylesheet = readFileSync(stylesheetPath, 'utf-8');
  const rootMatch = stylesheet.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootMatch) return null;

  const declarations: string[] = [];
  const declarationRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let declarationMatch: RegExpExecArray | null;
  while ((declarationMatch = declarationRegex.exec(rootMatch[1])) !== null) {
    declarations.push(`${declarationMatch[1]}: ${declarationMatch[2].replace(/\/\*[\s\S]*?\*\//g, '').trim()};`);
  }

  if (!declarations.some(declaration => declaration.startsWith('--card:'))) return null;

  return `${marker}
.page-content {
  ${declarations.join('\n  ')}
}
.page-content .bg-background { background-color: var(--background); }
.page-content .bg-card { background-color: var(--card); }
.page-content .bg-primary { background-color: var(--primary); }
.page-content .bg-secondary { background-color: var(--secondary); }
.page-content .bg-muted { background-color: var(--muted); }
.page-content .bg-accent { background-color: var(--accent); }
.page-content .bg-destructive { background-color: var(--destructive); }
.page-content .text-foreground { color: var(--foreground); }
.page-content .text-card-foreground { color: var(--card-foreground); }
.page-content .text-primary { color: var(--primary); }
.page-content .text-primary-foreground { color: var(--primary-foreground); }
.page-content .text-secondary-foreground { color: var(--secondary-foreground); }
.page-content .text-muted-foreground { color: var(--muted-foreground); }
.page-content .text-accent-foreground { color: var(--accent-foreground); }
.page-content .text-destructive-foreground { color: var(--destructive-foreground); }
.page-content .border-border { border-color: var(--border); }
.page-content .border-input { border-color: var(--input); }
.page-content .placeholder\\:text-muted-foreground::placeholder { color: var(--muted-foreground); }
.page-content .focus-visible\\:ring-ring:focus-visible { --tw-ring-color: var(--ring); }
.page-content .hover\\:bg-primary\\/90:hover { background-color: color-mix(in srgb, var(--primary) 90%, transparent); }
.page-content .hover\\:bg-secondary\\/80:hover { background-color: color-mix(in srgb, var(--secondary) 80%, transparent); }
.page-content .hover\\:bg-accent:hover { background-color: var(--accent); }
.page-content .hover\\:text-accent-foreground:hover { color: var(--accent-foreground); }`;
}
