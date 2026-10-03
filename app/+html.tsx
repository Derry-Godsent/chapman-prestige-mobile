import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * The one page every web screen is rendered inside.
 *
 * A phone app is drawn on a screen that never changes size. A browser page is
 * drawn on a viewport that does: the address bar and the toolbar slide away as
 * you scroll, the notch and the home indicator eat into the edges, and a double
 * tap zooms the whole page in. Left alone, a screen laid out for a phone ends up
 * measured against the wrong box, which is why bottom buttons can sit behind the
 * browser's own chrome and things appear to shift.
 *
 * So the shell below locks the app to the part of the screen that is actually
 * visible, keeps it out of the areas the phone marks as unsafe, and refuses the
 * two gestures that move a web page around. Everything after that is ordinary
 * app layout, the same as on a phone.
 *
 * The base path is what lets the same build serve from a plain domain root (Vercel)
 * and from a folder address (GitHub Pages, which puts the app at
 * /chapman-prestige-mobile). The build sets EXPO_PUBLIC_BASE_PATH for the folder case.
 */
const basePath = process.env.EXPO_PUBLIC_BASE_PATH ?? "";

/**
 * The app's own typefaces, served to the browser.
 *
 * On a phone the app loads these through Expo. In a browser nothing did, so every
 * style that asks for Inter_400Regular or PlusJakartaSans_800ExtraBold was asking
 * for a font the browser had never heard of, and the browser answered with its own
 * default one. Lines were then a different length from the app's, so text wrapped
 * differently and rows sat at different heights. Serving the same six files here
 * makes the web version measure exactly like the phone version.
 */
const fonts = `
  @font-face { font-family: Inter_400Regular; src: url("${basePath}/fonts/Inter_400Regular.ttf") format("truetype"); font-display: block; }
  @font-face { font-family: Inter_500Medium; src: url("${basePath}/fonts/Inter_500Medium.ttf") format("truetype"); font-display: block; }
  @font-face { font-family: Inter_600SemiBold; src: url("${basePath}/fonts/Inter_600SemiBold.ttf") format("truetype"); font-display: block; }
  @font-face { font-family: Inter_700Bold; src: url("${basePath}/fonts/Inter_700Bold.ttf") format("truetype"); font-display: block; }
  @font-face { font-family: PlusJakartaSans_700Bold; src: url("${basePath}/fonts/PlusJakartaSans_700Bold.ttf") format("truetype"); font-display: block; }
  @font-face { font-family: PlusJakartaSans_800ExtraBold; src: url("${basePath}/fonts/PlusJakartaSans_800ExtraBold.ttf") format("truetype"); font-display: block; }
`;

const shell = `
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    /* Nothing scrolls except the screens that are built to scroll, so the page
       itself can never be dragged about and the browser's bars never move. */
    overflow: hidden;
    overscroll-behavior: none;
  }
  body {
    background-color: #FBF7F0;
    /* No text inflation when the phone is turned sideways. */
    -webkit-text-size-adjust: 100%;
    /* No grey flash over a button when it is tapped. */
    -webkit-tap-highlight-color: transparent;
  }
  @media (prefers-color-scheme: dark) {
    body { background-color: #111318; }
  }
  #root {
    /* Pinned to the visible area. The address bar and toolbar come and go on an
       iPhone; this makes the app the height you can actually see, so a button at
       the bottom of a screen is on the screen rather than behind the browser. */
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    /* Two quick taps are two quick taps, never a zoom that leaves the page
       looking shifted. Scrolling inside a screen still works normally. */
    touch-action: manipulation;
  }
  /* A row of boxes that should share the width, such as the six digits of a text
     code, cannot shrink on the web unless this is said: a browser gives an input
     its own minimum width, wide enough for about twenty letters, and six of those
     push each other off the right edge of the screen. */
  input, textarea, select { min-width: 0; }
  @supports (height: 100dvh) {
    #root { height: 100dvh; }
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
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="application-name" content="Chapman Prestige" />

        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <link rel="icon" href={`${basePath}/favicon.png`} sizes="any" />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: fonts }} />
        <style dangerouslySetInnerHTML={{ __html: shell }} />

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
