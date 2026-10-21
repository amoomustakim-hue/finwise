// Category lists per mode, shared by the server (rules, AI, maths) and the front end (pickers).
// `kind` decides how a category counts: income, spending, or neither (internal transfers).

export type Mode = 'personal' | 'business'
export type Kind = 'income' | 'expense' | 'internal_transfer' | 'refund' | 'other'

type Category = { name: string; kind: Kind; for: 'debit' | 'credit' | 'both' }

export const CATEGORIES: Record<Mode, Category[]> = {
  personal: [
    { name: 'Food', kind: 'expense', for: 'debit' },
    { name: 'Groceries', kind: 'expense', for: 'debit' },
    { name: 'Transportation', kind: 'expense', for: 'debit' },
    { name: 'Rent', kind: 'expense', for: 'debit' },
    { name: 'Bills & Utilities', kind: 'expense', for: 'debit' },
    { name: 'Airtime & Data', kind: 'expense', for: 'debit' },
    { name: 'Subscriptions', kind: 'expense', for: 'debit' },
    { name: 'Shopping', kind: 'expense', for: 'debit' },
    { name: 'Entertainment', kind: 'expense', for: 'debit' },
    { name: 'Health', kind: 'expense', for: 'debit' },
    { name: 'Family & Friends', kind: 'expense', for: 'debit' },
    { name: 'Bank charges', kind: 'expense', for: 'debit' },
    { name: 'Other expense', kind: 'expense', for: 'debit' },
    { name: 'Salary', kind: 'income', for: 'credit' },
    { name: "Owner's pay", kind: 'income', for: 'credit' },
    { name: 'Gift / Support received', kind: 'income', for: 'credit' },
    { name: 'Other income', kind: 'income', for: 'credit' },
    { name: 'Loan received', kind: 'other', for: 'credit' },
    { name: 'Refund', kind: 'refund', for: 'credit' },
    { name: 'Savings', kind: 'internal_transfer', for: 'both' },
    { name: 'Own-account transfer', kind: 'internal_transfer', for: 'both' },
  ],
  business: [
    { name: 'Inventory & supplies', kind: 'expense', for: 'debit' },
    { name: 'Staff salaries', kind: 'expense', for: 'debit' },
    { name: 'Rent', kind: 'expense', for: 'debit' },
    { name: 'Transportation & logistics', kind: 'expense', for: 'debit' },
    { name: 'Utilities', kind: 'expense', for: 'debit' },
    { name: 'Marketing', kind: 'expense', for: 'debit' },
    { name: 'Tax & levies', kind: 'expense', for: 'debit' },
    { name: 'Bank charges', kind: 'expense', for: 'debit' },
    { name: 'Personal expense', kind: 'expense', for: 'debit' },
    { name: 'Other expense', kind: 'expense', for: 'debit' },
    { name: 'Customer payment', kind: 'income', for: 'credit' },
    { name: 'Other income', kind: 'income', for: 'credit' },
    // Borrowed money or the owner's own top-up: real cash in, but not revenue.
    { name: 'Loan or owner capital', kind: 'other', for: 'credit' },
    { name: 'Refund', kind: 'refund', for: 'credit' },
    // Money the owner moves out for themselves is not a business cost.
    { name: "Owner's withdrawal", kind: 'internal_transfer', for: 'debit' },
    { name: 'Own-account transfer', kind: 'internal_transfer', for: 'both' },
  ],
}

/** Categories that make sense for a debit or a credit in this mode. */
export function categoriesFor(mode: Mode, direction: 'debit' | 'credit'): string[] {
  return CATEGORIES[mode].filter((c) => c.for === 'both' || c.for === direction).map((c) => c.name)
}

export function kindOf(mode: Mode, category: string): Kind {
  return CATEGORIES[mode].find((c) => c.name === category)?.kind ?? 'other'
}

export function isValidCategory(mode: Mode, category: string, direction: 'debit' | 'credit'): boolean {
  return categoriesFor(mode, direction).includes(category)
}
