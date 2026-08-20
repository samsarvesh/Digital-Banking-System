#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define FILE_NAME "bank_accounts.txt"
#define MAX_LOGS 150

// --- STRUCTURE CONCEPTS ---

// Concept: Structure for Transactions
typedef struct {
    int id;
    char type; // 'D' = Deposit, 'W' = Withdrawal, 'T' = Transfer Out, 'R' = Transfer In (Received)
    double amount;
    char timestamp[30];
    char description[100];
} Transaction;

// Concept: Structure for Bank Account
typedef struct {
    int accountNumber;
    char holderName[100];
    double balance;
    Transaction* transactions; // Concept: DMA & Dynamic Array
    int transactionCount;
    int transactionCapacity;
} Account;

// Concept: Structure for Linked List Node
typedef struct BankNode {
    Account account;           // Nested structure
    struct BankNode* next;     // Self-referential pointer for Linked List
} BankNode;

// Execution Log structure to send memory-operation traces to the React frontend
typedef struct {
    char action[256];
    char concept[64]; // "Linked List", "DMA", "Array", "File Handling", "Structure"
    unsigned long address; // Memory address (hex value parsed as integer)
} ExecLog;

// Global state
BankNode* head = NULL;
int nextAccountNumber = 1001;
ExecLog logs[MAX_LOGS];
int logCount = 0;
double totalMemoryAllocated = 0;

// --- UTILITY FUNCTIONS ---

// Record execution traces to demonstrate C concepts dynamically
void add_log(const char* action, const char* concept, void* ptr) {
    if (logCount < MAX_LOGS) {
        snprintf(logs[logCount].action, sizeof(logs[logCount].action), "%s", action);
        snprintf(logs[logCount].concept, sizeof(logs[logCount].concept), "%s", concept);
        logs[logCount].address = (unsigned long)ptr;
        logCount++;
    }
}

// Format current timestamp
void get_current_time_str(char* buffer, int max_len) {
    time_t rawtime;
    struct tm* timeinfo;
    time(&rawtime);
    timeinfo = localtime(&rawtime);
    strftime(buffer, max_len, "%Y-%m-%d %H:%M:%S", timeinfo);
}

// Convert spaces to underscores for easy file parsing
void spaces_to_underscores(char* str) {
    for (int i = 0; str[i] != '\0'; i++) {
        if (str[i] == ' ') {
            str[i] = '_';
        }
    }
}

// Convert underscores back to spaces
void underscores_to_spaces(char* str) {
    for (int i = 0; str[i] != '\0'; i++) {
        if (str[i] == '_') {
            str[i] = ' ';
        }
    }
}

// --- CORE BANKING SYSTEM OPERATIONS ---

// Concept: Linked List Insertion & DMA
BankNode* create_account_node(const char* name, double initial_balance) {
    // 1. Allocate node using DMA
    BankNode* newNode = (BankNode*)malloc(sizeof(BankNode));
    if (newNode == NULL) {
        add_log("Failed memory allocation for BankNode", "DMA", NULL);
        return NULL;
    }
    totalMemoryAllocated += sizeof(BankNode);
    add_log("malloc() allocated 1 BankNode structure", "DMA", newNode);

    // 2. Initialize account structure inside node (Concept: Structure)
    newNode->account.accountNumber = nextAccountNumber++;
    snprintf(newNode->account.holderName, sizeof(newNode->account.holderName), "%s", name);
    newNode->account.balance = initial_balance;
    
    // 3. Dynamic array of transactions (Concept: DMA & Array)
    newNode->account.transactionCapacity = 4; // Start capacity of 4
    newNode->account.transactionCount = 0;
    newNode->account.transactions = (Transaction*)malloc(newNode->account.transactionCapacity * sizeof(Transaction));
    if (newNode->account.transactions == NULL) {
        add_log("Failed memory allocation for Transaction Array", "DMA", NULL);
        free(newNode);
        return NULL;
    }
    totalMemoryAllocated += newNode->account.transactionCapacity * sizeof(Transaction);
    add_log("malloc() allocated initial Transaction Array (capacity 4)", "DMA", newNode->account.transactions);

    newNode->next = NULL;

    // 4. Record details in structural logs
    char actionBuf[256];
    snprintf(actionBuf, sizeof(actionBuf), "Initialized Account struct: Acc #%d, Holder: '%s', Bal: $%.2f", 
             newNode->account.accountNumber, newNode->account.holderName, newNode->account.balance);
    add_log(actionBuf, "Structure", &(newNode->account));

    // 5. Add initial opening deposit transaction if balance > 0
    if (initial_balance > 0) {
        Transaction tx;
        tx.id = 1;
        tx.type = 'D';
        tx.amount = initial_balance;
        get_current_time_str(tx.timestamp, sizeof(tx.timestamp));
        snprintf(tx.description, sizeof(tx.description), "Initial Opening Deposit");

        newNode->account.transactions[0] = tx;
        newNode->account.transactionCount = 1;
        add_log("Added opening deposit transaction to dynamic array", "Array", &(newNode->account.transactions[0]));
    }

    return newNode;
}

// Add a transaction to an existing account (Concept: Dynamic Array Resizing & DMA)
void add_transaction(Account* acc, char type, double amount, const char* desc) {
    // If dynamic array is full, double its capacity (Concept: DMA & Array)
    if (acc->transactionCount >= acc->transactionCapacity) {
        int oldCapacity = acc->transactionCapacity;
        acc->transactionCapacity *= 2;
        Transaction* temp = (Transaction*)realloc(acc->transactions, acc->transactionCapacity * sizeof(Transaction));
        if (temp == NULL) {
            add_log("Failed to reallocate transaction history array", "DMA", NULL);
            return;
        }
        acc->transactions = temp;
        totalMemoryAllocated += (acc->transactionCapacity - oldCapacity) * sizeof(Transaction);
        
        char actionBuf[128];
        snprintf(actionBuf, sizeof(actionBuf), "realloc() expanded transaction capacity from %d to %d", oldCapacity, acc->transactionCapacity);
        add_log(actionBuf, "DMA", acc->transactions);
    }

    // Set structure fields (Concept: Structure & Array index)
    Transaction tx;
    tx.id = acc->transactionCount + 1;
    tx.type = type;
    tx.amount = amount;
    get_current_time_str(tx.timestamp, sizeof(tx.timestamp));
    snprintf(tx.description, sizeof(tx.description), "%s", desc);

    acc->transactions[acc->transactionCount] = tx;
    acc->transactionCount++;

    char actionBuf[256];
    snprintf(actionBuf, sizeof(actionBuf), "Recorded '%c' TX #%d of $%.2f in account array", type, tx.id, amount);
    add_log(actionBuf, "Array", &(acc->transactions[acc->transactionCount - 1]));
}

// Concept: Linked List Traversal
BankNode* find_account(int accNum) {
    BankNode* current = head;
    int depth = 0;
    while (current != NULL) {
        depth++;
        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "Checking Linked List node #%d (Acc #%d)", depth, current->account.accountNumber);
        add_log(actBuf, "Linked List", current);

        if (current->account.accountNumber == accNum) {
            snprintf(actBuf, sizeof(actBuf), "Match found! Account #%d at node pointer", accNum);
            add_log(actBuf, "Linked List", current);
            return current;
        }
        current = current->next;
    }
    add_log("Account search reached end of Linked List (NULL)", "Linked List", NULL);
    return NULL;
}

// Insert account node to the Linked List (Concept: Linked List Manipulation)
void insert_account(BankNode* node) {
    if (head == NULL) {
        head = node;
        add_log("Set new node as head of the Linked List", "Linked List", head);
    } else {
        BankNode* current = head;
        while (current->next != NULL) {
            current = current->next;
        }
        current->next = node;
        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "Linked next pointer of node %d to new node", current->account.accountNumber);
        add_log(actBuf, "Linked List", current);
    }
}

// Close/Delete account node from the Linked List (Concept: Linked List deletion, DMA freeing)
int delete_account(int accNum) {
    BankNode* current = head;
    BankNode* prev = NULL;
    int position = 1;

    while (current != NULL && current->account.accountNumber != accNum) {
        prev = current;
        current = current->next;
        position++;
    }

    if (current == NULL) {
        add_log("Account not found. Deletion cancelled.", "Linked List", NULL);
        return 0; // Not found
    }

    // Found the node. Unlink it.
    if (prev == NULL) {
        // Deleting the head node
        head = current->next;
        add_log("Removed head node. Reset list head to head->next", "Linked List", head);
    } else {
        prev->next = current->next;
        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "Bypassed list node at position %d, linked prev to current->next", position);
        add_log(actBuf, "Linked List", prev);
    }

    // Free the dynamic memory (Concept: DMA Freeing)
    // First, free the transaction array inside the account structure
    unsigned long txAddr = (unsigned long)current->account.transactions;
    free(current->account.transactions);
    totalMemoryAllocated -= current->account.transactionCapacity * sizeof(Transaction);
    char actBuf[128];
    snprintf(actBuf, sizeof(actBuf), "free() released dynamic transactions array (addr: 0x%lx)", txAddr);
    add_log(actBuf, "DMA", NULL);

    // Second, free the node itself
    unsigned long nodeAddr = (unsigned long)current;
    free(current);
    totalMemoryAllocated -= sizeof(BankNode);
    snprintf(actBuf, sizeof(actBuf), "free() released BankNode structure (addr: 0x%lx)", nodeAddr);
    add_log(actBuf, "DMA", NULL);

    return 1; // Success
}

// Deposit function
int make_deposit(int accNum, double amount, const char* desc) {
    BankNode* node = find_account(accNum);
    if (node == NULL) return 0;

    node->account.balance += amount;
    add_transaction(&(node->account), 'D', amount, desc);
    
    char actBuf[128];
    snprintf(actBuf, sizeof(actBuf), "Updated Account #%d balance to $%.2f", accNum, node->account.balance);
    add_log(actBuf, "Structure", &(node->account));
    return 1;
}

// Withdrawal function
int make_withdrawal(int accNum, double amount, const char* desc) {
    BankNode* node = find_account(accNum);
    if (node == NULL) return 0;

    if (node->account.balance < amount) {
        add_log("Insufficient funds for withdrawal", "Structure", &(node->account));
        return -1; // Insufficient funds
    }

    node->account.balance -= amount;
    add_transaction(&(node->account), 'W', -amount, desc);

    char actBuf[128];
    snprintf(actBuf, sizeof(actBuf), "Withdrew $%.2f. New Balance: $%.2f", amount, node->account.balance);
    add_log(actBuf, "Structure", &(node->account));
    return 1;
}

// Transfer function (concept: structure updating, multi-account interactions)
int make_transfer(int srcNum, int destNum, double amount, const char* desc) {
    if (srcNum == destNum) {
        add_log("Source and destination accounts are the same", "Structure", NULL);
        return -2;
    }

    BankNode* srcNode = find_account(srcNum);
    BankNode* destNode = find_account(destNum);

    if (srcNode == NULL) {
        add_log("Transfer failed: Source account not found", "Linked List", NULL);
        return 0; // Source not found
    }
    if (destNode == NULL) {
        add_log("Transfer failed: Destination account not found", "Linked List", NULL);
        return -1; // Destination not found
    }

    if (srcNode->account.balance < amount) {
        add_log("Transfer failed: Insufficient funds in source account", "Structure", &(srcNode->account));
        return -3; // Insufficient funds
    }

    // Debit source
    srcNode->account.balance -= amount;
    char srcDesc[150];
    snprintf(srcDesc, sizeof(srcDesc), "Transfer to Acc #%d: %s", destNum, desc);
    add_transaction(&(srcNode->account), 'T', -amount, srcDesc);

    // Credit destination
    destNode->account.balance += amount;
    char destDesc[150];
    snprintf(destDesc, sizeof(destDesc), "Transfer from Acc #%d: %s", srcNum, desc);
    add_transaction(&(destNode->account), 'R', amount, destDesc);

    add_log("Successfully transferred funds between structures", "Structure", srcNode);
    return 1; // Success
}

// --- FILE HANDLING CONCEPTS ---

// Save database to file (Concept: File Writing)
int save_to_file() {
    FILE* file = fopen(FILE_NAME, "w");
    if (file == NULL) {
        add_log("Error opening data file for saving", "File Handling", NULL);
        return 0;
    }
    add_log("fopen() opened file for writing bank database", "File Handling", file);

    // Save metadata
    fprintf(file, "META %d\n", nextAccountNumber);

    BankNode* current = head;
    int accSavedCount = 0;
    while (current != NULL) {
        char nameCopy[100];
        snprintf(nameCopy, sizeof(nameCopy), "%s", current->account.holderName);
        spaces_to_underscores(nameCopy); // Standard C parsing safeguard

        // Write Account header: ACCOUNT <num> <name> <balance> <txCount> <txCap>
        fprintf(file, "ACCOUNT %d %s %.2f %d %d\n", 
                current->account.accountNumber, 
                nameCopy, 
                current->account.balance, 
                current->account.transactionCount,
                current->account.transactionCapacity);
        
        // Write all transactions
        for (int i = 0; i < current->account.transactionCount; i++) {
            Transaction tx = current->account.transactions[i];
            char descCopy[120];
            snprintf(descCopy, sizeof(descCopy), "%s", tx.description);
            spaces_to_underscores(descCopy);

            // Write Tx: TX <id> <type> <amount> <timestamp> <desc>
            fprintf(file, "TX %d %c %.2f %s %s\n", 
                    tx.id, tx.type, tx.amount, tx.timestamp, descCopy);
        }
        
        accSavedCount++;
        current = current->next;
    }

    fclose(file);
    add_log("fclose() saved database. Data records written successfully.", "File Handling", NULL);
    return 1;
}

// Load database from file (Concept: File Reading & Reconstruction)
int load_from_file() {
    FILE* file = fopen(FILE_NAME, "r");
    if (file == NULL) {
        add_log("fopen() failed: File does not exist. Creating fresh database.", "File Handling", NULL);
        return 0;
    }
    add_log("fopen() opened file to load bank database", "File Handling", file);

    char type[32];
    int loadedAccounts = 0;

    // Clear existing list if loaded before (cleanup)
    while (head != NULL) {
        delete_account(head->account.accountNumber);
    }
    
    // Read Meta or Header lines
    while (fscanf(file, "%31s", type) != EOF) {
        if (strcmp(type, "META") == 0) {
            fscanf(file, "%d", &nextAccountNumber);
        } else if (strcmp(type, "ACCOUNT") == 0) {
            // Read account line
            int accNum, txCount, txCap;
            char holder[100];
            double balance;
            
            fscanf(file, "%d %99s %lf %d %d", &accNum, holder, &balance, &txCount, &txCap);
            underscores_to_spaces(holder);

            // Reconstruct in-memory structures (DMA)
            BankNode* node = (BankNode*)malloc(sizeof(BankNode));
            if (node == NULL) {
                fclose(file);
                return 0;
            }
            totalMemoryAllocated += sizeof(BankNode);

            node->account.accountNumber = accNum;
            snprintf(node->account.holderName, sizeof(node->account.holderName), "%s", holder);
            node->account.balance = balance;
            node->account.transactionCount = txCount;
            node->account.transactionCapacity = txCap;
            node->account.transactions = (Transaction*)malloc(txCap * sizeof(Transaction));
            totalMemoryAllocated += txCap * sizeof(Transaction);
            node->next = NULL;

            // Load all transactions for this account
            for (int i = 0; i < txCount; i++) {
                char txHeader[10];
                int txId;
                char txType;
                double txAmt;
                char txTime[30];
                char txDesc[100];
                char timeBuffer[20];
                
                // Read next TX line: TX <id> <type> <amount> <time1> <time2> <desc>
                fscanf(file, "%9s %d %c %lf", txHeader, &txId, &txType, &txAmt);
                // Timestamps might have spaces or we combine them
                fscanf(file, "%s %s %99s", txTime, timeBuffer, txDesc);
                strcat(txTime, " ");
                strcat(txTime, timeBuffer);

                underscores_to_spaces(txDesc);

                Transaction t;
                t.id = txId;
                t.type = txType;
                t.amount = txAmt;
                snprintf(t.timestamp, sizeof(t.timestamp), "%s", txTime);
                snprintf(t.description, sizeof(t.description), "%s", txDesc);

                node->account.transactions[i] = t;
            }

            insert_account(node);
            loadedAccounts++;
        }
    }

    fclose(file);
    
    char actBuf[128];
    snprintf(actBuf, sizeof(actBuf), "fclose() closed file. Loaded %d accounts with transaction histories", loadedAccounts);
    add_log(actBuf, "File Handling", NULL);
    return 1;
}

// Clean up entire memory (for complete shutdown/reloads)
void cleanup_all_memory() {
    BankNode* current = head;
    while (current != NULL) {
        BankNode* temp = current;
        current = current->next;
        free(temp->account.transactions);
        free(temp);
    }
    head = NULL;
}

// Helper to convert accounts database to JSON output
void print_json_output() {
    printf("{\n");
    printf("  \"systemInfo\": {\n");
    printf("    \"totalAccounts\": %d,\n", nextAccountNumber - 1001), // Approximate or accurate
    printf("    \"nextAccountNumber\": %d,\n", nextAccountNumber);
    printf("    \"totalMemoryAllocatedBytes\": %.0f\n", totalMemoryAllocated);
    printf("  },\n");
    
    // Output Accounts
    printf("  \"accounts\": [\n");
    BankNode* current = head;
    while (current != NULL) {
        printf("    {\n");
        printf("      \"accountNumber\": %d,\n", current->account.accountNumber);
        printf("      \"holderName\": \"%s\",\n", current->account.holderName);
        printf("      \"balance\": %.2f,\n", current->account.balance);
        printf("      \"memoryAddress\": \"0x%lx\",\n", (unsigned long)current);
        printf("      \"txArrayAddress\": \"0x%lx\",\n", (unsigned long)current->account.transactions);
        printf("      \"transactionCount\": %d,\n", current->account.transactionCount);
        printf("      \"transactionCapacity\": %d,\n", current->account.transactionCapacity);
        
        printf("      \"transactions\": [\n");
        for (int i = 0; i < current->account.transactionCount; i++) {
            Transaction tx = current->account.transactions[i];
            printf("        {\n");
            printf("          \"id\": %d,\n", tx.id);
            printf("          \"type\": \"%c\",\n", tx.type);
            printf("          \"amount\": %.2f,\n", tx.amount);
            printf("          \"timestamp\": \"%s\",\n", tx.timestamp);
            printf("          \"description\": \"%s\"\n", tx.description);
            if (i == current->account.transactionCount - 1) {
                printf("        }\n");
            } else {
                printf("        },\n");
            }
        }
        printf("      ]\n");

        if (current->next == NULL) {
            printf("    }\n");
        } else {
            printf("    },\n");
        }
        current = current->next;
    }
    printf("  ],\n");

    // Output dynamic execution logs
    printf("  \"logs\": [\n");
    for (int i = 0; i < logCount; i++) {
        printf("    {\n");
        printf("      \"step\": %d,\n", i + 1);
        printf("      \"action\": \"%s\",\n", logs[i].action);
        printf("      \"concept\": \"%s\",\n", logs[i].concept);
        if (logs[i].address != 0) {
            printf("      \"address\": \"0x%lx\"\n", logs[i].address);
        } else {
            printf("      \"address\": null\n");
        }
        if (i == logCount - 1) {
            printf("    }\n");
        } else {
            printf("    },\n");
        }
    }
    printf("  ]\n");
    printf("}\n");
}

// Seed mock bank data if there are no files
void seed_initial_data() {
    add_log("No file data found. Auto-seeding initial banking records...", "File Handling", NULL);
    
    BankNode* a1 = create_account_node("John Doe", 1500.00);
    insert_account(a1);
    add_transaction(&(a1->account), 'W', -50.00, "ATM Withdrawal");
    add_transaction(&(a1->account), 'D', 200.00, "Salary Bonus");

    BankNode* a2 = create_account_node("Jane Smith", 3200.50);
    insert_account(a2);
    add_transaction(&(a2->account), 'D', 150.00, "Online Refund");

    BankNode* a3 = create_account_node("Robert Johnson", 450.00);
    insert_account(a3);
    
    save_to_file();
}

// --- MAIN FUNCTION ---

int main(int argc, char* argv[]) {
    // Standard initialization: Load existing files first (Concept: File handling & Linked List population)
    int loaded = load_from_file();
    if (!loaded) {
        seed_initial_data();
    }

    if (argc < 2) {
        // Just print current state if no arguments
        print_json_output();
        cleanup_all_memory();
        return 0;
    }

    // Command Dispatcher
    const char* command = argv[1];

    if (strcmp(command, "--list") == 0) {
        add_log("CLI command '--list' triggered structural dump", "Linked List", head);
    } 
    else if (strcmp(command, "--create") == 0 && argc >= 4) {
        const char* name = argv[2];
        double init_bal = atof(argv[3]);
        
        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "CLI request: Create account for '%s' with $%.2f", name, init_bal);
        add_log(actBuf, "Structure", NULL);

        BankNode* newNode = create_account_node(name, init_bal);
        if (newNode != NULL) {
            insert_account(newNode);
            save_to_file();
        }
    } 
    else if (strcmp(command, "--deposit") == 0 && argc >= 5) {
        int accNum = atoi(argv[2]);
        double amt = atof(argv[3]);
        const char* desc = argv[4];

        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "CLI request: Deposit $%.2f into Acc #%d", amt, accNum);
        add_log(actBuf, "Structure", NULL);

        if (make_deposit(accNum, amt, desc)) {
            save_to_file();
        }
    } 
    else if (strcmp(command, "--withdraw") == 0 && argc >= 5) {
        int accNum = atoi(argv[2]);
        double amt = atof(argv[3]);
        const char* desc = argv[4];

        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "CLI request: Withdraw $%.2f from Acc #%d", amt, accNum);
        add_log(actBuf, "Structure", NULL);

        if (make_withdrawal(accNum, amt, desc) == 1) {
            save_to_file();
        }
    } 
    else if (strcmp(command, "--transfer") == 0 && argc >= 6) {
        int srcNum = atoi(argv[2]);
        int destNum = atoi(argv[3]);
        double amt = atof(argv[4]);
        const char* desc = argv[5];

        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "CLI request: Transfer $%.2f from Acc #%d to Acc #%d", amt, srcNum, destNum);
        add_log(actBuf, "Structure", NULL);

        if (make_transfer(srcNum, destNum, amt, desc) == 1) {
            save_to_file();
        }
    } 
    else if (strcmp(command, "--delete") == 0 && argc >= 3) {
        int accNum = atoi(argv[2]);

        char actBuf[128];
        snprintf(actBuf, sizeof(actBuf), "CLI request: Close/Delete Acc #%d", accNum);
        add_log(actBuf, "Linked List", NULL);

        if (delete_account(accNum)) {
            save_to_file();
        }
    }

    // Output full JSON state
    print_json_output();

    // Clean up dynamic memory at program exit (Concept: DMA Freeing)
    cleanup_all_memory();
    return 0;
}
