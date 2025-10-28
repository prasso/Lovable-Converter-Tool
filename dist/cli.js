#!/usr/bin/env node
import { program } from 'commander';
import { parseAllPages } from './parser.js';
import { generateSQL, generateSQLWithTransaction } from './sqlGenerator.js';
import { writeFile, pathExists } from './utils/fileUtils.js';
/**
 * Main CLI entry point
 */
async function main() {
    program
        .name('react-to-prasso-converter')
        .description('Convert React app pages to Prasso site_pages SQL')
        .version('1.0.0');
    program
        .command('convert')
        .description('Convert React app to SQL')
        .requiredOption('-f, --folder <path>', 'Path to React app folder')
        .requiredOption('-s, --site-id <id>', 'Site ID for fk_site_id', (val) => parseInt(val, 10))
        .option('-o, --output <path>', 'Output SQL file path (default: stdout)')
        .option('-d, --dry-run', 'Preview SQL without writing')
        .option('-t, --transaction', 'Wrap SQL in transaction')
        .action(async (options) => {
        try {
            await convertCommand(options);
        }
        catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    program.parse(process.argv);
    // Show help if no command provided
    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }
}
/**
 * Execute convert command
 */
async function convertCommand(options) {
    const { folder, siteId, output, dryRun, transaction } = options;
    // Validate inputs
    if (!pathExists(folder)) {
        throw new Error(`Folder not found: ${folder}`);
    }
    if (siteId <= 0) {
        throw new Error('Site ID must be a positive integer');
    }
    console.log(`📂 Reading React app from: ${folder}`);
    console.log(`🔗 Using Site ID: ${siteId}`);
    // Parse pages
    console.log('📖 Parsing pages...');
    const pages = parseAllPages(folder);
    if (pages.length === 0) {
        throw new Error('No pages found in src/pages directory');
    }
    console.log(`✅ Found ${pages.length} pages:`);
    pages.forEach(page => {
        console.log(`   - ${page.name} (${page.route})`);
    });
    // Convert pages
    console.log('🔄 Converting to database records...');
    const convertedPages = pages.map(page => ({
        name: page.name,
        title: page.title || page.name,
        route: page.route || `/${page.name.toLowerCase()}`,
        html: page.content, // Use original content for now
        requiresLogin: page.name !== 'NotFound' && page.name !== 'Index',
    }));
    // Generate SQL
    console.log('💾 Generating SQL...');
    const sql = transaction
        ? generateSQLWithTransaction(convertedPages, siteId)
        : generateSQL(convertedPages, siteId);
    // Output
    if (dryRun) {
        console.log('\n📋 DRY RUN - SQL Preview:\n');
        console.log(sql.substring(0, 1000) + '\n... (truncated)');
        console.log(`\n✅ Would generate ${convertedPages.length} INSERT statements`);
    }
    else if (output) {
        writeFile(output, sql);
        console.log(`\n✅ SQL written to: ${output}`);
        console.log(`📊 Total statements: ${convertedPages.length}`);
    }
    else {
        console.log('\n' + sql);
    }
}
// Run CLI
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map