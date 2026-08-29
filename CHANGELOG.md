# Changelog

All notable changes to this project will be documented in this file.

## v1.3.7 - 2026-08-29
- Added: 9-ball scores now update in real time as balls are selected or deselected.
- Added: A real-time points-to-win countdown appears when a player needs nine or fewer points to win.
- Fixed: 9-ball Break and Run awards now require the player to have taken the opening break shot.
- Tests: Added automated coverage for standard, Sudden Death, and Single Rack live-scoring behavior.
- Removed: The site-wide contact form and Formbricks integration to reduce spam.

## v1.3.6 - 2026-08-18
- Added: Versioned backup schema with compatibility for backups created before v1.3.6. [70e8f5f] - ([@meagantroot])
- Fixed: Corrupted or incorrectly shaped browser storage now recovers safely instead of breaking the pool app. [70e8f5f] - ([@meagantroot])
- Security: Added stricter validation for imported game modes, players, scores, innings, balls, and active-match state. [70e8f5f] - ([@meagantroot])
- Tests: Added automated storage and backup regression tests to the GitHub Actions build. [70e8f5f] - ([@meagantroot])

## v1.3.5 - 2026-08-18
- Fixed: Corrected malformed Liquid branching in the shared page head. [887574b] - ([@meagantroot])
- Fixed: Removed duplicate document closing tags from generated pages. [887574b] - ([@meagantroot])
- Fixed: Corrected the plants table structure and generated plant links. [887574b] - ([@meagantroot])
- Added: Reusable, accessible blog pagination shared by blog layouts. [887574b] - ([@meagantroot])
- Accessibility: Restored browser zoom support on mobile devices. [887574b] - ([@meagantroot])
- Security: Added opener isolation to links that open in a new tab. [887574b] - ([@meagantroot])

## v1.3.4 - 2026-08-18
- Build: Pinned Ruby 3.3.0 and Bundler 2.5.3 for reproducible local and automated builds. [faa17e6] - ([@meagantroot])
- Build: Added a committed dependency lockfile and declared all configured Jekyll plugins directly. [faa17e6] - ([@meagantroot])
- Added: GitHub Actions now verifies strict production Jekyll builds for pull requests and pushes to `main`. [faa17e6] - ([@meagantroot])
- Added: Documented local setup, preview, and build commands. [faa17e6] - ([@meagantroot])
- Fixed: Excluded Bundler's `vendor` directory from Jekyll processing so cached dependencies do not break automated builds. [f06e4a4] - ([@meagantroot])

## v1.3.3 - 2026-08-18
- Fixed: Backups exported without an active match can now be imported on another device. [3e6e57f] - ([@meagantroot])
- Fixed: Valid active matches are preserved and restored when importing a backup. [3e6e57f] - ([@meagantroot])

## v1.3.2 - 2026-08-18
- Security: Added validation, size limits, depth limits, and unsafe-property protection for imported backup files. [d9fb8d2] - ([@meagantroot])
- Security: Sanitized imported text and escaped match data rendered in history and player statistics. [d9fb8d2] - ([@meagantroot])

## v1.3.1 - 2026-08-05
- Fixed: Cleaned up match history. [c752f4d] - ([@meagantroot])
- Fixed: Winner name not being stored to match history. [c752f4d] - ([@meagantroot])

## v1.3 - 2026-08-05
- Added: New Sudden Death scoring mode. [3d206c0] - ([@meagantroot])
- Added: Manually choose who shoots first. [3d206c0] - ([@meagantroot])

## v1.2
- Unreleased: Abandoned development fork.

## v1.1.14 - 2026-04-01
- Added: automatic break and run detection logic. [6ab4847] - ([@meagantroot])
- Removed: break and run button. [6ab4847] - ([@meagantroot])

## v1.1.13 - 2026-04-01
- Improved: 8-ball Solids/Stripes Logic. [c7ac628] - ([@meagantroot])

## v1.1.12 - 2026-04-01
- Improved: Ball Toggle Logic and styling. [be1d884] - ([@meagantroot])

## v1.1.11 - 2026-03-24
- Fixed: Innings now start at 0. [769a3c2] - ([@meagantroot])

## v1.1.10 - 2026-03-23
- Security: Added DomPurify. [c2e29ae] - ([@meagantroot])
- Security: Added XSS protections to form inputs. [c2e29ae] - ([@meagantroot])
- Update: Set 10-ball to use APA style 8-ball handicaps. [c2e29ae] - ([@meagantroot])

## v1.1.9 - 2026-03-23
- Update: Content Update [8145d8a] - ([@meagantroot])

## v1.1.8 - 2026-03-22
- Added: Player search added to Player Stats and Match history. [4ef5ecf] - ([@meagantroot])
- Update: Redesigned the player stats UI. [4ef5ecf] - ([@meagantroot])

## v1.1.7 - 2026-03-22
- Update: 10-ball scoring experiment. [725a7d8] - ([@meagantroot])

## v1.1.6 - 2026-03-22
- Reverted: Failed version do not use.

## v1.1.5 - 2026-03-21
- Dev version not published.

## v1.1.4 - 2026-03-21
- Dev version not published.

## v1.1.3 - 2026-03-21
- Added: Implemented official APA style 8-ball handicaps. [73c5e33] - ([@meagantroot])

## v1.1.2 - 2026-03-18
- Update: Code comments [546cada] - ([@meagantroot])

## v1.1.1 - 2026-03-18
- Update: Refactored Game History to include player skill levels. [e73fcf9] - ([@meagantroot])
- Added: Player skill level to stored dataset. [e73fcf9] - ([@meagantroot])
- Added: Made player name inputs required and added placeholders. [e73fcf9] - ([@meagantroot])

## v1.1 - 2026-03-12
- Initial project release [0a92fd5] - ([@meagantroot])

[6ab4847]: https://github.com/meagantroot/mltydesigns.com/pull/19/commits/6ab4847c3b581cfdf5bfc63c9d1e59b1f1d78edc
[c7ac628]: https://github.com/meagantroot/mltydesigns.com/commit/c7ac6285827bbdbe6d9e13df5ed9db1a028a1be6
[be1d884]: https://github.com/meagantroot/mltydesigns.com/pull/17/commits/be1d884d334b1d8375758e8c0ce899afd9efd92c
[769a3c2]: https://github.com/meagantroot/mltydesigns.com/pull/16/commits/769a3c2a172d92e2dd42cbf661dc271319b88a84
[c2e29ae]: https://github.com/meagantroot/mltydesigns.com/pull/13/commits/c2e29ae9bc04ad14358986fe2182966f76d22589
[8145d8a]: https://github.com/meagantroot/mltydesigns.com/pull/12/commits/8145d8a8e067db69afd3573d6df85e3d063385a9
[4ef5ecf]: https://github.com/meagantroot/mltydesigns.com/pull/11/commits/4ef5ecf6f21e9353249459f3cac07b476a977800
[725a7d8]: https://github.com/meagantroot/mltydesigns.com/pull/10/commits/725a7d8d71c15239f1de83612a94cbedebae654e
[73c5e33]: https://github.com/meagantroot/mltydesigns.com/pull/7/commits/73c5e331ec4329802eeec5dd9fe35cfdd1f20351
[546cada]: https://github.com/meagantroot/mltydesigns.com/pull/6/commits/546cadaf4dd90d11a0f839e86e125010e838aa8b
[e73fcf9]: https://github.com/meagantroot/mltydesigns.com/pull/5/commits/e73fcf9f90bd54acd9e86e5d0a35a3fd1f30f7f6
[0a92fd5]: https://github.com/meagantroot/mltydesigns.com/pull/4/commits/0a92fd5384d532c20a398b42fb8611ce9173407e
[3d206c0]: https://github.com/meagantroot/mltydesigns.com/pull/22/commits/3d206c00b77e27590fe6102746293515c2aee2c1
[c752f4d]: https://github.com/meagantroot/mltydesigns.com/pull/23/commits/c752f4d6de42ea1a4c6335f83ca19074ef55017f
[d9fb8d2]: https://github.com/meagantroot/mltydesigns.com/pull/24/commits/d9fb8d24f32b1631eaabc901f8898f4ea7b4964c
[3e6e57f]: https://github.com/meagantroot/mltydesigns.com/pull/25/commits/3e6e57fcc0221270be48cdb72af81e231b0e79cd
[faa17e6]: https://github.com/meagantroot/mltydesigns.com/pull/26/commits/faa17e6b65915626c826696183fe7e7f68fbc3fd
[f06e4a4]: https://github.com/meagantroot/mltydesigns.com/pull/26/commits/f06e4a438e6d72154b2ed5ee256bb4e5dad1941b
[887574b]: https://github.com/meagantroot/mltydesigns.com/pull/27/commits/887574b9cbd3e7958530f0c65cb1f00e1cbbf17c
[70e8f5f]: https://github.com/meagantroot/mltydesigns.com/pull/28/commits/70e8f5fb6de9598c7eca6b3532c5b03dc3c83407
[@meagantroot]: https://github.com/meagantroot
