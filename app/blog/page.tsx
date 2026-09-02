import type { Metadata } from "next";

import { BlogListContent } from "@/components/pages/blog/blogListContent";

export const metadata: Metadata = {
  title: "وبلاگ | دوتامیت",
  description: "آموزش‌ها، تحلیل پچ‌ها و ترفندهای صعود در رنکد دوتا ۲.",
};

export default function BlogListPage() {
  return <BlogListContent />;
}
