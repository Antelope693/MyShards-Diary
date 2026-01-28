import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface ContentRendererProps {
  content: string;
}

export default function ContentRenderer({ content }: ContentRendererProps) {
  const { t } = useTranslation();

  // ... (keep processContent)
  const processContent = (text: string): string => {
    // 将 [img:url:width%] 转换为 HTML img 标签
    return text.replace(/\[img:([^\]]+):(\d+)%\]/g, (_match, url, width) => {
      // NOTE: strict sanitization might strip inline styles. 
      // If so, we might need a custom schema.
      return `\n<img src="${url}" alt="${t('common.image_alt')}" style="width: ${width}%; height: auto; display: block; margin: 1.5rem auto; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />\n`;
    });
  };

  const processedContent = processContent(content);

  return (
    <div className="content-renderer prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // ...
          // 自定义图片渲染，支持内联样式
          img: ({ ...props }) => {
            // 检查是否有内联样式（来自我们的图片标记）
            const style = (props as any).style;
            if (style) {
              return <img {...props} style={style} className="rounded-lg shadow-lg" />;
            }
            // 普通 Markdown 图片
            return (
              <img
                {...props}
                className="rounded-lg shadow-lg max-w-full h-auto my-4"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            );
          },
          // 自定义段落样式
          p: ({ ...props }) => (
            <p {...props} className="mb-4 leading-relaxed text-gray-700" />
          ),
          // 自定义标题样式
          h1: ({ ...props }) => (
            <h1 {...props} className="text-3xl sm:text-4xl font-bold text-gray-800 mt-6 sm:mt-8 mb-3 sm:mb-4" />
          ),
          h2: ({ ...props }) => (
            <h2 {...props} className="text-2xl sm:text-3xl font-bold text-gray-800 mt-4 sm:mt-6 mb-2 sm:mb-3" />
          ),
          h3: ({ ...props }) => (
            <h3 {...props} className="text-xl sm:text-2xl font-semibold text-gray-800 mt-3 sm:mt-4 mb-2" />
          ),
          // 代码块
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  {...props}
                  className="bg-gray-100 text-purple-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-mono"
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                {...props}
                className={`${className} block bg-gray-900 text-gray-100 p-3 sm:p-4 rounded-lg overflow-x-auto text-xs sm:text-sm font-mono my-3 sm:my-4`}
              >
                {children}
              </code>
            );
          },
          // 列表
          ul: ({ ...props }) => (
            <ul {...props} className="list-disc list-inside mb-3 sm:mb-4 space-y-1 sm:space-y-2 text-gray-700" />
          ),
          ol: ({ ...props }) => (
            <ol {...props} className="list-decimal list-inside mb-3 sm:mb-4 space-y-1 sm:space-y-2 text-gray-700" />
          ),
          li: ({ ...props }) => (
            <li {...props} className="ml-2 sm:ml-4" />
          ),
          // 引用
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-purple-500 pl-3 sm:pl-4 italic text-gray-600 my-3 sm:my-4"
            />
          ),
          // 链接
          a: ({ ...props }) => (
            <a
              {...props}
              className="text-purple-600 hover:text-purple-700 underline break-words"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // 表格
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-3 sm:my-4 -mx-2 sm:mx-0">
              <table {...props} className="min-w-full border-collapse border border-gray-300 text-sm sm:text-base" />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              {...props}
              className="border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-100 font-semibold text-left text-xs sm:text-sm"
            />
          ),
          td: ({ ...props }) => (
            <td {...props} className="border border-gray-300 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm" />
          ),
          // 水平线
          hr: ({ ...props }) => (
            <hr {...props} className="my-4 sm:my-6 border-gray-300" />
          ),
          // 强调
          strong: ({ ...props }) => (
            <strong {...props} className="font-bold text-gray-800" />
          ),
          em: ({ ...props }) => (
            <em {...props} className="italic" />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
