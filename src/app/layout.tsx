import type { Metadata } from "next";
import "./globals.css";
import { PhaseLayout } from "@/components/PhaseLayout";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Access Journey Logging Toolkit",
  description: "Week 6 — Access Journey Logging for MA IE: Design for Social Change",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <PhaseLayout>
        <div className="flex min-h-screen flex-col">
          <AppHeader />

          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
            {children}
          </main>

          <footer className="mt-auto shrink-0 border-t border-white/10 bg-black/90 px-4 py-3 text-xs text-white/70">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.svg"
                  alt="UAL"
                  className="h-11 w-auto object-contain"
                />
              </div>
              <div className="text-right leading-snug">
                <div>MA IE – Design for Social Change</div>
                <div className="text-white/50">
                  Access Journey Logging Toolkit
                </div>
              </div>
            </div>
          </footer>
        </div>
        </PhaseLayout>
      </body>
    </html>
  );
}

