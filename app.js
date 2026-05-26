// Compiler Components Instantiations
const lexer = new Lexer();
const semanticAnalyzer = new SemanticAnalyzer();
const interpreter = new Interpreter();

// DOM Elements
const codeEditor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const lineCount = document.getElementById('lineCount');
const tokenTableBody = document.getElementById('tokenTableBody');
const symbolTableBody = document.getElementById('symbolTableBody');
const terminalConsole = document.getElementById('terminalConsole');
const astTreeContainer = document.getElementById('astTreeContainer');
const errorConsole = document.getElementById('errorConsole');
const errorCount = document.getElementById('errorCount');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const rightPanelBadge = document.getElementById('rightPanelBadge');

// State Storage
let tokenList = [];
let symbolList = [];

/* ====================================================
   EDITOR LINE NUMBERS & SCROLL SYNC
   ==================================================== */

function updateLineNumbers() {
    const lines = codeEditor.value.split('\n');
    const lineNumbersText = lines.map((_, index) => index + 1).join('\n');
    lineNumbers.textContent = lineNumbersText;
    lineCount.textContent = `Lines: ${lines.length}`;
}

function syncScroll() {
    lineNumbers.scrollTop = codeEditor.scrollTop;
}

codeEditor.addEventListener('input', updateLineNumbers);
codeEditor.addEventListener('scroll', syncScroll);

/* ====================================================
   TAB BUTTON SYSTEM
   ==================================================== */

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabId = btn.getAttribute('data-tab');
        
        // Deactivate all tab buttons in current panel group
        const parentHeader = btn.closest('.panel').querySelector('.panel-header');
        parentHeader.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Hide all tab contents in current panel
        const panel = btn.closest('.panel');
        panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Show target content
        panel.querySelector(`#${tabId}`).classList.add('active');
        
        // Adjust badges
        if (panel.classList.contains('right-panel')) {
            updateRightPanelBadge(tabId);
        }
    });
});

function updateRightPanelBadge(activeTabId) {
    if (activeTabId === 'tokens-tab') {
        rightPanelBadge.textContent = `Tokens: ${tokenList.length}`;
        rightPanelBadge.style.backgroundColor = 'var(--primary-color)';
    } else {
        rightPanelBadge.textContent = `Symbols: ${symbolList.length}`;
        rightPanelBadge.style.backgroundColor = 'var(--secondary-color)';
    }
}

/* ====================================================
   TERMINAL CONSOLE OUTPUT INTERACTION
   ==================================================== */

function clearTerminal() {
    terminalConsole.innerHTML = '';
}

function printToTerminal(text, type = 'output') {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = text;
    terminalConsole.appendChild(line);
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
}

/* ====================================================
   SYMBOL EXTRACTION UTILITY
   ==================================================== */

/**
 * Traverses AST to find all variable declarations
 */
function collectSymbolsFromAST(ast) {
    const symbols = [];
    
    function traverse(node, scopeName = 'Global') {
        if (!node) return;
        
        if (node.type === 'VariableDeclaration') {
            // Avoid duplicate additions in visual list
            if (!symbols.some(s => s.name === node.name && s.scope === scopeName)) {
                symbols.push({
                    name: node.name,
                    type: node.varType,
                    scope: scopeName,
                    line: node.line
                });
            }
        } else if (node.type === 'BlockStatement') {
            node.body.forEach(child => traverse(child, 'Local'));
        } else if (node.type === 'IfStatement') {
            traverse(node.condition, scopeName);
            traverse(node.thenBranch, 'Local');
            if (node.elseBranch) traverse(node.elseBranch, 'Local');
        } else if (node.type === 'WhileStatement') {
            traverse(node.condition, scopeName);
            traverse(node.body, 'Local');
        } else if (node.type === 'ForStatement') {
            if (node.init && node.init.type === 'VariableDeclaration') {
                symbols.push({
                    name: node.init.name,
                    type: node.init.varType,
                    scope: 'Local (For)',
                    line: node.init.line
                });
            }
            traverse(node.body, 'Local');
        } else if (node.body && Array.isArray(node.body)) {
            node.body.forEach(child => traverse(child, scopeName));
        }
    }
    
    traverse(ast);
    return symbols;
}

/* ====================================================
   TABLE RENDERERS
   ==================================================== */

function renderTokenTable(tokens) {
    tokenTableBody.innerHTML = '';
    tokenList = tokens;
    
    // Update badge count
    const activeTab = document.querySelector('.right-panel .tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'tokens-tab') {
        updateRightPanelBadge('tokens-tab');
    }

    if (tokens.length === 0) {
        tokenTableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="4">No tokens found.</td>
            </tr>
        `;
        return;
    }

    tokens.forEach((token, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><code>${escapeHtml(token.lexeme)}</code></td>
            <td><span class="token-type token-${token.type.toLowerCase()}">${token.type}</span></td>
            <td>${token.line}</td>
        `;
        tokenTableBody.appendChild(row);
    });
}

function renderSymbolTable(symbols, interpInstance = null) {
    symbolTableBody.innerHTML = '';
    symbolList = symbols;
    
    const activeTab = document.querySelector('.right-panel .tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'symbols-tab') {
        updateRightPanelBadge('symbols-tab');
    }

    if (symbols.length === 0) {
        symbolTableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">No symbols declared.</td>
            </tr>
        `;
        return;
    }

    symbols.forEach((symbol, index) => {
        let valText = 'Undefined';
        
        if (interpInstance && interpInstance.environment) {
            try {
                const envVal = interpInstance.environment.get(symbol.name);
                valText = envVal.value;
                if (envVal.type === 'bool') {
                    valText = envVal.value ? 'true' : 'false';
                } else if (envVal.type === 'string') {
                    valText = `"${envVal.value}"`;
                } else if (envVal.type === 'char') {
                    valText = `'${envVal.value}'`;
                }
            } catch (e) {
                // If it was declared locally but is no longer in scope
                valText = 'Out of Scope';
            }
        }

        const row = document.createElement('tr');
        
        // Define badge style based on data types
        let typeClass = 'token-keyword';
        if (symbol.type === 'num') typeClass = 'token-number';
        else if (symbol.type === 'deci') typeClass = 'token-string';
        else if (symbol.type === 'bool') typeClass = 'token-operator';
        else if (symbol.type === 'char') typeClass = 'token-delimiter';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><code>${escapeHtml(symbol.name)}</code></td>
            <td><span class="token-type ${typeClass}">${symbol.type}</span></td>
            <td><code>${escapeHtml(String(valText))}</code></td>
            <td>${symbol.scope}</td>
        `;
        symbolTableBody.appendChild(row);
    });
}

function renderErrors(errors) {
    errorConsole.innerHTML = '';
    
    if (errors.length === 0) {
        errorConsole.innerHTML = `
            <div class="console-message success">
                <span class="console-icon">✓</span>
                <span>Compilation and execution completed successfully! No errors found.</span>
            </div>
        `;
        errorCount.textContent = 'Errors: 0';
        errorCount.style.backgroundColor = 'var(--success-color)';
        return;
    }

    errors.forEach(err => {
        const row = document.createElement('div');
        row.className = 'console-message error';
        row.innerHTML = `
            <span class="console-icon">✗</span>
            <span><strong>[${err.type}] Line ${err.line}:</strong> ${err.message}</span>
        `;
        errorConsole.appendChild(row);
    });

    errorCount.textContent = `Errors: ${errors.length}`;
    errorCount.style.backgroundColor = 'var(--error-color)';
}

/* ====================================================
   COMPILER RUNTIME PIPELINE
   ==================================================== */

function runCompiler() {
    const code = codeEditor.value;

    if (!code.trim()) {
        errorConsole.innerHTML = `
            <div class="console-message warning">
                <span class="console-icon">⚠</span>
                <span>Editor is empty. Write code before running.</span>
            </div>
        `;
        errorCount.textContent = 'Errors: 0';
        errorCount.style.backgroundColor = 'var(--warning-color)';
        return;
    }

    // Initialize UI Panels
    clearTerminal();
    printToTerminal("[System] Starting compilation pipeline...", "system");
    
    // Switch to Terminal tab so user sees console output
    const terminalTabBtn = document.querySelector('.center-panel .tab-btn[data-tab="terminal-tab"]');
    if (terminalTabBtn) terminalTabBtn.click();

    setTimeout(() => {
        try {
            // 1. Lexical Analysis
            const lexResult = lexer.tokenize(code);
            renderTokenTable(lexResult.tokens);

            if (lexResult.errors.length > 0) {
                renderErrors(lexResult.errors);
                printToTerminal("[System] Compilation failed during Lexical Analysis.", "error");
                renderSymbolTable([]);
                ASTVisualizer.render(null, astTreeContainer);
                return;
            }

            // 2. Syntactic Analysis (Parsing)
            const parserInstance = new Parser(lexResult.tokens);
            const parseResult = parserInstance.parse();

            if (parseResult.errors.length > 0) {
                renderErrors(parseResult.errors);
                printToTerminal("[System] Compilation failed during Parsing.", "error");
                renderSymbolTable([]);
                ASTVisualizer.render(null, astTreeContainer);
                return;
            }

            // Display AST tree
            ASTVisualizer.render(parseResult, astTreeContainer);

            // 3. Semantic Analysis
            const semanticErrors = semanticAnalyzer.analyze(parseResult);
            
            // Extract symbols declared in AST to render Table frame
            const symbols = collectSymbolsFromAST(parseResult);
            renderSymbolTable(symbols);

            if (semanticErrors.length > 0) {
                renderErrors(semanticErrors);
                printToTerminal("[System] Compilation failed during Semantic Analysis.", "error");
                return;
            }

            // 4. Code Execution (Interpreting)
            printToTerminal("[System] Code compiled successfully. Executing program...\n", "system");

            const runtimeResult = interpreter.interpret(
                parseResult,
                // Display callback
                (val) => {
                    printToTerminal(val, "output");
                },
                // Input callback
                (promptText) => {
                    printToTerminal(`[Input Prompt] ${promptText}`, "system");
                    const val = window.prompt(promptText) || "";
                    printToTerminal(`> ${val}`, "input-echo");
                    return val;
                }
            );

            // Update symbols layout with final values
            renderSymbolTable(symbols, interpreter);

            if (!runtimeResult.success) {
                renderErrors([runtimeResult.error]);
                printToTerminal(`\n[System] Execution halted due to runtime error on line ${runtimeResult.error.line}.`, "error");
                return;
            }

            // Report Success
            printToTerminal("\n[System] Program executed successfully.", "system");
            renderErrors([]);

        } catch (fatalErr) {
            console.error(fatalErr);
            renderErrors([{
                type: 'FATAL_COMPILER_ERROR',
                line: 1,
                message: fatalErr.message
            }]);
            printToTerminal("[System] Fatal compiler failure occurred.", "error");
        }
    }, 100);
}

/* ====================================================
   UI CONTROLS INTERACTION
   ==================================================== */

function clearAll() {
    codeEditor.value = '';
    updateLineNumbers();
    clearTerminal();
    
    // Show welcome line
    printToTerminal("[System] ZenLang Execution Console v2.0 ready. Write code and click 'Run Code'.", "system");
    
    // Clear tables
    renderTokenTable([]);
    renderSymbolTable([]);
    
    // Reset diagnostic logs
    errorConsole.innerHTML = `
        <div class="console-message success">
            <span class="console-icon">✓</span>
            <span>Compiler diagnostic check: status OK. Ready to parse.</span>
        </div>
    `;
    errorCount.textContent = 'Errors: 0';
    errorCount.style.backgroundColor = 'var(--primary-color)';

    // Reset AST visualizer
    astTreeContainer.innerHTML = `
        <div class="console-message success">
            <span>No AST generated. Write code and compile to inspect structure.</span>
        </div>
    `;
}

function loadSample() {
    const sampleCode = `// ZenLang Demo Program
// Shows variables, operations, loops and conditionals

num limit = 5;
display("Entering calculation loop up to: " + limit);

for (num i = 1; i <= limit; i = i + 1) {
    when (i % 2 == 0) {
        display(i + " is Even");
    }
    else {
        display(i + " is Odd");
    }
}

display("");
display("Type Coercion Test:");
deci radius = 3.5;
deci multiplier = 2; // Coerced to deci 2.0
deci doubleRadius = radius * multiplier;
display("Double radius: " + doubleRadius);

display("");
display("Interactive Input Test:");
string name = input("What is your name? ");
display("Hello " + name + "! Welcome to ZenLang!");
`;

    codeEditor.value = sampleCode;
    updateLineNumbers();
    clearTerminal();
    printToTerminal("[System] Demo code loaded successfully. Press 'Run Code' to execute.", "system");
}

// Bind Actions
runBtn.addEventListener('click', runCompiler);
clearBtn.addEventListener('click', clearAll);
sampleBtn.addEventListener('click', loadSample);

// Keyboard Shortcuts (Ctrl+Enter to Run)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCompiler();
    }
});

// HTML escaping helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initial triggers
updateLineNumbers();
