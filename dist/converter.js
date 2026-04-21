/**
 * Find the index of the matching closing bracket for the opener at `openIdx`.
 * Tracks strings/template literals so brackets inside them don't affect depth.
 * Returns -1 if unbalanced.
 */
function findMatchingBracket(source, openIdx, open, close) {
    let depth = 0;
    let i = openIdx;
    let strChar = null;
    while (i < source.length) {
        const ch = source[i];
        if (strChar) {
            if (ch === '\\') {
                i += 2;
                continue;
            }
            if (ch === strChar) {
                strChar = null;
                i++;
                continue;
            }
            i++;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            strChar = ch;
            i++;
            continue;
        }
        if (ch === open)
            depth++;
        else if (ch === close) {
            depth--;
            if (depth === 0)
                return i;
        }
        i++;
    }
    return -1;
}
/**
 * Locate `const IDENT[: Type] = [ ... ]` in the source and return the array
 * body (text between the outer [ and ]). Returns null if not found.
 */
function findConstArrayBody(source, name) {
    const re = new RegExp(`\\bconst\\s+${name}\\b\\s*(?::[^=]+)?=\\s*\\[`, 'g');
    const m = re.exec(source);
    if (!m)
        return null;
    const openIdx = source.indexOf('[', m.index + m[0].length - 1);
    if (openIdx === -1)
        return null;
    const closeIdx = findMatchingBracket(source, openIdx, '[', ']');
    if (closeIdx === -1)
        return null;
    return source.slice(openIdx + 1, closeIdx);
}
/**
 * Parse an array body (text between `[` and `]`) into a list of objects,
 * extracting string fields and JSX fields (parenthesized expressions).
 */
function parseObjectArrayItems(arrayBody) {
    const items = [];
    let i = 0;
    while (i < arrayBody.length) {
        while (i < arrayBody.length && arrayBody[i] !== '{')
            i++;
        if (i >= arrayBody.length)
            break;
        const end = findMatchingBracket(arrayBody, i, '{', '}');
        if (end === -1)
            break;
        const body = arrayBody.slice(i + 1, end);
        items.push(parseObjectLiteral(body));
        i = end + 1;
    }
    return items;
}
function parseObjectLiteral(body) {
    const obj = {};
    // String values: key: "value"  or  key: 'value'
    const strRe = /(\w+)\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
    let m;
    while ((m = strRe.exec(body)) !== null) {
        obj[m[1]] = (m[2] ?? m[3] ?? '').replace(/\\(.)/g, '$1');
    }
    // Parenthesized JSX values: key: ( ... )
    const parenRe = /(\w+)\s*:\s*\(/g;
    while ((m = parenRe.exec(body)) !== null) {
        const openIdx = m.index + m[0].length - 1;
        const closeIdx = findMatchingBracket(body, openIdx, '(', ')');
        if (closeIdx !== -1) {
            obj[m[1]] = body.slice(openIdx + 1, closeIdx).trim();
        }
    }
    return obj;
}
/**
 * Expand {IDENT.map((param[, idx]) => ( TEMPLATE ))} expressions in the JSX
 * by looking up the array `IDENT` in the raw source file and cloning the
 * template once per item, substituting `{param.key}` and `={param.key}`
 * occurrences.
 */
function expandMapExpressions(jsx, rawSource) {
    const mapRe = /\{\s*(\w+)\.map\s*\(\s*\(\s*(\w+)(?:\s*,\s*\w+)?\s*\)\s*=>\s*\(/g;
    let out = '';
    let lastEnd = 0;
    let m;
    while ((m = mapRe.exec(jsx)) !== null) {
        const arrName = m[1];
        const paramName = m[2];
        const tplOpen = m.index + m[0].length - 1; // position of '(' before template
        const tplClose = findMatchingBracket(jsx, tplOpen, '(', ')');
        if (tplClose === -1)
            continue;
        const template = jsx.slice(tplOpen + 1, tplClose);
        // After the template there should be `)` closing `.map(` then `}` closing `{`
        let j = tplClose + 1;
        while (j < jsx.length && /\s/.test(jsx[j]))
            j++;
        if (jsx[j] !== ')')
            continue;
        j++;
        while (j < jsx.length && /\s/.test(jsx[j]))
            j++;
        if (jsx[j] !== '}')
            continue;
        const wholeEnd = j + 1;
        const arrBody = findConstArrayBody(rawSource, arrName);
        if (arrBody == null)
            continue;
        const items = parseObjectArrayItems(arrBody);
        if (items.length === 0)
            continue;
        const expanded = items
            .map(item => substituteItem(template, paramName, item))
            .join('\n');
        out += jsx.slice(lastEnd, m.index) + expanded;
        lastEnd = wholeEnd;
        // Re-seek regex past the end of the expansion in the original string
        mapRe.lastIndex = wholeEnd;
    }
    out += jsx.slice(lastEnd);
    return out;
}
function substituteItem(template, paramName, item) {
    let t = template;
    for (const key of Object.keys(item)) {
        const val = item[key];
        // Attribute form: ={param.key}  -> ="value"
        t = t.replace(new RegExp(`=\\{\\s*${paramName}\\.${key}\\s*\\}`, 'g'), `="${val.replace(/"/g, '&quot;')}"`);
        // Text form: {param.key} -> value
        t = t.replace(new RegExp(`\\{\\s*${paramName}\\.${key}\\s*\\}`, 'g'), val);
    }
    return t;
}
/**
 * Remove balanced curly-brace expressions, including nested ones.
 * Regex alone cannot handle nested braces reliably, so we walk the string.
 */
function stripBracedExpressions(input) {
    let out = '';
    let depth = 0;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '{') {
            depth++;
            continue;
        }
        if (ch === '}') {
            if (depth > 0) {
                depth--;
                continue;
            }
        }
        if (depth === 0) {
            out += ch;
        }
    }
    return out;
}
/**
 * Convert React JSX to semantic HTML.
 * Expects component.content to already be the JSX body (extracted by parser).
 */
export function convertJSXToHTML(component) {
    const jsxContent = component.content;
    // If no JSX content was extracted, create basic HTML
    if (!jsxContent || jsxContent.trim() === '') {
        return `<div class="page-content"><h1>${component.title || component.name}</h1></div>`;
    }
    let html = jsxContent;
    // Expand {arr.map((item) => ( <tpl/> ))} by reading `const arr = [...]`
    // from the raw source and cloning the template per item.
    if (component.rawContent) {
        html = expandMapExpressions(html, component.rawContent);
    }
    // Strip JSX comments: {/* ... */}
    html = html.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    // Convert React <Link to="..."> to <a href="...">
    html = html.replace(/<Link\b/g, '<a');
    html = html.replace(/<\/Link>/g, '</a>');
    html = html.replace(/\bto="/g, 'href="');
    // Convert JSX className to class
    html = html.replace(/className=/g, 'class=');
    // Handle common dynamic attribute patterns BEFORE stripping braces
    html = html.replace(/src=\{[^}]*\}/g, 'src="#"');
    html = html.replace(/href=\{[^}]*\}/g, 'href="#"');
    html = html.replace(/to=\{[^}]*\}/g, 'href="#"');
    // Remove all braced expressions (handles nested braces like style={{ ... }})
    html = stripBracedExpressions(html);
    // Now clean attributes left with empty/dangling values
    html = html.replace(/\s+(key|style|width|height|onClick|onChange|onSubmit|ref)=(?=\s|>|\/)/g, '');
    html = html.replace(/\s+(key|style|width|height|onClick|onChange|onSubmit|ref)=""/g, '');
    // Remove dangling map/iteration scaffolding left after brace removal
    // e.g. "(action, i) => (" or ")) " outside tags
    html = html.replace(/\(\s*[a-zA-Z_][\w,\s]*\)\s*=>\s*\(/g, '');
    html = html.replace(/\)\s*\)/g, '');
    // Convert self-closing non-void tags (e.g. <span />) to paired tags
    const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
    html = html.replace(/<(\w+)([^>]*?)\/>/g, (_m, tag, attrs) => {
        return voidTags.has(tag.toLowerCase())
            ? `<${tag}${attrs} />`
            : `<${tag}${attrs}></${tag}>`;
    });
    // Collapse excessive whitespace but preserve single spaces
    html = html.replace(/\s+/g, ' ').trim();
    html = html.replace(/>\s+</g, '><');
    // Wrap in page-content wrapper
    return `<div class="page-content">${html}</div>`;
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