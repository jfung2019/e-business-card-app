---
name: add-card-field
description: Checklist for adding, renaming or removing a field on a business card in this React Native app — core fields like phone or website, and custom_fields like address_cn, wechat_id or a social handle. Use this whenever the work involves a new piece of data appearing on a card, whether the request mentions the OCR parser, the card form, the wallet card face, the detail screen, the offline queue, or just says something like "cards should also capture X". A field touches nine or more files across parsing, storage, sync and three render surfaces, and the failure mode is silent — the value is captured but never shown, or shown but lost when the phone is offline.
---

# Adding a field to a business card

A "field" here is one of two things, and the distinction decides most of the work:

- **A core field** — `name`, `company_name`, `job_title`, `email`, `phone`, `website`. These are typed columns in `CoreFields` and mirror the API's Pydantic models. Adding one is an API change first; the app cannot invent a core field on its own.
- **A custom field** — anything in `custom_fields: Record<string, string>`, such as `address_en`, `address_cn`, `wechat_id`, `phone_2`. These need no schema change, which is why almost every new field should be one.

Start by asking which it is. If the request doesn't need a typed column and API support, make it a custom field.

## The touchpoints

Work through these in order. The order matters: the key has to exist before the parser can emit it, and the parser has to emit it before a screen can render it.

### 1. The canonical key — `src/utils/customFieldKeys.ts`

Export a `const` for the key and add every spelling the OCR or the LLM might return to `CUSTOM_FIELD_KEY_ALIASES`. Look at how `wechat_id` is done: the aliases cover spaced, underscored, Simplified and Traditional Chinese forms, because the model echoes whatever the card printed.

This file is half of a pair. The comment in it points at `_CUSTOM_FIELD_KEY_ALIASES` in the API's `app/services/openrouter.py`, and a spelling added on one side only will silently fail to fold — the value lands under a second key and the UI that looks up the canonical one shows nothing. When you add aliases here, say so in your summary so the API side gets the same change.

### 2. Offline parsing — `src/utils/parseOcrOffline.ts`

This is the on-device fallback that runs when a scan is saved with no network. If the new field can be recognised from raw OCR text, add its detection here and write it into `custom_fields` under the canonical key, the way `address_en`, `address_cn` and `wechat_id` are. If it can't be recognised offline, skip this file — the LLM path will fill it in when the card syncs and enhancement runs.

Anything you add here deserves a test in `__tests__/`; the parser is pure and easy to test, and regex classification breaks in ways that are invisible in the UI.

### 3. Display label — `src/utils/formatCustomFieldLabel.ts`

Keys render through this. The default turns `address_cn` into "address (cn)". If that reads badly for your key, add an entry to `EXACT_LABELS` — that's why `wechat_id` shows as "WeChat".

### 4. Editing — `src/screens/MyCardFormScreen.tsx`

Custom fields render generically from the keys present on the card, so a field that already has a value appears without code changes. Two things still need thought: whether the key should be offered on a card that doesn't have it yet (the form only shows keys it finds), and the ordering, which comes from `sortStoredCustomFieldKeys`.

### 5. Offline queue and patches — `src/services/offlineCardQueue.ts`, `src/services/offlineUserCardQueue.ts`, `src/utils/buildQueueFieldEditsPatch.ts`

An edit made offline is stored as a patch and replayed later. If the patch builder or the queue types enumerate fields anywhere, the new field has to be listed, or an offline edit to it is dropped on sync with no error shown. This is the step most likely to be forgotten, because everything looks correct while the phone is online.

### 6. Caches — `src/services/cardCollectionCache.ts`, `src/services/userCardsCache.ts`

These persist cards for offline viewing. They usually store whole card objects, in which case nothing changes. Check for field enumeration or a stored schema version before assuming it.

### 7. The render surfaces — three of them, and they are easy to miss

- `src/components/WalletCard.tsx` — a collected card's face in the wallet stack.
- `src/components/MyCardFace.tsx` — your own card's face.
- `src/screens/CardDetailScreen.tsx` — the detail rows, plus `CONTACT_FIELD_LABELS` for core fields and the suggested-updates review flow.

The two card faces are not one component and do not share code; a field added to one and not the other shows up on collected cards but not your own, or the reverse. If the field belongs on the face rather than only in the detail list, both need it.

Card faces have a hard space budget. The address band holds three lines and splits them 1 CN + 2 EN when both exist, and it insets its right padding to clear the face-toggle buttons. Before adding anything to a face, decide what it displaces — a card face that overflows just clips, silently.

### 8. Suggested updates — `src/screens/CardDetailScreen.tsx`

After a scan syncs, the API returns `enhanced_suggestions` for review. A new field should flow through that UI if the API can suggest it, so the user can accept the AI's value.

## Finishing

Run the tests and the linter:

```bash
npm test
npm run lint
```

Then state plainly which of the nine touchpoints you changed and which you deliberately skipped, with the reason. "Skipped the offline parser because a LinkedIn URL isn't reliably recognisable from OCR" is useful to a reviewer; a silent omission is the bug this checklist exists to prevent.
