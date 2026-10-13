/**
 * Utility functions for normalizing Markdown and LaTeX mathematics
 * Delimiters supported:
 * - Standard LaTeX inline: $...$ and \(...\)
 * - Standard LaTeX display: $$...$$ and \[...\]
 * - Anki MathJax tags: [$]...[/$] and [$$]...[/$$]
 * - Anki legacy tags: [latex]...[/latex]
 */

export function normalizeMarkdownMath(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    return String(input);
  }

  if (!input.trim()) {
    return '';
  }

  // Step 1: Temporarily extract code blocks and inline code so delimiters inside are preserved
  const codeBlocks: string[] = [];
  const placeholderPrefix = '@@MATH_CODE_TOKEN_';
  const placeholderSuffix = '@@';

  // Fenced code blocks (``` ... ``` or ~~~ ... ~~~)
  let processed = input.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${placeholderPrefix}${idx}${placeholderSuffix}`;
  });

  // Inline code (` ... `)
  processed = processed.replace(/(`[^`\n]+`)/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${placeholderPrefix}${idx}${placeholderSuffix}`;
  });

  // Step 2: Normalize Anki HTML line breaks outside of code
  processed = processed.replace(/<br\s*\/?>/gi, '\n');

  // Step 3: Anki legacy and MathJax short-tags:
  // [latex]...[/latex] -> $$...$$
  processed = processed.replace(/\[latex\]([\s\S]*?)\[\/latex\]/gi, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // [$$]...[/$$] -> $$...$$
  processed = processed.replace(/\[\$\$\]([\s\S]*?)\[\/\$\$\]/gi, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // [$]...[/$] -> $...$
  processed = processed.replace(/\[\$\]([\s\S]*?)\[\/\$\]/gi, (_, math) => {
    return `$${math.trim()}$`;
  });

  // Step 4: Standard LaTeX delimiters
  // Display math: \[ ... \] -> $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // Inline math: \( ... \) -> $ ... $
  // Note: remark-math requires no whitespace right after opening $ or right before closing $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    const trimmed = math.trim();
    if (!trimmed) return '';
    return `$${trimmed}$`;
  });

  // Step 5: Restore code blocks and inline code
  processed = processed.replace(
    new RegExp(`${placeholderPrefix}(\\d+)${placeholderSuffix}`, 'g'),
    (_, idxStr) => {
      const idx = parseInt(idxStr, 10);
      return codeBlocks[idx] ?? '';
    }
  );

  return processed;
}
