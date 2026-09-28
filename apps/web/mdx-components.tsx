import { FaqList } from "@/app/_components/mdx/faq-list";
import { HowTo } from "@/app/_components/mdx/how-to";
import { YoutubeEmbed } from "@/app/_components/mdx/youtube-embed";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

// For docs pages — uses fumadocs built-in components (including tables)
export function getDocsMDXComponents(
  components?: MDXComponents,
): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tabs,
    Tab,
    Steps,
    Step,
    ...components,
  };
}

// For blog/other content — overrides table components with custom UI
export function getContentMDXComponents(
  components?: MDXComponents,
): MDXComponents {
  return {
    ...defaultMdxComponents,
    table: (props) => <Table {...props} />,
    thead: (props) => <TableHeader {...props} />,
    tbody: (props) => <TableBody {...props} />,
    tr: (props) => <TableRow {...props} />,
    th: (props) => <TableHead {...props} />,
    td: (props) => <TableCell {...props} />,
    FAQ: FaqList,
    HowTo,
    YoutubeEmbed,
    ...components,
  };
}

/**
 * Next.js MDX global provider, defaults to content (non-docs) components.
 * @alias
 */
export const useMDXComponents = getContentMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getContentMDXComponents>;
}
