import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { GlobalDialogProvider } from "@/components/ui/GlobalDialogProvider";
import { GlobalSnackbarProvider } from "@/components/ui/GlobalSnackbarProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Crystal Press — POS & Printing ERP",
  description: "High-speed retail counter billing and custom job order management system for Crystal Press.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="font-sans antialiased bg-[#F8FAFC] text-slate-900 selection:bg-lime-200 overflow-x-hidden min-h-screen">
        <AuthProvider>
          <QueryProvider>
            {children}
            <GlobalDialogProvider />
            <GlobalSnackbarProvider />
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
