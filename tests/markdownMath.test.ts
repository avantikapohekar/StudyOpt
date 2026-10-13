import { normalizeMarkdownMath } from '../src/lib/markdownMath';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Running Markdown & LaTeX Math Normalizer Tests ---');

// Test 1: Empty / null / undefined handling
assert(normalizeMarkdownMath(null) === '', 'Null should return empty string');
assert(normalizeMarkdownMath(undefined) === '', 'Undefined should return empty string');
assert(normalizeMarkdownMath('') === '', 'Empty string should return empty string');
assert(normalizeMarkdownMath('   ') === '', 'Whitespace-only string should return empty string');
console.log('✓ Test 1: Empty and invalid inputs handled gracefully');

// Test 2: Standard markdown and inline math
const test2 = '**Worst-case:** $O(\\log N)$\n*Average-case:* $O(\\log N)$';
const res2 = normalizeMarkdownMath(test2);
assert(res2.includes('**Worst-case:** $O(\\log N)$'), 'Preserves bold and inline math');
assert(res2.includes('*Average-case:* $O(\\log N)$'), 'Preserves italic and inline math');
console.log('✓ Test 2: Standard bold, italic, and inline math preserved');

// Test 3: MathJax inline math \( ... \)
const test3 = 'The value of \\( x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\) is real.';
const res3 = normalizeMarkdownMath(test3);
assert(res3.includes('$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$'), 'Converts \\( ... \\) to $...$');
assert(!res3.includes('\\('), 'Removes \\( delimiter');
assert(!res3.includes('\\)'), 'Removes \\) delimiter');
console.log('✓ Test 3: MathJax \\( ... \\) inline math normalized to $...$');

// Test 4: MathJax display math \[ ... \]
const test4 = 'Consider the following theorem:\n\\[ \\det(A - \\lambda I) = 0 \\]\nDone.';
const res4 = normalizeMarkdownMath(test4);
assert(res4.includes('$$\n\\det(A - \\lambda I) = 0\n$$'), 'Converts \\[ ... \\] to $$ ... $$');
assert(!res4.includes('\\['), 'Removes \\[ delimiter');
assert(!res4.includes('\\]'), 'Removes \\] delimiter');
console.log('✓ Test 4: MathJax \\[ ... \\] display math normalized to $$...$$');

// Test 5: Anki short-tags [$]...[/$] and [$$]...[/$$]
const test5 = 'Anki inline: [$]\\alpha + \\beta[/$] and display: [$$]\\int_0^1 x dx[/$$]';
const res5 = normalizeMarkdownMath(test5);
assert(res5.includes('$\\alpha + \\beta$'), 'Converts [$]...[/$] to $...$');
assert(res5.includes('$$\n\\int_0^1 x dx\n$$'), 'Converts [$$]...[/$$] to $$...$$');
console.log('✓ Test 5: Anki [$] and [$$] tags normalized');

// Test 6: Legacy Anki [latex]...[/latex]
const test6 = 'Legacy tag: [latex]\\sum_{i=1}^n i = \\frac{n(n+1)}{2}[/latex]';
const res6 = normalizeMarkdownMath(test6);
assert(res6.includes('$$\n\\sum_{i=1}^n i = \\frac{n(n+1)}{2}\n$$'), 'Converts [latex] to $$...$$');
console.log('✓ Test 6: Legacy [latex] tags normalized');

// Test 7: Delimiters inside code blocks MUST NOT be modified
const test7 = 'Here is code:\n```cpp\nif (a \\( b \\)) {\n  return "[$foo[/$]";\n}\n```\nAnd outside: \\( x^2 \\)';
const res7 = normalizeMarkdownMath(test7);
assert(res7.includes('if (a \\( b \\)) {'), 'Preserves \\( inside code block');
assert(res7.includes('"[$foo[/$]"'), 'Preserves [$ inside code block');
assert(res7.includes('$x^2$'), 'Converts \\( outside code block');
console.log('✓ Test 7: Delimiters inside code blocks are preserved intact');

// Test 8: Delimiters inside inline code (`...`) MUST NOT be modified
const test8 = 'Check `foo \\( bar \\)` command and \\( y = 2x \\).';
const res8 = normalizeMarkdownMath(test8);
assert(res8.includes('`foo \\( bar \\)`'), 'Preserves \\( inside inline backticks');
assert(res8.includes('$y = 2x$'), 'Converts \\( outside inline backticks');
console.log('✓ Test 8: Delimiters inside inline code are preserved intact');

// Test 9: Anki HTML line breaks outside of code
const test9 = 'Line 1<br>Line 2<br />Line 3';
const res9 = normalizeMarkdownMath(test9);
assert(res9 === 'Line 1\nLine 2\nLine 3', 'Normalizes <br> tags to newlines');
console.log('✓ Test 9: Anki HTML line breaks normalized');

console.log('\nAll 9 tests passed successfully!\n');
