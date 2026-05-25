import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function ChatMarkdown({ content }) {
  return (
    <div className="chat-markdown text-sm text-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || 'illustration'}
              className="rounded-lg my-3 max-w-full max-h-64 object-contain border border-gray-100"
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
