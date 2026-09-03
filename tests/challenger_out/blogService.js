"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staticBlogs = void 0;
exports.renderMarkdown = renderMarkdown;
exports.staticBlogs = [
    {
        id: "blog-1",
        title: "Getting Started with Swift",
        date: "2026-06-05",
        content: "# Getting Started with Swift\nSwift is an amazing language.\nHere is some code:\n```swift\nprint(\"Hello, Swift!\")\n```"
    },
    {
        id: "blog-2",
        title: "Writing a Custom DOM Mock",
        date: "2026-05-20",
        content: "# Writing a Custom DOM Mock\nWhy write a mock when you can... write one!\n- Element\n- Document\n- Event"
    },
    {
        id: "blog-3",
        title: "XSS Protection in Blog Parsers",
        date: "2026-04-10",
        content: "# XSS Protection\nCheck this out: `<script>alert('XSS')</script>` is escaped!"
    }
];
function renderMarkdown(md) {
    if (!md)
        return '';
    // 1. Escape HTML entities to protect against XSS
    const escaped = md
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    // 2. Multiline code blocks
    let text = escaped.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // 3. Tokenize/extract all inline code blocks
    const inlineBlocks = [];
    text = text.replace(/`([^`]+)`/g, (_match, codeContent) => {
        const placeholder = `__INLINE_CODE_PLACEHOLDER_${inlineBlocks.length}__`;
        inlineBlocks.push(codeContent);
        return placeholder;
    });
    // 4. Parse headings and lists
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    text = text.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    // 5. Paragraphs (split by lines and wrap non-header/non-list/non-code block lines in <p> tags)
    const lines = text.split('\n');
    let inCodeBlock = false;
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed)
            return '';
        const containsPre = line.includes('<pre');
        const containsPreEnd = line.includes('</pre');
        const shouldNotWrap = inCodeBlock ||
            trimmed.startsWith('<h') ||
            trimmed.startsWith('<li') ||
            containsPre ||
            containsPreEnd ||
            trimmed.startsWith('__INLINE_CODE_PLACEHOLDER_');
        if (containsPre && !containsPreEnd) {
            inCodeBlock = true;
        }
        else if (containsPreEnd) {
            inCodeBlock = false;
        }
        if (shouldNotWrap) {
            return line;
        }
        return `<p>${line}</p>`;
    });
    let joined = processedLines.filter(Boolean).join('\n');
    // 6. Re-inject the formatted inline code contents
    for (let i = 0; i < inlineBlocks.length; i++) {
        joined = joined.replace(`__INLINE_CODE_PLACEHOLDER_${i}__`, `<code>${inlineBlocks[i]}</code>`);
    }
    return joined;
}
