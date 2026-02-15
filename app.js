
// Initialize the lexer
const lexer = new Lexer();

// DOM Elements
const codeEditor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const lineCount = document.getElementById('lineCount');
const tokenCount = document.getElementById('tokenCount');
const symbolCount = document.getElementById('symbolCount');
const errorCount = document.getElementById('errorCount');
const tokenTableBody = document.getElementById('tokenTableBody');
const symbolTableBody = document.getElementById('symbolTableBody');
const errorConsole = document.getElementById('errorConsole');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');

/**
 * Updates line numbers in the editor
 * Synchronizes with the number of lines in the code editor
 */
function updateLineNumbers() {
    const lines = codeEditor.value.split('\n');
    const lineNumbersText = lines.map((_, index) => index + 1).join('\n');
    lineNumbers.textContent = lineNumbersText;
    lineCount.textContent = `Lines: ${lines.length}`;
}

/**
 * Synchronizes scrolling between code editor and line numbers
 */
function syncScroll() {
    lineNumbers.scrollTop = codeEditor.scrollTop;
}

/**
 * Renders tokens in the token table
 * 
 * @param {Array} tokens - Array of token objects
 */
function renderTokenTable(tokens) {
    tokenTableBody.innerHTML = '';

    if (tokens.length === 0) {
        tokenTableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="4">No tokens found</td>
            </tr>
        `;
        tokenCount.textContent = 'Tokens: 0';
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

    tokenCount.textContent = `Tokens: ${tokens.length}`;
}

/**
 * Renders identifiers in the symbol table
 * 
 * @param {Array} symbols - Array of symbol objects
 */
function renderSymbolTable(symbols) {
    symbolTableBody.innerHTML = '';

    if (symbols.length === 0) {
        symbolTableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="4">No identifiers found</td>
            </tr>
        `;
        symbolCount.textContent = 'Identifiers: 0';
        return;
    }

    symbols.forEach((symbol, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><code>${escapeHtml(symbol.name)}</code></td>
            <td>${symbol.firstLine}</td>
            <td>${symbol.frequency}</td>
        `;
        symbolTableBody.appendChild(row);
    });

    symbolCount.textContent = `Identifiers: ${symbols.length}`;
}

/**
 * Renders errors in the error console
 * 
 * @param {Array} errors - Array of error objects
 */
function renderErrors(errors) {
    errorConsole.innerHTML = '';

    if (errors.length === 0) {
        errorConsole.innerHTML = `
            <div class="console-message success">
                <span class="console-icon">✓</span>
                <span>Lexical analysis completed successfully! No errors found.</span>
            </div>
        `;
        errorCount.textContent = 'Errors: 0';
        errorCount.style.background = '#10b981';
        errorCount.style.color = 'white';
        return;
    }

    errors.forEach(error => {
        const message = document.createElement('div');
        message.className = 'console-message error';
        message.innerHTML = `
            <span class="console-icon">✗</span>
            <span><strong>Line ${error.line}:</strong> ${error.message}</span>
        `;
        errorConsole.appendChild(message);
    });

    errorCount.textContent = `Errors: ${errors.length}`;
    errorCount.style.background = '#ef4444';
    errorCount.style.color = 'white';
}

/**
 * Main analysis function
 * Tokenizes the source code and updates all UI components
 */
function analyzeCode() {
    const sourceCode = codeEditor.value.trim();

    if (!sourceCode) {
        // Show warning if editor is empty
        errorConsole.innerHTML = `
            <div class="console-message warning">
                <span class="console-icon">⚠</span>
                <span>Editor is empty. Please write some code first.</span>
            </div>
        `;
        errorCount.textContent = 'Errors: 0';
        errorCount.style.background = '#f59e0b';
        errorCount.style.color = 'white';
        return;
    }

    // Show analyzing message
    errorConsole.innerHTML = `
        <div class="console-message success">
            <span class="console-icon">⏳</span>
            <span>Analyzing source code...</span>
        </div>
    `;

    // Perform lexical analysis
    setTimeout(() => {
        const result = lexer.tokenize(sourceCode);

        // Update UI with results
        renderTokenTable(result.tokens);
        renderSymbolTable(result.symbolTable);
        renderErrors(result.errors);

        // Log results to browser console for debugging
        console.log('Lexical Analysis Results:', result);
    }, 100);
}

/**
 * Clears all editor content and resets UI
 */
function clearAll() {
    codeEditor.value = '';
    updateLineNumbers();

    tokenTableBody.innerHTML = `
        <tr class="empty-state">
            <td colspan="4">No tokens yet. Write code and click "Analyze Code"</td>
        </tr>
    `;

    symbolTableBody.innerHTML = `
        <tr class="empty-state">
            <td colspan="4">No identifiers found</td>
        </tr>
    `;

    errorConsole.innerHTML = `
        <div class="console-message success">
            <span class="console-icon">✓</span>
            <span>Ready to analyze code...</span>
        </div>
    `;

    tokenCount.textContent = 'Tokens: 0';
    symbolCount.textContent = 'Identifiers: 0';
    errorCount.textContent = 'Errors: 0';
    errorCount.style.background = '';
    errorCount.style.color = '';
}

/**
 * Loads a sample ZenLang program
 */
function loadSample() {
    const sampleCode = `// ZenLang Sample Program
// Demonstrates all language features

num x = 10;
num y = 20;
deci pi = 3.14159;
char grade = 'A';
string name = "ZenLang";

// Display output
display("Welcome to ZenLang!");
display("Value of x: ");
display(x);

// Conditional statement
when (x > 5) {
    display("x is greater than 5");
}
else {
    display("x is less than or equal to 5");
}

// Loop example
num i = 0;
while (i < 5) {
    display(i);
    i = i + 1;
}

// For loop
for (num j = 0; j < 3; j = j + 1) {
    display("Iteration: ");
    display(j);
}

// Arithmetic operations
num sum = x + y;
num product = x * y;
deci result = pi * 2.0;

// Input example
input("Enter a number: ");
`;

    codeEditor.value = sampleCode;
    updateLineNumbers();

    // Show success message
    errorConsole.innerHTML = `
        <div class="console-message success">
            <span class="console-icon">✓</span>
            <span>Sample code loaded successfully! Click "Analyze Code" to tokenize.</span>
        </div>
    `;
}

/**
 * Escapes HTML special characters to prevent XSS
 * 
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Handles keyboard shortcuts
 */
function handleKeyboard(event) {
    // Ctrl+Enter or Cmd+Enter to analyze
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        analyzeCode();
    }

    // Ctrl+L or Cmd+L to clear
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        clearAll();
    }
}

// Event Listeners
codeEditor.addEventListener('input', updateLineNumbers);
codeEditor.addEventListener('scroll', syncScroll);
codeEditor.addEventListener('keydown', handleKeyboard);
analyzeBtn.addEventListener('click', analyzeCode);
clearBtn.addEventListener('click', clearAll);
sampleBtn.addEventListener('click', loadSample);

// Initialize line numbers on page load
updateLineNumbers();

// Welcome message
console.log(`
╔════════════════════════════════════════╗
║   ZenLang Lexical Analyzer v1.0        ║
║   Compiler Design - Phase 1            ║
║                                        ║
║   Keyboard Shortcuts:                  ║
║   • Ctrl+Enter: Analyze Code           ║
║   • Ctrl+L: Clear All                  ║
╚════════════════════════════════════════╝
`);
