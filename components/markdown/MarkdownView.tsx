"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const alertLabels = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
} as const;

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

const alertPattern = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][\t ]*\n?/;

function remarkGithubAlerts() {
  return (tree: MarkdownNode) => {
    visitMarkdownNode(tree, (node) => {
      if (node.type === "blockquote") {
        transformAlertBlockquote(node);
      }
    });
  };
}

function visitMarkdownNode(
  node: MarkdownNode,
  visitor: (node: MarkdownNode) => void,
) {
  visitor(node);
  node.children?.forEach((child) => visitMarkdownNode(child, visitor));
}

function transformAlertBlockquote(node: MarkdownNode) {
  const firstParagraph = node.children?.[0];
  const firstText = firstParagraph?.children?.[0];

  if (
    firstParagraph?.type !== "paragraph" ||
    firstText?.type !== "text" ||
    !firstText.value
  ) {
    return;
  }

  const match = firstText.value.match(alertPattern);
  if (!match) return;

  const alertType = match[1].toLowerCase() as keyof typeof alertLabels;
  firstText.value = firstText.value.replace(alertPattern, "");

  node.data = {
    ...node.data,
    hName: "aside",
    hProperties: {
      className: `markdown-alert markdown-alert-${alertType}`,
      role: "note",
    },
  };

  const shouldRemoveMarkerParagraph =
    firstParagraph.children?.every(
      (child) => child.type === "text" && !child.value?.trim(),
    ) ?? false;

  if (shouldRemoveMarkerParagraph) {
    node.children?.shift();
  }

  node.children?.unshift({
    type: "paragraph",
    data: {
      hProperties: {
        className: "markdown-alert-title",
      },
    },
    children: [{ type: "text", value: alertLabels[alertType] }],
  });
}

const markdownComponents: Components = {
  h2({ id, children, ...props }) {
    if (id === "footnote-label") {
      return (
        <h2 {...props} id={id}>
          脚注
        </h2>
      );
    }

    return (
      <h2 {...props} id={id}>
        {children}
      </h2>
    );
  },
  a({ href, children, ...props }) {
    const isExternal = href ? /^https?:\/\//.test(href) : false;

    return (
      <a
        {...props}
        href={href}
        rel={isExternal ? "noreferrer noopener" : undefined}
        target={isExternal ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  },
  img({ alt, ...props }) {
    // Markdown本文の画像URLはユーザー入力なので、Next Imageのドメイン最適化対象にしない。
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={alt ?? ""} decoding="async" loading="lazy" />;
  },
  table({ children, ...props }) {
    return (
      <div className="markdown-table-wrapper">
        <table {...props}>{children}</table>
      </div>
    );
  },
};

/** Markdown 本文を描画する。CommonMark + GFM を安全なHTMLとして表示する。 */
export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm, remarkGithubAlerts]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
