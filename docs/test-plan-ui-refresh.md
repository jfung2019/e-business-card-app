# Test plan — UI refresh and name structure (`enhance/UI-UX`)

Manual acceptance tests for the release on branch `enhance/UI-UX`, covering the
navigation rework, the wallet, the Collected list, the Add and scan flows, card
detail, Settings, and the first/last name structure that spans the app and the
API.

Each case is written to be pasted into an Azure DevOps Test Case work item:
**Steps** map to the Steps grid, **Expected** to the Expected Result column, and
**Evidence** says what to attach.

---

## 1 · Before you start

### Builds under test

| Item | Value | Where to capture it |
| --- | --- | --- |
| App branch / commit | `enhance/UI-UX` @ `<sha>` | `git rev-parse --short HEAD` |
| API branch / commit | `enhance/name-structure` @ `<sha>` | same, in the API repo |
| API environment | dev | Settings shows the API target in the debug banner |
| Device / OS | e.g. iPhone 14, iOS 17.5 | Screenshot of the device |

Record these once at the top of the test run. A screenshot without a build
reference proves nothing later.

### Hard precondition — the API must be rebuilt

The name fields do not exist on a server running an older image. Before testing
anything in section 8, confirm the dev API is running the name-structure build:

```bash
curl -s https://<dev-host>/api/v1/cards | head -c 400
```

The response must contain `first_name`, `last_name`, `name_cn`, `sort_key` and
`sort_basis`. If it does not, redeploy first:

```bash
sudo chown -R $USER:$USER .git && git pull && sudo docker compose up -d --build api
```

Testing sorting against an old API produces false failures: the app falls back
to guessing parts from the printed name, which is exactly the behaviour the
feature replaces.

### Test data to seed

Create these before section 6 onwards. They exist to make sorting provable — the
rules only differ on names like these.

| Ref | Printed name | First | Last | Chinese | Company | Files under |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | Chris Huang | Chris | Huang | — | Northwind | **H** |
| D2 | Wong Ka Ming | Ka Ming | Wong | 黃嘉明 | Northwind | **W** |
| D3 | Sunny | Sunny | — | — | Lightfoot | **S** |
| D4 | Michelle Lee | Michelle | — | 李明珠 | Lightfoot | **M** |
| D5 | 陳大文 | — | — | 陳大文 | — | **中文** |
| D6 | Megaannum Ltd | — | — | — | Megaannum Ltd | **M** (by company) |

D3 and D4 are the cases where a first name has to stand in as the sort key. D5
must have no Latin company name, or it files under that instead. D6 is the
company-only card.

### Evidence conventions

- One screenshot per **Expected** line that makes a visible claim.
- Name files `TC-<id>_<step>.png`, e.g. `TC-3.2_after-delete.png`.
- For anything involving data, attach the API response or a Mongo query next to
  the screenshot. A screen can show the right thing for the wrong reason.
- A case passes only when the expected result is observed **exactly**. Anything
  else is a fail with a screenshot and a note, not a "pass with comment".

---

## 2 · Navigation and tab bar

**TC-1.1 — Five tabs are present and reachable**
Steps: launch the app signed in → tap each tab in turn.
Expected: tabs read My cards, Collected, (scan button), Add, Settings. Each
opens its own screen; the active tab is gold, the others muted.
Evidence: one screenshot per tab.

**TC-1.2 — The scan button is not a tab**
Steps: tap the raised centre camera button.
Expected: a sheet slides up asking "Whose card is it?". No tab becomes active
behind it, and the previous screen is still underneath.
Evidence: screenshot of the sheet over the previous screen.

**TC-1.3 — Back from a pushed screen returns to the same tab**
Steps: Collected → open any card → back.
Expected: returns to Collected with its scroll position, not to My cards.
Evidence: before/after screenshots.

---

## 3 · My cards (wallet)

**TC-2.1 — First-run empty state**
Preconditions: an account with no cards.
Steps: open My cards.
Expected: dashed placeholder card, "No cards yet", and two buttons — Scan my
card and Type it in. No blank screen, no spinner left running.
Evidence: screenshot.

**TC-2.2 — Primary card is on top and full size**
Preconditions: 3+ cards, one marked primary, and the primary is *not* the first
card by sort order.
Steps: open My cards.
Expected: the primary card is the large card at the top of the stack, with the
Primary badge. Header subtitle reads "N cards · <company> is primary".
Evidence: screenshot of the stack.

**TC-2.3 — Cards below read as stacked cards**
Steps: look at the strips beneath the top card.
Expected: each strip has square top corners and rounded bottom corners, carries
its company name, and is filled with the Settings card colour. No visible line
across the join with the card above.
Evidence: close-up screenshot of the stack.

**TC-2.4 — Tapping any card in the stack opens that card**
Steps: tap the second strip down, then go back and tap the third.
Expected: each opens **that** card's detail page — verify by the company name in
the header. Not the top card, not Browse all.
Evidence: screenshot of each detail page showing the matching company.

**TC-2.5 — Wallet limit is respected**
Preconditions: 6+ cards. Settings → Cards in the wallet = 5.
Steps: open My cards and count.
Expected: 5 cards shown; footer link reads "Browse all N cards" with N = the
full count. Change the setting to 3 and repeat — 3 shown.
Evidence: screenshots at both settings, with the card count visible.

**TC-2.6 — Browse all opens the full list**
Steps: tap "Browse all N cards".
Expected: the browse screen lists every card, including those the limit hid.
Evidence: screenshot.

**TC-2.7 — Reorder by long press**
Steps: on Browse all, long-press a card, drag it to a new position, release.
Expected: the card lifts under the finger, the others move aside, the new order
survives leaving and re-entering the screen. A short tap opens the card instead
of starting a drag.
Evidence: screenshots before, mid-drag and after re-entry.

---

## 4 · My card detail

**TC-3.1 — Actions are present and work**
Steps: open a card from the wallet → use Share, Export, Edit, Primary in turn.
Expected: Share opens the OS share sheet; Export opens the export modal and
produces a file; Edit opens the form pre-filled; Primary moves the badge to this
card and the wallet re-orders behind it.
Evidence: one screenshot per action, plus the exported file.

**TC-3.2 — Delete asks first, then removes**
Steps: Delete → Cancel. Then Delete → confirm.
Expected: Cancel leaves the card untouched. Confirm removes it, returns to the
previous screen, and the card is gone from the list without a manual refresh.
Evidence: confirmation dialog, list before, list after.

---

## 5 · Collected list

**TC-4.1 — Search**
Steps: type part of a name, then part of a company.
Expected: the list narrows on both; clearing the field restores every card.
Evidence: screenshots of both searches.

**TC-4.2 — Sort chips**
Steps: tap Recent, First name, Last name, Company in turn.
Expected: Recent orders by date added, newest first. The three name modes
regroup the list into A–Z sections. The selected chip is visibly selected.
Evidence: screenshot per chip.

**TC-4.3 — Section letters match the filing rule**
Preconditions: test data D1–D6 exist.
Steps: sort by Last name and scroll the whole list.
Expected: D1 under **H**, D2 under **W**, D3 under **S**, D4 under **M**,
D6 under **M**, and D5 in a **中文** section **at the very bottom**, after Z.
Evidence: screenshots covering each section header with its card.

**TC-4.4 — Name reads correctly while sorted**
Steps: with Last name sorting on, look at D1 and D2.
Expected: D1 shows "Huang, Chris" — inverted, family name bold and first. D2
shows "Wong Ka Ming" exactly as printed, because it is already family-first. No
Chinese name is reordered.
Evidence: close-up screenshot of both rows.

**TC-4.5 — Typed-in cards are marked**
Steps: find a card added through Add → A contact.
Expected: it carries the "Typed in" tag and shows a designed card thumbnail
rather than a photo.
Evidence: screenshot.

---

## 6 · Card detail (collected)

**TC-5.1 — Contact actions**
Steps: open a card with phone, email, website, WhatsApp and WeChat.
Expected: five icon actions in one row; each opens the right app or dialog.
A card with only some of these shows only those.
Evidence: screenshot of a full card and a sparse one.

**TC-5.2 — Front view / Back view**
Preconditions: a card scanned with both sides.
Steps: tap the view toggle.
Expected: the label switches between Front view and Back view and the image
follows. A card with no back scan shows no toggle.
Evidence: screenshots of both faces.

**TC-5.3 — Delete returns to Collected**
Steps: open a card **from Collected** → Delete → confirm.
Expected: returns to the **Collected** list, not My cards, and the card is gone.
Evidence: screenshots before and after. *(This is the fix for the reported bug —
capture it explicitly.)*

**TC-5.4 — Edit shows the name split**
Steps: tap Edit.
Expected: separate First name, Last name and Chinese name fields appear,
pre-filled. Saving keeps the printed name unchanged on the card face.
Evidence: screenshot of the edit form and of the card after saving.

---

## 7 · Add and scan flows

**TC-6.1 — Add tab offers both kinds**
Steps: open Add.
Expected: a segmented control — My own card / A contact. My own card shows **no
card-design picker** (the colour comes from Settings).
Evidence: screenshot of both segments.

**TC-6.2 — Saving a contact opens its detail page**
Steps: Add → A contact → fill name, company, phone, WhatsApp, WeChat → Save.
Expected: lands on the new card's **detail page** showing what was entered.
Returning to the Add tab shows an **empty** form, not the values just saved.
Evidence: form before save, detail page after, empty form on return.

**TC-6.3 — Saving my own card opens its detail page**
Steps: Add → My own card → fill in details including First/Last/Chinese name →
Save.
Expected: lands on the new card's detail page; the card appears in the wallet.
Evidence: detail page plus the wallet.

**TC-6.4 — Name parts are actually stored**
Steps: after TC-6.3, reopen the card → Edit.
Expected: First name, Last name and Chinese name are still filled in — they
survived the save. Confirm against the API response for that card.
Evidence: edit form screenshot **and** the API response showing the fields.

**TC-6.5 — Editing redirects back to the card**
Steps: open a card → Edit → change the job title → Save changes.
Expected: returns to that card's **detail page** showing the **new** title, not
the old one and not the wallet.
Evidence: before, edit, after.

**TC-6.6 — Scan asks who, not how**
Steps: tap the scan button → choose "Someone else's card".
Expected: the sheet closes and the **scan page** opens — the camera does **not**
launch by itself. The page offers Scan card and Choose image.
Evidence: sheet, then scan page.

**TC-6.7 — Scan reaches the right destination**
Steps: repeat TC-6.6 for both answers, capturing a card each time.
Expected: "My own card" saves into My cards; "Someone else's card" saves into
Collected. Neither lands in the other.
Evidence: the resulting card in the correct list, both times.

**TC-6.8 — Back side prompt**
Steps: capture a front image.
Expected: "Front captured successfully — Add the back side?" with Scan back,
Choose back and Skip back and save. The camera-or-library page does not reappear.
Evidence: screenshot of the prompt.

---

## 8 · Name structure (data level)

These prove the feature is real in the data, not only on screen. Azure reviewers
generally want at least one of these attached.

**TC-7.1 — API returns the new fields**
Steps: `GET /api/v1/cards` for the test account.
Expected: each card carries `first_name`, `last_name`, `name_cn`, `sort_key` and
`sort_basis`. For D1, `sort_key` = `huang`, `sort_basis` = `last_en`.
Evidence: the raw JSON response.

**TC-7.2 — Basis follows the fallback chain**
Steps: inspect the responses for D1, D3, D4, D5, D6.
Expected: `sort_basis` is `last_en` for D1, `first_en` for D3 and D4, `none` for
D5, `company` for D6.
Evidence: the JSON for each, highlighted.

**TC-7.3 — A card with no split still sorts**
Preconditions: a card created before this release, with empty name parts.
Steps: view it in Collected sorted by Last name.
Expected: it still appears under a sensible letter (derived on read), not in an
error state and not missing from the list.
Evidence: screenshot plus that card's API response.

**TC-7.4 — Backfill report runs clean**
Steps: run the report mode on the dev server:
`sudo docker exec ebc-api python -m scripts.backfill_name_parts`
Expected: prints the total card count and the number needing a re-read, writes
nothing.
Evidence: terminal output.

---

## 9 · Settings

**TC-8.1 — Sections**
Expected: Appearance, Account and Legal only. No My cards section, no stats
tiles. Opening Settings is immediate — buttons respond on first tap.
Evidence: screenshot of the full screen.

**TC-8.2 — Card colour applies everywhere**
Steps: pick the Sand swatch (`#D1C6A5`) → open My cards → open Collected.
Expected: every designed card face — wallet card, stack strips, Collected
thumbnails — uses sand with dark text that remains readable. Scanned photos are
unaffected.
Evidence: Settings, wallet and Collected screenshots after the change.

**TC-8.3 — Colour survives a restart**
Steps: force-quit and relaunch.
Expected: the chosen colour is still selected.
Evidence: screenshot after relaunch.

**TC-8.4 — Dark mode**
Steps: toggle dark mode and walk through all five tabs.
Expected: every screen switches; no unreadable text, no white flashes on card
faces.
Evidence: screenshot per tab in dark mode.

---

## 10 · Regression and offline

**TC-9.1 — Existing cards survive the upgrade**
Preconditions: an account with cards created before this release.
Steps: install the new build over the old one and open both lists.
Expected: every card is still present with its images, order and primary flag.
Evidence: card count before and after.

**TC-9.2 — Offline scan queues and syncs**
Steps: turn on airplane mode → scan a card → save → restore the network → pull
to refresh.
Expected: the card is kept as a local draft, then syncs and appears as a normal
card. No duplicate.
Evidence: offline state, then synced state.

**TC-9.3 — Share link renders the chosen design**
Steps: share a card and open the link in a browser.
Expected: the web card uses the same colour family as the app, including Sand.
Evidence: browser screenshot next to the app screenshot.

---

## 11 · Supporting automated evidence

Not a substitute for the cases above, but worth attaching to the work item as
supporting proof:

```bash
npx jest            # app: 128 tests
python -m pytest    # API, from the api repo
```

The app suite includes 17 unit tests over the name-sorting rules
(`__tests__/nameSort.test.ts`) that cover the same filing logic TC-4.3 checks on
screen, and the API has `tests/test_name_sort.py`. Capture the summary lines.

Neither repo has a CI pipeline today, so these are run locally and pasted in. If
Azure wants durable run history, an `azure-pipelines.yml` running both suites
with JUnit output would put results in the Tests tab of every run — worth doing
separately from this release.

---

## 12 · Sign-off

| Area | Cases | Result | Tester | Date |
| --- | --- | --- | --- | --- |
| Navigation | TC-1.1 – TC-1.3 | | | |
| Wallet | TC-2.1 – TC-2.7 | | | |
| My card detail | TC-3.1 – TC-3.2 | | | |
| Collected | TC-4.1 – TC-4.5 | | | |
| Card detail | TC-5.1 – TC-5.4 | | | |
| Add and scan | TC-6.1 – TC-6.8 | | | |
| Name structure | TC-7.1 – TC-7.4 | | | |
| Settings | TC-8.1 – TC-8.4 | | | |
| Regression | TC-9.1 – TC-9.3 | | | |

**Release is evidenced when** every case above has a result, every fail has a
linked bug, and the build references in section 1 are attached to the run.
