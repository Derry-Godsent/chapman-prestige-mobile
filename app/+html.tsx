import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * The one page every web screen is rendered inside.
 *
 * It exists to make the web version behave like an app on a phone: the name under
 * the icon, a full screen launch when it is added to the home screen, and the right
 * colours while it loads so nothing flashes white.
 *
 * The base path is what lets the same build serve from a plain domain root (Vercel)
 * and from a folder address (GitHub Pages, which puts the app at
 * /chapman-prestige-mobile). The build sets EXPO_PUBLIC_BASE_PATH for the folder case.
 */
const basePath = process.env.EXPO_PUBLIC_BASE_PATH ?? "";

const background = `
  body {
    background-color: #FBF7F0;
    margin: 0;
    overscroll-behavior-y: none;
  }
  @media (prefers-color-scheme: dark) {
    body { background-color: #111318; }
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* The title and description live in the root layout, so there is one of each. */}
        <meta name="color-scheme" content="light dark" />

        {/* Added to a phone home screen, it opens full screen with this name. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chapman" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="application-name" content="Chapman Prestige" />

        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <link rel="icon" href={`${basePath}/favicon.png`} sizes="any" />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: background }} />

        {/* Registers the do-nothing service worker that makes the browser offer the
            real "Install app" rather than a plain shortcut. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register(${JSON.stringify(
              `${basePath}/sw.js`,
            )}).catch(function () {}); }); }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
