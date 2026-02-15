
class Lexer {
    constructor() {
        // ZenLang Keywords (reserved words)
        this.keywords = new Set([
            'display',  // printf equivalent
            'input',    // scanf equivalent
            'num',      // int equivalent
            'deci',     // float equivalent
            'char',
            'string',
            'while',
            'for',
            'when',     // if equivalent
            'else'
        ]);

        // Regular Expression Patterns for Token Recognition
        // Each pattern represents a DFA that recognizes a specific token type
        this.patterns = {
            // Whitespace (ignored but used for tokenization)
            whitespace: /\s+/,

            // Single-line comment: // comment
            singleLineComment: /\/\/.*/,

            // Multi-line comment: /* comment */
            multiLineComment: /\/\*[\s\S]*?\*\//,

            // String literals: "text" or 'text'
            // DFA: " -> (any char except ")* -> "
            string: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/,

            // Number literals: integers and floats
            // Matches: 123, 45.67, .89, 0.5
            // DFA: digit+ (. digit+)?
            number: /\d+\.?\d*|\.\d+/,

            // Identifiers: variable/function names
            // Must start with letter or underscore, followed by alphanumeric or underscore
            // DFA: [a-zA-Z_] -> [a-zA-Z0-9_]*
            identifier: /[a-zA-Z_][a-zA-Z0-9_]*/,

            // Operators: arithmetic, relational, logical, assignment
            operator: /==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|]/,

            // Delimiters: punctuation and brackets
            delimiter: /[;,(){}[\]]/
        };
    }

    /**
     * Main tokenization function
     * Scans the source code and produces a list of tokens
     * 
     * @param {string} sourceCode - The ZenLang source code to analyze
     * @returns {Object} - Contains tokens array, symbol table, and errors
     */
    tokenize(sourceCode) {
        const tokens = [];
        const symbolTable = new Map(); // Stores identifiers and their metadata
        const errors = [];

        const lines = sourceCode.split('\n');

        // Process each line
        lines.forEach((line, lineIndex) => {
            const lineNumber = lineIndex + 1;
            let position = 0;

            // Scan the line character by character
            while (position < line.length) {
                const remainingLine = line.substring(position);

                // Skip whitespace
                const whitespaceMatch = remainingLine.match(/^\s+/);
                if (whitespaceMatch) {
                    position += whitespaceMatch[0].length;
                    continue;
                }

                // Skip single-line comments
                const commentMatch = remainingLine.match(/^\/\/.*/);
                if (commentMatch) {
                    break; // Rest of line is comment
                }

                // Try to match each token type
                let matched = false;

                // 1. Try to match STRING
                const stringMatch = remainingLine.match(/^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/);
                if (stringMatch) {
                    tokens.push({
                        lexeme: stringMatch[0],
                        type: 'STRING',
                        line: lineNumber
                    });
                    position += stringMatch[0].length;
                    matched = true;
                    continue;
                }

                // 2. Try to match NUMBER
                const numberMatch = remainingLine.match(/^(\d+\.?\d*|\.\d+)/);
                if (numberMatch) {
                    tokens.push({
                        lexeme: numberMatch[0],
                        type: 'NUMBER',
                        line: lineNumber
                    });
                    position += numberMatch[0].length;
                    matched = true;
                    continue;
                }

                // 3. Try to match KEYWORD or IDENTIFIER
                const identifierMatch = remainingLine.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
                if (identifierMatch) {
                    const lexeme = identifierMatch[0];

                    // Check if it's a keyword
                    if (this.keywords.has(lexeme)) {
                        tokens.push({
                            lexeme: lexeme,
                            type: 'KEYWORD',
                            line: lineNumber
                        });
                    } else {
                        // It's an identifier - add to symbol table
                        tokens.push({
                            lexeme: lexeme,
                            type: 'IDENTIFIER',
                            line: lineNumber
                        });

                        // Update symbol table
                        if (symbolTable.has(lexeme)) {
                            const entry = symbolTable.get(lexeme);
                            entry.frequency++;
                        } else {
                            symbolTable.set(lexeme, {
                                name: lexeme,
                                firstLine: lineNumber,
                                frequency: 1
                            });
                        }
                    }

                    position += lexeme.length;
                    matched = true;
                    continue;
                }

                // 4. Try to match OPERATOR
                const operatorMatch = remainingLine.match(/^(==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|])/);
                if (operatorMatch) {
                    tokens.push({
                        lexeme: operatorMatch[0],
                        type: 'OPERATOR',
                        line: lineNumber
                    });
                    position += operatorMatch[0].length;
                    matched = true;
                    continue;
                }

                // 5. Try to match DELIMITER
                const delimiterMatch = remainingLine.match(/^[;,(){}[\]]/);
                if (delimiterMatch) {
                    tokens.push({
                        lexeme: delimiterMatch[0],
                        type: 'DELIMITER',
                        line: lineNumber
                    });
                    position += delimiterMatch[0].length;
                    matched = true;
                    continue;
                }

                // If no pattern matched, it's an unknown/error token
                if (!matched) {
                    const unknownChar = remainingLine[0];
                    tokens.push({
                        lexeme: unknownChar,
                        type: 'UNKNOWN',
                        line: lineNumber
                    });

                    errors.push({
                        line: lineNumber,
                        message: `Unrecognized character: '${unknownChar}'`,
                        type: 'LEXICAL_ERROR'
                    });

                    position++;
                }
            }
        });

        return {
            tokens,
            symbolTable: Array.from(symbolTable.values()),
            errors
        };
    }

    /**
     * Validates if a string is a valid identifier
     * Used for additional validation beyond tokenization
     * 
     * @param {string} str - String to validate
     * @returns {boolean} - True if valid identifier
     */
    isValidIdentifier(str) {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str) && !this.keywords.has(str);
    }

    /**
     * Checks if a string is a keyword
     * 
     * @param {string} str - String to check
     * @returns {boolean} - True if keyword
     */
    isKeyword(str) {
        return this.keywords.has(str);
    }

    /**
     * Gets all supported keywords
     * 
     * @returns {Array} - Array of keyword strings
     */
    getKeywords() {
        return Array.from(this.keywords);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Lexer;
}
