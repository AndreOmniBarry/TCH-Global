// Bank details shown in the Give section. Edit here (or ask your web team).
// Leave the list empty to hide the bank card.
export type BankAccount = { purpose: string; bank: string; name: string; number: string; currency?: string };

// name: the exact account name the bank shows (leave '' to hide it until confirmed).
export const BANK_ACCOUNTS: BankAccount[] = [
  { purpose: 'Tithes, offerings, pledges & projects', bank: 'Premium Trust Bank', name: 'The Comforters House Global Ministries', number: '0010181146', currency: 'NGN' },
  { purpose: 'Partnership', bank: 'Sterling Bank', name: 'The Comforters House Global Ministry', number: '0101421732', currency: 'NGN' },
];
