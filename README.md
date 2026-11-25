# Distro Pilot

Compare Linux package evidence and support windows, then keep a migration plan.

**Use it:** https://coolcode.ca/distropilot/ · **Source:** https://github.com/jsdyer/distropilot

<!-- coolcode:guide -->
Browse captured desktop apps, media tools, backup utilities, developer software and servers, then compare their package evidence across indexed Linux releases. Search and filter the app and distribution pickers; arbitrary valid Repology project identifiers still work through the cached gateway. Rolling releases and Debian’s development branch are labelled separately from fixed releases. Official lifecycle dates, source coverage and dated migration notes travel with exported plans. Mint coverage is explicitly unverified; an Ubuntu base comparison is not Mint package evidence. Missing records do not prove absence, and older versions may have security backports.
<!-- /coolcode:guide -->

## Use the comparison

1. Search releases by name or release model and filter by distribution. Select up to six; selected-release chips remain visible while filtering. The initial Ubuntu, Debian and AlmaLinux choices are examples.
2. Browse the captured app catalogue by category, search by app name, and use Add. The catalogue covers desktop/office, media/design, backup/files, network/security, development, terminal/admin and servers/databases. For any other software, expand **Add any other Repology project** and enter its identifier. A project identifier may differ from an apt/dnf package name; find identifiers at https://repology.org/projects/. The starter catalogue is not a limit on live lookups.
3. Expand cells to inspect package revisions and branches. Ubuntu Firefox/Chromium records may show `1snap1`: these are transitional packages, not the installed Snap version. Snap and Flatpak alternatives are outside this capture. Versions alone do not indicate security, compatibility or installability. This is not a dependency resolver. The index does not provide package architecture, so the UI does not invent an architecture filter.
4. Record required versions and upgrade checks in migration notes. Saving in this browser is explicit. JSON export includes all evidence and original check dates; CSV includes selected package records and notes. Imported older plans remain useful even if the current default releases change. Reload to return to the current published capture.

## Sources and date meanings

- Package data: https://repology.org/api/v1/project/php (replace `php` with the project identifier). Repology may lack a release or a package. “No captured record” is not proof of package absence. Every selectable release must have observed records in the daily capture. The number of captured projects with records is shown on each release, and each app shows its release coverage.
- Ubuntu / Debian support: https://debian.pages.debian.net/distro-info-data/ubuntu.csv and https://debian.pages.debian.net/distro-info-data/debian.csv, maintained by Debian's distro-info-data project.
- AlmaLinux active / security support: https://wiki.almalinux.org/release-notes/.
- Rocky active / security support: https://docs.rockylinux.org/releases/. Only the maintained minor release is supported.
- Alpine main support: https://www.alpinelinux.org/releases/. The community repository is supported only until the next stable release; the displayed main end date does not extend community support.
- Fedora lifecycle: https://docs.fedoraproject.org/en-US/releases/lifecycle/. Dates are not captured automatically; consult the official policy.

The maintained catalogue currently contains **64 projects, 20 repository choices and 9 distribution families**. Repository identifiers were verified in actual Repology project responses:

| Distribution | Indexed choices | Lifecycle treatment |
| --- | --- | --- |
| Ubuntu | 22.04 LTS, 24.04 LTS, 26.04 LTS, 26.10 | Daily distro-info dates |
| Debian | 12, 13, unstable/sid | Stable dates; sid explicitly development, not a stable release |
| Fedora | 44, 45 | Official policy link; exact dates not captured |
| AlmaLinux | 8, 9 | Daily active/security dates |
| Rocky Linux | 8, 9 | Daily active/security dates |
| openSUSE | Leap 15.6, Tumbleweed | Leap 15.6 ended 2026-04-30; Tumbleweed rolling |
| Arch Linux | Official repositories | Rolling; no AUR evidence |
| Alpine | 3.22, 3.23, 3.24 | Daily main-repository end dates |
| Void Linux | x86_64 repository | Rolling; repository scope is explicit |

Linux Mint, AlmaLinux 10, Rocky Linux 10 and openSUSE Leap 16 are not presented as selectable package evidence because index coverage was not established in the verified responses. The app includes visible coverage notes, rather than inventing repository IDs. [Mint’s official release list](https://www.linuxmint.com/download_all.php) identifies Ubuntu 24.04 as the Mint 22.x base, Ubuntu 22.04 as the Mint 21.x base and Debian 13 as the LMDE 7 base; these base repositories do not cover Mint-specific packages. Recheck the source before adding a new ID.

Rolling-policy sources: [Arch](https://archlinux.org/about/), [openSUSE](https://get.opensuse.org/desktop/), [Void](https://voidlinux.org/). [Debian sid](https://www.debian.org/releases/sid/) is a development branch whose security updates are not managed by the Debian security team. The reviewed [Leap 15.6 EOL](https://calendar.opensuse.org/teams/product-schedule/events/leap-15-6-eol) is included for migration planning, not as a current supported release.

`checked_at` is the source-capture time, not a vendor release date. Individually reviewed policy statements and Leap’s end date retain `policy_verified_on`; a daily build does not pretend to reverify those statements. Each project retains its individual check date when refreshed. Ubuntu ESM / legacy and Debian LTS / ELTS differ from regular support in eligibility and package coverage. Validate a migration against the distribution's package and security documentation.

## Privacy and API setup

No API key is required in this repository. Live project lookups use `https://coolcode-visitor-api.jeffdyer.workers.dev/api/distropilot/project?name=...`, configured in `config/catalogue.json`. Its contract is `{ "fetched_at": "ISO timestamp", "data": [Repology package records] }`. Only the project identifier leaves the page. The gateway caches requests, enforces the upstream request interval and returns `429` with `Retry-After` when busy. Previously loaded evidence is retained on failure. Gateway deployment is managed separately by the CoolCode hub.

The app fetches its published capture from this site. Selection, notes and imported plans stay on the visitor's device. Explicit saved plans use `coolcode:distropilot:plan` in localStorage. The standard CoolCode aggregate visit counter also runs. No private API key belongs in `web/`, repository variables, generated JSON or frontend code.

## Expand or customize

Edit `config/catalogue.json`:

- `projects`: maintained baseline Repology project identifiers (currently 64). The visitor wishlist is expandable and is not restricted to these examples.
- `project_info`: display labels and categories keyed by project identifier. Add a new category here and the visitor filter picks it up automatically; missing metadata defaults to the identifier and Other.
- `repositories`: verified Repology IDs, display labels, official sources and `release_model` (`fixed`, `rolling`, `development`). Ubuntu/Debian and Alpine use `series`; Alma/Rocky use `major`. Source adapters parse lifecycle dates. Reviewed policies use `policy_note` and `policy_verified_on`; only dates explicitly verified in an official source belong in `reviewed_lifecycle`. No fixed end date is invented for rolling/development branches. Adding a row exposes it in the picker, but a daily capture fails if that repository has no observed records across the configured projects.
- `coverage_notes`: explained gaps with an official link and original `reviewed_on`. These travel with exported captures. Do not silently map one distribution to another's repositories.
- `default_projects`, `default_repositories`: initial choices.
- `max_projects`, `max_repositories`: conservative visitor limits (30 and 6; bounded to 100 projects and 12 releases).
- `api_base`: cached live gateway base, without `/project`. Do not point the browser at Repology directly; its API lacks the needed browser CORS policy.

Run `python3 scripts/refresh.py`, then the checks below. The collector retrieves actual sources, validates all results, spaces Repology requests by at least 1.25 seconds and writes data only after every source succeeds. An unavailable or changed source causes a failing workflow and preserves the previous deployment. It makes 64 sequential project requests per daily run (the verified source pass took about six minutes), with a 45-second timeout and 8 MB raw bound per request. The refresh step is capped at 11 minutes inside the 15-minute job, leaving time for checks; timeout/failure retains the prior deployment. Account for manual and push-triggered runs as well as the gateway's 600/day budget when staying below Repology's discouraged 1,000/day threshold. Reuse a recently downloaded response for local development; avoid repeated full refreshes.

Commit configuration, refreshed `web/data/`, application and tests. Push to `main` or run **Browser tool · Check and publish** manually. PR builds use the committed capture offline; main builds refresh, test, commit captured data and publish via GitHub Pages. GitHub Pages source must be GitHub Actions. Do not add a CNAME.

## Schedule and monitoring

`.github/workflows/pages.yml` runs daily at **08:31 UTC**, on main pushes and manually. `.github/workflows/schedule-guard.yml` renews only the explicitly allowlisted collector and itself. Both must also be registered in the independent CoolCode watchdog; a guard does not prove source freshness.

Small freshness probe: `https://coolcode.ca/distropilot/data/status.json` → `checked_at` (UTC ISO string), `count` (number of projects), `repository_count`, and SHA-256 of the published catalogue. Expected cadence 24 hours; alert after 72 hours, count below 1, failed workflow or bad HTTP response. Probe the route and downloadable JSON, plus the live gateway separately.

## Development

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m pip install -r tests/browser-requirements.txt
CHROMIUM_PATH=/usr/bin/google-chrome python3 tests/browser_smoke.py
```

The browser test exercises searchable categories/releases, rolling policies, Mint coverage gaps, an extra project outside the starter list, source text safety, local save/restore, export, rate-limit failure preservation and mobile overflow at the project subpath. CI uses Ubuntu 24.04's installed Google Chrome. The offline builder adds a deterministic content revision to local CSS, JavaScript imports and the catalogue JSON fetch. A changed source capture therefore receives a matching new asset URL instead of mixing fresh HTML with an older cached script or catalogue. Identical inputs produce identical revisions. Build output in `dist/` is ignored by git. Lifecycle integration requirements are documented in `AGENTS.md` and the hub's `docs/tool-lifecycle.md`.
