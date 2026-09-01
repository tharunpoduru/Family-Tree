# Social-share image

When someone shares your site's link in WhatsApp or iMessage, the
preview card comes from the Open Graph tags — generated automatically
from `family.config.ts` once `siteUrl` is set. Text-only cards work
fine; a picture card is nicer.

## Adding one

1. Generate or design a **1200 × 630** JPEG (prompt below).
2. Save it as `app/public/social.jpg`.
3. Set `socialImage: '/social.jpg'` in
   [app/src/family.config.ts](../app/src/family.config.ts).
4. Rebuild and deploy. (If you later replace the artwork, give the file
   a new name — link previews cache aggressively by URL.)

Keep the artwork free of personal data: no faces, member names, dates,
or counts. The family name and a beautiful tree are plenty.

## A generation prompt that works

Fill in the ALL-CAPS parts and hand this to an image model:

```text
Finished social-share / Open Graph image for a private family-tree
website. Landscape 1200 × 630, full bleed, premium editorial heritage
style. Scene: a single magnificent old Indian banyan tree with a broad
organically branching crown and visibly interwoven roots on the right
half of the frame, serene blue-hour atmosphere, warm honey-gold sunrise
light picking out branches — suggesting generations and continuity.
Cinematic photographic realism, restrained fine-art finish; the tree
must look alive, not metallic. Left 48%: calm deep indigo backdrop with
subtle silk-like texture blending seamlessly into the landscape (not a
separate panel), carrying a text-led editorial lockup with generous
margins and immediate readability at small link-preview size.
Palette: deep indigo #163a75 and #102741, muted peacock blue #1e4f9c,
warm ivory #f9fdff, restrained antique turmeric gold #c98a12.
Text (verbatim, only these lines):
"FAMILY NAME IN YOUR SCRIPT"
"SUBTITLE IN YOUR SCRIPT (e.g. 'family tree' in your language)"
"THE FAMILYNAME FAMILY"
"your-project.web.app"
Typography: the native-script family name largest, in warm ivory
traditional serif lettering with every character and vowel mark
accurate; the subtitle at one-third size in muted light gold; a
delicate gold hairline; the English line in small widely tracked
refined uppercase sans-serif; the web address in clean softly lit
ivory, plain text. High-end book-cover typography, not decorative
calligraphy.
Constraints: no people, faces, member names, dates, counts, slogans,
crests, logos, watermarks, religious symbols, clip art, glowing
particles, flat cartoon trees, or oversaturated neon. One coherent
image.
```

Inspect the result at actual link-preview size before shipping — small
is how almost everyone will see it.
