import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
export const metadata: Metadata = {
  title: "Signal | Hackathon Portal",
  description:
    "Apply as a hacker or mentor. Review thoughtfully. Make something that matters at Signal Hackathon.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
