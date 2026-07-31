# CONFIGURATION — AI OS PROFILE

This file is the single source of truth for every user-editable value used across
`README.md` and the `assets/*.svg` files. Nothing in this project is hardcoded —
if you want to rebrand the profile, edit the values here and mirror them into the
corresponding placeholders in each file (GitHub READMEs cannot read external
config files at render time, so this doc is the manual "source of truth" you copy
from, not a live include).

---

## IDENTITY

| KEY | VALUE |
|---|---|
| `FULL_NAME` | Rey |
| `USERNAME` | RohonAlam |
| `TITLE` | AI / Robotics Research Engineer |
| `ROLE` | M.Tech Student — Robotics & AI |
| `INSTITUTE` | Indian Institute of Technology, Guwahati |
| `MISSION` | 3D Urban Reconstruction using Video Data |
| `LOCATION` | Guwahati, Assam, India |
| `STATUS` | ONLINE — RESEARCHING |
| `ACCESS_LEVEL` | ROOT |
| `UPTIME` | since 2025 |

---

## CONTACT

| KEY | VALUE |
|---|---|
| `GITHUB` | https://github.com/RohonAlam |
| `LINKEDIN` | ADD_YOUR_LINKEDIN_URL |
| `LEETCODE` | ADD_YOUR_LEETCODE_USERNAME |
| `EMAIL` | ADD_YOUR_EMAIL |

> These three are placeholders — fill them in before publishing. I don't have
> verified values for your LinkedIn, LeetCode handle, or email, so I left them
> as edit markers rather than guessing.

---

## COLOR SYSTEM

| TOKEN | HEX | USAGE |
|---|---|---|
| `BG` | `#0D1117` | Background |
| `PRIMARY` | `#00FFFF` | Headers, accents, glow |
| `SECONDARY` | `#00A3FF` | Sub-accents, links |
| `TEXT` | `#FFFFFF` | Body text |
| `MUTED` | `#8B949E` | Comments, labels |
| `SUCCESS` | `#00FF88` | Status OK / bars |

## TYPOGRAPHY

| TOKEN | VALUE |
|---|---|
| `FONT_PRIMARY` | JetBrains Mono |
| `FONT_FALLBACK` | Fira Code, monospace |

---

## MODULES (Section 4 progress bars)

| MODULE | LOAD % |
|---|---|
| Computer Vision | 90 |
| Robotics | 85 |
| SLAM | 75 |
| NeRF | 60 |
| Gaussian Splatting | 50 |
| Neural Rendering | 70 |

---

## SKILL MATRIX (Section 6 progress bars)

| SKILL | LEVEL % |
|---|---|
| Python | 95 |
| C++ | 85 |
| ROS | 80 |
| OpenCV | 85 |
| PyTorch | 75 |
| Docker | 60 |
| Linux | 80 |
| Git | 85 |

> Percentages above are illustrative placeholders (round, editable numbers), not
> measured metrics — adjust them to whatever honestly reflects your level.

---

## PROJECT DATABASE (Section 5 entries)

Add one row per project. Format used in README:

```
[00N] NAME | STATUS | DESCRIPTION | TECH_STACK | LINK
```

| ID | NAME | STATUS | DESCRIPTION | TECH STACK | LINK |
|---|---|---|---|---|---|
| 001 | 3D-Urban-Reconstruction | ACTIVE | Reconstructing urban-scale 3D scenes from monocular video | Python, PyTorch, NeRF/3DGS, OpenCV | ADD_REPO_LINK |
| 002 | ADD_PROJECT_NAME | ADD_STATUS | ADD_DESCRIPTION | ADD_STACK | ADD_LINK |
| 003 | ADD_PROJECT_NAME | ADD_STATUS | ADD_DESCRIPTION | ADD_STACK | ADD_LINK |

> Only project 001 is filled from what you've told me about your research focus.
> The rest are edit markers — add your real repos and links before publishing.

---

## RESEARCH TIMELINE (Section 7)

| YEAR | MILESTONE |
|---|---|
| 2023 | AI Voice Assistant |
| 2024 | MERN Stack Development |
| 2025 | Joined IIT Guwahati (M.Tech, Robotics & AI) |
| 2026 | 3D Urban Reconstruction using Video Data |
| Future | Research Publication |

---

## CURRENT GOALS (Section 8)

- [ ] ADD_GOAL_1
- [ ] ADD_GOAL_2
- [ ] ADD_GOAL_3

> Left as edit markers — I don't have your actual 2026 goals on file, so filling
> these in myself would be a guess rather than a fact.

---

## NOTES ON THE GITHUB ACTION

`profile.yml` only generates the **snake animation** and **trophies SVG** and
commits them back to the repo, because those two are the only widgets without a
live-embeddable image URL. Everything else (GitHub Stats, Streak, Activity
Graph, LeetCode, Visitor Counter) is wired as a live `<img>` pointing at a
third-party rendering service, so it always reflects current data without a
scheduled workflow run. See the "SYSTEM DASHBOARD" comment block in `README.md`
for the exact services used, and verify each service is still online before
publishing — I can't confirm their current uptime from here.
