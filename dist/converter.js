/**
 * Convert React JSX to semantic HTML
 * This is a simplified converter that extracts text and structure
 */
export function convertJSXToHTML(component) {
    let html = component.content;
    // Remove TypeScript/React imports
    html = html.replace(/^import\s+.*?from\s+["'].*?["'];?\n/gm, '');
    // Remove component wrapper and export
    html = html.replace(/^const\s+\w+\s*=\s*\(\)\s*=>\s*\(/m, '');
    html = html.replace(/\);\s*\n\s*export\s+default\s+\w+;?\s*$/m, '');
    // Convert JSX className to class
    html = html.replace(/className=/g, 'class=');
    // Remove React-specific attributes
    html = html.replace(/\s+key=\{[^}]+\}/g, '');
    // Convert self-closing components to divs
    html = html.replace(/<(\w+)\s+([^>]*)\/>/g, '<div $2></div>');
    // Remove curly braces from simple text interpolations (basic approach)
    html = html.replace(/\{([^}]+)\}/g, (match, content) => {
        // Keep complex expressions as comments
        if (content.includes('map') || content.includes('?')) {
            return `<!-- Dynamic: ${content} -->`;
        }
        return content;
    });
    // Clean up excessive whitespace
    html = html.replace(/\s+/g, ' ').trim();
    // Wrap in basic HTML structure
    const wrappedHTML = `<div class="page-content">${html}</div>`;
    return wrappedHTML;
}
/**
 * Extract plain text from JSX for preview
 */
export function extractTextFromJSX(content) {
    let text = content;
    // Remove imports
    text = text.replace(/^import\s+.*?from\s+["'].*?["'];?\n/gm, '');
    // Remove JSX tags
    text = text.replace(/<[^>]+>/g, '');
    // Remove curly braces and code
    text = text.replace(/\{[^}]+\}/g, '');
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text.substring(0, 200); // First 200 chars
}
/**
 * Convert page component to database record format
 */
export function convertPageToRecord(component, siteId) {
    const html = convertJSXToHTML(component);
    const requiresLogin = component.name !== 'NotFound' && component.name !== 'Index';
    return {
        name: component.name,
        title: component.title || component.name,
        route: component.route || `/${component.name.toLowerCase()}`,
        html,
        requiresLogin,
    };
}
/**
 * Generate section name from component name
 */
export function generateSection(componentName) {
    // Convert camelCase to Title Case
    return componentName
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
//# sourceMappingURL=converter.js.map