# MTG Prerelease Explorer

A React app for browsing Magic: The Gathering sets and cards ahead of a prerelease, powered by the Scryfall API.

## Features

- Selects an upcoming set, with a recent-set fallback.
- Loads cards across paginated Scryfall results.
- Supports card search, mana-color filters, and card selection.
- Includes a release countdown and persistent light/dark theme preference.

## Run locally

```bash
git clone https://github.com/ggrantrichards/mtg-prerelease.git
cd mtg-prerelease
npm install
npm run dev
```

## Build and check

```bash
npm run build
npm run preview
npm run lint
```

## Stack

React, Vite, Tailwind CSS, Framer Motion, and Lucide icons. The interface is implemented in [src/App.jsx](src/App.jsx).

## Data and attribution

Card and set data come from [Scryfall](https://scryfall.com/). This is an unofficial fan project and is not affiliated with Wizards of the Coast. Magic: The Gathering names and artwork belong to their respective owners.

Set selection and the countdown use release dates from the API; they do not establish a local store's prerelease schedule.
