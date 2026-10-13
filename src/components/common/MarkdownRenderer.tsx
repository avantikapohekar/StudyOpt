import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { normalizeMarkdownMath } from '../../lib/markdownMath';

interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  dense?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  dense = false,
}) => {
  const normalized = useMemo(() => {
    return normalizeMarkdownMath(content);
  }, [content]);

  if (!normalized) {
    return null;
  }

  return (
    <div
      className={`markdown-renderer max-w-full overflow-hidden text-neutral-900 dark:text-neutral-100 leading-relaxed ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              throwOnError: false,
              strict: false,
              errorColor: '#ef4444',
            },
          ],
        ]}
        components={{
          p: ({ children }) => (
            <p className={`${dense ? 'my-1' : 'my-2'} first:mt-0 last:mb-0 break-words leading-relaxed`}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-neutral-950 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-neutral-800 dark:text-neutral-200">
              {children}
            </em>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0 text-neutral-950 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-3 mb-1.5 first:mt-0 text-neutral-950 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-2.5 mb-1 first:mt-0 text-neutral-900 dark:text-neutral-100">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 my-2 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 my-2 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">
              {children}
            </li>
          ),
          pre: ({ children }) => (
            <pre className="p-3.5 my-2.5 rounded-xl bg-neutral-900 text-neutral-100 dark:bg-neutral-950 border border-neutral-800 font-mono text-xs overflow-x-auto max-w-full leading-normal shadow-inner">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }: any) => {
            const isCodeBlock =
              Boolean(className?.includes('language-')) ||
              (typeof children === 'string' && children.includes('\n'));

            if (!isCodeBlock) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono text-[0.88em] border border-neutral-200/80 dark:border-neutral-700/80 break-words"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-indigo-500 pl-3 my-2 italic text-neutral-600 dark:text-neutral-400">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto max-w-full my-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <table className="w-full text-xs text-left divide-y divide-neutral-200 dark:divide-neutral-800">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-neutral-800 dark:text-neutral-200 font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-4 border-neutral-200 dark:border-neutral-800" />
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
};
