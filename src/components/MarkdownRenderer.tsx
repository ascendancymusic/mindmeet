import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Check if content contains markdown formatting (bold, italic, code, etc.)
  const hasMarkdownFormatting = /[*_`#\[\]()]/g.test(content) || /<[^>]*>/g.test(content);
  
  // If it's just plain text with newlines, render it directly to preserve empty lines
  if (!hasMarkdownFormatting) {
    return (
      <div className={`markdown-content whitespace-pre-wrap ${className}`} style={{ pointerEvents: 'none' }}>
        {content}
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
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
