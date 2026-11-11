# Account Manager - Ledger Book (React Native Clone)

A full-featured personal finance app built with React Native + Expo, with **100% local SQLite storage** — no cloud, no accounts, fully private.

## Features

- **Dashboard** — total balance, monthly summary, quick actions
- **Transactions** — add income/expense, filter by type/period, search
- **Accounts** — multiple accounts (personal, business, savings, cash, credit)
- **Parties** — track ledgers per person/vendor (who owes what, call/SMS/email)
- **Reports** — charts (pie + bar), breakdown by category, weekly/monthly/yearly
- **Categories** — 15 built-in + create custom income/expense categories
- **Backup & Restore** — export JSON backup, import it back
- **CSV Export** — export transactions as CSV for spreadsheets
- **100% Offline** — all data in SQLite on device

## Tech Stack

| Package | Purpose |
|---|---|
| `expo-sqlite` | Local SQLite database |
| `@react-navigation/native` + `bottom-tabs` + `stack` | Navigation |
| `react-native-chart-kit` + `react-native-svg` | Charts in reports |
| `expo-file-system` | Read/write backup files |
| `expo-sharing` | Share/export files |
| `expo-document-picker` | Pick backup file to restore |
| `date-fns` | Date formatting & calculations |
| `@expo/vector-icons` | Ionicons throughout the app |

## Setup & Run

```bash
cd AccountManager
npm install
npx expo start
```

Then press `a` for Android emulator or scan the QR code with Expo Go.

## Project Structure

```
src/
  database/
    db.js           # SQLite init, schema, seeding
    queries.js      # All DB queries (CRUD + reports)
  screens/
    DashboardScreen.js
    TransactionsScreen.js
    AddTransactionScreen.js
    AccountsScreen.js
    AccountDetailScreen.js
    PartiesScreen.js
    PartyDetailScreen.js
    ReportsScreen.js
    CategoriesScreen.js
    MoreScreen.js
  navigation/
    AppNavigator.js  # Stack + Tab navigation
  components/
    common/          # Card, EmptyState, AmountText
    transaction/     # TransactionItem
  theme/
    colors.js        # All color constants
  utils/
    formatters.js    # Currency, date, period helpers
```

## Personalisation Ideas

- Change `Colors.primary` in `src/theme/colors.js` to your brand color
- Add your own default categories in `src/database/db.js`
- Add multi-currency conversion
- Add PIN lock / biometric authentication
- Add recurring transactions
