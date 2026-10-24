# App icon: image-generation prompt

Paste the prompt below into an image generator (Midjourney, DALL·E, Ideogram, Firefly…).

## Main icon (1024×1024)

> App icon for a personal bills and subscriptions tracker. Rounded-square iOS/Android app icon. Centered glyph: a stylised paper receipt whose bottom edge curls into a circular refresh arrow, representing monthly pay cycles, with a small check mark on the receipt. Flat, minimal, geometric vector style with soft depth and one subtle inner shadow. Background: a smooth diagonal gradient from deep navy #0F1B2D (top-left) to emerald teal #0F9D7A (bottom-right). Glyph in off-white #F4F5F7, check mark in bright teal #2CC9A0. No text, no letters, no numbers, no currency symbols. High contrast, crisp edges, glyph centered with about 20% padding on every side. 1024×1024 PNG.

## Variants to export

Save each one over the file already referenced in `app.json`:

| File | What it is | Prompt change |
|---|---|---|
| `assets/images/icon.png` | Main icon (iOS and fallback) | Use the prompt as written. |
| `assets/images/android-icon-foreground.png` | Android adaptive-icon foreground | "Only the glyph, on a fully transparent background, centered in the inner 66% of the canvas." |
| `assets/images/android-icon-background.png` | Android adaptive-icon background | "Only the navy-to-teal gradient, no glyph." |
| `assets/images/android-icon-monochrome.png` | Android 13+ themed icon | "Only the glyph as a single flat white silhouette on a transparent background, no gradient or shadow." |
| `assets/images/splash-icon.png` | Splash screen image | "Only the glyph in off-white on a transparent background." |

After replacing the files, update the splash `backgroundColor` in `app.json` to `#0F1B2D` and the Android `adaptiveIcon.backgroundColor` to `#0F1B2D`, so they match. Icons only change in a new build (`npm run build-dev-client`).
