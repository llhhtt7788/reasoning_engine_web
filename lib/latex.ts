// lib/latex.ts
// Utilities to render messages containing LaTeX math (inline $...$ and display $$...$$)
// Uses KaTeX to render math and isomorphic-dompurify to sanitize final HTML.

import katex from 'katex';
import createDOMPurify from 'isomorphic-dompurify';

const windowLike: Window | typeof globalThis = typeof window !== 'undefined' ? window : globalThis;
const DOMPurify = createDOMPurify(windowLike);

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Tokenize text into segments: display math ($$..$$), inline math ($..$), and plain text.
// This tokenizer handles escaped dollar signs (\$) by temporarily replacing them.
export function renderMessageToHtml(input: string): string {
  if (!input) return '';

  // Protect escaped dollar signs
  const ESC_DOLLAR = '___ESC_DOLLAR___';
  const working = input.replace(/\\\$/g, ESC_DOLLAR); // replace literal \$ with placeholder

  const parts: string[] = [];
  const regex = /(\$\$([\s\S]*?)\$\$)|\$([^$\n]+?)\$/g; // match $$...$$ first, then $...$
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(working)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) {
      // push plain text before this match
      parts.push(escapeHtml(working.slice(lastIndex, idx)));
    }

    if (m[1] && m[2] !== undefined) {
      const tex = m[2];
      try {
        const rendered = katex.renderToString(tex, { throwOnError: false, displayMode: true });
        parts.push(rendered);
      } catch {
        parts.push(escapeHtml(m[0]));
      }
    } else {
      const tex = m[3];
      try {
        const rendered = katex.renderToString(tex, { throwOnError: false, displayMode: false });
        parts.push(rendered);
      } catch {
        parts.push(escapeHtml(m[0]));
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < working.length) {
    parts.push(escapeHtml(working.slice(lastIndex)));
  }

  const combined = parts.join('');

  // restore escaped dollar signs
  const restored = combined.replace(new RegExp(ESC_DOLLAR, 'g'), '$');

  // Sanitize final HTML to avoid XSS
  return DOMPurify.sanitize(restored);
}
