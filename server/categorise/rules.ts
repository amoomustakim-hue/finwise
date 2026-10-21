// Keyword rules: fast, free, explainable. Anything they can't place confidently is left
// for the user (transfers to people) or the AI (unknown merchants).
import type { Mode } from '../../shared/categories.js'

export type RuleResult = { category: string; confidence: number } | { ask: string } | null

type Tx = { narration: string; direction: 'debit' | 'credit'; mode: Mode }

/** Normalise a narration into a stable merchant/recipient key, e.g. "TO:CHINEDU OKAFOR" or "CHICKEN REPUBLIC". */
export function matchKey(narration: string): string {
  const s = narration.toUpperCase().replace(/\s+/g, ' ').trim()
  const transfer = s.match(/(?:NIP |MOBILE |WEB )?TRANSFER (TO|FROM) ([A-Z .'&-]+?)(?: - .*|\/.*| REF.*| \d.*)?$/)
  if (transfer) return `${transfer[1]}:${transfer[2].trim()}`
  return s
    .replace(/^(POS PURCHASE|POS|WEB PURCHASE|PURCHASE|PAYMENT TO|PAYMENT|NIP|USSD)\s+/, '')
    .replace(/\b(REF|TXN|ID)[:#]?\s*\w+/g, '')
    .replace(/[\d#*/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ')
}

// [pattern, personal category, business category, confidence]
const DEBIT_RULES: [RegExp, string | null, string | null, number][] = [
  // Tax before charges: "LAGOS STATE IRS - LEVY" is tax, "ELECTRONIC MONEY TRANSFER LEVY" is a bank charge.
  [/\bIRS\b|\bFIRS\b|\bTAX\b|LIRS/, 'Other expense', 'Tax & levies', 0.9],
  [/CHARGE|LEVY|STAMP DUTY|SMS ALERT|VAT|MAINTENANCE FEE|COMMISSION/, 'Bank charges', 'Bank charges', 0.97],
  // Food delivery first, so "BOLT FOOD" / "UBER EATS" don't match the ride-hailing rule below.
  [/BOLT FOOD|UBER EATS|CHOWDECK|GLOVO|HEYFOOD|FOODCOURT/, 'Food', 'Personal expense', 0.93],
  [/\b(BOLT|UBER|INDRIVE|RIDA|TAXIFY)\b|\bBRT\b|LAGBUS|COWRYWISE BUS/, 'Transportation', 'Transportation & logistics', 0.95],
  [/DISPATCH|LOGISTICS|DELIVERY|GIG |KWIK|SENDBOX/, 'Transportation', 'Transportation & logistics', 0.85],
  [/FILLING STATION|PETROL|DIESEL|FUEL|NNPC|TOTAL ENERG|MRS /, 'Transportation', 'Utilities', 0.85],
  [/CHICKEN REPUBLIC|KILIMANJARO|DOMINOS|KFC|COLD STONE|MAMA PUT|BUKKA|CHOWDECK|GLOVO|RESTAURANT|EATERY|SUYA|SWEET SENSATION|TANTALIZER/, 'Food', 'Personal expense', 0.92],
  [/SHOPRITE|SPAR|MARKET SQUARE|JUSTRITE|PRINCE EBEANO|SUPERMARKET|HUBMART/, 'Groceries', 'Inventory & supplies', 0.88],
  [/\b(MTN|AIRTEL|GLO|9MOBILE)\b.*(AIRTIME|DATA)|AIRTIME|DATA BUNDLE|RECHARGE/, 'Airtime & Data', 'Utilities', 0.95],
  [/NETFLIX|SPOTIFY|APPLE\.COM|ICLOUD|YOUTUBE|SHOWMAX|PRIME VIDEO|CHATGPT|OPENAI|GOOGLE \*|CANVA/, 'Subscriptions', 'Marketing', 0.93],
  [/DSTV|GOTV|STARTIMES|MULTICHOICE/, 'Subscriptions', 'Utilities', 0.93],
  [/IKEDC|EKEDC|AEDC|PHED|IBEDC|KEDCO|ELECTRIC|PREPAID TOKEN|POSTPAID|WATER BOARD|LAWMA/, 'Bills & Utilities', 'Utilities', 0.95],
  [/PHARMACY|MEDPLUS|HOSPITAL|CLINIC|HMO|HEALTH/, 'Health', 'Personal expense', 0.88],
  [/JUMIA|KONGA|SLOT|H&M|MALL|BOUTIQUE|ALIEXPRESS|TEMU/, 'Shopping', 'Personal expense', 0.82],
  [/CINEMA|FILMHOUSE|GENESIS|BET9JA|SPORTYBET|CONCERT|NIGHT CLUB|LOUNGE/, 'Entertainment', 'Personal expense', 0.85],
  [/\bRENT\b|LANDLORD|SHOP RENT/, 'Rent', 'Rent', 0.9],
  [/- SALARY|SALARY|WAGES|PAYROLL/, null, 'Staff salaries', 0.9],
  [/RICE DEPOT|WHOLESALE|DISTRIBUTOR|SUPPLIER|FOODSTUFF|RESTOCK|INVENTORY/, null, 'Inventory & supplies', 0.85],
  [/FACEBOOK ADS|META ADS|INSTAGRAM|GOOGLE ADS|FLYER|PRINTING|ADVERT/, null, 'Marketing', 0.88],
  [/OWN ACCOUNT|SAVINGS|PIGGYVEST|COWRYWISE|KUDA SAVE|TARGET SAVE/, 'Savings', 'Own-account transfer', 0.9],
]

const CREDIT_RULES: [RegExp, string | null, string | null, number][] = [
  [/REVERSAL|REFUND|CHARGEBACK/, 'Refund', 'Refund', 0.92],
  [/\bSALARY\b|PAYROLL|WAGES/, 'Salary', null, 0.95],
  [/POS SETTLEMENT|PAYSTACK|FLUTTERWAVE|MONIEPOINT SETTLEMENT|OPAY SETTLEMENT|SETTLEMENT/, null, 'Customer payment', 0.92],
  [/INTEREST/, 'Other income', 'Other income', 0.85],
]

/**
 * Decide a category from the narration alone.
 * `ownNames` = the user's name and business name, so money moving between their own
 * personal and business accounts is recognised (owner's pay) instead of counted twice.
 */
export function applyRules(tx: Tx, ownNames: string[]): RuleResult {
  const s = tx.narration.toUpperCase()
  const isOwn = ownNames.some((n) => n && s.includes(n.toUpperCase()))

  if (/OWNER PAY|OWNER'?S PAY|OWNER WITHDRAWAL|DRAWINGS/.test(s) || isOwn) {
    if (tx.mode === 'business') {
      return tx.direction === 'debit'
        ? { category: "Owner's withdrawal", confidence: 0.95 }
        : { category: 'Own-account transfer', confidence: 0.85 }
    }
    return tx.direction === 'credit' ? { category: "Owner's pay", confidence: 0.95 } : { category: 'Own-account transfer', confidence: 0.85 }
  }

  const rules = tx.direction === 'debit' ? DEBIT_RULES : CREDIT_RULES
  for (const [pattern, personal, business, confidence] of rules) {
    if (!pattern.test(s)) continue
    const category = tx.mode === 'personal' ? personal : business
    if (category) return { category, confidence }
  }

  // Transfers between people: the narration rarely says what it was for, so ask instead of guessing.
  const transfer = s.match(/TRANSFER (TO|FROM) ([A-Z .'&-]+)/)
  if (transfer) {
    const name = transfer[2].trim().split(' - ')[0].replace(/\s+(REF|TRF|TXN)$/, '')
    if (tx.mode === 'business' && tx.direction === 'credit') {
      // Money into a business account from a person is usually a customer paying.
      // Unusually large ones are pulled back for the user to confirm (see flagUnusualCredits).
      return { category: 'Customer payment', confidence: 0.88 }
    }
    return {
      ask:
        tx.direction === 'debit'
          ? `You sent money to ${titleCase(name)}. What was it for?`
          : `${titleCase(name)} sent you money. What was it?`,
    }
  }
  return null
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
