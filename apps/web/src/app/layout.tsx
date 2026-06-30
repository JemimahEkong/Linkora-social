import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { NavBar } from "@/components/NavBar";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";

export const metadata: Metadata = {
  title: "Linkora",
  description: "Decentralised social on Stellar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg focus:font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          Skip to content
        </a>
        <ThemeBootstrap />
        <WalletProvider>
          <OnboardingProvider>
            <NotificationsProvider>
              <NavBar />
              <main id="main-content" tabIndex={-1} className="pb-16 md:pb-0">
                {children}
              </main>
            </NotificationsProvider>
          </OnboardingProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
