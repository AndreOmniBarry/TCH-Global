// Bank details shown in the Give section. Edit here (or ask your web team).
// Leave the list empty to hide the bank card.
export type BankAccount = { purpose: string; bank: string; name: string; number: string; currency?: string };

export const BANK_ACCOUNTS: BankAccount[] = [
  // { purpose: 'Tithes & Offerings', bank: 'Bank name', name: 'The Comforters House Global', number: '0000000000', currency: 'NGN' },
];
