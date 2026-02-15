# 🔍 ZenLang Lexical Analyzer

**Compiler Design - Phase 1 (30%)**  
A complete lexical analyzer for the custom ZenLang programming language.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Language Specifications](#language-specifications)
3. [Features](#features)
4. [How It Works](#how-it-works)
5. [Regular Expressions Used](#regular-expressions-used)
6. [DFA Concept](#dfa-concept)
7. [Compiler Phases](#compiler-phases)
8. [Installation & Usage](#installation--usage)
9. [Project Structure](#project-structure)
10. [Viva Questions & Answers](#viva-questions--answers)

---

## 🎯 Overview

This project implements the **Lexical Analysis** phase of a compiler for ZenLang, a custom programming language. The lexical analyzer (lexer) reads source code and breaks it down into tokens, which are the smallest meaningful units of the language.

**Key Objectives:**
- Tokenize ZenLang source code
- Classify tokens by type (keyword, identifier, number, etc.)
- Build a symbol table for identifiers
- Detect and report lexical errors
- Provide a clean, modern UI for visualization

---

## 🌟 Language Specifications

### ZenLang Keywords

| ZenLang Keyword | C/C++ Equivalent | Purpose |
|-----------------|------------------|---------|
| `display` | `printf` | Output to console |
| `input` | `scanf` | Input from user |
| `num` | `int` | Integer data type |
| `deci` | `float` | Decimal/float data type |
| `char` | `char` | Character data type |
| `string` | `char*` / `string` | String data type |
| `while` | `while` | While loop |
| `for` | `for` | For loop |
| `when` | `if` | Conditional statement |
| `else` | `else` | Alternative condition |

### Token Types

1. **KEYWORD** - Reserved words (display, num, when, etc.)
2. **IDENTIFIER** - Variable/function names
3. **NUMBER** - Integer and floating-point literals
4. **STRING** - Text enclosed in quotes
5. **OPERATOR** - Arithmetic, relational, logical operators
6. **DELIMITER** - Semicolons, braces, parentheses
7. **UNKNOWN** - Unrecognized characters (errors)

---

## ✨ Features

### Core Functionality
- ✅ Complete tokenization of ZenLang source code
- ✅ Token classification with 7 distinct types
- ✅ Symbol table generation for identifiers
- ✅ Lexical error detection and reporting
- ✅ Line number tracking for all tokens

### User Interface
- 🎨 Modern dark theme with gradient backgrounds
- 📝 Syntax-highlighted code editor with line numbers
- 📊 Real-time token table display
- 🗂️ Symbol table with frequency tracking
- ⚠️ Error console with color-coded messages
- 🔄 Sample code loader for quick testing
- ⌨️ Keyboard shortcuts (Ctrl+Enter to analyze)

### Code Quality
- 📚 Comprehensive inline documentation
- 🧩 Modular, reusable code structure
- 🎯 Clean separation of concerns (lexer logic vs UI)
- 💬 Detailed comments explaining theory

---

## 🔧 How It Works

### Lexical Analysis Process

```
Source Code → Lexer → Tokens → Symbol Table
                  ↓
              Error Detection
```

**Step-by-Step:**

1. **Input**: User writes ZenLang code in the editor
2. **Scanning**: Lexer reads code character by character
3. **Pattern Matching**: Regular expressions match token patterns
4. **Classification**: Tokens are categorized by type
5. **Symbol Table**: Identifiers are stored with metadata
6. **Error Detection**: Unknown characters are flagged
7. **Output**: Results displayed in tables and console

### Example

**Input Code:**
```zenlang
num x = 10;
display("Hello");
```

**Tokens Generated:**

| Lexeme | Token Type | Line |
|--------|------------|------|
| `num` | KEYWORD | 1 |
| `x` | IDENTIFIER | 1 |
| `=` | OPERATOR | 1 |
| `10` | NUMBER | 1 |
| `;` | DELIMITER | 1 |
| `display` | KEYWORD | 2 |
| `(` | DELIMITER | 2 |
| `"Hello"` | STRING | 2 |
| `)` | DELIMITER | 2 |
| `;` | DELIMITER | 2 |

**Symbol Table:**

| Identifier | First Line | Frequency |
|------------|------------|-----------|
| `x` | 1 | 1 |

---

## 📐 Regular Expressions Used

The lexer uses the following regex patterns:

### 1. **String Literals**
```regex
"([^"\\]|\\.)*"|'([^'\\]|\\.)*'
```
- Matches text in double or single quotes
- Handles escape sequences like `\n`, `\"`

### 2. **Number Literals**
```regex
\d+\.?\d*|\.\d+
```
- Matches integers: `123`, `0`, `999`
- Matches floats: `3.14`, `0.5`, `.99`

### 3. **Identifiers**
```regex
[a-zA-Z_][a-zA-Z0-9_]*
```
- Must start with letter or underscore
- Can contain letters, digits, underscores
- Examples: `x`, `count`, `_temp`, `myVar123`

### 4. **Operators**
```regex
==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|]
```
- Multi-character: `==`, `!=`, `<=`, `>=`, `&&`, `||`
- Single-character: `+`, `-`, `*`, `/`, `%`, `=`, `<`, `>`, `!`

### 5. **Delimiters**
```regex
[;,(){}[\]]
```
- Matches: `;`, `,`, `(`, `)`, `{`, `}`, `[`, `]`

---

## 🤖 DFA Concept

### What is a DFA?

A **Deterministic Finite Automaton (DFA)** is a state machine used to recognize patterns in strings.

**Components:**
- **States**: Nodes representing positions in pattern matching
- **Transitions**: Edges labeled with input characters
- **Start State**: Initial state
- **Accept States**: States indicating successful match

### Example: DFA for Identifier Recognition

```
     [a-zA-Z_]        [a-zA-Z0-9_]
(Start) ---------> (Accept) <---------+
   q0                 q1              |
                       |              |
                       +--------------+
                          (loop)
```

**How it works:**
1. Start in state `q0`
2. Read first character:
   - If `[a-zA-Z_]` → move to `q1` (accept state)
   - Otherwise → reject
3. While in `q1`, read next character:
   - If `[a-zA-Z0-9_]` → stay in `q1`
   - Otherwise → stop (accept if no more input)

**Examples:**
- `x` → Accept ✅
- `myVar` → Accept ✅
- `_temp123` → Accept ✅
- `123abc` → Reject ❌ (starts with digit)

### DFA vs NFA

| DFA | NFA |
|-----|-----|
| One transition per input | Multiple transitions possible |
| Deterministic | Non-deterministic |
| Faster execution | Slower execution |
| Used in lexers | Used in regex engines |

---

## 📚 Compiler Phases

The ZenLang compiler will have 6 phases. **This project implements Phase 1.**

### Phase 1: Lexical Analysis ✅ (THIS PROJECT)
- **Input**: Source code (text)
- **Output**: Stream of tokens
- **Purpose**: Break code into meaningful units
- **Tools**: Regular expressions, DFAs

### Phase 2: Syntax Analysis (Future)
- **Input**: Tokens
- **Output**: Parse tree / Abstract Syntax Tree (AST)
- **Purpose**: Check grammatical structure
- **Tools**: Context-free grammars, parsers

### Phase 3: Semantic Analysis (Future)
- **Input**: Parse tree
- **Output**: Annotated parse tree
- **Purpose**: Type checking, scope resolution
- **Tools**: Symbol tables, type systems

### Phase 4: Intermediate Code Generation (Future)
- **Input**: Annotated parse tree
- **Output**: Intermediate representation (IR)
- **Purpose**: Platform-independent code
- **Tools**: Three-address code, quadruples

### Phase 5: Code Optimization (Future)
- **Input**: IR code
- **Output**: Optimized IR code
- **Purpose**: Improve performance
- **Tools**: Data flow analysis, loop optimization

### Phase 6: Code Generation (Future)
- **Input**: Optimized IR
- **Output**: Target machine code
- **Purpose**: Generate executable code
- **Tools**: Register allocation, instruction selection

---

## 🚀 Installation & Usage

### Prerequisites
- Any modern web browser (Chrome, Firefox, Edge, Safari)
- No server or dependencies required!

### Running the Application

1. **Download/Clone** the project files
2. **Open** `index.html` in your web browser
3. **Write** ZenLang code in the editor or click "Load Sample"
4. **Click** "Analyze Code" or press `Ctrl+Enter`
5. **View** results in the token table, symbol table, and error console

### Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter` - Analyze code
- `Ctrl+L` / `Cmd+L` - Clear all

---

## 📁 Project Structure

```
compiler-design/
│
├── index.html          # Main HTML structure
├── styles.css          # Modern UI styling
├── lexer.js            # Core lexical analyzer logic
├── app.js              # UI controller and event handlers
└── README.md           # This file
```

### File Descriptions

**index.html**
- Defines the page structure
- Split-screen layout with editor and output panels
- Semantic HTML for accessibility

**styles.css**
- Modern dark theme with CSS variables
- Responsive grid layout
- Smooth animations and transitions
- Custom scrollbar styling

**lexer.js**
- `Lexer` class with tokenization logic
- Regular expression patterns for token matching
- Symbol table management
- Comprehensive documentation

**app.js**
- DOM manipulation and event handling
- UI updates for tokens, symbols, and errors
- Sample code loader
- Keyboard shortcut support

---

## 🎓 Viva Questions & Answers

### Basic Questions

**Q1: What is lexical analysis?**  
**A:** Lexical analysis is the first phase of compilation where source code is scanned and converted into tokens. It groups characters into meaningful units like keywords, identifiers, and operators.

**Q2: What is a token?**  
**A:** A token is the smallest meaningful unit in a programming language. It consists of a lexeme (the actual text) and a token type (category like KEYWORD or NUMBER).

**Q3: What is the difference between a lexeme and a token?**  
**A:** A lexeme is the actual character sequence (e.g., `"display"`), while a token is the category it belongs to (e.g., KEYWORD).

**Q4: What is a symbol table?**  
**A:** A symbol table is a data structure that stores information about identifiers (variables, functions) including their names, types, scope, and memory locations.

### Intermediate Questions

**Q5: What are regular expressions?**  
**A:** Regular expressions are patterns used to match character sequences. They define rules for recognizing tokens like identifiers (`[a-zA-Z_][a-zA-Z0-9_]*`) or numbers (`\d+`).

**Q6: What is a DFA?**  
**A:** A Deterministic Finite Automaton is a state machine that recognizes patterns. It has states and transitions, and accepts input if it ends in an accepting state.

**Q7: How does your lexer handle errors?**  
**A:** When the lexer encounters a character that doesn't match any pattern, it creates an UNKNOWN token and adds an error to the error list with the line number.

**Q8: Why do we need lexical analysis?**  
**A:** Lexical analysis simplifies parsing by converting raw text into structured tokens. It also removes whitespace and comments, making the parser's job easier.

### Advanced Questions

**Q9: What is the difference between DFA and NFA?**  
**A:** DFA has exactly one transition per input symbol and is deterministic. NFA can have multiple transitions or epsilon transitions and is non-deterministic. DFAs are faster but NFAs are easier to construct.

**Q10: How do you handle keywords vs identifiers?**  
**A:** First, I match the pattern for identifiers. Then, I check if the matched string exists in the keyword set. If yes, it's a KEYWORD; otherwise, it's an IDENTIFIER.

**Q11: What is the time complexity of your lexer?**  
**A:** O(n) where n is the length of the source code, as we scan each character once.

**Q12: How would you extend this to Phase 2 (parsing)?**  
**A:** I would implement a parser using a context-free grammar. The parser would consume tokens from the lexer and build a parse tree or AST based on the grammar rules.

---

## 🏆 Project Highlights for Viva

1. **Clean Code**: Well-commented, modular structure
2. **Theory Integration**: DFA and regex concepts explained
3. **Professional UI**: Modern, responsive design
4. **Error Handling**: Comprehensive error detection
5. **Symbol Table**: Tracks identifiers with frequency
6. **Extensible**: Easy to add new keywords or token types
7. **Documentation**: Detailed README and inline comments

---

## 📝 Sample ZenLang Programs

### Example 1: Hello World
```zenlang
display("Hello, ZenLang!");
```

### Example 2: Variables and Arithmetic
```zenlang
num x = 10;
num y = 20;
num sum = x + y;
display(sum);
```

### Example 3: Conditional Statement
```zenlang
num age = 18;
when (age >= 18) {
    display("Adult");
}
else {
    display("Minor");
}
```

### Example 4: Loop
```zenlang
num i = 0;
while (i < 5) {
    display(i);
    i = i + 1;
}
```

---

## 🎯 Future Enhancements

- [ ] Add syntax highlighting in the editor
- [ ] Implement Phase 2: Syntax Analysis (Parser)
- [ ] Export tokens to JSON/CSV
- [ ] Add more token types (comments, preprocessor directives)
- [ ] Support for multi-line strings
- [ ] Better error recovery mechanisms

---

## 👨‍💻 Author

**3rd Year Engineering Student**  
Compiler Design Project - Phase 1  
ZenLang Lexical Analyzer

---

## 📄 License

This project is created for educational purposes as part of a compiler design course.

---

**Good luck with your viva! 🎓**
