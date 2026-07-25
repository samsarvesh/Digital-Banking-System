import React, { useState, useEffect, useRef } from "react";
import { 
  Wallet, PlusCircle, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, 
  Trash2, Cpu, Database, Code, FileText, CheckCircle2, Activity, 
  HardDrive, Layers, Network, ArrowRight, RefreshCw, ChevronRight, HelpCircle,
  Search, Copy, Terminal, User, Sparkles, Clock, ArrowRightLeft, Check,
  Lock, Unlock, Shield, Settings, Info, CreditCard, Download, Send, Menu, X, Landmark, Percent, AlertTriangle,
  Smartphone, QrCode, Share2, Home, Calendar, CalendarCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BackendState, Account, Transaction, ExecLog } from "./types";

interface FixedDeposit {
  id: string;
  accountNumber: number;
  principal: number;
  rate: number;
  months: number;
  maturityValue: number;
  createdAt: string;
}

interface LoanAccount {
  id: string;
  accountNumber: number;
  principal: number;
  rate: number;
  months: number;
  emi: number;
  description: string;
  createdAt: string;
}

interface CardConfig {
  accountNumber: number;
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  color: "slate" | "indigo" | "emerald" | "gold" | "rose" | "purple";
  limit: number;
  frozen: boolean;
  type: string;
}

interface UpiConfig {
  accountNumber: number;
  holderName: string;
  upiId: string;
  limit: number;
  frozen: boolean;
}

interface ScheduledUpiPayment {
  id: string;
  accountNumber: number;
  sourceVpa: string;
  targetVpa: string;
  amount: number;
  description: string;
  frequency: "once" | "daily" | "weekly" | "monthly";
  startDate: string;
  nextRunDate: string;
  active: boolean;
  createdAt: string;
}

const EXCHANGE_RATES: Record<string, { rate: number; name: string; symbol: string; flag: string }> = {
  USD: { rate: 1.0, name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  EUR: { rate: 1.09, name: "Euro", symbol: "€", flag: "🇪🇺" },
  GBP: { rate: 1.28, name: "British Pound", symbol: "£", flag: "🇬🇧" },
  JPY: { rate: 0.0064, name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  INR: { rate: 0.012, name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  CAD: { rate: 0.73, name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" },
  AUD: { rate: 0.66, name: "Australian Dollar", symbol: "A$", flag: "🇦🇺" },
  SGD: { rate: 0.74, name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
  CHF: { rate: 1.12, name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  CNY: { rate: 0.14, name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
};

export default function App() {
  const [state, setState] = useState<BackendState | null>(null);
  const [backendCode, setBackendCode] = useState<string>("");
  const [engineMode, setEngineMode] = useState<string>("Detecting backend...");

  // Navigation
  const [activeTab, setActiveTab] = useState<"home" | "overview" | "accounts" | "transfer" | "cards" | "upi" | "ai" | "wealth">("home");
  
  // Wealth & Loan Sandboxes state
  const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>([]);
  const [fdAmount, setFdAmount] = useState<string>("1000");
  const [fdTerm, setFdTerm] = useState<number>(12); // months
  
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [loanAmount, setLoanAmount] = useState<string>("5000");
  const [loanTerm, setLoanTerm] = useState<number>(24); // months
  const [loanPurpose, setLoanPurpose] = useState<string>("Personal Loan");

  // Account selection
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<number | null>(null);
  
  // Loading and feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Show/Hide Diagnostics (C backend details)
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [searchLog, setSearchLog] = useState<string>("");
  
  // Modal for Printable Statement
  const [showStatementPrint, setShowStatementPrint] = useState<boolean>(false);
  const [deleteConfirmAccountNum, setDeleteConfirmAccountNum] = useState<number | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({ holderName: "", initialBalance: "" });
  const [txForm, setTxForm] = useState({ amount: "", description: "", type: "D" });
  const [transferForm, setTransferForm] = useState({ destNumber: "", amount: "", description: "" });
  
  // Currency converter widget state
  const [convAmount, setConvAmount] = useState<string>("100");
  const [convFrom, setConvFrom] = useState<string>("EUR");
  const [convTo, setConvTo] = useState<string>("USD");
  
  // Card customization state
  const [cards, setCards] = useState<CardConfig[]>([]);
  const [cardColor, setCardColor] = useState<CardConfig["color"]>("indigo");
  const [cardLimit, setCardLimit] = useState<number>(5000);
  const [cardType, setCardType] = useState<string>("Visa Black Edition");
  const [revealCardDetails, setRevealCardDetails] = useState<boolean>(false);

  // UPI customization and simulation state
  const [upiConfigs, setUpiConfigs] = useState<UpiConfig[]>([]);
  const [upiIdInput, setUpiIdInput] = useState<string>("");
  const [upiLimit, setUpiLimit] = useState<number>(2000);
  const [selectedUpiSuffix, setSelectedUpiSuffix] = useState<string>("@atlas");
  
  // Interactive UPI payment simulator
  const [upiSimPayee, setUpiSimPayee] = useState<string>("");
  const [upiSimAmount, setUpiSimAmount] = useState<string>("");
  const [upiSimDesc, setUpiSimDesc] = useState<string>("");
  const [upiSimType, setUpiSimType] = useState<"pay" | "receive">("pay");

  // Scheduled UPI Payment states
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduleFrequency, setScheduleFrequency] = useState<"once" | "daily" | "weekly" | "monthly">("weekly");
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledUpiPayment[]>(() => {
    try {
      const saved = localStorage.getItem("atlas_scheduled_upi");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("atlas_scheduled_upi", JSON.stringify(scheduledPayments));
  }, [scheduledPayments]);

  // Selected transactions for deletion
  const [selectedTxIds, setSelectedTxIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedTxIds([]);
  }, [selectedAccountNumber]);

  // AI Advisor state
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiHistory, setAiHistory] = useState<Array<{ role: "user" | "model"; text: string }>>([
    {
      role: "model",
      text: "Welcome to Atlas Intelligence. I am your certified premier wealth advisor. I can analyze your transaction ledger to build personalized savings, compound interest projections, and budget frameworks. What financial goals can we tackle today?"
    }
  ]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // UTC Time state
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // Set UTC date and time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current state from server and manage automated server re-hydration from client storage
  const fetchState = async (keepSelection = true) => {
    setLoading(true);
    try {
      const res = await fetch("/api/bank/state");
      if (!res.ok) throw new Error("Failed to sync core banking state.");
      let data: BackendState = await res.json();
      
      // Automatic client-side ledger re-hydration to survive container sleep/restarts
      const savedBackupStr = localStorage.getItem("atlas_sfb_backup");
      if (savedBackupStr) {
        try {
          const backup = JSON.parse(savedBackupStr);
          if (backup && Array.isArray(backup.accounts) && backup.accounts.length > 0) {
            // Determine if the server's state represents a default or cleared container state compared to our backup
            const serverAccNums = data.accounts.map(a => a.accountNumber);
            const backupAccNums = backup.accounts.map((a: any) => a.accountNumber);
            
            const needsRestore = 
              serverAccNums.length !== backupAccNums.length ||
              !serverAccNums.every(num => backupAccNums.includes(num)) ||
              data.accounts.some(serverAcc => {
                const backupAcc = backup.accounts.find((ba: any) => ba.accountNumber === serverAcc.accountNumber);
                return !backupAcc || backupAcc.balance !== serverAcc.balance || (backupAcc.transactions || []).length !== (serverAcc.transactions || []).length;
              });

            if (needsRestore) {
              console.log("[STORAGE RE-HYDRATION] Server state is empty or reset. Re-loading secure backup onto the C memory database...");
              const restoreRes = await fetch("/api/bank/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  accounts: backup.accounts,
                  nextAccNum: backup.nextAccountNumber
                })
              });
              if (restoreRes.ok) {
                const restoreResult = await restoreRes.json();
                // Refetch the fully synchronized clean state
                const refetchRes = await fetch("/api/bank/state");
                if (refetchRes.ok) {
                  data = await refetchRes.json();
                  setSuccessMsg("Banking state securely re-hydrated from persistent client storage.");
                }
              }
            }
          }
        } catch (backupErr) {
          console.error("Backup restoration failed:", backupErr);
        }
      }

      setState(data);
      
      // Save/refresh backup
      if (data && data.accounts) {
        const newBackup = {
          accounts: data.accounts,
          nextAccountNumber: data.systemInfo?.nextAccountNumber || 1004,
          lastSavedAt: Date.now()
        };
        localStorage.setItem("atlas_sfb_backup", JSON.stringify(newBackup));
      }
      
      if (data.accounts.length > 0) {
        if (!keepSelection || !selectedAccountNumber || !data.accounts.some(a => a.accountNumber === selectedAccountNumber)) {
          setSelectedAccountNumber(data.accounts[0].accountNumber);
        }
      } else {
        setSelectedAccountNumber(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while linking to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Sync state changes instantly into browser storage as backup
  useEffect(() => {
    if (state && state.accounts) {
      const backup = {
        accounts: state.accounts,
        nextAccountNumber: state.systemInfo?.nextAccountNumber || 1004,
        lastSavedAt: Date.now()
      };
      localStorage.setItem("atlas_sfb_backup", JSON.stringify(backup));
    }
  }, [state]);

  // Fetch C Source code
  const fetchCode = async () => {
    try {
      const res = await fetch("/api/bank/code");
      if (!res.ok) throw new Error("Failed to load backend C source.");
      const data = await res.json();
      setBackendCode(data.code);
      setEngineMode(data.engineMode || "Simulated C Runtime Fallback");
    } catch (err) {
      console.error("Could not fetch C source code", err);
    }
  };

  // Initialize and load persisted cards and UPI settings
  useEffect(() => {
    fetchState(false);
    fetchCode();
    
    const savedCards = localStorage.getItem("apex_horizon_cards");
    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards));
      } catch (e) {
        console.error("Error loading card configurations", e);
      }
    }

    const savedUpi = localStorage.getItem("atlas_sfb_upi");
    if (savedUpi) {
      try {
        setUpiConfigs(JSON.parse(savedUpi));
      } catch (e) {
        console.error("Error loading UPI configurations", e);
      }
    }

    const savedFds = localStorage.getItem("atlas_sfb_fds");
    if (savedFds) {
      try {
        setFixedDeposits(JSON.parse(savedFds));
      } catch (e) {
        console.error("Error loading FDs", e);
      }
    }

    const savedLoans = localStorage.getItem("atlas_sfb_loans");
    if (savedLoans) {
      try {
        setLoans(JSON.parse(savedLoans));
      } catch (e) {
        console.error("Error loading loans", e);
      }
    }
  }, []);

  // Sync cards state whenever accounts list or locally stored cards change
  useEffect(() => {
    if (!state?.accounts) return;
    
    // Auto-generate cards for accounts that do not have one yet
    setCards(prevCards => {
      let updated = [...prevCards];
      let changed = false;
      
      state.accounts.forEach(acc => {
        const hasCard = updated.some(c => c.accountNumber === acc.accountNumber);
        if (!hasCard) {
          const accPadded = String(acc.accountNumber).padStart(4, "0");
          const colors: CardConfig["color"][] = ["slate", "indigo", "emerald", "gold", "rose", "purple"];
          const randomColor = colors[acc.accountNumber % colors.length];
          const newCard: CardConfig = {
            accountNumber: acc.accountNumber,
            holderName: acc.holderName,
            cardNumber: `4532 9901 2284 ${accPadded}`,
            expiry: "12/31",
            cvv: String(100 + (acc.accountNumber % 900)),
            color: randomColor,
            limit: 5000,
            frozen: false,
            type: acc.balance > 2500 ? "Mastercard World Elite" : "Visa Signature"
          };
          updated.push(newCard);
          changed = true;
        }
      });
      
      // Filter out cards for accounts that were deleted
      const existingAccNums = state.accounts.map(a => a.accountNumber);
      const filtered = updated.filter(c => existingAccNums.includes(c.accountNumber));
      if (filtered.length !== updated.length) {
        updated = filtered;
        changed = true;
      }

      if (changed) {
        localStorage.setItem("apex_horizon_cards", JSON.stringify(updated));
      }
      return updated;
    });
  }, [state?.accounts]);

  // Sync UPI state whenever accounts change
  useEffect(() => {
    if (!state?.accounts) return;
    
    setUpiConfigs(prevConfigs => {
      let updated = [...prevConfigs];
      let changed = false;
      
      state.accounts.forEach(acc => {
        const hasUpi = updated.some(u => u.accountNumber === acc.accountNumber);
        if (!hasUpi) {
          // Format standard UPI handle based on name
          const cleanName = acc.holderName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const defaultUpiId = `${cleanName || "client"}${acc.accountNumber}@atlas`;
          const newUpi: UpiConfig = {
            accountNumber: acc.accountNumber,
            holderName: acc.holderName,
            upiId: defaultUpiId,
            limit: 2000,
            frozen: false,
          };
          updated.push(newUpi);
          changed = true;
        }
      });
      
      // Filter out deleted
      const existingAccNums = state.accounts.map(a => a.accountNumber);
      const filtered = updated.filter(u => existingAccNums.includes(u.accountNumber));
      if (filtered.length !== updated.length) {
        updated = filtered;
        changed = true;
      }
      
      if (changed) {
        localStorage.setItem("atlas_sfb_upi", JSON.stringify(updated));
      }
      return updated;
    });
  }, [state?.accounts]);

  // Selected account helpers
  const selectedAccount = state?.accounts.find(a => a.accountNumber === selectedAccountNumber) || null;
  const selectedAccountCard = cards.find(c => c.accountNumber === selectedAccountNumber) || null;
  const selectedUpiConfig = upiConfigs.find(u => u.accountNumber === selectedAccountNumber) || null;

  // Sync card customizer inputs reactively
  useEffect(() => {
    if (selectedAccountCard) {
      setCardColor(selectedAccountCard.color);
      setCardLimit(selectedAccountCard.limit);
      setCardType(selectedAccountCard.type);
    }
  }, [selectedAccountNumber, selectedAccountCard]);

  // Sync UPI customizer inputs reactively
  useEffect(() => {
    if (selectedUpiConfig) {
      const parts = selectedUpiConfig.upiId.split("@");
      setUpiIdInput(parts[0] || "");
      setUpiLimit(selectedUpiConfig.limit);
      setSelectedUpiSuffix("@" + (parts[1] || "atlas"));
    }
  }, [selectedAccountNumber, selectedUpiConfig]);

  // Handle Create Account (Open Account)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.holderName || !createForm.initialBalance) {
      setErrorMsg("Please provide both a customer name and an initial deposit.");
      return;
    }
    const balanceNum = parseFloat(createForm.initialBalance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      setErrorMsg("Initial deposit must be a valid, positive number.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/bank/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holderName: createForm.holderName,
          initialBalance: balanceNum
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setState(data);
      const newAcc = data.accounts[data.accounts.length - 1];
      setSuccessMsg(`Congratulations! Account #${newAcc.accountNumber} has been successfully opened for ${createForm.holderName}.`);
      setSelectedAccountNumber(newAcc.accountNumber);
      setCreateForm({ holderName: "", initialBalance: "" });
      setActiveTab("overview");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to establish a new banking account node.");
    } finally {
      setLoading(false);
    }
  };

  const getFdRate = (months: number) => {
    if (months <= 3) return 6.0;
    if (months <= 6) return 6.5;
    if (months <= 12) return 7.5;
    if (months <= 24) return 8.0;
    if (months <= 36) return 8.5;
    return 9.2;
  };

  const getLoanRate = (months: number) => {
    if (months <= 12) return 9.5;
    if (months <= 24) return 10.5;
    return 11.5;
  };

  const calculateEMI = (principal: number, annualRate: number, months: number) => {
    const r = annualRate / 12 / 100;
    if (r === 0) return principal / months;
    return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  };

  // Handle Open Fixed Deposit
  const handleOpenFD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountNumber || !selectedAccount) {
      setErrorMsg("Please select an active account on top.");
      return;
    }
    const amt = parseFloat(fdAmount);
    if (isNaN(amt) || amt < 100) {
      setErrorMsg("Minimum Fixed Deposit amount is $100.00");
      return;
    }
    if (selectedAccount.balance < amt) {
      setErrorMsg(`Insufficient funds in Account #${selectedAccountNumber} to create FD. Present balance is $${selectedAccount.balance.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Deduct balance from account on the backend
      const res = await fetch("/api/bank/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: selectedAccountNumber,
          amount: amt,
          description: `Locked FD Node #${Date.now().toString().slice(-4)}`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Create local FD
      const rate = getFdRate(fdTerm);
      const maturity = amt * Math.pow(1 + (rate / 100), fdTerm / 12);
      const newFd: FixedDeposit = {
        id: `FD-${Date.now().toString().slice(-6)}`,
        accountNumber: selectedAccountNumber,
        principal: amt,
        rate,
        months: fdTerm,
        maturityValue: Number(maturity.toFixed(2)),
        createdAt: new Date().toISOString().split('T')[0]
      };

      const updatedFds = [...fixedDeposits, newFd];
      setFixedDeposits(updatedFds);
      localStorage.setItem("atlas_sfb_fds", JSON.stringify(updatedFds));

      // Refresh state
      await fetchState(true);
      setSuccessMsg(`Fixed Deposit ${newFd.id} of $${amt.toFixed(2)} established successfully @ ${rate}% p.a. Maturity value: $${newFd.maturityValue.toFixed(2)}.`);
      setFdAmount("1000");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to establish Fixed Deposit node.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Close / Break Fixed Deposit
  const handleCloseFD = async (fdId: string) => {
    const fd = fixedDeposits.find(f => f.id === fdId);
    if (!fd) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Credit funds back to selected account
      const res = await fetch("/api/bank/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: fd.accountNumber,
          amount: fd.principal,
          description: `Liquidated FD Node #${fd.id}`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const updatedFds = fixedDeposits.filter(f => f.id !== fdId);
      setFixedDeposits(updatedFds);
      localStorage.setItem("atlas_sfb_fds", JSON.stringify(updatedFds));

      await fetchState(true);
      setSuccessMsg(`Fixed Deposit ${fdId} successfully liquidated. Principal of $${fd.principal.toFixed(2)} credited back to Account #${fd.accountNumber}.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to break Fixed Deposit.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Apply/Disburse Loan
  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountNumber || !selectedAccount) {
      setErrorMsg("Please select an active account on top.");
      return;
    }
    const amt = parseFloat(loanAmount);
    if (isNaN(amt) || amt < 500) {
      setErrorMsg("Minimum Loan request is $500.00");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Disburse loan via deposit on backend
      const loanId = `LN-${Date.now().toString().slice(-6)}`;
      const res = await fetch("/api/bank/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: selectedAccountNumber,
          amount: amt,
          description: `Disbursed ${loanPurpose} #${loanId}`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rate = getLoanRate(loanTerm);
      const emi = calculateEMI(amt, rate, loanTerm);
      const newLoan: LoanAccount = {
        id: loanId,
        accountNumber: selectedAccountNumber,
        principal: amt,
        rate,
        months: loanTerm,
        emi: Number(emi.toFixed(2)),
        description: loanPurpose,
        createdAt: new Date().toISOString().split('T')[0]
      };

      const updatedLoans = [...loans, newLoan];
      setLoans(updatedLoans);
      localStorage.setItem("atlas_sfb_loans", JSON.stringify(updatedLoans));

      await fetchState(true);
      setSuccessMsg(`Secure Capital Disbursed: $${amt.toFixed(2)} has been credited to Account #${selectedAccountNumber}. EMI scheduled: $${newLoan.emi}/mo.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to disburse loan capital.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Repay Loan
  const handleRepayLoan = async (loanId: string, repayAmt: number) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    if (!selectedAccount || selectedAccount.balance < repayAmt) {
      setErrorMsg(`Insufficient funds in selected account to repay EMI. Required: $${repayAmt.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Withdraw payment from account
      const res = await fetch("/api/bank/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: loan.accountNumber,
          amount: repayAmt,
          description: `Repay EMI ${loan.id}`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Deduct from outstanding balance or settle loan
      let settled = false;
      const updatedLoans = loans.map(l => {
        if (l.id === loanId) {
          const remaining = l.principal - repayAmt;
          if (remaining <= 0) {
            settled = true;
            return null;
          }
          return { ...l, principal: Number(remaining.toFixed(2)) };
        }
        return l;
      }).filter(Boolean) as LoanAccount[];

      setLoans(updatedLoans);
      localStorage.setItem("atlas_sfb_loans", JSON.stringify(updatedLoans));

      await fetchState(true);
      if (settled) {
        setSuccessMsg(`Congratulations! Loan ${loanId} has been fully repaid and settled.`);
      } else {
        setSuccessMsg(`Payment of $${repayAmt.toFixed(2)} successfully applied to Loan ${loanId}.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to make loan repayment.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Deposit / Withdrawal
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountNumber) {
      setErrorMsg("Please select an active account.");
      return;
    }
    const amountNum = parseFloat(txForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0.");
      return;
    }
    if (!txForm.description.trim()) {
      setErrorMsg("Please add a business purpose or description for this transaction.");
      return;
    }

    // Client-side quick fund validation
    if (txForm.type === "W" && selectedAccount && selectedAccount.balance < amountNum) {
      setErrorMsg(`Insufficient liquid funds. Your maximum withdrawal limit is $${selectedAccount.balance.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    const endpoint = txForm.type === "D" ? "/api/bank/deposit" : "/api/bank/withdraw";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: selectedAccountNumber,
          amount: amountNum,
          description: txForm.description
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setState(data);
      setSuccessMsg(`Securely processed $${amountNum.toFixed(2)} ${txForm.type === "D" ? "deposit" : "withdrawal"} for Account #${selectedAccountNumber}.`);
      setTxForm({ amount: "", description: "", type: "D" });
      
      // Auto trigger quick audit logs on success if diagnostics is on
      if (showDiagnostics) {
        setSearchLog("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to post transaction entry.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountNumber) {
      setErrorMsg("Please select a source account.");
      return;
    }
    const destNum = parseInt(transferForm.destNumber);
    if (isNaN(destNum) || destNum === selectedAccountNumber) {
      setErrorMsg("Please specify a valid, distinct destination account number.");
      return;
    }
    const amountNum = parseFloat(transferForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg("Please specify a positive transfer amount.");
      return;
    }
    if (!transferForm.description.trim()) {
      setErrorMsg("Please include a wire transfer memo/purpose.");
      return;
    }

    if (selectedAccount && selectedAccount.balance < amountNum) {
      setErrorMsg(`Insufficient funds. Your wire balance is capped at $${selectedAccount.balance.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/bank/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srcNumber: selectedAccountNumber,
          destNumber: destNum,
          amount: amountNum,
          description: transferForm.description
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setState(data);
      setSuccessMsg(`Successfully executed wire transfer of $${amountNum.toFixed(2)} to Account #${destNum}.`);
      setTransferForm({ destNumber: "", amount: "", description: "" });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete inter-account wire transfer.");
    } finally {
      setLoading(false);
    }
  };

  // Close/Delete Account
  const handleCloseAccount = (accNum: number) => {
    setDeleteConfirmAccountNum(accNum);
  };

  const executeCloseAccount = async (accNum: number) => {
    setDeleteConfirmAccountNum(null);
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/bank/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber: accNum })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setState(data);
      setSuccessMsg(`Account #${accNum} has been closed. Memory structures successfully deallocated.`);
      
      // Auto-select another account if one exists
      if (data.accounts.length > 0) {
        setSelectedAccountNumber(data.accounts[0].accountNumber);
      } else {
        setSelectedAccountNumber(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute account node closure.");
    } finally {
      setLoading(false);
    }
  };

  // Modify Card customization parameters
  const handleUpdateCardCustomizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountNumber) return;

    setCards(prev => {
      const updated = prev.map(c => {
        if (c.accountNumber === selectedAccountNumber) {
          return {
            ...c,
            color: cardColor,
            limit: cardLimit,
            type: cardType
          };
        }
        return c;
      });
      localStorage.setItem("apex_horizon_cards", JSON.stringify(updated));
      return updated;
    });
    setSuccessMsg(`Secure custom bounds updated for your card associated with Account #${selectedAccountNumber}.`);
  };

  // Toggle card freeze status
  const toggleFreezeCard = (accNum: number) => {
    setCards(prev => {
      const updated = prev.map(c => {
        if (c.accountNumber === accNum) {
          const updatedState = !c.frozen;
          setSuccessMsg(`Card status changed: Card is now ${updatedState ? "FROZEN" : "ACTIVE"}.`);
          return { ...c, frozen: updatedState };
        }
        return c;
      });
      localStorage.setItem("apex_horizon_cards", JSON.stringify(updated));
      return updated;
    });
  };

  // Modify UPI customization parameters
  const handleUpdateUpiCustomizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountNumber || !selectedUpiConfig) return;

    setUpiConfigs(prev => {
      const updated = prev.map(u => {
        if (u.accountNumber === selectedAccountNumber) {
          const cleanPrefix = upiIdInput.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
          const fullUpiId = `${cleanPrefix || "client"}${selectedUpiSuffix}`;
          return {
            ...u,
            upiId: fullUpiId,
            limit: upiLimit
          };
        }
        return u;
      });
      localStorage.setItem("atlas_sfb_upi", JSON.stringify(updated));
      return updated;
    });
    setSuccessMsg(`Secure UPI settings updated for Account #${selectedAccountNumber}.`);
  };

  // Toggle UPI freeze status
  const toggleFreezeUpi = (accNum: number) => {
    setUpiConfigs(prev => {
      const updated = prev.map(u => {
        if (u.accountNumber === accNum) {
          const updatedState = !u.frozen;
          setSuccessMsg(`UPI status changed: UPI channel is now ${updatedState ? "FROZEN" : "ACTIVE"}.`);
          return { ...u, frozen: updatedState };
        }
        return u;
      });
      localStorage.setItem("atlas_sfb_upi", JSON.stringify(updated));
      return updated;
    });
  };

  // Handle UPI transaction simulation
  const handleSimulateUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountNumber || !selectedUpiConfig) {
      setErrorMsg("Please select an active account.");
      return;
    }

    if (selectedUpiConfig.frozen) {
      setErrorMsg(`Transaction Declined: UPI transactions are currently FROZEN for this account. Please activate UPI first.`);
      return;
    }

    const amountNum = parseFloat(upiSimAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0.");
      return;
    }

    if (amountNum > selectedUpiConfig.limit) {
      setErrorMsg(`Transaction Declined: Amount exceeds your set daily UPI limit of $${selectedUpiConfig.limit.toFixed(2)}.`);
      return;
    }

    if (!upiSimPayee.trim()) {
      setErrorMsg("Please provide a target UPI ID (e.g. merchant@upi).");
      return;
    }

    if (upiSimType === "pay" && selectedAccount && selectedAccount.balance < amountNum) {
      setErrorMsg(`Transaction Declined: Insufficient balance in Account #${selectedAccountNumber}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const isPay = upiSimType === "pay";

    // Handle Scheduled Payment Creation
    if (isPay && isScheduled) {
      const newSchedule: ScheduledUpiPayment = {
        id: Date.now().toString(),
        accountNumber: selectedAccountNumber,
        sourceVpa: selectedUpiConfig.upiId,
        targetVpa: upiSimPayee.trim(),
        amount: amountNum,
        description: upiSimDesc.trim() || "Scheduled UPI Outflow",
        frequency: scheduleFrequency,
        startDate: scheduleDate,
        nextRunDate: scheduleDate,
        active: true,
        createdAt: new Date().toISOString()
      };

      setScheduledPayments(prev => [newSchedule, ...prev]);
      setSuccessMsg(`Successfully scheduled a ${scheduleFrequency} transfer of $${amountNum.toFixed(2)} to ${upiSimPayee.trim()} starting on ${scheduleDate}.`);
      
      // Clear simulation form
      setUpiSimAmount("");
      setUpiSimPayee("");
      setUpiSimDesc("");
      setIsScheduled(false);
      setLoading(false);
      return;
    }

    const endpoint = isPay ? "/api/bank/withdraw" : "/api/bank/deposit";
    const prefix = isPay ? "UPI PAY" : "UPI RECV";
    const finalDesc = `${prefix}: ${upiSimDesc.trim() || (isPay ? "Merchant Outflow" : "Instant Inward Transfer")} (via ${upiSimPayee.trim()})`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: selectedAccountNumber,
          amount: amountNum,
          description: finalDesc
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setState(data);
      setSuccessMsg(`UPI Transaction Success! ${isPay ? "Sent" : "Received"} $${amountNum.toFixed(2)} ${isPay ? "to" : "from"} ${upiSimPayee}.`);
      
      // Clear simulation form
      setUpiSimAmount("");
      setUpiSimPayee("");
      setUpiSimDesc("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process UPI secure transaction.");
    } finally {
      setLoading(false);
    }
  };

  // Execute Scheduled UPI transfer immediately (Simulate Trigger)
  const executeScheduledPayment = async (payment: ScheduledUpiPayment) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const sourceAccount = state?.accounts.find(a => a.accountNumber === payment.accountNumber);
      if (!sourceAccount) {
        throw new Error(`Source Account #${payment.accountNumber} not found.`);
      }
      if (sourceAccount.balance < payment.amount) {
        throw new Error(`Insufficient balance ($${sourceAccount.balance.toFixed(2)}) in Account #${payment.accountNumber} to execute scheduled payment of $${payment.amount.toFixed(2)}.`);
      }

      const finalDesc = `UPI SCHEDULED (${payment.frequency.toUpperCase()}): ${payment.description} to ${payment.targetVpa}`;
      
      const res = await fetch("/api/bank/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: payment.accountNumber,
          amount: payment.amount,
          description: finalDesc
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setState(data);
      setSuccessMsg(`Successfully executed scheduled payment of $${payment.amount.toFixed(2)} to ${payment.targetVpa}!`);

      // Update the scheduled payment next run date
      setScheduledPayments(prev => {
        return prev.map(p => {
          if (p.id === payment.id) {
            const nextDate = new Date(p.nextRunDate);
            if (p.frequency === "daily") {
              nextDate.setDate(nextDate.getDate() + 1);
            } else if (p.frequency === "weekly") {
              nextDate.setDate(nextDate.getDate() + 7);
            } else if (p.frequency === "monthly") {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }
            
            return {
              ...p,
              nextRunDate: p.frequency === "once" ? p.nextRunDate : nextDate.toISOString().split("T")[0],
              active: p.frequency === "once" ? false : p.active
            };
          }
          return p;
        });
      });

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute scheduled payment.");
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduledPayment = (id: string) => {
    setScheduledPayments(prev => prev.filter(p => p.id !== id));
    setSuccessMsg("Scheduled payment successfully cancelled.");
  };

  const toggleScheduledPaymentStatus = (id: string) => {
    setScheduledPayments(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.active;
        setSuccessMsg(`Scheduled payment is now ${nextState ? "ACTIVE" : "PAUSED"}.`);
        return { ...p, active: nextState };
      }
      return p;
    }));
  };

  const handleDeleteSelectedTransactions = async () => {
    if (!selectedAccount || selectedTxIds.length === 0) return;
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      const res = await fetch("/api/bank/transactions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: selectedAccount.accountNumber,
          transactionIds: selectedTxIds
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setState(data);
      setSuccessMsg(`Successfully deleted ${selectedTxIds.length} transaction entries from ledger.`);
      setSelectedTxIds([]); // Clear selection
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete transactions.");
    } finally {
      setLoading(false);
    }
  };

  // Gemini AI Chat query
  const handleAiQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userMessage = aiPrompt;
    setAiPrompt("");
    setAiHistory(prev => [...prev, { role: "user", text: userMessage }]);
    setAiLoading(true);

    try {
      const res = await fetch("/api/bank/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          accountContext: selectedAccount
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAiHistory(prev => [...prev, { role: "model", text: data.text }]);
    } catch (err: any) {
      setAiHistory(prev => [
        ...prev, 
        { 
          role: "model", 
          text: `Advisor System Error: ${err.message || "I encountered an authentication issue with the wealth portal. Please check if GEMINI_API_KEY is configured in Settings > Secrets."}` 
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Predefined AI Advisor prompts
  const triggerPredefinedPrompt = (promptText: string) => {
    setAiPrompt(promptText);
  };

  // Aggregates for Dashboard
  const bankTotalAccounts = state?.accounts.length || 0;
  const bankTotalCapital = state?.accounts.reduce((sum, a) => sum + a.balance, 0) || 0;
  const selectedAccountBalance = selectedAccount?.balance || 0;
  const selectedAccountTxCount = selectedAccount?.transactions.length || 0;

  // Filtered Logs for Developer Auditing
  const filteredLogs = state?.logs.filter(log => {
    const term = searchLog.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.concept.toLowerCase().includes(term) ||
      (log.address && log.address.toLowerCase().includes(term))
    );
  }) || [];

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col font-sans relative antialiased">
      {/* Absolute Ambient Background Lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* RETAIL BANKING PREMIUM HEADER */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 md:px-12 py-4">
        <div className="max-w-[1800px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Landmark className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white">ATLAS SMALL FINANCE BANK</h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold tracking-wider">
                SECURE PORTAL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Modern Security · Limitless Growth</p>
          </div>
        </div>

        {/* Client Picker & Status bar */}
        <div className="flex flex-wrap items-center gap-3 justify-end w-full sm:w-auto">
          {state?.accounts && state.accounts.length > 0 ? (
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 rounded-xl p-1.5 px-3">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-slate-400">Viewing Client:</span>
              <select
                value={selectedAccountNumber || ""}
                onChange={(e) => {
                  setSelectedAccountNumber(Number(e.target.value));
                  setRevealCardDetails(false);
                }}
                className="bg-transparent text-xs text-white focus:outline-none font-semibold cursor-pointer border-none pr-1"
              >
                {state.accounts.map(acc => (
                  <option key={acc.accountNumber} value={acc.accountNumber} className="bg-slate-900 text-slate-200">
                    {acc.holderName} (Acc #{acc.accountNumber})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-medium">
              No Client Accounts in Database. Please open one.
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 p-2 px-3 rounded-xl text-[10px] text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentTime || "Loading Date..."}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-emerald-500/20 p-2 px-3 rounded-xl text-[10px] text-emerald-400 font-mono" title="Client-Side Persistent Ledger Hydration Active">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 uppercase font-bold tracking-wider">PERSISTENT LINK</span>
          </div>
        </div>
      </div>
    </header>

      {/* SECONDARY NAVIGATION BAR (FINTECH PORTAL LINKS) */}
      <nav className="bg-[#090f23]/80 border-b border-slate-800/60 sticky top-[73px] sm:top-[73px] z-30 px-4 sm:px-8 md:px-12 py-2 overflow-x-auto">
        <div className="max-w-[1800px] mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "home" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Home className="w-4 h-4 text-sky-400" />
            Home
          </button>

          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "overview" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Wallet className="w-4 h-4 text-indigo-400" />
            Overview
          </button>
          
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "accounts" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Landmark className="w-4 h-4 text-emerald-400" />
            Manage Accounts
          </button>

          <button
            onClick={() => setActiveTab("transfer")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "transfer" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            Safe Teller
          </button>

          <button
            onClick={() => setActiveTab("cards")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "cards" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <CreditCard className="w-4 h-4 text-rose-400" />
            Smart Cards
          </button>

          <button
            onClick={() => setActiveTab("upi")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "upi" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Smartphone className="w-4 h-4 text-amber-500" />
            UPI Hub
          </button>

          <button
            onClick={() => setActiveTab("wealth")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "wealth" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Percent className="w-4 h-4 text-cyan-400" />
            Wealth & Loans
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 relative ${
              activeTab === "ai" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            AI Advisor
            <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          </button>
        </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchState(true)}
              disabled={loading}
              className="p-2 text-xs font-semibold rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/50 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              <span className="hidden lg:inline">Sync Portal</span>
            </button>
          </div>
        </div>
      </nav>

      {/* FEEDBACK BANNER ALERTS */}
      <div className="px-4 sm:px-8 md:px-12 pt-4 max-w-[1800px] mx-auto w-full z-10">
        <AnimatePresence mode="popLayout">
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-200 text-xs flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="hover:text-rose-100 text-rose-400 text-lg cursor-pointer ml-3 font-bold">×</button>
            </motion.div>
          )}
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-200 text-xs flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="hover:text-emerald-100 text-emerald-400 text-lg cursor-pointer ml-3 font-bold">×</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-1 px-4 sm:px-8 md:px-12 py-6 max-w-[1800px] mx-auto w-full z-10 relative">
        <AnimatePresence mode="wait">
          
          {/* TAB 0: PROFESSIONAL PORTAL HOME SCREEN */}
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* HERO SECTION CONTAINER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* HERO MESSAGE CARD */}
                <div className="lg:col-span-7 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[380px]">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative space-y-4">
                    <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                      <Sparkles className="w-3.5 h-3.5" />
                      Next-Generation Banking Engine
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                      Where Performance Meets <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">
                        Financial Sovereignty
                      </span>
                    </h1>
                    
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                      Welcome to Atlas Digital Banking, an interactive simulation of ultra-high-performance ledger architectures. Powered by custom low-level structures, our engine manages dynamic user records with zero-overhead settlements, continuous cryptographic logging, and sub-millisecond liquidity routing.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">LATENCY</span>
                        <span className="text-sm font-extrabold text-cyan-400 font-mono">&lt; 0.18ms</span>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">UPTIME RATIO</span>
                        <span className="text-sm font-extrabold text-emerald-400 font-mono">99.999%</span>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3 col-span-2 sm:col-span-1">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">ALLOCATOR</span>
                        <span className="text-sm font-extrabold text-indigo-400 font-mono">Dynamic RAM</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative pt-6 border-t border-slate-800/40 mt-6 flex flex-wrap gap-3 items-center">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-500/15 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Enter Live Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => setActiveTab("accounts")}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Landmark className="w-4 h-4 text-emerald-400" />
                      <span>Setup Accounts</span>
                    </button>
                  </div>
                </div>

                {/* HARDWARE / REAL-TIME DIAGNOSTICS MONITOR */}
                <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[380px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Atlas Node Console</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[9px] font-mono font-bold text-emerald-400">NODE ACTIVE</span>
                      </div>
                    </div>

                    <div className="bg-black/40 border border-slate-900 rounded-xl p-4 font-mono text-[10px] space-y-2.5 text-slate-400">
                      <div className="flex justify-between border-b border-slate-900/40 pb-1.5">
                        <span className="text-slate-500">Node Architecture:</span>
                        <span className="text-white font-bold">RAM Linked-List System</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900/40 pb-1.5">
                        <span className="text-slate-500">Allocated Nodes (RAM):</span>
                        <span className="text-cyan-400 font-bold">{state?.accounts?.length || 0} Dynamic Structures</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900/40 pb-1.5">
                        <span className="text-slate-500">Ledger Memory Size:</span>
                        <span className="text-indigo-400 font-bold">{((state?.accounts?.length || 0) * 144).toLocaleString()} Bytes</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900/40 pb-1.5">
                        <span className="text-slate-500">Double-Entry Journals:</span>
                        <span className="text-amber-500 font-semibold">Enabled (Active)</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-slate-500">SHA-256 Checksums:</span>
                        <span className="text-emerald-400 font-bold">Auto-Validation</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-900/80">
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        💡 <span className="text-slate-300 font-semibold">Continuous Synchronization:</span> The client holds an active persistent link to the reactive database. Adding cards, deposits, transfers, or UPI targets automatically triggers ledger hydration.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Synced: Real-Time
                    </span>
                    <span>v2.8.4-RELEASE</span>
                  </div>
                </div>

              </div>

              {/* THREE CORE ARCHITECTURAL PILLARS OF THE BANK */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-2xl p-5 relative group hover:border-indigo-500/40 transition-all shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">High-Concurrency Linked Lists</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    By bypassing bloated relational engines, Atlas maintains active customer accounts inside an optimized, contiguous memory model, permitting super-fast traversal and instant record indexing.
                  </p>
                </div>

                <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-2xl p-5 relative group hover:border-cyan-500/40 transition-all shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 border border-cyan-500/20">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Immutable Double-Entry Auditing</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Every card purchase, interest accumulation, UPI payload, or wire transfer is automatically captured as a dual-sided journal write with absolute data validity checks.
                  </p>
                </div>

                <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-2xl p-5 relative group hover:border-emerald-500/40 transition-all shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/20">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Global Currency Standards</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Operate securely across global regions with localized currency conversions, fully compliant USD reference models, dynamic fixed deposits, and customizable smart debit cards.
                  </p>
                </div>

              </div>

              {/* DETAILED INFORMATION ABOUT THE BANK */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* ABOUT US TEXT CARD */}
                <div className="lg:col-span-7 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-indigo-400" />
                      About Atlas Digital Banking
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Pioneering financial software structures for high-performance operations since 2026.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                    <p>
                      At Atlas, we believe that modern banking software shouldn't have to carry the legacy burden of slow monolithic databases and bloated request pipelines. Our core technology simulation is built on elegant, light, and optimized structures, enabling instant validation of funds, safe dynamic ledger expansions, and multi-signature security checks.
                    </p>
                    <p>
                      Whether you are creating customizable premium debit cards with personalized styling, simulating localized UPI instant-payment channels, initializing high-yield wealth accounts, or modeling global forex risk, Atlas provides the comprehensive Sandbox playground to execute complex operations safely.
                    </p>
                    <p>
                      We integrate state-of-the-art developer diagnostics so that computer engineers can view live structural logs, dynamic memory address states, execution run logs, and active memory usages generated upon every interaction.
                    </p>
                  </div>

                  <div className="border-t border-slate-800/60 pt-5 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Headquarters</span>
                      <span className="block text-xs text-white font-medium">Silicon Valley & Bangalore Core Node</span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Security Framework</span>
                      <span className="block text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Full Audit Integrity
                      </span>
                    </div>
                  </div>
                </div>

                {/* FAQ AND HELP ACCORDION */}
                <div className="lg:col-span-5 bg-slate-950/40 border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    Frequently Asked Questions
                  </h3>

                  <div className="space-y-3">
                    <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 space-y-1">
                      <h4 className="text-xs font-bold text-white">How is my data stored?</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Data is permanently stored in your local profile environment. Any changes made to accounts, debit card colors, or fixed deposits are written to standard reactive memory space and synchronized securely.
                      </p>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 space-y-1">
                      <h4 className="text-xs font-bold text-white">Is this a real, live bank?</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        No, this is a premium high-performance digital banking simulator representing an optimized finance console to demonstrate low-level architectures, clean responsive UI design, and Forex conversion tools.
                      </p>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3.5 space-y-1">
                      <h4 className="text-xs font-bold text-white">Can I simulate multiple accounts?</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Yes! Simply navigate to the <span className="text-cyan-400 hover:underline cursor-pointer" onClick={() => setActiveTab("accounts")}>Manage Accounts</span> section to dynamically allocate new account objects with personalized holder names.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Greeter and Quick stats bento box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Premium Card */}
                <div className="md:col-span-2 bg-[#0d152d]/60 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[220px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-indigo-300 font-mono tracking-widest uppercase font-bold">Atlas Premier Status</span>
                        <h2 className="text-xl font-extrabold text-white mt-1">
                          {selectedAccount ? `Welcome back, ${selectedAccount.holderName}!` : "Welcome to Atlas Small Finance Bank"}
                        </h2>
                      </div>
                      <div className="w-12 h-8 bg-slate-950/40 rounded-lg flex items-center justify-center border border-slate-800">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">ATLAS</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 mt-3 max-w-md">
                      Your liquidity and assets are secured with deep memory hashing. Access automated AI wealth strategies to build long-term generational equity.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 z-10 border-t border-slate-800/60 pt-4">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold">Total Liquidity Ledger</span>
                      <p className="text-2xl font-black text-white mt-1">
                        ${selectedAccount ? selectedAccount.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold">Account Ledger Node</span>
                      <p className="text-sm font-mono font-bold text-slate-300 mt-2">
                        {selectedAccount ? `ACC: ${selectedAccount.accountNumber}` : "No Active Account"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Seed / Creator Box */}
                <div className="bg-[#0e1735]/60 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div>
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <PlusCircle className="w-4 h-4" />
                      Establish New Client Node
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Create an isolated dynamic banking structure in our high-performance ledger network.
                    </p>
                  </div>

                  <form onSubmit={handleCreateAccount} className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Customer Full Name</label>
                      <input
                        type="text"
                        placeholder="Johnathan Archer"
                        value={createForm.holderName}
                        onChange={(e) => setCreateForm(p => ({ ...p, holderName: e.target.value }))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Initial Opening Deposit ($)</label>
                      <input
                        type="number"
                        placeholder="500.00"
                        value={createForm.initialBalance}
                        onChange={(e) => setCreateForm(p => ({ ...p, initialBalance: e.target.value }))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:from-indigo-500 hover:to-indigo-600 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      Open Premium Account
                    </button>
                  </form>
                </div>
              </div>

              {/* BENTO GRID ROW 2 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Interactive Credit Card Mockup */}
                <div className="md:col-span-5 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-rose-400" />
                        Atlas Smart Card
                      </h3>
                      {selectedAccountCard && (
                        <button
                          onClick={() => setRevealCardDetails(!revealCardDetails)}
                          className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer border border-cyan-500/20 rounded-md px-2 py-0.5 bg-cyan-500/5 transition-all"
                        >
                          {revealCardDetails ? "Hide Credentials" : "Show CVV/Card"}
                        </button>
                      )}
                    </div>

                    {selectedAccountCard ? (
                      <div className="relative">
                        {/* Physical Card Render */}
                        <div className={`w-full h-48 rounded-2xl p-5 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 ${
                          selectedAccountCard.frozen ? "grayscale brightness-75 bg-slate-800" :
                          selectedAccountCard.color === "slate" ? "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" :
                          selectedAccountCard.color === "indigo" ? "bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950" :
                          selectedAccountCard.color === "emerald" ? "bg-gradient-to-br from-emerald-600 via-slate-900 to-emerald-950" :
                          selectedAccountCard.color === "gold" ? "bg-gradient-to-br from-amber-600 via-yellow-700 to-slate-950" :
                          selectedAccountCard.color === "rose" ? "bg-gradient-to-br from-rose-600 via-pink-700 to-slate-950" :
                          "bg-gradient-to-br from-purple-700 via-fuchsia-800 to-slate-950"
                        }`}>
                          {/* Chip and Type */}
                          <div className="flex justify-between items-start">
                            <div>
                              {/* Golden Chip */}
                              <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-yellow-300 to-amber-500 border border-yellow-200/40 relative mb-1" />
                              <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">{selectedAccountCard.type}</span>
                            </div>
                            <span className="text-xs font-mono font-black italic text-slate-100">ATLAS SFB</span>
                          </div>

                          {/* Card Number */}
                          <div className="font-mono text-base font-bold tracking-widest my-2 text-white/90">
                            {revealCardDetails ? selectedAccountCard.cardNumber : `••••  ••••  ••••  ${selectedAccountCard.cardNumber.slice(-4)}`}
                          </div>

                          {/* Holder, Expiry, CVV */}
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[8px] text-slate-400 uppercase block font-semibold">Cardholder</span>
                              <span className="text-xs font-bold tracking-wide uppercase">{selectedAccountCard.holderName}</span>
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase block font-semibold">Expiry</span>
                                <span className="text-xs font-mono font-bold">{selectedAccountCard.expiry}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase block font-semibold">CVV</span>
                                <span className="text-xs font-mono font-bold">{revealCardDetails ? selectedAccountCard.cvv : "•••"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Frozen Ribbon overlay */}
                          {selectedAccountCard.frozen && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-rose-400 font-bold text-xs gap-1.5 z-10">
                              <Lock className="w-5 h-5 text-rose-500" />
                              <span>CARD SECURELY FROZEN</span>
                            </div>
                          )}
                        </div>

                        {/* Card quick actions */}
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() => toggleFreezeCard(selectedAccountCard.accountNumber)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                              selectedAccountCard.frozen 
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            }`}
                          >
                            {selectedAccountCard.frozen ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                Activate Card
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-rose-400" />
                                Freeze Card
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => setActiveTab("cards")}
                            className="p-2 px-3.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all text-xs font-bold cursor-pointer"
                          >
                            Customize Card
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                        <CreditCard className="w-8 h-8 text-slate-600" />
                        <span>Select client profile to provision card</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Transaction History Mini Ledger */}
                <div className="md:col-span-7 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        Recent Statement Ledger
                      </h3>
                      {selectedAccount && selectedAccount.transactions.length > 0 && (
                        <button
                          onClick={() => setShowStatementPrint(true)}
                          className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Invoice PDF Statement
                        </button>
                      )}
                    </div>

                    {/* Bulk selection action bar */}
                    {selectedAccount && selectedAccount.transactions.length > 0 && (
                      <div className="flex items-center justify-between bg-slate-950/30 border border-slate-900/50 rounded-xl p-2 px-3 mb-2.5 text-xs">
                        <label className="flex items-center gap-2 text-slate-400 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedTxIds.length === selectedAccount.transactions.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTxIds(selectedAccount.transactions.map(tx => tx.id));
                              } else {
                                setSelectedTxIds([]);
                              }
                            }}
                            className="rounded border-slate-800 bg-slate-950/80 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>
                            Select All ({selectedTxIds.length}/{selectedAccount.transactions.length})
                          </span>
                        </label>

                        {selectedTxIds.length > 0 && (
                          <button
                            onClick={handleDeleteSelectedTransactions}
                            disabled={loading}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-md cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Selected</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                      {selectedAccount ? (
                        selectedAccount.transactions.length > 0 ? (
                          [...selectedAccount.transactions].reverse().map(tx => (
                            <div key={tx.id} className="bg-slate-950/60 border border-slate-900/50 rounded-xl p-2.5 px-3.5 flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTxIds.includes(tx.id)}
                                  onChange={() => {
                                    setSelectedTxIds(prev =>
                                      prev.includes(tx.id)
                                        ? prev.filter(id => id !== tx.id)
                                        : [...prev, tx.id]
                                    );
                                  }}
                                  className="rounded border-slate-800 bg-slate-950/80 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  tx.type === "D" ? "bg-emerald-500/10 text-emerald-400" :
                                  tx.type === "W" ? "bg-rose-500/10 text-rose-400" :
                                  tx.type === "T" ? "bg-rose-500/10 text-rose-400 animate-pulse" :
                                  "bg-emerald-500/10 text-emerald-400"
                                }`}>
                                  {tx.type === "D" || tx.type === "R" ? (
                                    <ArrowDownLeft className="w-4 h-4" />
                                  ) : (
                                    <ArrowUpRight className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-sans font-bold text-slate-200 text-xs">{tx.description}</p>
                                  <span className="text-[10px] text-slate-500">{tx.timestamp}</span>
                                </div>
                              </div>
                              <span className={`font-bold ${
                                tx.type === "D" || tx.type === "R" ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {tx.type === "D" || tx.type === "R" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="h-36 flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                            <Clock className="w-6 h-6 text-slate-600" />
                            <span>No ledger transactions found for this account.</span>
                            <span className="text-[10px] text-slate-600">Please make a deposit or withdrawal.</span>
                          </div>
                        )
                      ) : (
                        <div className="h-36 flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                          <User className="w-6 h-6 text-slate-600" />
                          <span>Please select or open an account to review statement.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedAccount && (
                    <div className="mt-4 pt-3.5 border-t border-slate-900 flex justify-between items-center text-xs text-slate-400">
                      <span>Dynamic Ledger size: <strong className="font-mono text-slate-300 font-bold">{selectedAccount.transactionCount} of {selectedAccount.transactionCapacity}</strong> elements</span>
                      <button 
                        onClick={() => setActiveTab("accounts")}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1 transition-all"
                      >
                        Ledger Statements <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* SAVINGS GRAPH / ANALYTICS SIMULATED BOX */}
              <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Horizon Dynamic Yield & Cashflow Trends
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Simulated performance of cumulative deposits and interest assets across active accounts.</p>
                  </div>
                  <div className="flex bg-[#050814] p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 rounded-md font-bold">5.25% APY</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Custom Graphic Yield Charts */}
                  <div className="lg:col-span-8 space-y-4">
                    {state?.accounts && state.accounts.length > 0 ? (
                      <div className="space-y-3.5">
                        {state.accounts.map(acc => {
                          const percentage = Math.min(100, Math.max(12, (acc.balance / Math.max(1, bankTotalCapital)) * 100));
                          return (
                            <div key={acc.accountNumber} className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-300">{acc.holderName} <span className="text-[10px] text-slate-500 font-mono">(Acc #{acc.accountNumber})</span></span>
                                <span className="font-mono text-slate-400 font-bold">${acc.balance.toFixed(2)} ({percentage.toFixed(0)}% of Bank Cap)</span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-950/80 rounded-full overflow-hidden border border-slate-900/50 flex">
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-400 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-slate-500 text-xs">
                        <span>No asset trends available. Establish a client account above to track ledger distributions.</span>
                      </div>
                    )}
                  </div>

                  {/* Financial projections quick card */}
                  <div className="lg:col-span-4 bg-[#050916] border border-slate-900 p-4.5 rounded-2xl space-y-4.5 text-xs text-slate-400 relative">
                    <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1 text-slate-300">
                      <Percent className="w-4 h-4 text-amber-400" />
                      Dynamic Wealth Advisor tip
                    </h4>
                    
                    <p className="text-[11px] leading-relaxed">
                      Your cumulative bank liquidity stands at <strong className="text-white">${bankTotalCapital.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>. 
                      Compounding at <strong>5.25% APY</strong>, this asset portfolio will generate an estimated <strong className="text-emerald-400">+${(bankTotalCapital * 0.0525).toFixed(2)}</strong> in secure yield interest next fiscal cycle.
                    </p>

                    <button
                      onClick={() => setActiveTab("ai")}
                      className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ask AI wealth roadmap
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 2: DETAILED ACCOUNTS LEDGER */}
          {activeTab === "accounts" && (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Manage Customers & Accounts
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Add new customers, remove active account nodes, and review transaction ledgers.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LIST OF ACCOUNTS & QUICK CREATION FORM */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Establish New Client Node inside Tab 2 */}
                  <div className="bg-[#0e1735]/60 border border-slate-800/80 rounded-2xl p-4.5 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <PlusCircle className="w-4 h-4" />
                      Add New Customer Account
                    </h3>
                    <form onSubmit={handleCreateAccount} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Customer Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Johnathan Archer"
                            value={createForm.holderName}
                            onChange={(e) => setCreateForm(p => ({ ...p, holderName: e.target.value }))}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Initial Deposit ($)</label>
                          <input
                            type="number"
                            placeholder="500.00"
                            value={createForm.initialBalance}
                            onChange={(e) => setCreateForm(p => ({ ...p, initialBalance: e.target.value }))}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:from-indigo-500 hover:to-indigo-600 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Create Customer Account
                      </button>
                    </form>
                  </div>

                  {/* SCROLLABLE LIST */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {state?.accounts && state.accounts.length > 0 ? (
                      state.accounts.map(acc => {
                        const isActive = acc.accountNumber === selectedAccountNumber;
                        return (
                          <div
                            key={acc.accountNumber}
                            onClick={() => {
                              setSelectedAccountNumber(acc.accountNumber);
                              setRevealCardDetails(false);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                              isActive 
                                ? "bg-[#0f1837] border-indigo-500/40 shadow-md shadow-indigo-500/5" 
                                : "bg-[#070b19]/60 border-slate-900 hover:border-slate-800 hover:bg-slate-900/30"
                            }`}
                          >
                            {isActive && (
                              <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
                            )}
                            
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded-full border border-indigo-500/15 uppercase font-bold tracking-wider">
                                  ACC #{acc.accountNumber}
                                </span>
                                <h4 className="text-sm font-bold text-white pt-1">{acc.holderName}</h4>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-600" />
                                  {acc.transactions.length} record entries · Size: {acc.transactionCapacity}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase font-semibold">Ledger balance</p>
                                <p className="text-sm font-extrabold text-white mt-1">${acc.balance.toFixed(2)}</p>
                              </div>
                            </div>

                            <div className="mt-3.5 pt-3.5 border-t border-slate-900/50 flex justify-between items-center text-[10px] text-slate-400">
                              <div className="flex items-center gap-1 font-mono text-slate-500">
                                <Database className="w-3 h-3" />
                                <span>{acc.memoryAddress}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloseAccount(acc.accountNumber);
                                }}
                                className="text-slate-500 hover:text-rose-400 cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                Remove Account
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                        <Landmark className="w-8 h-8 text-slate-600 animate-pulse" />
                        <span>Zero Accounts Found in Database.</span>
                        <span>Initialize a premium account above.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CURRENT ACCOUNT STATEMENT STATEMENT */}
                <div className="lg:col-span-7 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[400px]">
                  
                  {selectedAccount ? (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800/60 pb-4 gap-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">Ledger Statement Viewer</span>
                          <h3 className="text-lg font-black text-white mt-1">{selectedAccount.holderName}</h3>
                          <p className="text-xs text-slate-400 font-mono">ACCOUNT: #{selectedAccount.accountNumber} · NODEPTR: {selectedAccount.memoryAddress}</p>
                        </div>
                        <div className="text-right sm:text-right">
                          <span className="text-[10px] uppercase text-slate-500 block font-semibold">Liquid Balance</span>
                          <span className="text-xl font-extrabold text-emerald-400 mt-1">${selectedAccount.balance.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Bulk selection action bar */}
                      {selectedAccount && selectedAccount.transactions.length > 0 && (
                        <div className="flex items-center justify-between bg-slate-950/30 border border-slate-900/50 rounded-xl p-2.5 px-3.5 text-xs">
                          <label className="flex items-center gap-2 text-slate-400 font-medium cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedTxIds.length === selectedAccount.transactions.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTxIds(selectedAccount.transactions.map(tx => tx.id));
                                } else {
                                  setSelectedTxIds([]);
                                }
                              }}
                              className="rounded border-slate-800 bg-slate-950/80 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>
                              Select All ({selectedTxIds.length}/{selectedAccount.transactions.length})
                            </span>
                          </label>

                          {selectedTxIds.length > 0 && (
                            <button
                              onClick={handleDeleteSelectedTransactions}
                              disabled={loading}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-all shadow-md cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Selected ({selectedTxIds.length})</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Transaction entries table */}
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {selectedAccount.transactions.length > 0 ? (
                          [...selectedAccount.transactions].reverse().map(tx => (
                            <div key={tx.id} className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-3 flex items-center justify-between text-xs font-mono hover:bg-slate-950/80 transition-all">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTxIds.includes(tx.id)}
                                  onChange={() => {
                                    setSelectedTxIds(prev =>
                                      prev.includes(tx.id)
                                        ? prev.filter(id => id !== tx.id)
                                        : [...prev, tx.id]
                                    );
                                  }}
                                  className="rounded border-slate-800 bg-slate-950/80 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                                      tx.type === "D" || tx.type === "R" 
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                                        : "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                                    }`}>
                                      {tx.type === "D" ? "DEP" : tx.type === "W" ? "WTH" : tx.type === "T" ? "WIR_OUT" : "WIR_INC"}
                                    </span>
                                    <span className="font-sans font-semibold text-slate-200 text-xs">{tx.description}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                    <span>ID: #{tx.id}</span>
                                    <span>·</span>
                                    <span>{tx.timestamp}</span>
                                  </div>
                                </div>
                              </div>
                              <span className={`font-bold text-sm ${
                                tx.type === "D" || tx.type === "R" ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {tx.type === "D" || tx.type === "R" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-1 text-xs">
                            <Clock className="w-8 h-8 text-slate-600 mb-1" />
                            <span>No recorded operations found.</span>
                            <span className="text-[10px] text-slate-600">This dynamic array has size 0.</span>
                          </div>
                        )}
                      </div>

                      {/* PDF Print statement action bar */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500 font-mono">Dynamic Array base pointer: {selectedAccount.txArrayAddress}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowStatementPrint(true)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Statement PDF
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                      <Landmark className="w-12 h-12 text-slate-700" />
                      <span>Select a Client Profile from the left panel to review dynamic banking ledger details.</span>
                    </div>
                  )}

                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 3: SAFEPAYMENTS & TRANSFER */}
          {activeTab === "transfer" && (
            <motion.div
              key="transfer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-800/60 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                  Horizon Secure Teller Center
                </h2>
                <p className="text-xs text-slate-400 mt-1">Safely deposit capital, execute liquid cash withdrawals, or write direct inter-account transfers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* TELLER DEPOSIT / WITHDRAWAL FORM */}
                <div className="md:col-span-6 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3.5 mb-4">
                    <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-indigo-400" />
                      Cash Desk Ledger
                    </h3>
                    
                    {/* Toggle Selector */}
                    <div className="flex bg-[#050814] p-0.5 rounded-lg border border-slate-800 text-[10px]">
                      <button
                        onClick={() => setTxForm(p => ({ ...p, type: "D" }))}
                        className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          txForm.type === "D" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        DEPOSIT
                      </button>
                      <button
                        onClick={() => setTxForm(p => ({ ...p, type: "W" }))}
                        className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                          txForm.type === "W" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        WITHDRAW
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleTransactionSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Target Account Profile</label>
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-white flex items-center justify-between">
                        {selectedAccount ? (
                          <>
                            <div>
                              <p className="font-bold text-slate-200">{selectedAccount.holderName}</p>
                              <span className="text-[10px] text-slate-500 font-mono">Account Number: #{selectedAccount.accountNumber}</span>
                            </div>
                            <span className="font-mono text-emerald-400 font-bold">${selectedAccount.balance.toFixed(2)} available</span>
                          </>
                        ) : (
                          <span className="text-slate-500">Please establish or select an account profile.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Transaction Amount ($)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={txForm.amount}
                          onChange={(e) => setTxForm(p => ({ ...p, amount: e.target.value }))}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 pl-7 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Audit Ledger Memo / Purpose</label>
                      <input
                        type="text"
                        placeholder="ATM Cash Deposit, Salary, Refund, Petty cash..."
                        value={txForm.description}
                        onChange={(e) => setTxForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !selectedAccount}
                      className={`w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                        txForm.type === "D" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-rose-600 hover:bg-rose-500"
                      }`}
                    >
                      {txForm.type === "D" ? (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          Commit Ledger Deposit
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-4 h-4" />
                          Commit Ledger Withdrawal
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* TRANSFER TELLER FORM */}
                <div className="md:col-span-6 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3.5 mb-4">
                    <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-400" />
                      Atlas Bank Wire Transfer Desk
                    </h3>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/10 font-bold">INSTANT MEMORY WIRE</span>
                  </div>

                  <form onSubmit={handleTransferSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Source Client Profile</label>
                        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200">
                          {selectedAccount ? (
                            <div>
                              <p className="font-bold truncate text-slate-300">{selectedAccount.holderName}</p>
                              <span className="text-[10px] text-slate-500 font-mono">Acc: #{selectedAccount.accountNumber}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">None selected</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Destination Account Node</label>
                        <select
                          value={transferForm.destNumber}
                          onChange={(e) => setTransferForm(p => ({ ...p, destNumber: e.target.value }))}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                        >
                          <option value="">-- Choose Account --</option>
                          {state?.accounts
                            .filter(a => a.accountNumber !== selectedAccountNumber)
                            .map(acc => (
                              <option key={acc.accountNumber} value={acc.accountNumber}>
                                Acc #{acc.accountNumber} - {acc.holderName}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Transfer Amount ($)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm(p => ({ ...p, amount: e.target.value }))}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 pl-7 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Audit Ledger Wire Memo</label>
                      <input
                        type="text"
                        placeholder="Invoice #2940 payment, Gift, Family support..."
                        value={transferForm.description}
                        onChange={(e) => setTransferForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !selectedAccount || !transferForm.destNumber}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-emerald-500 hover:to-teal-500 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Transmit Ledger Capital Wire
                    </button>
                  </form>
                </div>

              </div>

              {/* GLOBAL CURRENCY EXCHANGE RATE WIDGET */}
              <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-3.5 mb-6 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                      Global Forex & Exchange Rate Sandbox
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Quickly calculate international exchange rates and convert local denominations back to USD standards.</p>
                  </div>
                  <span className="text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-md font-bold self-start sm:self-center">
                    Standard Mid-Market Rates
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* CONVERSION CALCULATOR */}
                  <div className="lg:col-span-5 bg-slate-950/40 p-5 rounded-2xl border border-slate-900/80 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Conversion Tool</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Convert Amount</label>
                        <input
                          type="number"
                          value={convAmount}
                          onChange={(e) => setConvAmount(e.target.value)}
                          placeholder="100"
                          className="w-full bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">From</label>
                          <select
                            value={convFrom}
                            onChange={(e) => setConvFrom(e.target.value)}
                            className="w-full bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                          >
                            {Object.entries(EXCHANGE_RATES).map(([code, data]) => (
                              <option key={code} value={code}>
                                {data.flag} {code} - {data.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">To</label>
                          <select
                            value={convTo}
                            onChange={(e) => setConvTo(e.target.value)}
                            className="w-full bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                          >
                            {Object.entries(EXCHANGE_RATES).map(([code, data]) => (
                              <option key={code} value={code}>
                                {data.flag} {code} - {data.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 text-center space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Calculated Result</span>
                      <p className="text-xl font-extrabold text-white font-mono">
                        {parseFloat(convAmount || "0").toLocaleString("en-US", { maximumFractionDigits: 2 })} {convFrom}
                      </p>
                      <p className="text-xs text-slate-400 font-semibold">= {((parseFloat(convAmount || "0") * (EXCHANGE_RATES[convFrom]?.rate || 1.0)) / (EXCHANGE_RATES[convTo]?.rate || 1.0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {convTo}</p>
                      
                      <div className="text-[9px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-900/60 flex justify-between">
                        <span>1 {convFrom} = {((EXCHANGE_RATES[convFrom]?.rate || 1.0) / (EXCHANGE_RATES[convTo]?.rate || 1.0)).toFixed(4)} {convTo}</span>
                        <span>1 {convTo} = {((EXCHANGE_RATES[convTo]?.rate || 1.0) / (EXCHANGE_RATES[convFrom]?.rate || 1.0)).toFixed(4)} {convFrom}</span>
                      </div>
                    </div>
                  </div>

                  {/* STANDARD EXCHANGE RATES GRID */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Standard Mid-Market Exchange Rates (vs USD)</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(EXCHANGE_RATES)
                        .filter(([code]) => code !== "USD")
                        .map(([code, data]) => (
                          <div 
                            key={code} 
                            onClick={() => {
                              setConvFrom(code);
                              setConvTo("USD");
                            }}
                            className="bg-slate-950/40 hover:bg-slate-950 border border-slate-900 hover:border-cyan-500/40 rounded-xl p-3 text-xs transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-slate-400 font-bold">{data.flag} {code}</span>
                              <span className="text-[10px] text-slate-500">{data.name}</span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-xs text-slate-500">1 {data.symbol} =</span>
                              <span className="text-sm font-extrabold text-white font-mono">${data.rate} <span className="text-[10px] font-normal text-slate-400">USD</span></span>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 leading-relaxed italic">
                      💡 Click any exchange rate card to automatically load the pairing with USD inside the interactive converter. Calculations are simulation-based.
                    </p>
                  </div>

                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 4: CREDIT / DEBIT CARDS HUB */}
          {activeTab === "cards" && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-800/60 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-400" />
                  Horizon Smart Customizer Hub
                </h2>
                <p className="text-xs text-slate-400 mt-1">Configure limits, freeze merchant authorization, and customize your physical card aesthetic pairing.</p>
              </div>

              {selectedAccountCard ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Visualizer left */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4">
                    <div className={`w-full max-w-sm h-48 rounded-2xl p-5 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 ${
                      selectedAccountCard.frozen ? "grayscale brightness-75 bg-slate-800" :
                      cardColor === "slate" ? "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" :
                      cardColor === "indigo" ? "bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950" :
                      cardColor === "emerald" ? "bg-gradient-to-br from-emerald-600 via-slate-900 to-emerald-950" :
                      cardColor === "gold" ? "bg-gradient-to-br from-amber-600 via-yellow-700 to-slate-950" :
                      cardColor === "rose" ? "bg-gradient-to-br from-rose-600 via-pink-700 to-slate-950" :
                      "bg-gradient-to-br from-purple-700 via-fuchsia-800 to-slate-950"
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-yellow-300 to-amber-500 border border-yellow-200/40 mb-1" />
                          <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">{cardType}</span>
                        </div>
                        <span className="text-xs font-mono font-black italic">ATLAS SFB</span>
                      </div>

                      <div className="font-mono text-base font-bold tracking-widest my-2 text-white/90">
                        {revealCardDetails ? selectedAccountCard.cardNumber : `••••  ••••  ••••  ${selectedAccountCard.cardNumber.slice(-4)}`}
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase font-semibold">Cardholder</span>
                          <span className="text-xs font-bold uppercase">{selectedAccountCard.holderName}</span>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase font-semibold">Expiry</span>
                            <span className="text-xs font-mono font-bold">{selectedAccountCard.expiry}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase font-semibold">CVV</span>
                            <span className="text-xs font-mono font-bold">{revealCardDetails ? selectedAccountCard.cvv : "•••"}</span>
                          </div>
                        </div>
                      </div>

                      {selectedAccountCard.frozen && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-rose-400 font-bold text-xs gap-1.5 z-10">
                          <Lock className="w-5 h-5 text-rose-500 animate-pulse" />
                          <span>CARD SECURELY FROZEN</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleFreezeCard(selectedAccountCard.accountNumber)}
                      className={`w-full max-w-sm py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                        selectedAccountCard.frozen 
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {selectedAccountCard.frozen ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          Deactivate Card Hold
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          Securely Freeze Card
                        </>
                      )}
                    </button>
                  </div>

                  {/* Settings customizer form right */}
                  <div className="md:col-span-7 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <h3 className="text-sm font-extrabold text-white mb-4">Atlas Customizer Panel</h3>
                    
                    <form onSubmit={handleUpdateCardCustomizer} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-2">Physical Metal Aesthetic Palette</label>
                        <div className="grid grid-cols-6 gap-2">
                          {[
                            { value: "slate", label: "Carbon", bg: "bg-slate-700 border-slate-500" },
                            { value: "indigo", label: "Royal", bg: "bg-indigo-700 border-indigo-500" },
                            { value: "emerald", label: "Jade", bg: "bg-emerald-600 border-emerald-400" },
                            { value: "gold", label: "Auric", bg: "bg-amber-600 border-amber-400" },
                            { value: "rose", label: "Pink", bg: "bg-rose-600 border-rose-400" },
                            { value: "purple", label: "Ether", bg: "bg-purple-600 border-purple-400" }
                          ].map(item => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setCardColor(item.value as CardConfig["color"])}
                              className={`p-2 rounded-xl text-[10px] font-bold text-white cursor-pointer transition-all border ${item.bg} ${
                                cardColor === item.value 
                                  ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105" 
                                  : "opacity-75 hover:opacity-100"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Authorization Class tier</label>
                          <select
                            value={cardType}
                            onChange={(e) => setCardType(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium"
                          >
                            <option value="Visa Black Infinite">Visa Black Infinite</option>
                            <option value="Mastercard World Elite">Mastercard World Elite</option>
                            <option value="Horizon Private Ledger">Horizon Private Ledger</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Daily Limit Bounds ($)</label>
                          <input
                            type="number"
                            value={cardLimit}
                            onChange={(e) => setCardLimit(Number(e.target.value))}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold transition-all"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Apply Bound Bounds to Card
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <CreditCard className="w-12 h-12 text-slate-700" />
                  <span>Select an active Client Profile above to configure digital smart cards.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: SECURE UPI HUB */}
          {activeTab === "upi" && (
            <motion.div
              key="upi"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-800/60 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-500 animate-bounce" />
                  Atlas Instant UPI Hub
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage your virtual payment address (VPA), customize daily UPI transaction limits, and simulate real-time inward and outward UPI transfers directly linked to your account node.
                </p>
              </div>

              {selectedUpiConfig ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Smartphone Visualizer (Left side) */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-4">
                    <div className="w-full max-w-sm bg-slate-950 border-4 border-slate-800 rounded-[36px] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 min-h-[460px]">
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4.5 bg-slate-800 rounded-b-xl z-20 flex items-center justify-center">
                        <div className="w-12 h-1 bg-slate-900 rounded-full" />
                      </div>

                      {/* Phone Screen Header */}
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1 border-b border-slate-900 pb-2">
                        <span>ATLAS SFB PAY</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>SECURE</span>
                        </div>
                      </div>

                      {/* QR Display Container */}
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 bg-slate-900/40 rounded-2xl p-4 border border-slate-900 relative">
                        {selectedUpiConfig.frozen ? (
                          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-rose-400 font-sans font-bold text-xs gap-2 z-10 p-4">
                            <Lock className="w-8 h-8 text-rose-500 animate-pulse" />
                            <span className="uppercase tracking-wider font-bold">UPI Channel Inactive</span>
                            <span className="text-[10px] text-slate-500 font-normal leading-relaxed">
                              Transactions are locked under current security guidelines. Unlock in the setting panel.
                            </span>
                          </div>
                        ) : null}

                        {/* Highly Elegant Fully Dynamic Scanable QR Code representation */}
                        <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-indigo-500/20 relative group">
                          <div className="w-40 h-40 flex flex-col items-center justify-center relative bg-white overflow-hidden rounded-lg">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${selectedUpiConfig.upiId}&pn=${encodeURIComponent(selectedUpiConfig.holderName)}&cu=USD`)}`}
                              alt="Secure UPI QR Code"
                              className="w-full h-full p-1 object-contain select-none pointer-events-none"
                              referrerPolicy="no-referrer"
                            />
                            {/* Center Logo branding badge */}
                            <div className="absolute w-9 h-9 bg-white rounded-xl flex items-center justify-center border-2 border-slate-100 shadow-md z-10 p-1">
                              <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-lg flex items-center justify-center text-white text-[8px] font-mono font-black">
                                UPI
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* UPI Address Information */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-mono">Scan QR to pay account node</span>
                          <div className="flex items-center gap-1.5 justify-center">
                            <strong className="text-xs text-slate-100 font-mono tracking-wide">{selectedUpiConfig.upiId}</strong>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedUpiConfig.upiId);
                                setSuccessMsg("UPI ID copied to clipboard!");
                              }}
                              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white cursor-pointer transition-all"
                              title="Copy UPI ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status / Bank Link Info */}
                      <div className="bg-[#040813] border border-slate-900 rounded-2xl p-3 flex justify-between items-center text-xs font-mono">
                        <div>
                          <span className="text-[8px] text-slate-500 block uppercase font-bold">Bank Node</span>
                          <span className="text-slate-200 font-semibold text-[10px]">Atlas Small Finance</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-slate-500 block uppercase font-bold">Status</span>
                          <span className={`text-[10px] font-bold ${selectedUpiConfig.frozen ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                            {selectedUpiConfig.frozen ? "FROZEN" : "ACTIVE"}
                          </span>
                        </div>
                      </div>

                      {/* Toggle hold on UPI */}
                      <button
                        onClick={() => toggleFreezeUpi(selectedUpiConfig.accountNumber)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          selectedUpiConfig.frozen 
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        {selectedUpiConfig.frozen ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            Deactivate UPI Lockout
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            Lockout UPI Channel
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Settings Customizer (Right side top/bottom layout) */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    
                    {/* Panel 1: UPI Customizer */}
                    <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
                      <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-indigo-400" />
                        Virtual Payment Address Settings
                      </h3>
                      
                      <form onSubmit={handleUpdateUpiCustomizer} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">UPI Address Handle prefix</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={upiIdInput}
                                onChange={(e) => setUpiIdInput(e.target.value)}
                                placeholder="client_name"
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 pr-20 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold transition-all"
                              />
                              <div className="absolute right-3 top-2.5 text-xs text-indigo-400 font-bold font-mono">
                                {selectedUpiSuffix}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">UPI ID Suffix Domain</label>
                            <select
                              value={selectedUpiSuffix}
                              onChange={(e) => setSelectedUpiSuffix(e.target.value)}
                              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium font-mono"
                            >
                              <option value="@atlas">@atlas (Private Wealth)</option>
                              <option value="@upi">@upi (Universal Gateway)</option>
                              <option value="@sfb">@sfb (Finance Core)</option>
                              <option value="@paytm">@paytm (Digital India)</option>
                              <option value="@okaxis">@okaxis (Commercial Ledger)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Daily Accumulator UPI Limit ($)</label>
                            <input
                              type="number"
                              value={upiLimit}
                              onChange={(e) => setUpiLimit(Number(e.target.value))}
                              min="1"
                              max="10000"
                              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold transition-all"
                            />
                            <span className="text-[9px] text-slate-500 mt-0.5 block">Standard RBI guidelines cap daily UPI at $2,000 equivalent.</span>
                          </div>

                          <div className="bg-[#050814]/80 border border-slate-900 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
                            <span className="font-bold text-slate-300 block">Linked Funding Pool:</span>
                            <div className="font-mono text-[10px] text-slate-400">
                              Account: #{selectedUpiConfig.accountNumber}<br />
                              Max Transfer: ${selectedAccount ? selectedAccount.balance.toFixed(2) : "0.00"}<br />
                              Pointer: {selectedAccount ? selectedAccount.memoryAddress : "0x0"}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex justify-end">
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Update UPI Credentials
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Panel 2: Secure UPI Simulator */}
                    <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-amber-400" />
                            Real-Time UPI Transfer Simulator
                          </h3>
                          <p className="text-[10px] text-slate-400">Triggers safe ledger withdrawals/deposits on the source C-memory buffer.</p>
                        </div>
                        
                        <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-900">
                          <button
                            type="button"
                            onClick={() => setUpiSimType("pay")}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              upiSimType === "pay" 
                                ? "bg-indigo-600 text-white" 
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Send Pay
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpiSimType("receive")}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              upiSimType === "receive" 
                                ? "bg-emerald-600 text-white" 
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Receive Request
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleSimulateUpiPayment} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                              {upiSimType === "pay" ? "Recipient Virtual Address (VPA)" : "Sender Virtual Address (VPA)"}
                            </label>
                            <input
                              type="text"
                              value={upiSimPayee}
                              onChange={(e) => setUpiSimPayee(e.target.value)}
                              placeholder={upiSimType === "pay" ? "starbucks@okaxis" : "payer_account@upi"}
                              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-medium transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Simulated Amount ($)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={upiSimAmount}
                                onChange={(e) => setUpiSimAmount(e.target.value)}
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 pl-7 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Memo / Business Purpose</label>
                          <input
                            type="text"
                            value={upiSimDesc}
                            onChange={(e) => setUpiSimDesc(e.target.value)}
                            placeholder={upiSimType === "pay" ? "Morning premium mocha latte" : "Received pocket money"}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                          />
                        </div>

                        {/* Schedule Payment Options */}
                        {upiSimType === "pay" && (
                          <div className="bg-[#050814]/60 border border-slate-900/85 rounded-2xl p-4 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-400" />
                                <div>
                                  <span className="text-xs font-bold text-white block">Schedule Recurring UPI</span>
                                  <span className="text-[10px] text-slate-400 block">Set up automatic future transfers</span>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  id="isScheduledCheckbox"
                                  checked={isScheduled}
                                  onChange={(e) => setIsScheduled(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-indigo-600"></div>
                              </label>
                            </div>

                            {isScheduled && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-900/80">
                                <div>
                                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Select Future Date</label>
                                  <input
                                    type="date"
                                    id="scheduleDateInput"
                                    value={scheduleDate}
                                    min={new Date().toISOString().split("T")[0]}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Transfer Frequency</label>
                                  <select
                                    id="scheduleFrequencyInput"
                                    value={scheduleFrequency}
                                    onChange={(e) => setScheduleFrequency(e.target.value as any)}
                                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium font-mono cursor-pointer"
                                  >
                                    <option value="once">Once (One-time transfer)</option>
                                    <option value="daily">Daily (Every day)</option>
                                    <option value="weekly">Weekly (Every week)</option>
                                    <option value="monthly">Monthly (Every month)</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading || !upiSimPayee.trim() || !upiSimAmount}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                            upiSimType === "pay"
                              ? isScheduled
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-500/10"
                                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/10"
                              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/10"
                          }`}
                        >
                          {upiSimType === "pay" ? (
                            isScheduled ? (
                              <>
                                <CalendarCheck className="w-4 h-4" />
                                Schedule Future UPI Transfer
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-4 h-4" />
                                Authorize Instant Outward UPI Transfer
                              </>
                            )
                          ) : (
                            <>
                              <ArrowDownLeft className="w-4 h-4" />
                              Request Dynamic UPI Inward Collection
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Panel 3: Scheduled UPI Transactions Registry */}
                    <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-indigo-400" />
                          Scheduled UPI Transfers ({scheduledPayments.filter(p => p.accountNumber === selectedUpiConfig.accountNumber).length})
                        </h3>
                        <p className="text-[10px] text-slate-400">Recurring automatic outflows configured for VPA: <span className="text-indigo-400 font-mono font-bold">{selectedUpiConfig.upiId}</span></p>
                      </div>

                      {scheduledPayments.filter(p => p.accountNumber === selectedUpiConfig.accountNumber).length === 0 ? (
                        <div className="p-6 border border-dashed border-slate-800/60 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                          <Clock className="w-8 h-8 text-slate-700 animate-pulse" />
                          <span>No scheduled payments found for this VPA.</span>
                          <span className="text-[10px] text-slate-600">Toggle "Schedule Recurring UPI" above to plan a future transfer.</span>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                          {scheduledPayments
                            .filter(p => p.accountNumber === selectedUpiConfig.accountNumber)
                            .map((payment) => {
                              return (
                                <div 
                                  key={payment.id} 
                                  className={`bg-slate-950/80 border rounded-2xl p-3.5 space-y-2.5 transition-all ${
                                    payment.active ? 'border-slate-800/80 hover:border-indigo-500/30' : 'border-slate-900/40 opacity-60'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-white font-mono">{payment.targetVpa}</span>
                                        <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full uppercase font-extrabold font-mono">
                                          {payment.frequency}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-0.5">{payment.description}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-extrabold text-indigo-400 block font-mono">${payment.amount.toFixed(2)}</span>
                                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold font-mono">Amount</span>
                                    </div>
                                  </div>

                                  <div className="bg-[#050814]/80 p-2 rounded-xl flex items-center justify-between text-[10px] font-mono text-slate-400 border border-slate-900">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-500">Next Run:</span>
                                      <span className="text-amber-400 font-bold">{payment.nextRunDate}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500">Status:</span>
                                      <span className={`font-bold ${payment.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {payment.active ? 'Active' : 'Paused'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1">
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleScheduledPaymentStatus(payment.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                          payment.active 
                                            ? "bg-slate-900 hover:bg-slate-800 text-amber-500 border border-amber-500/10" 
                                            : "bg-slate-900 hover:bg-slate-850 text-emerald-500 border border-emerald-500/10"
                                        }`}
                                      >
                                        {payment.active ? "Pause" : "Resume"}
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => executeScheduledPayment(payment)}
                                        disabled={loading || !payment.active}
                                        className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold cursor-pointer transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
                                      >
                                        <RefreshCw className="w-3 h-3 animate-spin-slow" />
                                        Trigger Run
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => deleteScheduledPayment(payment.id)}
                                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all cursor-pointer"
                                      title="Cancel Scheduled Transfer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <Smartphone className="w-12 h-12 text-slate-700" />
                  <span>Select an active Client Profile on top to configure digital UPI VPAs.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: APEX AI ADVISOR CHAT */}
          {activeTab === "ai" && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-800/60 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Sparkles className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Atlas Intelligence</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Your bespoke AI Private Wealth Advisor scanning live ledger node transactions.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Predefined prompt questions left */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-5 shadow-xl">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      Smart Advisory Blueprints
                    </h4>
                    
                    <div className="space-y-2">
                      {[
                        { label: "Analyze Ledger & Build Budget", prompt: "Scan my current transaction history. Give me a detailed budget spending breakdown, audit any cash outflow leaks, and write a savings action plan." },
                        { label: "Compound Yield Projections", prompt: "Assuming I continue with my current balance level, write a complete 5-year projections schedule compounding at 5.25% annual yield." },
                        { label: "Create Passive Income Assets", prompt: "Explain advanced asset classes such as certificates of deposit, index funds, and liquid ledger allocations for security." },
                        { label: "Check Ledger Authenticity", prompt: "Verify my dynamic account node transaction history for balance leaks or unauthorized transfer activities." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => triggerPredefinedPrompt(item.prompt)}
                          className="w-full p-2.5 bg-slate-950/80 border border-slate-900 hover:border-indigo-500/30 text-left text-slate-300 hover:text-white rounded-xl text-[11px] transition-all cursor-pointer flex items-center justify-between font-medium group"
                        >
                          <span className="truncate pr-2">{item.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-all flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedAccount && (
                    <div className="bg-[#050814] border border-slate-900 p-4 rounded-2xl text-[11px] text-slate-500 font-mono space-y-2">
                      <p className="font-sans font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                        <Info className="w-3.5 h-3.5 text-indigo-400" />
                        AI Ledger Context Bounds
                      </p>
                      <p>Client Name: <strong className="text-slate-300">{selectedAccount.holderName}</strong></p>
                      <p>Liquidity balance: <strong className="text-slate-300">${selectedAccount.balance.toFixed(2)}</strong></p>
                      <p>Tx history count: <strong className="text-slate-300">{selectedAccount.transactionCount} elements</strong></p>
                    </div>
                  )}
                </div>

                {/* AI Chat workspace right */}
                <div className="lg:col-span-8 bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl shadow-xl flex flex-col justify-between h-[450px]">
                  
                  {/* Messages box */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {aiHistory.map((msg, idx) => {
                      const isUser = msg.role === "user";
                      return (
                        <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                            isUser 
                              ? "bg-indigo-600 text-white rounded-tr-none font-medium" 
                              : "bg-slate-950/80 border border-slate-900 text-slate-300 rounded-tl-none font-mono"
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1.5 border-b border-white/5 pb-1">
                              {isUser ? (
                                <>
                                  <User className="w-3.5 h-3.5 text-slate-200" />
                                  <span className="font-bold text-[10px] text-slate-100 uppercase tracking-widest">Client Profile</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                                  <span className="font-bold text-[10px] text-amber-400 uppercase tracking-widest">Atlas Advisor Intelligence</span>
                                </>
                              )}
                            </div>
                            
                            {/* Parse lines with bullets nicely */}
                            <div className="whitespace-pre-line space-y-1 font-sans text-[11px]">
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-950/80 border border-slate-900 rounded-2xl rounded-tl-none p-4 text-xs font-mono max-w-sm flex items-center gap-2.5">
                          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                          <span className="text-slate-400">Consulting Atlas portfolios indices...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input form footer */}
                  <form onSubmit={handleAiQuerySubmit} className="p-4 bg-slate-950/40 border-t border-slate-900/60 flex gap-2 rounded-b-3xl">
                    <input
                      type="text"
                      placeholder={selectedAccount ? "Ask Atlas Advisor about interest rate schedules..." : "Select client account on top to supply budget context..."}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-500 hover:to-indigo-600 cursor-pointer shadow-md disabled:opacity-50 transition-all flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 6: WEALTH AND CREDIT HUB */}
          {activeTab === "wealth" && (
            <motion.div
              key="wealth"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-800/60 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Wealth & Credit Sandboxes</h2>
                    <p className="text-xs text-slate-400 mt-0.5">High-yield Fixed Deposits, real-time Loan disbursement, and deep-ledger transaction analytics.</p>
                  </div>
                </div>
              </div>

              {selectedAccount ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: FIXED DEPOSITS AND LOAN SANDBOX (8 SPAN) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* BENTO ROW: OPEN FIXED DEPOSIT */}
                    <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-cyan-400" />
                            Premium High-Yield Fixed Deposits
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Lock secure dynamic nodes and generate compounded annual interest.</p>
                        </div>
                        <span className="text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-md font-bold">
                          Up to 9.2% p.a.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        
                        {/* FD Configurator Form */}
                        <form onSubmit={handleOpenFD} className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-900">
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1.5 flex justify-between">
                              <span>Deposit Amount ($)</span>
                              <span className="text-cyan-400 font-mono">Min $100</span>
                            </label>
                            <input
                              type="number"
                              min="100"
                              placeholder="1000"
                              value={fdAmount}
                              onChange={(e) => setFdAmount(e.target.value)}
                              className="w-full bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1.5 flex justify-between">
                              <span>Lock Term (Months)</span>
                              <span className="text-cyan-400 font-mono">{fdTerm} Months</span>
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="3"
                                max="60"
                                step="3"
                                value={fdTerm}
                                onChange={(e) => setFdTerm(Number(e.target.value))}
                                className="flex-1 accent-cyan-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1 px-1">
                              <span>3m (6.0%)</span>
                              <span>12m (7.5%)</span>
                              <span>36m (8.5%)</span>
                              <span>60m (9.2%)</span>
                            </div>
                          </div>

                          {/* Live Projection Calculator Block */}
                          <div className="border-t border-slate-900 pt-3 mt-3">
                            <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                              <div>
                                <span className="text-[10px] text-slate-500">Interest Rate:</span>
                                <p className="text-white font-bold font-mono text-xs mt-0.5">{getFdRate(fdTerm)}% p.a.</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500">Maturity Projection:</span>
                                <p className="text-emerald-400 font-bold font-mono text-xs mt-0.5">
                                  ${(Number(fdAmount || 0) * Math.pow(1 + (getFdRate(fdTerm) / 100), fdTerm / 12)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={loading || !fdAmount || parseFloat(fdAmount) < 100}
                            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl text-xs font-bold shadow-md hover:from-cyan-500 hover:to-cyan-600 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Lock High-Yield FD Node
                          </button>
                        </form>

                        {/* List of Active Fixed Deposits */}
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Secure FD Nodes ({fixedDeposits.filter(f => f.accountNumber === selectedAccount.accountNumber).length})</h4>
                          
                          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                            {fixedDeposits.filter(f => f.accountNumber === selectedAccount.accountNumber).length > 0 ? (
                              fixedDeposits.filter(f => f.accountNumber === selectedAccount.accountNumber).map((fd) => (
                                <div key={fd.id} className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex flex-col justify-between gap-2 text-xs hover:border-slate-800 transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                      <span className="font-mono font-bold text-white text-[11px]">{fd.id}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">{fd.createdAt}</span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-1 py-1.5 border-y border-slate-900/40 text-[10px]">
                                    <div>
                                      <span className="text-slate-500">Principal</span>
                                      <p className="text-white font-semibold font-mono mt-0.5">${fd.principal.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Rate / Term</span>
                                      <p className="text-cyan-400 font-semibold font-mono mt-0.5">{fd.rate}% / {fd.months}m</p>
                                    </div>
                                    <div>
                                      <span className="text-emerald-400 font-semibold">Maturity</span>
                                      <p className="text-emerald-400 font-semibold font-mono mt-0.5">${fd.maturityValue.toFixed(2)}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 pt-1">
                                    <span className="text-[9px] font-mono text-slate-500">Type: locked_memory_ptr</span>
                                    <button
                                      onClick={() => handleCloseFD(fd.id)}
                                      className="text-[10px] font-mono text-rose-400 hover:text-rose-300 font-bold border border-rose-500/20 rounded-md px-2 py-1 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer transition-all"
                                    >
                                      Premature Settle (Liquidate)
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 border border-dashed border-slate-800/80 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5 h-[230px]">
                                <Layers className="w-8 h-8 text-slate-700" />
                                <span>No active locked FD nodes found for this account.</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* BENTO ROW: CREDIT AND LOANS SANDBOX */}
                    <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            Atlas Dynamic Credit & Overdraft Sandbox
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Check loan eligibility and instantly disburse secured memory capital into your active node.</p>
                        </div>
                        <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                          <span>Rate: {getLoanRate(loanTerm)}% p.a.</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        
                        {/* Loan Request Form */}
                        <form onSubmit={handleApplyLoan} className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-900">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Loan Capital Purpose</label>
                              <select
                                value={loanPurpose}
                                onChange={(e) => setLoanPurpose(e.target.value)}
                                className="w-full bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                              >
                                <option value="Personal Loan">Personal Loan</option>
                                <option value="Business Expansion">Business Loan</option>
                                <option value="Sovereign Overdraft">Overdraft Limit</option>
                                <option value="Venture Capital">Venture Capital</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Term (Months)</label>
                              <select
                                value={loanTerm}
                                onChange={(e) => setLoanTerm(Number(e.target.value))}
                                className="w-full bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                              >
                                <option value={6}>6 Months</option>
                                <option value={12}>12 Months</option>
                                <option value={24}>24 Months</option>
                                <option value={36}>36 Months</option>
                                <option value={48}>48 Months</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1.5 flex justify-between">
                              <span>Required Loan Principal ($)</span>
                              <span className="text-indigo-400 font-mono">Min $500</span>
                            </label>
                            <input
                              type="number"
                              min="500"
                              max="100000"
                              placeholder="5000"
                              value={loanAmount}
                              onChange={(e) => setLoanAmount(e.target.value)}
                              className="w-full bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono font-medium"
                            />
                          </div>

                          {/* Live EMI projection block */}
                          <div className="border-t border-slate-900 pt-3 mt-3">
                            <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                              <div>
                                <span className="text-[10px] text-slate-500">Interest rate (Annual):</span>
                                <p className="text-white font-bold font-mono text-xs mt-0.5">{getLoanRate(loanTerm)}% p.a.</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500">Estimated Monthly EMI:</span>
                                <p className="text-indigo-400 font-bold font-mono text-xs mt-0.5">
                                  ${calculateEMI(parseFloat(loanAmount || "0"), getLoanRate(loanTerm), loanTerm).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={loading || !loanAmount || parseFloat(loanAmount) < 500}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:from-indigo-500 hover:to-indigo-600 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Disburse Secured Capital
                          </button>
                        </form>

                        {/* List of Active Loans */}
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">Active Capital Loans ({loans.filter(l => l.accountNumber === selectedAccount.accountNumber).length})</h4>
                          
                          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                            {loans.filter(l => l.accountNumber === selectedAccount.accountNumber).length > 0 ? (
                              loans.filter(l => l.accountNumber === selectedAccount.accountNumber).map((loan) => (
                                <div key={loan.id} className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex flex-col justify-between gap-2 text-xs hover:border-slate-800 transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                      <span className="font-mono font-bold text-white text-[11px]">{loan.id}</span>
                                    </div>
                                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded px-1">{loan.description}</span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-1 py-1.5 border-y border-slate-900/40 text-[10px]">
                                    <div>
                                      <span className="text-slate-500">Outstanding</span>
                                      <p className="text-white font-semibold font-mono mt-0.5">${loan.principal.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Rate / Term</span>
                                      <p className="text-indigo-400 font-semibold font-mono mt-0.5">{loan.rate}% / {loan.months}m</p>
                                    </div>
                                    <div>
                                      <span className="text-indigo-400 font-bold">Monthly EMI</span>
                                      <p className="text-indigo-400 font-bold font-mono mt-0.5">${loan.emi.toFixed(2)}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 pt-1">
                                    <span className="text-[9px] font-mono text-slate-500">{loan.createdAt}</span>
                                    <button
                                      onClick={() => handleRepayLoan(loan.id, loan.emi)}
                                      className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-bold border border-emerald-500/20 rounded-md px-2 py-1 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer transition-all flex items-center gap-1"
                                    >
                                      <PlusCircle className="w-3 h-3" />
                                      Pay EMI
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 border border-dashed border-slate-800/80 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5 h-[230px]">
                                <Shield className="w-8 h-8 text-slate-700" />
                                <span>No outstanding credit or active loan nodes found.</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: DETAILED LEDGER CATEGORY SPENDING ANALYTICS (4 SPAN) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* CREDIT SCORE ESTIMATOR CARD */}
                    <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Live Credit Eligibility Score
                      </h4>

                      <div className="text-center py-4 bg-slate-950/40 rounded-2xl border border-slate-900 mb-4">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Dynamic Score Index</span>
                        <p className="text-4xl font-extrabold text-emerald-400 mt-1 font-mono">
                          {selectedAccount.balance > 10000 ? "820" : selectedAccount.balance > 5000 ? "780" : selectedAccount.balance > 1000 ? "710" : "640"}
                          <span className="text-xs text-slate-500 font-normal"> / 850</span>
                        </p>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mt-1.5 font-mono">
                          {selectedAccount.balance > 5000 ? "Excellent Profile" : selectedAccount.balance > 1000 ? "Prime Standing" : "Moderate Liquidity"}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>Active Ledger Transactions:</span>
                          <span className="text-white font-mono font-bold">{selectedAccount.transactions.length} Nodes</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>Allocated Overdraft Limit:</span>
                          <span className="text-indigo-400 font-mono font-bold">
                            ${(Math.max(2000, selectedAccount.balance * 1.5)).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 italic leading-relaxed mt-2.5 border-t border-slate-900 pt-2.5">
                          Note: Your dynamic Credit eligibility index scales live with your core memory ledger balance and active safe transactions count.
                        </p>
                      </div>
                    </div>

                    {/* DYNAMIC CATEGORY SPENDING CHART CARD */}
                    <div className="bg-[#0b1126]/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        Ledger Category Spending
                      </h4>

                      {(() => {
                        const breakdown = (() => {
                          if (!selectedAccount) return { categories: [], totalOut: 0 };
                          let totalOut = 0;
                          const catAmounts: Record<string, number> = {
                            "Food & Dining": 0,
                            "Bills & Utilities": 0,
                            "Transfers Out": 0,
                            "Secured Investments": 0,
                            "Other Expenses": 0,
                          };

                          selectedAccount.transactions.forEach(tx => {
                            if (tx.type === 'W' || tx.type === 'T') {
                              const desc = tx.description.toLowerCase();
                              totalOut += tx.amount;
                              if (desc.includes("coffee") || desc.includes("food") || desc.includes("dining") || desc.includes("restaurant") || desc.includes("swiggy") || desc.includes("zomato") || desc.includes("grocery") || desc.includes("mart")) {
                                catAmounts["Food & Dining"] += tx.amount;
                              } else if (desc.includes("bill") || desc.includes("recharge") || desc.includes("phone") || desc.includes("netflix") || desc.includes("utility") || desc.includes("rent") || desc.includes("electricity")) {
                                catAmounts["Bills & Utilities"] += tx.amount;
                              } else if (desc.includes("transfer") || desc.includes("send") || desc.includes("repay")) {
                                catAmounts["Transfers Out"] += tx.amount;
                              } else if (desc.includes("fd") || desc.includes("locked") || desc.includes("investment") || desc.includes("gold")) {
                                catAmounts["Secured Investments"] += tx.amount;
                              } else {
                                catAmounts["Other Expenses"] += tx.amount;
                              }
                            }
                          });

                          const categories = Object.entries(catAmounts).map(([name, amount]) => ({
                            name,
                            amount,
                            percentage: totalOut > 0 ? (amount / totalOut) * 100 : 0
                          })).filter(c => c.amount > 0 || totalOut === 0);

                          return { categories, totalOut };
                        })();

                        return breakdown.totalOut > 0 ? (
                          <div className="space-y-4">
                            <div className="text-slate-400 text-[11px] mb-3">
                              <span>Total Period Outflow: </span>
                              <span className="text-white font-bold font-mono">${breakdown.totalOut.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div className="space-y-3">
                              {breakdown.categories.map((cat, i) => {
                                const colors = ["bg-indigo-500", "bg-cyan-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500"];
                                const col = colors[i % colors.length];
                                return (
                                  <div key={cat.name} className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-400">{cat.name}</span>
                                      <span className="text-white font-mono font-bold">
                                        ${cat.amount.toFixed(2)} ({cat.percentage.toFixed(0)}%)
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
                                      <div className={`${col} h-full rounded-full`} style={{ width: `${cat.percentage}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 border border-dashed border-slate-800/80 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5">
                            <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                            <span>No outflows/transactions recorded. Category classification requires active withdrawal or transfer entries.</span>
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                </div>
              ) : (
                <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <Smartphone className="w-12 h-12 text-slate-700" />
                  <span>Select an active Client Profile node above to access Fixed Deposits and Capital Credit Sandboxes.</span>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL PRINT DIALOG OVERLAY (PDF INVOICE STATEMENT) */}
      <AnimatePresence>
        {showStatementPrint && selectedAccount && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl p-8 flex flex-col justify-between overflow-hidden max-h-[90vh]"
            >
              {/* Printable Body Block */}
              <div id="printable-statement-element" className="space-y-6 overflow-y-auto pr-1">
                
                {/* Invoice Letterhead */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-950">ATLAS SMALL FINANCE BANK</h1>
                    <p className="text-[10px] text-slate-500 tracking-widest uppercase font-mono">Atlas Wealth Group</p>
                    <p className="text-xs text-slate-600 mt-1">100 Financial Center Blvd, Geneva, CH</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono tracking-widest bg-slate-900 text-white px-2.5 py-1 rounded-sm block font-bold mb-1">OFFICIAL BANK STATEMENT</span>
                    <p className="text-xs text-slate-600 font-mono">Date: {currentTime || new Date().toUTCString()}</p>
                    <p className="text-xs text-slate-600 font-mono">Acc: #{selectedAccount.accountNumber}</p>
                  </div>
                </div>

                {/* Ledger metadata summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-100 p-4 rounded-xl font-mono text-xs text-slate-700">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">Account Holder</span>
                    <strong className="text-slate-950 font-bold font-sans">{selectedAccount.holderName}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">C node pointer</span>
                    <span>{selectedAccount.memoryAddress}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">Total entries</span>
                    <span>{selectedAccount.transactionCount} entries</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 font-sans block font-semibold">Closing balance</span>
                    <strong className="text-slate-950 font-black">${selectedAccount.balance.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Transactions details list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-800 border-b border-slate-200 pb-1.5 font-mono">Detailed Posting Ledger History</h4>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedAccount.transactions.map((tx, idx) => (
                      <div key={idx} className="border-b border-slate-100 pb-2 flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans font-bold text-slate-950 text-xs">{tx.description}</span>
                            <span className="text-[9px] text-slate-400">({tx.timestamp})</span>
                          </div>
                          <span className="text-[10px] text-slate-500">Transaction ID: #{tx.id} · Type: {tx.type}</span>
                        </div>
                        <span className={`font-mono font-bold text-sm ${
                          tx.type === "D" || tx.type === "R" ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {tx.type === "D" || tx.type === "R" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-4">
                  <p>Atlas Small Finance Bank is a registered international financial custodian. Dynamic allocations tracked under source memory buffers.</p>
                  <p className="mt-1">© {new Date().getFullYear()} Atlas International. All ledger entries certified secure.</p>
                </div>

              </div>

              {/* Action buttons bottom */}
              <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowStatementPrint(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  Close Document
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Print Statement Invoice
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM ACCOUNT CLOSURE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmAccountNum !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1126] border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 overflow-hidden"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <AlertTriangle className="w-8 h-8 animate-pulse shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-white font-sans">Deallocate Account Node?</h3>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mt-0.5">Secure C-Engine Memory Deconstruction</p>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 text-xs space-y-2.5 leading-relaxed font-sans text-slate-300">
                <p>
                  Are you absolutely sure you want to close <strong className="text-white">Account #{deleteConfirmAccountNum}</strong>?
                </p>
                <p className="text-slate-400">
                  This action triggers an immediate <code className="text-cyan-400 font-mono bg-cyan-950/30 px-1 py-0.5 rounded border border-cyan-500/10">free()</code> call on the structural <strong className="text-slate-300">BankNode</strong> pointer and deletes all associated transaction history records from persistent database storage.
                </p>
                <p className="text-rose-400 font-medium">
                  WARNING: This operation is destructive and cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmAccountNum(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeCloseAccount(deleteConfirmAccountNum)}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-rose-500/10 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Deallocate Node
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFESSIONAL PREMIUM FOOTER (CLEAN & OFFLINE PREPARED) */}
      <footer className="mt-12 border-t border-slate-800/80 bg-slate-950/90 py-6 px-4 sm:px-8 md:px-12 z-10 font-sans text-xs text-slate-500">
        <div className="max-w-[1800px] mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Atlas Small Finance Digital Banking Platform</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 text-center md:text-right">
            <div className="text-[11px] text-slate-400 font-medium">
              Created by <span className="text-indigo-400 font-semibold">Sam Sarvesh</span>
              <span className="mx-1.5 text-slate-600">·</span>
              Made with <span className="text-rose-500">❤</span> in India
            </div>
            <span>© {new Date().getFullYear()} Atlas Small Finance Bank. All rights reserved. Secure commercial ledger systems certified.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
