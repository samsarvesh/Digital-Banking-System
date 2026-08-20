# 🏛️ Digital Banking System — Full-Stack C & React Portal

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![C Language](https://img.shields.io/badge/C_Language-A8B9CC?style=for-the-badge&logo=c&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google_Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)

**An interactive digital banking portal driven by a low-level C-programming engine, bridging data structures, linked lists, dynamic memory allocation, and file handling with a reactive modern web UI.**

</div>

---

## 🌟 Overview

The **Digital Banking System** is an educational and production-grade full-stack application designed to showcase how low-level systems programming (C) can seamlessly power a high-performance modern web interface (React + Tailwind CSS). 

Unlike standard CRUD web apps, core banking logic—such as account creation, ledger serialization, dynamic transaction arrays, and account closures—is driven by a real C backend engine (`backend.c`). It features memory pointer visualization, immediate `free()` call simulations, file-based I/O persistence, automated UPI payment scheduling, and an integrated **Google Gemini AI Financial Advisor**.

---

## ✨ Key Features

### 💻 Low-Level Systems Engine (C Programming)
- **Linked Lists (`BankNode`)**: Dynamic memory allocation using `malloc()` and `free()` to link accounts sequentially without fixed memory ceilings.
- **Dynamic Array Growth**: Transaction history logs scale automatically using `realloc()` as user activity expands.
- **Persistent File I/O**: Real-time disk serialization to `bank_accounts.txt` reading and writing structured ledger entries with custom `TX` headers.
- **Memory & Pointer Console**: Watch memory addresses, pointer dereferences, and low-level CLI command executions (`--create`, `--deposit`, `--withdraw`, `--transfer`, `--delete`) in real time.

### 🏦 Comprehensive Banking Operations
- **Account Management**: Open checking/savings accounts with custom initial deposits and close accounts with instant pointer deallocation.
- **Instant Transfers & Ledgers**: Perform intra-bank deposits, withdrawals, and inter-account transfers with immediate sequential ledger logging.
- **Bulk Ledger Operations**: Select individual or batch transaction entries for bulk deletion with automatic ID renumbering.
- **Scheduled UPI Payments**: Set up future-dated UPI outward transfers with frequency rules (`once`, `daily`, `weekly`, `monthly`) and automated recurring execution.

### 🤖 AI Financial Advisor (Powered by Google Gemini)
- **Smart Budgeting**: Personalized financial recommendations based on real-time transaction history and account liquidity.
- **Anomalous Spending Detection**: Instant analytical feedback on large withdrawals or unusual outflow frequency.
- **Interactive Chat**: Ask complex financial questions directly within the banking portal.

---

## 🏗️ Architecture & Core Structures

The application communicates via an **Express.js API Bridge** (`server.ts`) that spawns child processes to execute C binaries or dynamically falls back to a mirrored TypeScript state engine when GCC is unavailable.

### C Data Structure Definitions (`backend.c`)
```c
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
    Transaction* transactions; // Dynamically allocated array (malloc / realloc)
    int transactionCount;
    int transactionCapacity;
} Account;

typedef struct BankNode {
    Account account;
    struct BankNode* next;     // Linked list pointer to next account node
} BankNode;
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **GCC Compiler** *(Optional, for native C execution. The app includes an automatic TypeScript simulated state engine if GCC is not detected in the host environment).*

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/digital-banking-system.git
   cd digital-banking-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will boot up at `http://localhost:3000`.

---

## 📂 Project Structure

```text
├── backend.c              # Core C engine (Linked lists, file I/O, memory allocation)
├── server.ts              # Express API server & C-binary execution bridge
├── bank_accounts.txt      # Persistent file storage for account ledgers & transactions
├── src/
│   ├── App.tsx            # Primary interactive banking portal UI & state handlers
│   ├── main.tsx           # React DOM entry point & error boundary configuration
│   ├── types.ts           # Shared TypeScript interfaces for accounts & UI states
│   └── index.css          # Tailwind CSS styling & custom utility definitions
├── vite.config.ts         # Vite bundling & plugin setup
└── package.json           # Project scripts & npm dependencies
```

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend Bridge**: Node.js, Express.js, TSX
- **Systems Core**: Standard C Library (`stdio.h`, `stdlib.h`, `string.h`)
- **AI Integration**: Google GenAI SDK (`@google/genai`)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
