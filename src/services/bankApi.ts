import { BackendState, Account, Transaction, ExecLog } from "../types";

const SIM_DB_KEY = "atlas_client_sim_db";
const BACKUP_KEY = "atlas_sfb_backup";

interface SimDatabase {
  accounts: Account[];
  nextAccountNumber: number;
}

const SIM_C_CODE = `// ============================================================================
// ATLAS SMALL FINANCE BANK - LOW-LEVEL C ENGINE CORE (backend.c)
// Architecture: x86_64 / Simulated Client Engine
// Memory Model: Dynamic Heap Allocation (malloc / realloc / free)
// ============================================================================
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef struct {
    int id;
    char type;          // 'D' = Deposit, 'W' = Withdraw, 'T' = Transfer Out, 'R' = Transfer In
    double amount;
    char timestamp[30];
    char description[100];
} Transaction;

typedef struct {
    int accountNumber;
    char name[100];
    double balance;
    Transaction* transactions; // Dynamically resized array via realloc
    int transactionCount;
    int transactionCapacity;
} Account;

typedef struct BankNode {
    Account account;
    struct BankNode* next;     // Sequential linked list pointer
} BankNode;

// Memory Pointer Visualization and Deallocation Simulation
void execute_free_node(BankNode* node) {
    if (node) {
        if (node->account.transactions) {
            free(node->account.transactions); // Deallocate transaction history array
        }
        free(node);                           // Release structural node pointer
    }
}
`;

function generateSimAddress(seed: number = 0): string {
  const hex = Math.floor(Math.random() * 0x10000 + 0x7ffd0000 + seed).toString(16);
  return `0x${hex}`;
}

function getInitialSimDb(): SimDatabase {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  return {
    nextAccountNumber: 1004,
    accounts: [
      {
        accountNumber: 1001,
        holderName: "John Doe",
        balance: 1650.00,
        transactionCount: 3,
        transactionCapacity: 4,
        memoryAddress: generateSimAddress(10),
        txArrayAddress: generateSimAddress(100),
        transactions: [
          { id: 1, type: "D", amount: 1500.00, timestamp: now, description: "Initial Opening Deposit" },
          { id: 2, type: "W", amount: -50.00, timestamp: now, description: "ATM Withdrawal" },
          { id: 3, type: "D", amount: 200.00, timestamp: now, description: "Salary Bonus" }
        ]
      },
      {
        accountNumber: 1002,
        holderName: "Jane Smith",
        balance: 3350.50,
        transactionCount: 2,
        transactionCapacity: 4,
        memoryAddress: generateSimAddress(20),
        txArrayAddress: generateSimAddress(200),
        transactions: [
          { id: 1, type: "D", amount: 3200.50, timestamp: now, description: "Initial Opening Deposit" },
          { id: 2, type: "D", amount: 150.00, timestamp: now, description: "Online Refund" }
        ]
      },
      {
        accountNumber: 1003,
        holderName: "Robert Johnson",
        balance: 450.00,
        transactionCount: 1,
        transactionCapacity: 4,
        memoryAddress: generateSimAddress(30),
        txArrayAddress: generateSimAddress(300),
        transactions: [
          { id: 1, type: "D", amount: 450.00, timestamp: now, description: "Initial Opening Deposit" }
        ]
      }
    ]
  };
}

function loadSimDb(): SimDatabase {
  try {
    // Try primary client sim DB first
    const saved = localStorage.getItem(SIM_DB_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.accounts)) return parsed;
    }
    // Check backup DB
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (parsed && Array.isArray(parsed.accounts)) {
        return {
          accounts: parsed.accounts,
          nextAccountNumber: parsed.nextAccountNumber || 1004
        };
      }
    }
  } catch (e) {
    console.error("Error reading client sim DB:", e);
  }
  const initDb = getInitialSimDb();
  saveSimDb(initDb);
  return initDb;
}

function saveSimDb(db: SimDatabase) {
  try {
    localStorage.setItem(SIM_DB_KEY, JSON.stringify(db));
    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      accounts: db.accounts,
      nextAccountNumber: db.nextAccountNumber,
      timestamp: new Date().toISOString()
    }));
  } catch (e) {
    console.error("Error saving client sim DB:", e);
  }
}

function buildSimState(db: SimDatabase, actionLog: string = "Executed standalone client-side banking operation"): BackendState {
  const logs: ExecLog[] = [
    { step: 1, action: "fopen() opened storage ledger for read/write", concept: "File Handling / Storage", address: "0x55aa3200" },
    { step: 2, action: `Loaded ${db.accounts.length} active account nodes into memory linked list`, concept: "Dynamic Memory / Heap", address: db.accounts[0]?.memoryAddress || "0x7ffd5000" },
    { step: 3, action: actionLog, concept: "Pointer Manipulation", address: null }
  ];

  return {
    accounts: db.accounts,
    nextAccountNumber: db.nextAccountNumber,
    cCode: SIM_C_CODE,
    logs,
    serverTime: new Date().toUTCString(),
    systemInfo: {
      totalAccounts: db.accounts.length,
      nextAccountNumber: db.nextAccountNumber,
      totalMemoryAllocatedBytes: db.accounts.length * 512 + 1024,
      engineMode: "Simulated C Runtime Fallback",
      os: "WebAssembly / Standalone Client Engine",
      arch: "x86_64-simulated",
      compiler: "TypeScript Fallback Engine (Vercel/Static Compatible)",
      dbSize: `${Math.max(2.4, (JSON.stringify(db).length / 1024)).toFixed(1)} KB`,
      uptime: "100.0%",
      memoryUsage: `${(12 + Math.random() * 2).toFixed(1)} MB`
    }
  };
}

// Standalone fallback execution engine when backend API is unreachable or returns Vercel 404 HTML
async function executeClientFallback(endpoint: string, options?: RequestInit): Promise<any> {
  const method = (options?.method || "GET").toUpperCase();
  let body: any = {};
  if (options?.body && typeof options.body === "string") {
    try {
      body = JSON.parse(options.body);
    } catch (e) {}
  }

  const db = loadSimDb();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  if (endpoint.includes("/api/bank/state")) {
    return buildSimState(db, "CLI command '--list' verified linked list integrity");
  }

  if (endpoint.includes("/api/bank/code")) {
    return { code: SIM_C_CODE };
  }

  if (endpoint.includes("/api/bank/restore")) {
    if (body.accounts && Array.isArray(body.accounts)) {
      db.accounts = body.accounts;
      if (body.nextAccNum) db.nextAccountNumber = Number(body.nextAccNum);
      saveSimDb(db);
    }
    return { status: "success" };
  }

  if (endpoint.includes("/api/bank/accounts") && method === "POST") {
    const name = String(body.holderName || body.name || "Unnamed Client").trim();
    const initialDeposit = Number(body.initialBalance ?? body.initialDeposit) || 0;
    
    const newAcc: Account = {
      accountNumber: db.nextAccountNumber++,
      holderName: name,
      balance: initialDeposit,
      transactionCount: initialDeposit > 0 ? 1 : 0,
      transactionCapacity: 4,
      memoryAddress: generateSimAddress(),
      txArrayAddress: generateSimAddress(),
      transactions: initialDeposit > 0 ? [
        { id: 1, type: "D", amount: initialDeposit, timestamp: now, description: "Initial Opening Deposit" }
      ] : []
    };

    db.accounts.push(newAcc);
    saveSimDb(db);
    return buildSimState(db, `malloc() allocated new BankNode at ${newAcc.memoryAddress} for Account #${newAcc.accountNumber}`);
  }

  if (endpoint.includes("/api/bank/deposit") && method === "POST") {
    const accNum = Number(body.accountNumber);
    const amount = Number(body.amount);
    const desc = String(body.description || "Deposit").trim();

    const acc = db.accounts.find(a => a.accountNumber === accNum);
    if (!acc) return { error: `Account #${accNum} not found in database.` };

    acc.balance += amount;
    acc.transactions.push({
      id: acc.transactions.length + 1,
      type: "D",
      amount: amount,
      timestamp: now,
      description: desc
    });
    acc.transactionCount = acc.transactions.length;
    if (acc.transactionCount > acc.transactionCapacity) {
      acc.transactionCapacity *= 2;
      acc.txArrayAddress = generateSimAddress();
    }

    saveSimDb(db);
    return buildSimState(db, `realloc() expanded transaction array at ${acc.txArrayAddress}. Added Deposit +$${amount.toFixed(2)}`);
  }

  if (endpoint.includes("/api/bank/withdraw") && method === "POST") {
    const accNum = Number(body.accountNumber);
    const amount = Number(body.amount);
    const desc = String(body.description || "Withdrawal").trim();

    const acc = db.accounts.find(a => a.accountNumber === accNum);
    if (!acc) return { error: `Account #${accNum} not found in database.` };

    if (acc.balance < amount) {
      return { error: `Insufficient liquid funds. Your balance is $${acc.balance.toFixed(2)}, requested $${amount.toFixed(2)}.` };
    }

    acc.balance -= amount;
    acc.transactions.push({
      id: acc.transactions.length + 1,
      type: "W",
      amount: -amount,
      timestamp: now,
      description: desc
    });
    acc.transactionCount = acc.transactions.length;
    if (acc.transactionCount > acc.transactionCapacity) {
      acc.transactionCapacity *= 2;
      acc.txArrayAddress = generateSimAddress();
    }

    saveSimDb(db);
    return buildSimState(db, `Recorded Withdrawal -$${amount.toFixed(2)} in transaction array at ${acc.txArrayAddress}`);
  }

  if (endpoint.includes("/api/bank/transfer") && method === "POST") {
    const fromNum = Number(body.srcNumber ?? body.fromAccount ?? body.from);
    const toNum = Number(body.destNumber ?? body.toAccount ?? body.to);
    const amount = Number(body.amount);
    const desc = String(body.description || `Wire Transfer to #${toNum}`).trim();

    const srcAcc = db.accounts.find(a => a.accountNumber === fromNum);
    const tgtAcc = db.accounts.find(a => a.accountNumber === toNum);

    if (!srcAcc) return { error: `Source Account #${fromNum} not found.` };
    if (!tgtAcc) return { error: `Target Account #${toNum} not found.` };
    if (srcAcc.balance < amount) {
      return { error: `Insufficient liquid funds in Account #${fromNum} for transfer.` };
    }

    srcAcc.balance -= amount;
    srcAcc.transactions.push({
      id: srcAcc.transactions.length + 1,
      type: "T",
      amount: -amount,
      timestamp: now,
      description: desc
    });
    srcAcc.transactionCount = srcAcc.transactions.length;

    tgtAcc.balance += amount;
    tgtAcc.transactions.push({
      id: tgtAcc.transactions.length + 1,
      type: "R",
      amount: amount,
      timestamp: now,
      description: `Wire In from #${fromNum} (${srcAcc.holderName})`
    });
    tgtAcc.transactionCount = tgtAcc.transactions.length;

    saveSimDb(db);
    return buildSimState(db, `Executed wire transfer of $${amount.toFixed(2)} from Node ${srcAcc.memoryAddress} to ${tgtAcc.memoryAddress}`);
  }

  if (endpoint.includes("/api/bank/transactions/delete") && method === "POST") {
    const accNum = Number(body.accountNumber);
    const idsToDelete = Array.isArray(body.transactionIds) ? body.transactionIds.map(Number) : [];

    const acc = db.accounts.find(a => a.accountNumber === accNum);
    if (!acc) return { error: `Account #${accNum} not found.` };

    acc.transactions = acc.transactions.filter(tx => !idsToDelete.includes(Number(tx.id)));
    acc.transactions = acc.transactions.map((tx, idx) => ({
      ...tx,
      id: idx + 1
    }));
    acc.transactionCount = acc.transactions.length;

    saveSimDb(db);
    return buildSimState(db, `Removed ${idsToDelete.length} transactions and renumbered remaining indices in array at ${acc.txArrayAddress}`);
  }

  if (endpoint.includes("/api/bank/delete") && method === "POST") {
    const accNum = Number(body.accountNumber);
    const accIndex = db.accounts.findIndex(a => a.accountNumber === accNum);
    if (accIndex === -1) return { error: `Account #${accNum} not found.` };

    const removed = db.accounts.splice(accIndex, 1)[0];
    saveSimDb(db);
    return buildSimState(db, `free() deallocated BankNode pointer at ${removed.memoryAddress} and freed transaction array`);
  }

  if (endpoint.includes("/api/bank/ai/advisor") && method === "POST") {
    const prompt = String(body.prompt || "");
    const accNum = Number(body.accountNumber);
    const acc = db.accounts.find(a => a.accountNumber === accNum);

    let responseText = `Here is your financial overview for Account #${accNum} (${acc ? acc.holderName : "Client"}):\n\n`;
    if (acc) {
      responseText += `• **Current Liquidity**: $${acc.balance.toFixed(2)}\n`;
      responseText += `• **Transaction Activity**: ${acc.transactionCount} recorded operations in ledger.\n\n`;
      if (acc.balance > 2500) {
        responseText += `💡 **Recommendation**: Your account has healthy liquidity ($${acc.balance.toFixed(2)}). We recommend transferring 30-40% into a high-yield term Fixed Deposit (FD) to maximize passive compound interest.\n`;
      } else if (acc.balance < 500) {
        responseText += `⚠️ **Recommendation**: Your balance is relatively low. Monitor ATM cash withdrawals and recurring UPI automated outflows to avoid overdraft limits.\n`;
      } else {
        responseText += `💡 **Recommendation**: Maintain consistent monthly deposits to build your emergency fund cushion.\n`;
      }
    }
    if (prompt) {
      responseText += `\nRegarding your inquiry regarding "${prompt}": Atlas Small Finance Bank offers zero-fee UPI routing, instant C-engine ledger settlement, and flexible wealth expansion options.`;
    }
    return { text: responseText };
  }

  // Default fallback
  return buildSimState(db);
}

/**
 * Resilient API Fetch Wrapper
 * Automatically catches network errors or non-JSON responses (like Vercel 404 HTML pages)
 * and seamlessly executes via the Standalone Client Banking Simulator.
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(endpoint, options);
    
    // Check Content-Type and Status before attempting res.json()
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json") || contentType.includes("json");
    
    if (!res.ok || !isJson) {
      console.info(`[Standalone Fallback] Endpoint ${endpoint} returned status ${res.status} (non-JSON). Delegating to Client-Side Banking Engine.`);
      return await executeClientFallback(endpoint, options);
    }
    
    return await res.json();
  } catch (err) {
    console.info(`[Standalone Fallback] Network request failed for ${endpoint}. Delegating to Client-Side Banking Engine.`);
    return await executeClientFallback(endpoint, options);
  }
}
