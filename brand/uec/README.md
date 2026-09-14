# UEC brand files

UECPCOM Canubing II's logo and its drawing animation. They were the app's
built-in logo while it served UEC alone. Now that the app is Ekkly and serves
many churches, the built-in mark is Ekkly's (`public/ekkly-mark.svg`), and these
files are kept here, outside the app, for setting UEC up on the platform.

After moving UEC across (TENANCY.md, "Moving UEC across"), in UEC's app:

1. **Settings → Church details:** upload `uec-logo.png` as its logo.
2. **Settings → Colours:** set the light accent to `#01779b` and the dark accent
   to `#22b8cf`, the colours UEC's app has always used.

| File | What it is |
| --- | --- |
| `uec-logo.png` | The logo the app bundled |
| `uec-logo-public.png` | The favicon-sized copy that sat in `public/` |
| `UEC-animation.gif` | The master of the logo drawing itself |
| `uec-reveal.webp`, `uec-mark.webp`, `uec-still.webp` | Clips cut from it by `build-brand-animation.mjs` |

Nothing in the app imports these, so none of them ship.
