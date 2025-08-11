import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Custom inline formatting: ++text++ -> overline
  // We do a light preprocessing step before handing to ReactMarkdown (rehypeRaw enabled)
  const processedContent = React.useMemo(() => {
    // Skip replacement inside inline code spans delimited by backticks by temporarily extracting them
    const codeSpans: string[] = [];
    let temp = content.replace(/`[^`]*`/g, (m) => {
      codeSpans.push(m);
      return `__CODE_SPAN_${codeSpans.length - 1}__`;
    });
  // Replace --text-- with strikethrough span
  temp = temp.replace(/--([\s\S]*?)--/g, '<span class="mm-strike">$1</span>');
    // Restore code spans
    temp = temp.replace(/__CODE_SPAN_(\d+)__/g, (_m, i) => codeSpans[Number(i)]);
    return temp;
  }, [content]);
  // Check if content contains markdown formatting (bold, italic, code, etc.)
  const hasMarkdownFormatting = /[*_`#\[\]()]/g.test(processedContent) || /<[^>]*>/g.test(processedContent);
  
  // If it's just plain text with newlines, render it directly to preserve empty lines
  if (!hasMarkdownFormatting) {
    return (
      <div className={`markdown-content whitespace-pre-wrap ${className}`} style={{ pointerEvents: 'none' }}>
  {processedContent}
      </div>
    );
  }

  // For content with markdown formatting, use ReactMarkdown
  return (
    <div className={`markdown-content ${className}`} style={{ pointerEvents: 'none' }}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          // Customize markdown elements to match your design
          p: ({ children }) => <div className="whitespace-pre-wrap">{children}</div>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-gray-700/50 px-1 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          // Handle HTML span tags for colored text
          span: ({ children, style, ...props }) => (
            <span style={style} {...props}>{children}</span>
          ),
          // Remove default margins from headings and make them inline
          h1: ({ children }) => <strong className="text-lg font-bold">{children}</strong>,
          h2: ({ children }) => <strong className="text-base font-bold">{children}</strong>,
          h3: ({ children }) => <strong className="text-sm font-bold">{children}</strong>,
          // Handle line breaks
          br: () => <br />,
          // Remove list styling to keep it simple for nodes
          ul: ({ children }) => <span>{children}</span>,
          ol: ({ children }) => <span>{children}</span>,
          li: ({ children }) => <span>{children} </span>,
        }}
      >
  {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
