import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Fonts are self-hosted through next/font rather than an @import in the CSS.
 * That removes a render-blocking request to fonts.googleapis.com and lets the
 * browser lay text out with the right metrics on the first paint.
 */
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-var",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-var",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "DeveloperOS",
    template: "%s · DeveloperOS",
  },
  description: "Learn, build, practise and grow — in one workspace.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0e" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
};

/**
 * Applies the saved theme before the first paint. Without it a light-mode user
 * gets a dark flash on every navigation. It has to be inline and in the body.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("dos-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme="dark"
        className={`${sans.variable} ${mono.variable}`}
        suppressHydrationWarning
      >
        <body>
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
