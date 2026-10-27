// Bank details shown in the Give section. Edit here (or ask your web team).
// Leave the list empty to hide the bank card.
export type BankAccount = { purpose: string; bank: string; name: string; number: string; currency?: string };

// name: the exact account name the bank shows (leave '' to hide it until confirmed).
export const BANK_ACCOUNTS: BankAccount[] = [
  { purpose: 'Tithes, offerings & seeds', bank: 'GTBank (Guaranty Trust Bank)', name: 'The Comforters House Global/Consolation Ministry', number: '0168368717', currency: 'NGN' },
  { purpose: 'Tithes, offerings & seeds', bank: 'Sterling Bank', name: 'The Comforters House Global/Consolation Ministry', number: '0101421732', currency: 'NGN' },
];
