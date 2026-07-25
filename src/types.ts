export interface Transaction {
  id: number;
  type: 'D' | 'W' | 'T' | 'R';
  amount: number;
  timestamp: string;
  description: string;
}

export interface Account {
  accountNumber: number;
  holderName: string;
  balance: number;
  memoryAddress: string;
  txArrayAddress: string;
  transactionCount: number;
  transactionCapacity: number;
  transactions: Transaction[];
}

export interface SystemInfo {
  totalAccounts: number;
  nextAccountNumber: number;
  totalMemoryAllocatedBytes: number;
  engineMode?: string;
}

export interface ExecLog {
  step: number;
  action: string;
  concept: 'Linked List' | 'DMA' | 'Array' | 'File Handling' | 'Structure' | string;
  address: string | null;
}

export interface BackendState {
  systemInfo: SystemInfo;
  accounts: Account[];
  logs: ExecLog[];
}
