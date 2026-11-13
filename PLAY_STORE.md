# Publishing Geography Bee on Google Play

The app is a PWA at https://lopa23.github.io/geography_bee/ and is wrapped as a Trusted Web Activity.

1. Open https://www.pwabuilder.com, enter the URL above, and choose **Package for stores → Android**.
2. Use a package id such as `io.github.lopa23.geographybee`. Download the zip; keep the signing key and its passwords safe.
3. Add the zip's `assetlinks.json` entry to the `lopa23.github.io` repo at `.well-known/assetlinks.json` (it is a JSON array, so add it beside Sound Garden's entry). After Play App Signing is on, also add the SHA-256 fingerprint from Play Console → App integrity.
4. In Play Console, create the app (free), upload the `.aab`, and fill in:
   - Privacy policy: https://lopa23.github.io/geography_bee/privacy.html
   - Data safety: no data collected or shared.
   - Target audience: pick the age groups; this puts it under the Families policy (no ads, no analytics, nothing collected — already true).
   - Content rating questionnaire, store listing text, screenshots, 512px icon (`icons/icon-512.png`).
5. When changing app files, bump `CACHE` in `sw.js` so installed copies update.
