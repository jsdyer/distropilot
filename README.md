# Distro Pilot

Compare Linux package evidence and support windows, then keep a migration plan.

**Use it:** https://coolcode.ca/distropilot/ · **Source:** https://github.com/jsdyer/distropilot

<!-- coolcode:guide -->
Choose Linux releases, build a software wishlist and compare captured upstream versions, packaging revisions and repository sections. Add any valid Repology project identifier; new lookups use CoolCode’s cached gateway. Support dates are separately sourced from distro-info-data and AlmaLinux’s release notes, with Fedora dates explicitly uncaptured. Save notes and dated evidence locally or export/import a complete plan. Missing index records do not prove package absence, and older versions may have security backports.
<!-- /coolcode:guide -->

## Use the comparison

1. Select up to six releases. The initial Ubuntu, Debian and AlmaLinux choices are examples.
2. Add a Repology **project identifier**, such as `sqlite`, `curl` or `podman`. A project identifier may differ from an apt/dnf package name. Find identifiers at https://repology.org/projects/.
3. Expand cells to inspect package revisions and branches. Versions alone do not indicate security, compatibility or installability. This is not a dependency resolver. The index does not provide package architecture, so the UI does not invent an architecture filter.
4. Record required versions and upgrade checks in migration notes. Saving in this browser is explicit. JSON export includes all evidence and original check dates; CSV includes selected package records and notes. Imported older plans remain useful even if the current default releases change. Reload to return to the current published capture.

## Sources and date meanings

- Package data: https://repology.org/api/v1/project/php (replace `php` with the project identifier). Repology may lack a release or a package. “No captured record” is not proof of package absence. The initial capture has no observed AlmaLinux 10 coverage.
- Ubuntu / Debian support: https://debian.pages.debian.net/distro-info-data/ubuntu.csv and https://debian.pages.debian.net/distro-info-data/debian.csv, maintained by Debian's distro-info-data project.
- AlmaLinux active / security support: https://wiki.almalinux.org/release-notes/.
- Fedora lifecycle: https://docs.fedoraproject.org/en-US/releases/lifecycle/. Dates are not captured automatically; consult the official policy.

`checked_at` is when sources were successfully fetched, not a vendor release date. Each project retains its individual check date when refreshed. Ubuntu ESM / legacy and Debian LTS / ELTS differ from regular support in eligibility and package coverage. Validate a migration against the distribution's package and security documentation.

## Privacy and API setup

No API key is required in this repository. Live project lookups use `https://coolcode-visitor-api.jeffdyer.workers.dev/api/distropilot/project?name=...`, configured in `config/catalogue.json`. Its contract is `{ "fetched_at": "ISO timestamp", "data": [Repology package records] }`. Only the project identifier leaves the page. The gateway caches requests, enforces the upstream request interval and returns `429` with `Retry-After` when busy. Previously loaded evidence is retained on failure. Gateway deployment is managed separately by the CoolCode hub.

The app fetches its published capture from this site. Selection, notes and imported plans stay on the visitor's device. Explicit saved plans use `coolcode:distropilot:plan` in localStorage. The standard CoolCode aggregate visit counter also runs. No private API key belongs in `web/`, repository variables, generated JSON or frontend code.

## Expand or customize

Edit `config/catalogue.json`:

- `projects`: maintained baseline Repology project identifiers (currently 12). The visitor wishlist is expandable and is not restricted to these examples.
- `repositories`: Repology repository IDs with labels, official lifecycle links, and the distro-info `series` or AlmaLinux `major`. Unsupported lifecycle families may be listed with empty dates. Add a release here to expose it in the picker; never guess a Repology ID or support date.
- `default_projects`, `default_repositories`: initial choices.
- `max_projects`, `max_repositories`: conservative visitor limits (30 and 6; bounded to 100 projects and 12 releases).
- `api_base`: cached live gateway base, without `/project`. Do not point the browser at Repology directly; its API lacks the needed browser CORS policy.

Run `python3 scripts/refresh.py`, then the checks below. The collector retrieves actual sources, validates all results, spaces Repology requests by at least 1.1 seconds and writes data only after every source succeeds. An unavailable or changed source causes a failing workflow and preserves the previous deployment. It makes 12 project requests per daily run, well below Repology's discouraged 1,000/day threshold.

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

The browser test exercises an extra project outside the starter list, source text safety, local save/restore, export, rate-limit failure preservation and mobile overflow at the project subpath. CI uses Ubuntu 24.04's installed Google Chrome. Build output in `dist/` is ignored by git. Lifecycle integration requirements are documented in `AGENTS.md` and the hub's `docs/tool-lifecycle.md`.
