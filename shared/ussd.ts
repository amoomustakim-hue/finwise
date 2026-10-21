// USSD transfer codes, one entry per PAYER's bank. Placeholders: {amount} (whole naira), {account}.
//
// None of these are verified yet. A web search (2026-10-21) found only unofficial pages; GTBank
// *737*2 and First Bank *894 had some support, the others none. Rule: until a format is confirmed
// with a real ₦100 transfer, set verified: false — the app leads with "Copy code" and warns the
// payer to check the amount and account name on their bank's screen before entering their PIN.
// To verify: do a real ₦100 transfer with the code, then set verified: true and note the date.

export type UssdBank = { bank: string; base: string; transfer: string | null; verified: boolean; note?: string }

export const USSD_BANKS: UssdBank[] = [
  { bank: 'Zenith Bank', base: '*966#', transfer: '*966*{amount}*{account}#', verified: false },
  { bank: 'GTBank', base: '*737#', transfer: '*737*2*{amount}*{account}#', verified: false, note: 'Unofficial sources say *737*2 is for other-bank transfers' },
  { bank: 'First Bank', base: '*894#', transfer: '*894*{amount}*{account}#', verified: false },
  { bank: 'Access Bank', base: '*901#', transfer: null, verified: false, note: 'Format not found; use the menu' },
  { bank: 'UBA', base: '*919#', transfer: null, verified: false, note: 'Format not found; use the menu' },
  { bank: 'Fidelity Bank', base: '*770#', transfer: null, verified: false },
  { bank: 'FCMB', base: '*329#', transfer: null, verified: false },
  { bank: 'Union Bank', base: '*826#', transfer: null, verified: false },
  { bank: 'Sterling Bank', base: '*822#', transfer: null, verified: false },
  { bank: 'Wema Bank', base: '*945#', transfer: null, verified: false },
]

/** The code a payer at `bank` would dial to send `amountNaira` to `account`, or null if unknown. */
export function transferCode(bank: UssdBank, amountNaira: number, account: string): string | null {
  if (!bank.transfer) return null
  return bank.transfer.replace('{amount}', String(Math.round(amountNaira))).replace('{account}', account)
}

/** tel: link for a USSD code. '#' must be encoded as %23 or the dialer drops everything after it. */
export const telLink = (code: string) => `tel:${encodeURIComponent(code)}`
