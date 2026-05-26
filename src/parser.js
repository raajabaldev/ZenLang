class Parser {
    /**
     * @param {Array} tokens - List of tokens produced by the Lexer
     */
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
        this.errors = [];
    }

    /**
     * Main parse execution
     * @returns {Object} - AST representation and parsing errors
     */
    parse() {
        const statements = [];
        this.errors = [];
        this.current = 0;

        while (!this.isAtEnd()) {
            try {
                statements.push(this.statement());
            } catch (err) {
                // If parsing a statement fails, synchronize to compile next statements
                this.synchronize();
            }
        }

        return {
            type: 'Program',
            body: statements,
            errors: this.errors
        };
    }

    /* ==========================================
       STATEMENT PARSING RULES
       ========================================== */

    /**
     * Resolves and parses a statement
     */
    statement() {
        if (this.check('KEYWORD')) {
            const lexeme = this.peek().lexeme;
            if (['num', 'deci', 'char', 'string', 'bool'].includes(lexeme)) {
                return this.varDeclStatement();
            }
            if (lexeme === 'when') return this.whenStatement();
            if (lexeme === 'while') return this.whileStatement();
            if (lexeme === 'for') return this.forStatement();
            if (lexeme === 'display') return this.displayStatement();
            if (lexeme === 'input') return this.inputStatement();
        }

        if (this.check('DELIMITER', '{')) {
            return this.blockStatement();
        }

        if (this.check('IDENTIFIER')) {
            return this.assignmentStatement();
        }

        const token = this.peek();
        throw this.error(token, `Unexpected token '${token.lexeme}' representing start of statement.`);
    }

    /**
     * Parses: Type Identifier ("=" Expression)? ";"
     */
    varDeclStatement() {
        const typeToken = this.advance(); // type (num, deci, bool, char, string)
        const nameToken = this.consume('IDENTIFIER', "Expect variable name after type.");

        let initializer = null;
        if (this.match('OPERATOR', '=')) {
            initializer = this.expression();
        }

        this.consume('DELIMITER', "Expect ';' after variable declaration.", ';');

        return {
            type: 'VariableDeclaration',
            varType: typeToken.lexeme,
            name: nameToken.lexeme,
            value: initializer,
            line: typeToken.line
        };
    }

    /**
     * Parses: Identifier "=" Expression ";"
     */
    assignmentStatement() {
        const nameToken = this.consume('IDENTIFIER', "Expect variable name for assignment.");
        this.consume('OPERATOR', "Expect '=' after variable name.", '=');
        const value = this.expression();
        this.consume('DELIMITER', "Expect ';' after assignment.", ';');

        return {
            type: 'AssignmentExpression',
            name: nameToken.lexeme,
            value: value,
            line: nameToken.line
        };
    }

    /**
     * Parses: Identifier "=" Expression (no semicolon)
     */
    assignmentNoSemi() {
        const nameToken = this.consume('IDENTIFIER', "Expect variable name for assignment.");
        this.consume('OPERATOR', "Expect '=' after variable name.", '=');
        const value = this.expression();

        return {
            type: 'AssignmentExpression',
            name: nameToken.lexeme,
            value: value,
            line: nameToken.line
        };
    }

    /**
     * Parses: "{" StatementList "}"
     */
    blockStatement() {
        this.consume('DELIMITER', "Expect '{' to start block.", '{');
        const body = [];

        while (!this.check('DELIMITER', '}') && !this.isAtEnd()) {
            body.push(this.statement());
        }

        this.consume('DELIMITER', "Expect '}' to close block.", '}');

        return {
            type: 'BlockStatement',
            body: body
        };
    }

    /**
     * Parses: "when" "(" Expression ")" BlockStatement ("else" BlockStatement)?
     */
    whenStatement() {
        const whenToken = this.advance(); // consume 'when'
        this.consume('DELIMITER', "Expect '(' after 'when'.", '(');
        const condition = this.expression();
        this.consume('DELIMITER', "Expect ')' after condition.", ')');
        
        const thenBranch = this.blockStatement();
        let elseBranch = null;

        if (this.match('KEYWORD', 'else')) {
            elseBranch = this.blockStatement();
        }

        return {
            type: 'IfStatement',
            condition: condition,
            thenBranch: thenBranch,
            elseBranch: elseBranch,
            line: whenToken.line
        };
    }

    /**
     * Parses: "while" "(" Expression ")" BlockStatement
     */
    whileStatement() {
        const whileToken = this.advance(); // consume 'while'
        this.consume('DELIMITER', "Expect '(' after 'while'.", '(');
        const condition = this.expression();
        this.consume('DELIMITER', "Expect ')' after condition.", ')');
        
        const body = this.blockStatement();

        return {
            type: 'WhileStatement',
            condition: condition,
            body: body,
            line: whileToken.line
        };
    }

    /**
     * Parses: "for" "(" (VarDecl | Assignment | ";") Expression ";" AssignmentNoSemi ")" BlockStatement
     */
    forStatement() {
        const forToken = this.advance(); // consume 'for'
        this.consume('DELIMITER', "Expect '(' after 'for'.", '(');

        let init = null;
        if (this.match('DELIMITER', ';')) {
            init = null;
        } else if (this.check('KEYWORD') && ['num', 'deci', 'char', 'string', 'bool'].includes(this.peek().lexeme)) {
            init = this.varDeclStatement();
        } else {
            init = this.assignmentStatement(); // consumes ';'
        }

        let condition = null;
        if (!this.check('DELIMITER', ';')) {
            condition = this.expression();
        }
        this.consume('DELIMITER', "Expect ';' after loop condition.", ';');

        let update = null;
        if (!this.check('DELIMITER', ')')) {
            update = this.assignmentNoSemi();
        }
        this.consume('DELIMITER', "Expect ')' after for clauses.", ')');

        const body = this.blockStatement();

        return {
            type: 'ForStatement',
            init: init,
            condition: condition,
            update: update,
            body: body,
            line: forToken.line
        };
    }

    /**
     * Parses: "display" "(" Expression ")" ";"
     */
    displayStatement() {
        const displayToken = this.advance(); // consume 'display'
        this.consume('DELIMITER', "Expect '(' after 'display'.", '(');
        const argument = this.expression();
        this.consume('DELIMITER', "Expect ')' after expression.", ')');
        this.consume('DELIMITER', "Expect ';' after display statement.", ';');

        return {
            type: 'CallExpression',
            callee: 'display',
            args: [argument],
            line: displayToken.line
        };
    }

    /**
     * Parses: "input" "(" Expression ")" ";"
     */
    inputStatement() {
        const inputToken = this.advance(); // consume 'input'
        this.consume('DELIMITER', "Expect '(' after 'input'.", '(');
        const argument = this.expression();
        this.consume('DELIMITER', "Expect ')' after expression.", ')');
        this.consume('DELIMITER', "Expect ';' after input statement.", ';');

        return {
            type: 'CallExpression',
            callee: 'input',
            args: [argument],
            line: inputToken.line
        };
    }

    /* ==========================================
       EXPRESSION PARSING RULES
       ========================================== */

    expression() {
        return this.logicalOr();
    }

    logicalOr() {
        let expr = this.logicalAnd();
        while (this.match('OPERATOR', '||')) {
            const operator = this.previous();
            const right = this.logicalAnd();
            expr = {
                type: 'BinaryExpression',
                operator: operator.lexeme,
                left: expr,
                right: right,
                line: operator.line
            };
        }
        return expr;
    }

    logicalAnd() {
        let expr = this.equality();
        while (this.match('OPERATOR', '&&')) {
            const operator = this.previous();
            const right = this.equality();
            expr = {
                type: 'BinaryExpression',
                operator: operator.lexeme,
                left: expr,
                right: right,
                line: operator.line
            };
        }
        return expr;
    }

    equality() {
        let expr = this.relational();
        while (this.match('OPERATOR', '==') || this.match('OPERATOR', '!=')) {
            const operator = this.previous();
            const right = this.relational();
            expr = {
                type: 'BinaryExpression',
                operator: operator.lexeme,
                left: expr,
                right: right,
                line: operator.line
            };
        }
        return expr;
    }

    relational() {
        let expr = this.additive();
        while (this.match('OPERATOR', '<') || this.match('OPERATOR', '>') || 
              this.match('OPERATOR', '<=') || this.match('OPERATOR', '>=')) {
            const operator = this.previous();
            const right = this.additive();
            expr = {
                type: 'BinaryExpression',
                operator: operator.lexeme,
                left: expr,
                right: right,
                line: operator.line
            };
        }
        return expr;
    }

    additive() {
        let expr = this.multiplicative();
        while (this.match('OPERATOR', '+') || this.match('OPERATOR', '-')) {
            const operator = this.previous();
            const right = this.multiplicative();
            expr = {
                type: 'BinaryExpression',
                operator: operator.lexeme,
                left: expr,
                right: right,
                line: operator.line
            };
        }
        return expr;
    }

    multiplicative() {
        let expr = this.unary();
        while (this.match('OPERATOR', '*') || this.match('OPERATOR', '/') || this.match('OPERATOR', '%')) {
            const operator = this.previous();
            const right = this.unary();
            expr = {
                type: 'BinaryExpression',
                operator: operator.lexeme,
                left: expr,
                right: right,
                line: operator.line
            };
        }
        return expr;
    }

    unary() {
        if (this.match('OPERATOR', '!') || this.match('OPERATOR', '-')) {
            const operator = this.previous();
            const right = this.unary();
            return {
                type: 'UnaryExpression',
                operator: operator.lexeme,
                operand: right,
                line: operator.line
            };
        }
        return this.primary();
    }

    primary() {
        // Literals: Numbers
        if (this.match('NUMBER')) {
            const token = this.previous();
            const isDeci = token.lexeme.includes('.');
            return {
                type: 'Literal',
                value: parseFloat(token.lexeme),
                valueType: isDeci ? 'deci' : 'num',
                line: token.line
            };
        }

        // Literals: Strings & Chars
        if (this.match('STRING')) {
            const token = this.previous();
            const cleanValue = token.lexeme.substring(1, token.lexeme.length - 1);
            const isChar = token.lexeme.startsWith("'") && cleanValue.length === 1;
            return {
                type: 'Literal',
                value: cleanValue,
                valueType: isChar ? 'char' : 'string',
                line: token.line
            };
        }

        // Literals: Booleans
        if (this.match('KEYWORD', 'true')) {
            return {
                type: 'Literal',
                value: true,
                valueType: 'bool',
                line: this.previous().line
            };
        }
        if (this.match('KEYWORD', 'false')) {
            return {
                type: 'Literal',
                value: false,
                valueType: 'bool',
                line: this.previous().line
            };
        }

        // Function Calls as expressions
        if (this.match('KEYWORD', 'display') || this.match('KEYWORD', 'input')) {
            const calleeToken = this.previous();
            const callee = calleeToken.lexeme;
            this.consume('DELIMITER', `Expect '(' after '${callee}'.`, '(');
            const argument = this.expression();
            this.consume('DELIMITER', `Expect ')' after '${callee}' expression.`, ')');
            return {
                type: 'CallExpression',
                callee: callee,
                args: [argument],
                line: calleeToken.line
            };
        }

        // Grouping: ( Expression )
        if (this.match('DELIMITER', '(')) {
            const expr = this.expression();
            this.consume('DELIMITER', "Expect ')' after parenthesized expression.", ')');
            return expr;
        }

        // Variable references
        if (this.match('IDENTIFIER')) {
            const token = this.previous();
            return {
                type: 'Identifier',
                name: token.lexeme,
                line: token.line
            };
        }

        const token = this.peek();
        throw this.error(token, `Expect expression. Found '${token.lexeme}'`);
    }

    /* ==========================================
       PARSER UTILITY METHODS
       ========================================== */

    /**
     * Checks if current token is of type and optional lexeme
     */
    check(type, lexeme = null) {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        if (token.type !== type) return false;
        if (lexeme !== null && token.lexeme !== lexeme) return false;
        return true;
    }

    /**
     * Advances and returns true if current matches type and lexeme
     */
    match(type, lexeme = null) {
        if (this.check(type, lexeme)) {
            this.advance();
            return true;
        }
        return false;
    }

    /**
     * Advances token pointer if token is valid, else throws parse error
     */
    consume(type, message, lexeme = null) {
        if (this.check(type, lexeme)) {
            return this.advance();
        }
        throw this.error(this.peek(), message);
    }

    advance() {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    isAtEnd() {
        return this.peek().type === 'EOF' || this.current >= this.tokens.length;
    }

    peek() {
        if (this.current >= this.tokens.length) {
            return { type: 'EOF', lexeme: '', line: this.previous() ? this.previous().line : 1 };
        }
        return this.tokens[this.current];
    }

    previous() {
        return this.tokens[this.current - 1];
    }

    error(token, message) {
        const err = {
            line: token.line || 1,
            message: `${message} (Found '${token.lexeme}')`,
            type: 'SYNTAX_ERROR'
        };
        this.errors.push(err);
        return err;
    }

    /**
     * Discards tokens until statement boundaries to resume compile process
     */
    synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().lexeme === ';') return;

            const nextToken = this.peek();
            if (nextToken.type === 'KEYWORD') {
                switch (nextToken.lexeme) {
                    case 'num':
                    case 'deci':
                    case 'char':
                    case 'string':
                    case 'bool':
                    case 'when':
                    case 'while':
                    case 'for':
                    case 'display':
                    case 'input':
                        return;
                }
            }
            this.advance();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Parser;
}
