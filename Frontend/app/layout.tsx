import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOÀN TRUNG – MARKETING MANAGEMENT",
  description:
    "Hệ thống quản lý Marketing & Khách hàng tiềm năng chuyên nghiệp - Toàn Trung Telecom JSC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased selection:bg-blue-100 selection:text-blue-900">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
