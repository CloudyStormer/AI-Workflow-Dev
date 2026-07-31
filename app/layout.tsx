import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Workflow Control Center",
  description: "用于观察、验证和治理 AI 软件工程工作流的可视化控制中心。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
