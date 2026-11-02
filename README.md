# Today, Apparently

A quiet, zero-framework static website that pairs live astronomical and calendar observations for today with a deterministically shuffled selection of 200+ deadpan, verifiable facts.

## Overview

Every visitor around the world sees the exact same curated selection of facts on the same calendar date—without a backend, database, cookies, or tracking.

At the top of the reading column, **Today, Apparently** calculates live facts for your current date:
- **Day of the Year**: Current day number and days remaining until the year ends.
- **Lunar Phase**: Moon illumination percentage, waxing/waning status, and days until the next full moon (computed via [SunCalc.js](https://github.com/mourner/suncalc)).
- **Solar Times**: Local sunrise, sunset, and total daylight duration (using a quiet timezone default with an optional inline toggle for exact device coordinates).
- **Astronomical Season**: Current Northern Hemisphere season and days remaining until the next solstice or equinox.

Below the today-specific observations, 10 to 11 facts are selected from a pool of 215+ curated entries in `facts.js` using a deterministic `mulberry32` pseudo-random shuffle seeded by `year * 10000 + month * 100 + day`.

## File Structure

```text
├── index.html   # Standalone HTML entry point
├── style.css    # Editorial typography, palette, and layout styles
├── script.js    # Astronomical calculations, seeded shuffle, and scroll observer
├── facts.js     # 215+ two-sentence deadpan facts (open for pull requests)
└── README.md    # Documentation and contribution guide
```

## How to Run

No build step, package manager, or server is required:

1. Clone or download this repository.
2. Double-click `index.html` (or open it directly in any modern browser).

If you prefer serving it over a local static server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

## Contributing More Facts (`facts.js`)

To add facts via Pull Request, append new entries to `window.FACTS_DATA` in `facts.js`. Every fact must follow these rules:

1. **Two sentences maximum**:
   - *Sentence one*: The true, verifiable fact with a concrete specific detail.
   - *Sentence two*: A dry, deadpan, slightly unimpressed observation.
2. **Strict tone**: No exclamation marks (`!`). Never start with `"Did you know"`. Never use the word `"Fascinating"`.
3. **Allowed categories**: `BIOLOGY`, `MOON`, `HISTORY`, `TODAY`, `MATH`, `SPACE`, `LANGUAGE`, `PHYSICS`, `ANIMALS`, `FOOD`, `HUMAN BODY`, `ANCIENT`.
