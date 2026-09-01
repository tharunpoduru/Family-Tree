# Family Tree — Product Requirements Document

**Template edition · v2.0**

This is the product thinking the template was built on. It reads as a
PRD for *your* deployment: where it says "the family", read yours.

---

## Problem Statement

A family's knowledge — who is related to whom, wedding and portrait
photographs, dates (Gregorian and tithi), gotra, and life stories —
lives scattered across individual memories, WhatsApp threads, and
physical albums. The elders who hold the most irreplaceable knowledge
are aging, and no shared, private place exists for the extended family
to see, preserve, and enrich this heritage together. Every year this
goes unbuilt, knowledge is permanently lost.

## Goals

1. **Findability**: any approved family member can find any relative
   and reach their family page in under 10 seconds, on a phone.
2. **Preservation with dignity**: every person is represented well
   regardless of how much is known — a name-only entry looks complete,
   not neglected.
3. **Cultural fidelity**: tithi dates, gotra, native-script names, and
   true kinship terms are first-class (optional, never enforced) — the
   site feels *made for this family*, not a generic tool localized.
4. **Living, not static**: members contribute corrections and photos
   through a suggestion flow that routes through an admin —
   deliberately sparking family conversations rather than silent edits.
5. **Privacy**: only explicitly approved family members ever see any
   family data.

## Principles

1. **Built for decades, not quarters.** A family archive has a 50-year
   horizon. Every choice favors longevity: the permanent `*.web.app`
   domain over a purchasable one that could lapse, a GEDCOM-mappable
   data model so the data outlives any website, photo originals
   archived at full resolution alongside served variants.
2. **Sequenced, never cheapened.** Phases define build *order*, not
   quality tiers. Nothing ships at "good enough for now."
3. **The tree grows forever.** The family starts from one ancestor and
   grows downward indefinitely. Every design — tree visualization, IDs,
   admin tooling, performance — assumes unbounded generational growth.
4. **Dignity in sparseness.** A name-only entry renders as complete,
   never as a gap-riddled form.
5. **Conversation by design.** The suggestion → admin-review loop is
   deliberately human-in-the-loop; the slight friction *is* the
   feature — it makes family members talk to each other.
6. **Language is data.** Kinship terms, calendar conventions, and
   scripts come from a swappable language pack; the engine encodes only
   the shared classificatory rules.

## Non-Goals

- **Not a genealogy research tool.** No GEDCOM import, record-hint
  matching, or ancestry search — this is curated family knowledge.
  (GEDCOM *export* remains architectural insurance.)
- **No public access or SEO.** Invisible to search engines; nothing
  public beyond the sign-in doorstep.
- **No native mobile apps.** Responsive web only — the audience arrives
  via shared links in WhatsApp; installs are friction.
- **No wiki-style direct editing by members.** Members suggest; only
  admins write canonical data. A social design, not a technical limit.
- **No in-app chat.** Conversations the site sparks should happen where
  the family already talks.
- **No automatic panchangam computation.** Tithi *storage and display*
  is core; computing "this year's Gregorian date for this tithi" is a
  future possibility the data model already supports.

## Personas

| Persona | Description |
|---|---|
| **Admin** | Seeds and owns the data; approves access requests and reviews suggestions. Moderately tech-comfortable. |
| **Member** | Extended family, all ages, mostly on phones via WhatsApp links. Views, searches, occasionally suggests. |
| **Elder member** | Low tech comfort, possibly low vision. Navigates by names and kinship, not UI conventions. Must never hit a dead end. |
| **Owner/Developer** | Deploys and operates; secondary admin; handles anything requiring technical skill. |

## Requirements

### Foundation (P0)

**R1. Data model — Person + Union (GEDCOM-aligned)**
Person: bilingual names, portraits (recent + younger), gotra,
nakshatra, composite dates, bio, places, parents-by-name for people
whose parents aren't in the tree, maiden name. Union: one or two
partners, wedding album, marriage date, ordered children.
Every date is Gregorian (partial ISO ok) and/or tithi
(māsa/paksha/tithi, any subset) plus an approximate flag.
*Accept:* a person with only a name renders correctly everywhere;
remarriage is representable; a union with no photo renders correctly.

**R2. Family page** — couple header with wedding album, names, marriage
date; children grid with portraits; tap a child → the page where *they*
are a parent; tap a parent → their parents' page; no dead ends.

**R3. Tree overview** — whole-family visualization usable on a phone,
re-rooting on tap, scaling with unbounded growth (collapsible branches,
not a fixed layout that degrades).

**R4. Directory + search** — alphabetical index; search matches
English and native-script names, nicknames, and maiden names; results
land on the person's home page.

**R5. Access control** — Google Sign-In + email-link fallback;
request-access doorstep; admin approval queue; member/admin roles with
multiple admins; individual revocation. **Firestore + Storage rules
enforce**: no reads without approved membership, no canonical writes
except admin, members may only create suggestions. Rules are the
enforcement layer — UI gating alone is cosmetic.
*Accept:* direct Firestore/Storage requests from an unapproved account
are denied by rules, proven by tests.

**R6. Mobile-first, all-ages UX** — responsive from 360px; base font ≥
16px; tap targets ≥ 44px; WCAG AA contrast; absent fields leave no
holes or "Unknown" labels; Lighthouse accessibility ≥ 95.

**R7. Performance on slow mobile networks** — full family graph loads
once per session; every navigation after that is a synchronous
in-memory lookup; photos lazy-load as resized variants, never
originals. The signed-out doorstep must not download the database SDK —
Firestore stays out of the critical path (separate chunks, dynamic
import after approval). First meaningful render < 3s on throttled 4G.

**R8. Infrastructure** — Firebase, Blaze plan; Firestore, Storage, and
the resize function in one deliberately chosen region (immutable — the
first decision made); the permanent `*.web.app` domain; `noindex`
everywhere.

### Committed (P1)

**R9. Suggestions + review** — members edit in the same sheets admins
use; saves become structured pending changes; admins see a
human-language field diff with attribution and apply, edit-first, or
decline. Member photo uploads land in a quarantined Storage path only.

**R10. In-app admin editing** — full CRUD for people, unions, photos,
crops, and tithi fields; data entry never ends, so admin
self-sufficiency is a long-term requirement, not a convenience.

**R11. Timeline** — all dated events, chronological, grouped by decade,
linking back to family pages.

**R12. Kinship badges** — "who is this person to me?" computed for the
signed-in viewer once their account is linked to a person, in the
configured language with a precise English gloss.

### Horizon (P2)

Remembrance view (upcoming death-anniversary tithis and birthdays) ·
GEDCOM export · galleries beyond one-great-photo-each · recorded oral
histories · a places/migration view.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Domain | The free permanent `<project>.web.app`. A lapsed renewal must never cut off family access. |
| 2 | Admins | Multiple, from day one. Admin is a role, not a person. |
| 3 | Seed scope | Infinite downward. No fixed "done" for data. |
| 4 | Living people's fields | All visible to approved members; a field-level visibility flag is reserved in the model should the family's stance change. |
| 5 | Data entry | Members suggest; admins apply or enter directly. |
| 6 | Photos | Audience is approved members only — get the family's comfort explicitly anyway. |

## Phasing

1. **The experience** — model, family pages, tree, directory, UX;
   placeholder data; no auth yet.
2. **The doors** — auth, approvals, security rules, region-verified
   infrastructure, performance hardening, real data, deploy.
3. **The conversation** — suggestions, in-app admin editing, timeline,
   kinship badges, native-script polish.

The only irreversible step is the Firestore region — it is chosen
first, before any other setup.
