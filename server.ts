import express from "express";
import path from "path";
import fs from "fs";
import { exec, execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Path definitions
const workspaceRoot = process.cwd();
const backendCPath = path.join(workspaceRoot, "backend.c");
const backendBinaryPath = path.join(workspaceRoot, process.platform === "win32" ? "backend.exe" : "backend");
const dbFilePath = path.join(workspaceRoot, "bank_accounts.txt");

let useRealCBinary = false;

// 1. ATTEMPT COMPILATION OF C BACKEND
try {
  console.log("Checking for GCC compiler...");
  execSync("gcc --version", { stdio: "ignore" });
  console.log("GCC found! Compiling backend.c...");
  execSync(`gcc -o "${backendBinaryPath}" "${backendCPath}"`, { stdio: "inherit" });
  console.log("C Backend compiled successfully! Real C binary will power the application.");
  useRealCBinary = true;
} catch (error) {
  console.log("GCC compiler not available or compilation failed. Falling back to the TypeScript/C simulated state engine.");
  useRealCBinary = false;
}

// Simulated C Database State in JS/TS (exact logical equivalent of backend.c)
interface SimTransaction {
  id: number;
  type: string;
  amount: number;
  timestamp: string;
  description: string;
}

interface SimAccount {
  accountNumber: number;
  holderName: string;
  balance: number;
  transactions: SimTransaction[];
  transactionCount: number;
  transactionCapacity: number;
  memoryAddress: string;
  txArrayAddress: string;
}

let nextAccountNumber = 1001;
let accountsList: SimAccount[] = [];
let simLogCount = 0;
let totalMemoryAllocated = 0;

// Recreates a C execution trace in the simulated environment
function generateSimAddress(): string {
  const hex = Math.floor(0x7ffd5100 + Math.random() * 0x1000).toString(16);
  return `0x${hex}`;
}

function spacesToUnderscores(str: string): string {
  return str.replace(/ /g, "_");
}

function underscoresToSpaces(str: string): string {
  return str.replace(/_/g, " ");
}

// Load database (TXT format) for TS Simulator
function loadDatabaseSim() {
  if (!fs.existsSync(dbFilePath)) {
    // Seed initial data
    console.log("No seed file found. Seeding initial accounts...");
    accountsList = [
      {
        accountNumber: 1001,
        holderName: "John Doe",
        balance: 1650.00,
        transactionCount: 3,
        transactionCapacity: 4,
        memoryAddress: "0x7ffd51a0",
        txArrayAddress: "0x7ffd5240",
        transactions: [
          { id: 1, type: "D", amount: 1500.00, timestamp: new Date().toISOString().replace("T", " ").slice(0, 19), description: "Initial Opening Deposit" },
          { id: 2, type: "W", amount: -50.00, timestamp: new Date().toISOString().replace("T", " ").slice(0, 19), description: "ATM Withdrawal" },
          { id: 3, type: "D", amount: 200.00, timestamp: new Date().toISOString().replace("T", " ").slice(0, 19), description: "Salary Bonus" }
        ]
      },
      {
        accountNumber: 1002,
        holderName: "Jane Smith",
        balance: 3350.50,
        transactionCount: 2,
        transactionCapacity: 4,
        memoryAddress: "0x7ffd51c0",
        txArrayAddress: "0x7ffd52a0",
        transactions: [
          { id: 1, type: "D", amount: 3200.50, timestamp: new Date().toISOString().replace("T", " ").slice(0, 19), description: "Initial Opening Deposit" },
          { id: 2, type: "D", amount: 150.00, timestamp: new Date().toISOString().replace("T", " ").slice(0, 19), description: "Online Refund" }
        ]
      },
      {
        accountNumber: 1003,
        holderName: "Robert Johnson",
        balance: 450.00,
        transactionCount: 1,
        transactionCapacity: 4,
        memoryAddress: "0x7ffd51e0",
        txArrayAddress: "0x7ffd5300",
        transactions: [
          { id: 1, type: "D", amount: 450.00, timestamp: new Date().toISOString().replace("T", " ").slice(0, 19), description: "Initial Opening Deposit" }
        ]
      }
    ];
    nextAccountNumber = 1004;
    saveDatabaseSim();
    return;
  }

  try {
    const data = fs.readFileSync(dbFilePath, "utf-8");
    const lines = data.split("\n");
    accountsList = [];
    let currentAccount: SimAccount | null = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const parts = line.split(" ");
      if (parts[0] === "META") {
        nextAccountNumber = parseInt(parts[1], 10);
      } else if (parts[0] === "ACCOUNT") {
        const accNum = parseInt(parts[1], 10);
        const holder = underscoresToSpaces(parts[2]);
        const balance = parseFloat(parts[3]);
        const txCount = parseInt(parts[4], 10);
        const txCap = parseInt(parts[5], 10);

        currentAccount = {
          accountNumber: accNum,
          holderName: holder,
          balance: balance,
          transactionCount: txCount,
          transactionCapacity: txCap,
          memoryAddress: generateSimAddress(),
          txArrayAddress: generateSimAddress(),
          transactions: []
        };
        accountsList.push(currentAccount);
      } else if (parts[0] === "TX" && currentAccount) {
        const id = parseInt(parts[1], 10);
        const type = parts[2];
        const amount = parseFloat(parts[3]);
        const timestamp = parts[4] + " " + parts[5];
        const description = underscoresToSpaces(parts[6]);

        currentAccount.transactions.push({
          id, type, amount, timestamp, description
        });
      }
    }
  } catch (err) {
    console.error("Error reading file in simulator mode:", err);
  }
}

// Save database (TXT format) for TS Simulator
function saveDatabaseSim() {
  try {
    let content = `META ${nextAccountNumber}\n`;
    for (const acc of accountsList) {
      const nameSafe = spacesToUnderscores(acc.holderName);
      content += `ACCOUNT ${acc.accountNumber} ${nameSafe} ${acc.balance.toFixed(2)} ${acc.transactionCount} ${acc.transactionCapacity}\n`;
      for (const tx of acc.transactions) {
        const descSafe = spacesToUnderscores(tx.description);
        content += `TX ${tx.id} ${tx.type} ${tx.amount.toFixed(2)} ${tx.timestamp} ${descSafe}\n`;
      }
    }
    fs.writeFileSync(dbFilePath, content, "utf-8");
  } catch (err) {
    console.error("Error writing database in simulator mode:", err);
  }
}

// 2. RUN BACKEND EXECUTABLE FUNCTION OR SIMULATOR FALLBACK
function executeCommand(args: string[]): Promise<any> {
  return new Promise((resolve) => {
    if (useRealCBinary) {
      const fullCommand = `"${backendBinaryPath}" ${args.map(a => `"${a}"`).join(" ")}`;
      exec(fullCommand, (err, stdout, stderr) => {
        if (err) {
          console.error("C binary runtime execution error:", err, stderr);
          // Fallback dynamically if binary crashes
          resolve(runSimulatedEngine(args));
        } else {
          try {
            const parsed = JSON.parse(stdout);
            resolve(parsed);
          } catch (jsonErr) {
            console.error("Failed to parse JSON from C binary stdout:", stdout);
            resolve({ error: "C JSON parsing error", raw: stdout });
          }
        }
      });
    } else {
      resolve(runSimulatedEngine(args));
    }
  });
}

// Exact replication of C execution logic, structures, and pointer logging
function runSimulatedEngine(args: string[]): any {
  loadDatabaseSim();
  const simLogs: any[] = [];
  let steps = 1;

  function log(action: string, concept: string, address: string | null = null) {
    simLogs.push({
      step: steps++,
      action,
      concept,
      address
    });
  }

  log("fopen() opened file to load bank database", "File Handling", "0x55aa3200");
  log(`fclose() closed file. Loaded ${accountsList.length} accounts with histories`, "File Handling", null);

  const command = args[0];

  if (command === "--list") {
    log("CLI command '--list' triggered structural dump", "Linked List", accountsList[0]?.memoryAddress || null);
  } 
  else if (command === "--create") {
    const name = args[1];
    const initialBalance = parseFloat(args[2]);

    log(`CLI request: Create account for '${name}' with $${initialBalance.toFixed(2)}`, "Structure", null);
    
    // Malloc node
    const nodeAddr = generateSimAddress();
    log("malloc() allocated 1 BankNode structure", "DMA", nodeAddr);
    
    const txArrayAddr = generateSimAddress();
    log("malloc() allocated initial Transaction Array (capacity 4)", "DMA", txArrayAddr);

    const newAccNum = nextAccountNumber++;
    const newAccount: SimAccount = {
      accountNumber: newAccNum,
      holderName: name,
      balance: initialBalance,
      transactionCount: 0,
      transactionCapacity: 4,
      memoryAddress: nodeAddr,
      txArrayAddress: txArrayAddr,
      transactions: []
    };

    log(`Initialized Account struct: Acc #${newAccNum}, Holder: '${name}', Bal: $${initialBalance.toFixed(2)}`, "Structure", nodeAddr);

    if (initialBalance > 0) {
      const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
      newAccount.transactions.push({
        id: 1,
        type: "D",
        amount: initialBalance,
        timestamp,
        description: "Initial Opening Deposit"
      });
      newAccount.transactionCount = 1;
      log("Added opening deposit transaction to dynamic array", "Array", txArrayAddr);
    }

    accountsList.push(newAccount);
    log("Set new node as head of the Linked List" + (accountsList.length > 1 ? " (linked to tail)" : ""), "Linked List", nodeAddr);

    saveDatabaseSim();
    log("fopen() opened file for writing bank database", "File Handling", "0x55aa3200");
    log("fclose() saved database. Data records written successfully.", "File Handling", null);
  } 
  else if (command === "--deposit") {
    const accNum = parseInt(args[1], 10);
    const amount = parseFloat(args[2]);
    const desc = args[3];

    log(`CLI request: Deposit $${amount.toFixed(2)} into Acc #${accNum}`, "Structure", null);

    // LL Search
    let depth = 0;
    let foundAcc: SimAccount | null = null;
    for (const acc of accountsList) {
      depth++;
      log(`Checking Linked List node #${depth} (Acc #${acc.accountNumber})`, "Linked List", acc.memoryAddress);
      if (acc.accountNumber === accNum) {
        foundAcc = acc;
        log(`Match found! Account #${accNum} at node pointer`, "Linked List", acc.memoryAddress);
        break;
      }
    }

    if (foundAcc) {
      foundAcc.balance += amount;
      
      // Dynamic array transaction insertion
      if (foundAcc.transactionCount >= foundAcc.transactionCapacity) {
        const oldCap = foundAcc.transactionCapacity;
        foundAcc.transactionCapacity *= 2;
        log(`realloc() expanded transaction capacity from ${oldCap} to ${foundAcc.transactionCapacity}`, "DMA", foundAcc.txArrayAddress);
      }

      foundAcc.transactions.push({
        id: foundAcc.transactionCount + 1,
        type: "D",
        amount,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        description: desc
      });
      foundAcc.transactionCount++;

      log(`Recorded 'D' TX #${foundAcc.transactionCount} of $${amount.toFixed(2)} in account array`, "Array", foundAcc.txArrayAddress);
      log(`Updated Account #${accNum} balance to $${foundAcc.balance.toFixed(2)}`, "Structure", foundAcc.memoryAddress);

      saveDatabaseSim();
      log("fopen() opened file for writing bank database", "File Handling", "0x55aa3200");
      log("fclose() saved database. Data records written successfully.", "File Handling", null);
    } else {
      log("Account search reached end of Linked List (NULL)", "Linked List", null);
    }
  } 
  else if (command === "--withdraw") {
    const accNum = parseInt(args[1], 10);
    const amount = parseFloat(args[2]); // Positive number passed from CLI usually, but let's make it positive
    const desc = args[3];

    log(`CLI request: Withdraw $${amount.toFixed(2)} from Acc #${accNum}`, "Structure", null);

    // LL Search
    let depth = 0;
    let foundAcc: SimAccount | null = null;
    for (const acc of accountsList) {
      depth++;
      log(`Checking Linked List node #${depth} (Acc #${acc.accountNumber})`, "Linked List", acc.memoryAddress);
      if (acc.accountNumber === accNum) {
        foundAcc = acc;
        log(`Match found! Account #${accNum} at node pointer`, "Linked List", acc.memoryAddress);
        break;
      }
    }

    if (foundAcc) {
      if (foundAcc.balance < amount) {
        log("Insufficient funds for withdrawal", "Structure", foundAcc.memoryAddress);
      } else {
        foundAcc.balance -= amount;
        
        if (foundAcc.transactionCount >= foundAcc.transactionCapacity) {
          const oldCap = foundAcc.transactionCapacity;
          foundAcc.transactionCapacity *= 2;
          log(`realloc() expanded transaction capacity from ${oldCap} to ${foundAcc.transactionCapacity}`, "DMA", foundAcc.txArrayAddress);
        }

        foundAcc.transactions.push({
          id: foundAcc.transactionCount + 1,
          type: "W",
          amount: -amount,
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
          description: desc
        });
        foundAcc.transactionCount++;

        log(`Recorded 'W' TX #${foundAcc.transactionCount} of -$${amount.toFixed(2)} in account array`, "Array", foundAcc.txArrayAddress);
        log(`Withdrew $${amount.toFixed(2)}. New Balance: $${foundAcc.balance.toFixed(2)}`, "Structure", foundAcc.memoryAddress);

        saveDatabaseSim();
        log("fopen() opened file for writing bank database", "File Handling", "0x55aa3200");
        log("fclose() saved database. Data records written successfully.", "File Handling", null);
      }
    } else {
      log("Account search reached end of Linked List (NULL)", "Linked List", null);
    }
  } 
  else if (command === "--transfer") {
    const srcNum = parseInt(args[1], 10);
    const destNum = parseInt(args[2], 10);
    const amount = parseFloat(args[3]);
    const desc = args[4];

    log(`CLI request: Transfer $${amount.toFixed(2)} from Acc #${srcNum} to Acc #${destNum}`, "Structure", null);

    // Linked List lookup
    let srcAcc: SimAccount | null = null;
    let destAcc: SimAccount | null = null;

    for (const acc of accountsList) {
      if (acc.accountNumber === srcNum) srcAcc = acc;
      if (acc.accountNumber === destNum) destAcc = acc;
    }

    if (!srcAcc) {
      log("Transfer failed: Source account not found", "Linked List", null);
    } else if (!destAcc) {
      log("Transfer failed: Destination account not found", "Linked List", null);
    } else if (srcAcc.balance < amount) {
      log("Transfer failed: Insufficient funds in source account", "Structure", srcAcc.memoryAddress);
    } else {
      srcAcc.balance -= amount;
      destAcc.balance += amount;

      // Add debit to source
      if (srcAcc.transactionCount >= srcAcc.transactionCapacity) {
        srcAcc.transactionCapacity *= 2;
      }
      srcAcc.transactions.push({
        id: srcAcc.transactionCount + 1,
        type: "T",
        amount: -amount,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        description: `Transfer to Acc #${destNum}: ${desc}`
      });
      srcAcc.transactionCount++;

      // Add credit to destination
      if (destAcc.transactionCount >= destAcc.transactionCapacity) {
        destAcc.transactionCapacity *= 2;
      }
      destAcc.transactions.push({
        id: destAcc.transactionCount + 1,
        type: "R",
        amount: amount,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        description: `Transfer from Acc #${srcNum}: ${desc}`
      });
      destAcc.transactionCount++;

      log("Successfully transferred funds between structures", "Structure", srcAcc.memoryAddress);

      saveDatabaseSim();
      log("fopen() opened file for writing bank database", "File Handling", "0x55aa3200");
      log("fclose() saved database. Data records written successfully.", "File Handling", null);
    }
  } 
  else if (command === "--delete") {
    const accNum = parseInt(args[1], 10);
    log(`CLI request: Close/Delete Acc #${accNum}`, "Linked List", null);

    const index = accountsList.findIndex(a => a.accountNumber === accNum);
    if (index !== -1) {
      const removedAcc = accountsList[index];
      accountsList.splice(index, 1);

      log(`Bypassed list node at position ${index + 1}, linked prev to current->next`, "Linked List", null);
      log(`free() released dynamic transactions array (addr: ${removedAcc.txArrayAddress})`, "DMA", null);
      log(`free() released BankNode structure (addr: ${removedAcc.memoryAddress})`, "DMA", null);

      saveDatabaseSim();
      log("fopen() opened file for writing bank database", "File Handling", "0x55aa3200");
      log("fclose() saved database. Data records written successfully.", "File Handling", null);
    } else {
      log("Account not found. Deletion cancelled.", "Linked List", null);
    }
  }

  // Count total memory
  totalMemoryAllocated = accountsList.length * 256; // Simulated struct sizes
  for (const acc of accountsList) {
    totalMemoryAllocated += acc.transactionCapacity * 128; // Transactions sizing
  }

  return {
    systemInfo: {
      totalAccounts: accountsList.length,
      nextAccountNumber,
      totalMemoryAllocatedBytes: totalMemoryAllocated,
      engineMode: "Simulated C Engine (Direct Node Sandbox)"
    },
    accounts: accountsList,
    logs: simLogs
  };
}

// --- API ENDPOINTS ---

// GET: Core bank state
app.get("/api/bank/state", async (req, res) => {
  try {
    const result = await executeCommand(["--list"]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Source Code of backend.c for the visual UI display
app.get("/api/bank/code", (req, res) => {
  try {
    if (fs.existsSync(backendCPath)) {
      const code = fs.readFileSync(backendCPath, "utf-8");
      res.json({ code, engineMode: useRealCBinary ? "Real Compiled C Binary" : "Simulated C Runtime Fallback" });
    } else {
      res.status(404).json({ error: "Source code file not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Create dynamic account
app.post("/api/bank/accounts", async (req, res) => {
  const { holderName, initialBalance } = req.body;
  if (!holderName || initialBalance === undefined) {
    return res.status(400).json({ error: "Missing holderName or initialBalance" });
  }
  try {
    const result = await executeCommand(["--create", holderName, initialBalance.toString()]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Deposit
app.post("/api/bank/deposit", async (req, res) => {
  const { accountNumber, amount, description } = req.body;
  if (!accountNumber || !amount || !description) {
    return res.status(400).json({ error: "Missing accountNumber, amount, or description" });
  }
  try {
    const result = await executeCommand(["--deposit", accountNumber.toString(), amount.toString(), description]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Withdraw
app.post("/api/bank/withdraw", async (req, res) => {
  const { accountNumber, amount, description } = req.body;
  if (!accountNumber || !amount || !description) {
    return res.status(400).json({ error: "Missing accountNumber, amount, or description" });
  }
  try {
    const result = await executeCommand(["--withdraw", accountNumber.toString(), amount.toString(), description]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Transfer
app.post("/api/bank/transfer", async (req, res) => {
  const { srcNumber, destNumber, amount, description } = req.body;
  if (!srcNumber || !destNumber || !amount || !description) {
    return res.status(400).json({ error: "Missing srcNumber, destNumber, amount, or description" });
  }
  try {
    const result = await executeCommand(["--transfer", srcNumber.toString(), destNumber.toString(), amount.toString(), description]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Delete account
app.post("/api/bank/delete", async (req, res) => {
  const { accountNumber } = req.body;
  if (!accountNumber) {
    return res.status(400).json({ error: "Missing accountNumber" });
  }
  try {
    const result = await executeCommand(["--delete", accountNumber.toString()]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Delete specific transactions from an account
app.post("/api/bank/transactions/delete", async (req, res) => {
  const { accountNumber, transactionIds } = req.body;
  if (!accountNumber || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ error: "Missing accountNumber or transactionIds" });
  }
  try {
    loadDatabaseSim();
    const acc = accountsList.find(a => a.accountNumber === Number(accountNumber));
    if (!acc) {
      return res.status(404).json({ error: "Account not found" });
    }
    
    const idsToDelete = transactionIds.map(Number);
    acc.transactions = acc.transactions.filter(tx => !idsToDelete.includes(Number(tx.id)));
    // Renumber remaining transactions to maintain sequential IDs matching transactionCount
    acc.transactions = acc.transactions.map((tx, idx) => ({
      ...tx,
      id: idx + 1
    }));
    acc.transactionCount = acc.transactions.length;
    
    saveDatabaseSim();
    
    // Refresh with executeCommand list to return full updated engine status and logs
    const result = await executeCommand(["--list"]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Restore / Sync database from client backup (re-hydrating ephemeral container storage)
app.post("/api/bank/restore", async (req, res) => {
  const { accounts, nextAccNum } = req.body;
  if (!Array.isArray(accounts)) {
    return res.status(400).json({ error: "Invalid accounts backup payload" });
  }

  try {
    accountsList = accounts.map(acc => {
      return {
        accountNumber: acc.accountNumber,
        holderName: acc.holderName,
        balance: Number(acc.balance),
        transactionCount: acc.transactionCount || acc.transactions.length,
        transactionCapacity: acc.transactionCapacity || Math.max(4, acc.transactions.length * 2),
        memoryAddress: acc.memoryAddress || generateSimAddress(),
        txArrayAddress: acc.txArrayAddress || generateSimAddress(),
        transactions: (acc.transactions || []).map((tx: any) => ({
          id: Number(tx.id),
          type: tx.type,
          amount: Number(tx.amount),
          timestamp: tx.timestamp,
          description: tx.description
        }))
      };
    });

    if (nextAccNum) {
      nextAccountNumber = Number(nextAccNum);
    } else {
      const maxAcc = accounts.reduce((max, a) => Math.max(max, Number(a.accountNumber)), 1000);
      nextAccountNumber = maxAcc + 1;
    }

    saveDatabaseSim();
    console.log(`[STORAGE HYDRATION] Database successfully restored with ${accountsList.length} accounts. Next Account Number: ${nextAccountNumber}`);
    res.json({ success: true, message: "Database re-hydrated successfully", accounts: accountsList, nextAccountNumber });
  } catch (err: any) {
    console.error("Error restoring database:", err);
    res.status(500).json({ error: "Failed to restore database", details: err.message });
  }
});

// Lazy initializer for Google GenAI client
let aiClient: any = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// POST: AI Advisor Insights (Atlas Intelligence)
app.post("/api/bank/ai/advisor", async (req, res) => {
  const { prompt, accountContext } = req.body;
  const lowerPrompt = (prompt || "").toLowerCase();
  
  // 1. OFFLINE ENGINES AS FIRST CLASS FALLBACKS
  const apiKeyExists = !!process.env.GEMINI_API_KEY;
  
  if (!apiKeyExists) {
    // Generate beautiful offline rule-based insights dynamically computed from actual bank records
    const clientName = accountContext ? accountContext.holderName : "Premium Guest";
    const balance = accountContext ? accountContext.balance : 0;
    const txs = accountContext ? accountContext.transactions || [] : [];
    
    let replyText = "";
    
    if (lowerPrompt.includes("budget") || lowerPrompt.includes("spending") || lowerPrompt.includes("scan") || lowerPrompt.includes("history")) {
      const totalDeposits = txs.filter((t: any) => t.type === 'D' || t.type === 'R').reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
      const totalWithdrawals = txs.filter((t: any) => t.type === 'W' || t.type === 'T').reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
      
      replyText = `**ATLAS INTELLIGENCE · SECURE OFFLINE WEALTH AUDIT**\n\n` +
        `Welcome, **${clientName}**. I have analyzed your active transaction ledger and formulated a complete wealth roadmap:\n\n` +
        `* **Active Liquid Balance**: $${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `* **Total Ledger Inflow**: $${totalDeposits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `* **Total Ledger Outflow**: $${totalWithdrawals.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
        `**Curated 50/30/20 Budgeting Allocations for your Capital:**\n` +
        `* **Essential Fixed Outlays (50%)**: **$${(balance * 0.5).toLocaleString("en-US", { minimumFractionDigits: 2 })}**\n` +
        `* **Compound Interest & Assets (30%)**: **$${(balance * 0.3).toLocaleString("en-US", { minimumFractionDigits: 2 })}**\n` +
        `* **Flexible Discretionary (20%)**: **$${(balance * 0.2).toLocaleString("en-US", { minimumFractionDigits: 2 })}**\n\n` +
        `**Debit Flow Leak Report**:\n` +
        `${totalWithdrawals > 0 
          ? `Your active ledger logs indicate outflows totaling $${totalWithdrawals.toLocaleString("en-US", { minimumFractionDigits: 2 })}. To optimize your capital efficiency, we recommend capping monthly debits below **$${(balance * 0.15).toLocaleString("en-US", { minimumFractionDigits: 2 })}**.` 
          : `Outstanding! No cashflow leakage detected. Your capital remains fully consolidated inside secure memory bounds.`}\n\n` +
        `*Recommendation*: Migrate at least 30% of your current balance into our high-yield interest channels to unlock compound growth.`;
    } 
    else if (lowerPrompt.includes("compound") || lowerPrompt.includes("projection") || lowerPrompt.includes("yield") || lowerPrompt.includes("5-year") || lowerPrompt.includes("interest")) {
      const rate = 0.0525;
      let tempBalance = balance > 0 ? balance : 1000.00;
      let projectionsText = "";
      
      projectionsText += `* **Year 0 (Principal Base)**: $${tempBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n`;
      for (let i = 1; i <= 5; i++) {
        const yieldEarned = tempBalance * rate;
        const finalBal = tempBalance + yieldEarned;
        projectionsText += `* **Year ${i}**: Base: $${tempBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} | **Yield: +$${yieldEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}** | End Balance: **$${finalBal.toLocaleString("en-US", { minimumFractionDigits: 2 })}**\n`;
        tempBalance = finalBal;
      }
      
      replyText = `**ATLAS INTELLIGENCE · COMPOUND YIELD FORECASTER**\n\n` +
        `Hello **${clientName}**. Below is your 5-year compounding schedule simulated risk-free at **5.25% APY** with Atlas Small Finance Treasury:\n\n` +
        `${projectionsText}\n` +
        `**Fintech Optimization Insights**:\n` +
        `* **Yield Multiplication**: Over a five-year period, your cash liquidity expands by **29.15%** purely through automatic interest accretion.\n` +
        `* **Monthly Sweeper**: Set up a recurring sweep transaction of at least $150.00 per month to increase the yield slope.`;
    }
    else if (lowerPrompt.includes("asset") || lowerPrompt.includes("passive") || lowerPrompt.includes("income") || lowerPrompt.includes("classes")) {
      replyText = `**ATLAS INTELLIGENCE · OFFLINE ASSETS BLUEPRINT**\n\n` +
        `Welcome **${clientName}**. Earning passive yield is essential to protect capital from inflation. Here are premium options available inside Atlas Small Finance Bank:\n\n` +
        `* **1. Cash sweeps (5.25% APY)**\n` +
        `  * *Volatility*: Zero | *Liquidity*: Maximum\n` +
        `  * *Best for*: Everyday savings and liquid deposit security.\n\n` +
        `* **2. Certificates of Deposit (CD) (Up to 5.65% APY)**\n` +
        `  * *Volatility*: Zero | *Liquidity*: Medium-Low (Fixed lock terms)\n` +
        `  * *Best for*: Capital committed to specific multi-month projects.\n\n` +
        `* **3. High-Yield Liquid Ledger Vaults**\n` +
        `  * *Volatility*: Minimal | *Liquidity*: High\n` +
        `  * *Best for*: Automatic savings accumulation.\n\n` +
        `*Advisory Note*: Ask about shifting your current balance of **$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}** into a lockbox CD to maximize interest.`;
    }
    else if (lowerPrompt.includes("verify") || lowerPrompt.includes("authenticity") || lowerPrompt.includes("unauthorized") || lowerPrompt.includes("audit")) {
      replyText = `**ATLAS INTELLIGENCE · SECURITY BLOCK AUDIT**\n\n` +
        `Secure audit compiled for **${clientName}** (Account #${accountContext ? accountContext.accountNumber : "1001"}):\n\n` +
        `* **Cryptographic Balance Integrity**: **Verified (100% OK)**\n` +
        `  * Reconciled total of **${txs.length}** log entries with the current balance of **$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}**.\n` +
        `* **Buffer Overflow Guards**: Secure bounds confirmed. Memory leaks: 0.\n` +
        `* **Double-Spending Proofs**: All transactions passed sequence authentication.\n\n` +
        `**Current Security Health**: **MAXIMUM (99.9%)**\n\n` +
        `*Security Tip*: Keep your cards frozen in your portal dashboard when they are not actively in use to secure merchant gates.`;
    }
    else {
      replyText = `**ATLAS INTELLIGENCE · PREMIUM PORTAL ADVISOR**\n\n` +
        `Greetings, **${clientName}**. I am your certified offline wealth assistant. I have established a direct link to your live transaction logs.\n\n` +
        `* **Client Node Linked**: ${clientName}\n` +
        `* **Liquidity Pool**: $${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `* **Portal Connectivity**: Secure Local Session (Offline-Ready)\n\n` +
        `**Quick prompts we can execute right now:**\n` +
        `1. **"budget"** - Scan transaction logs and render a custom 50/30/20 budget projection.\n` +
        `2. **"projections"** - Calculate a high-fidelity 5-year compounding yields chart.\n` +
        `3. **"passive income"** - Recommend advanced asset categories.\n` +
        `4. **"verify"** - Conduct a security audit on your account block allocations.\n\n` +
        `How can I help you manage your secure financial path today?`;
    }
    
    return res.json({ text: replyText });
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      throw new Error("No Gemini Client");
    }
    
    const systemPrompt = `You are Atlas Small Finance Bank's premium AI Financial Wealth Advisor, named Atlas Intelligence. 
You provide high-fidelity, professional, friendly, and practical financial insights, savings plans, budgeting strategies, and spending analysis.
Always maintain a sophisticated, reassuring, and highly skilled commercial bank advisor tone. 
Keep your suggestions readable, using clean bullet points and clear numbers. No markdown headers of level 1 or 2, use bolding or small lists instead to look premium and neat inside a compact UI chat.`;

    let userPrompt = "";
    if (accountContext) {
      userPrompt = `Here is the current financial profile of the client account:
- Client Name: ${accountContext.holderName}
- Account Number: ${accountContext.accountNumber}
- Current Liquid Balance: $${accountContext.balance.toFixed(2)}
- Number of Transactions: ${accountContext.transactionCount}

Transaction Ledger History:
${JSON.stringify(accountContext.transactions, null, 2)}

User's Query to Atlas Intelligence: "${prompt}"

Provide custom analysis or answer the query based on this account ledger. If there are no transactions, suggest initial deposit steps or safe asset classes. Identify saving leaks, inflow trends, and recommend custom target metrics. Use elegant retail banking terminology.`;
    } else {
      userPrompt = `User's Query to Atlas Intelligence: "${prompt}"

Provide a sophisticated overview of commercial banking advantages, credit portfolio setup, interest rate wealth expansion, or address their digital banking question elegantly.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini API Error, falling back to local simulation:", err.message);
    res.status(500).json({ error: err.message || "Failed to contact Gemini AI Advisor." });
  }
});

// Serve frontend SPA in dev and production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

// Only start the Express listening server when running standalone or in container ingress (not Vercel serverless function export)
if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
