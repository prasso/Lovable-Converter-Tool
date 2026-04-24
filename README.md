# React to Prasso Converter

A command-line tool that converts React application pages into SQL INSERT statements for the Prasso site_pages table. Automatically parses React components from src/pages/, extracts routes from App.tsx, converts JSX to HTML, and generates properly escaped SQL for database insertion.

Features:

Parse React pages and routes
Convert JSX to HTML
Generate SQL INSERT statements with proper escaping
Support for dry-run mode and transaction wrapping
Configurable output (stdout or file)

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic conversion to stdout
```bash
node dist/cli.js convert --folder /path/to/react-app --site-id 1
```

### Save to file
```bash
node dist/cli.js convert --folder /path/to/react-app --site-id 1 --output output.sql
```

### Dry run (preview without writing)
```bash
node dist/cli.js convert --folder /path/to/react-app --site-id 1 --dry-run
```

### With transaction wrapper
```bash
node dist/cli.js convert --folder /path/to/react-app --site-id 1 --transaction --output output.sql
```

## Options

- `-f, --folder <path>` (required): Path to React app folder
- `-s, --site-id <id>` (required): Site ID for fk_site_id
- `-o, --output <path>` (optional): Output SQL file path (default: stdout)
- `-d, --dry-run` (optional): Preview SQL without writing
- `-t, --transaction` (optional): Wrap SQL in transaction

## Example

```bash
node dist/cli.js convert \
  --folder /Users/bobbiperreault/Sourcecode/faxt/prasso/working-apps/connect-and-care-06 \
  --site-id 1 \
  --output connect-and-care.sql
```

```bash
node dist/cli.js convert \
  --folder /Users/bobbiperreault/Sourcecode/faxt/prasso/working-apps/faith-connect-hub \
  --site-id 20 \
  --output faith-connect-hub.sql
```
```bash
node dist/cli.js convert \
  --folder /Users/bobbiperreault/Sourcecode/faxt/prasso/working-apps/my-sweet-projects \
  --site-id 20 \
  --output my-sweet-projects.sql
```
## Output

The tool generates SQL INSERT statements for each page found in `src/pages/`:

```sql
-- Generated SQL for Prasso Site Pages
-- Site ID: 1
-- Generated: 2025-10-28T12:00:00.000Z
-- WARNING: Review before executing in production

INSERT INTO site_pages (fk_site_id, section, title, description, url, ...)
VALUES (1, 'Dashboard', 'Dashboard', '<div>...</div>', 'dashboard', ...);

INSERT INTO site_pages (fk_site_id, section, title, description, url, ...)
VALUES (1, 'Inbox', 'Inbox', '<div>...</div>', 'inbox', ...);

-- Total pages: 7
```

## Database Schema

The tool maps React pages to the following `site_pages` table columns:

- `fk_site_id`: Site ID (provided as input)
- `section`: Page section/category (derived from component name)
- `title`: Page title
- `description`: Page HTML content
- `url`: URL slug (derived from route)
- `headers`: Empty string (default)
- `masterpage`: 'sitepage.templates.blankpage' (default)
- `template`: 'sitepage.templates.blankpage' (default)
- `style`: Empty string (default)
- `login_required`: true for protected pages, false otherwise
- `user_level`: false (default)
- `where_value`: Empty string (default)
- `page_notifications_on`: false (default)
- `menu_id`: -1 (top-level, default)
- `type`: 1 (HTML content)
- `external_url`: NULL (default)
- `is_published`: true (default)

## Development

### Build
```bash
npm run build
```

### Development mode with ts-node
```bash
npm run dev -- convert --folder /path/to/app --site-id 1
```

## Notes

- All SQL strings are properly escaped to prevent SQL injection
- The tool extracts page metadata from React component files
- Routes are parsed from `src/App.tsx`
- Pages without explicit routes default to `/{componentName}`
- Protected pages (Dashboard, Inbox, etc.) have `login_required` set to true
- Generated SQL should be reviewed before executing in production
