/**
 * Custom Markdown components for ReactMarkdown
 */

const MarkdownComponents = {
  ul: ({ node, ...props }) => (
    <ul
      className="list-disc list-inside space-y-1 ml-4 text-gray-200"
      {...props}
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className="list-decimal list-inside space-y-1 ml-4 text-gray-200"
      {...props}
    />
  ),
  li: ({ node, ...props }) => <li className="mb-1 text-gray-200" {...props} />,
  h1: ({ node, ...props }) => (
    <h1 className="text-xl font-bold mt-4 mb-2 text-white" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-lg font-bold mt-3 mb-2 text-white" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-md font-bold mt-2 mb-1 text-white" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  p: ({ node, ...props }) => <p className="mb-2 text-gray-200" {...props} />,
};

export default MarkdownComponents;
