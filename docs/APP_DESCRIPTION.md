# YNAB Investments Sync

App that integrates with YNAB API to update some accounts on a schedule. No login required as it'll be self hosted.

## Techstack

- TypeScript
- OXLint as the linter
- Prettier as the formatter
- NX monorepo split by "apps"
- pnpm as the package manager
- Vitest for tests
- lint-staged for git hooks
  - Should run prettier and oxlint before any commits

## Structure

The apps should be self-contained, with their dependencies in their own package.json. The folder structure should be as follow:

- apps
  - web
    - ...
  - api
    - ...
- scripts (if needed)
- .oxlint.json
- prettier.config.ts
- ...

## Frontend

This will be written later. But just as a summary, it will contain:

- A homepage where the user can add the investments:
  - A button to add new that leads to a dialog where it is possible to add investments. The investments are not transactions but rather the total amount for a certain stock, bond, crypto...
    - The dialog should contain two fields
      - asset
        - Should be a string field that accepts anything. This is where the user inputs the asset code, for example MSFT or AAPL
      - amount
        - A number input for the amount for that asset the user holds.
      - YNAB account to sync to
        - A select field where the user selects the YNAB account to sync the values to
  - Cards listing the already added investments. When clicking the card, it should turn into "edit" mode where the user can change the amount or delete the asset entirely.

- A setup screen with a form containing some fields. This screen should be displayed when launching the app for the first time and also accessible via a button on the homescreen.
  - YNAB API token
    - Should accept any characters
    - Should be type="password"
    - Should have a "reveal" token option (similar to those reveal password fields)
  - Sync Schedule (a select field)
    - daily
    - every two days
    - weekly
    - every two weeks
    - monthly (first day of the month)
    - monthly (last day of the month)
  - A save button

## Backend

A NestJS application.

This app is split in two different subjects:

- A backend for the frontend
  - APIs to communicate with the frontend where it is able to
    - Save, edit, list and delete the assets based on the YNAB account id
    - Save the user preferences (setup screen)

- An app that run with a cron job on a schedule that was chosen by the user on the frontend app.
  - Should go through the assets added, convert the amount based on the stock/crypto market, sum everything and sync with the correct accounts. The currency should be inferred by the YNAB API. It should convert to the correct currency.

Disclaimer: The backend will is completely written by AI, powered by Claude Sonnet 4 and Claude Opus 4.
