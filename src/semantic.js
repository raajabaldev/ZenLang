class SemanticAnalyzer {
    constructor() {
        this.scopes = []; // Stack of maps representing scope scopes
        this.errors = [];
    }

    /**
     * Entry point for semantic analysis
     * @param {Object} ast - AST node (usually 'Program')
     * @returns {Array} - List of semantic errors found
     */
    analyze(ast) {
        this.scopes = [new Map()]; // Push global scope
        this.errors = [];
        this.visit(ast);
        return this.errors;
    }

    /* ==========================================
       SCOPE CONTEXT MANAGEMENT
       ========================================== */

    pushScope() {
        this.scopes.push(new Map());
    }

    popScope() {
        this.scopes.pop();
    }

    declareVariable(name, type, line) {
        const currentScope = this.scopes[this.scopes.length - 1];
        if (currentScope.has(name)) {
            this.error(line, `Duplicate declaration: variable '${name}' is already declared in this scope.`);
            return;
        }
        currentScope.set(name, type);
    }

    lookupVariable(name) {
        // Search from local scope up to global scope
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(name)) {
                return this.scopes[i].get(name);
            }
        }
        return null;
    }

    error(line, message) {
        this.errors.push({
            line: line || 1,
            message: message,
            type: 'SEMANTIC_ERROR'
        });
    }

    checkTypeCompatibility(expected, actual) {
        if (expected === actual) return true;

        // An integer (num) can be assigned to a decimal (deci)
        if (expected === 'deci' && actual === 'num') {
            return true;
        }

        // A single character (char) can be assigned to a string
        if (expected === 'string' && actual === 'char') {
            return true;
        }

        return false;
    }

    /* ==========================================
       VISITOR METHODS
       ========================================== */

    visit(node) {
        if (!node) return null;

        switch (node.type) {
            case 'Program':
                node.body.forEach(stmt => this.visit(stmt));
                return null;

            case 'BlockStatement':
                this.pushScope();
                node.body.forEach(stmt => this.visit(stmt));
                this.popScope();
                return null;

            case 'VariableDeclaration': {
                let initType = null;
                if (node.value) {
                    initType = this.visit(node.value);
                }

                // Register name in scope
                this.declareVariable(node.name, node.varType, node.line);

                // Type check initialization
                if (initType && initType !== 'error') {
                    if (!this.checkTypeCompatibility(node.varType, initType)) {
                        this.error(node.line, `Type mismatch: cannot assign value of type '${initType}' to variable '${node.name}' of type '${node.varType}'.`);
                    }
                }
                return null;
            }

            case 'AssignmentExpression': {
                const varType = this.lookupVariable(node.name);
                if (!varType) {
                    this.error(node.line, `Undeclared variable: '${node.name}' must be declared before it can be assigned a value.`);
                    return 'error';
                }

                const valType = this.visit(node.value);
                if (valType && valType !== 'error') {
                    if (!this.checkTypeCompatibility(varType, valType)) {
                        this.error(node.line, `Type mismatch: cannot assign value of type '${valType}' to variable '${node.name}' of type '${varType}'.`);
                    }
                }
                return varType;
            }

            case 'IfStatement': {
                const condType = this.visit(node.condition);
                if (condType && condType !== 'bool' && condType !== 'error') {
                    this.error(node.line, `Condition in 'when' must evaluate to a boolean expression, got '${condType}' instead.`);
                }
                this.visit(node.thenBranch);
                if (node.elseBranch) {
                    this.visit(node.elseBranch);
                }
                return null;
            }

            case 'WhileStatement': {
                const condType = this.visit(node.condition);
                if (condType && condType !== 'bool' && condType !== 'error') {
                    this.error(node.line, `Condition in 'while' loop must evaluate to a boolean expression, got '${condType}' instead.`);
                }
                this.visit(node.body);
                return null;
            }

            case 'ForStatement': {
                // Initialize loop scope
                this.pushScope();

                if (node.init) {
                    this.visit(node.init);
                }
                if (node.condition) {
                    const condType = this.visit(node.condition);
                    if (condType && condType !== 'bool' && condType !== 'error') {
                        this.error(node.line, `Loop condition in 'for' must evaluate to a boolean expression, got '${condType}' instead.`);
                    }
                }
                if (node.update) {
                    this.visit(node.update);
                }

                // Visit loop body (BlockStatement handles its own nested scope inside this loop scope)
                this.visit(node.body);

                this.popScope();
                return null;
            }

            case 'CallExpression': {
                if (node.callee === 'display') {
                    if (node.args.length !== 1) {
                        this.error(node.line, `Built-in function 'display' expects exactly 1 argument, but got ${node.args.length}.`);
                    } else {
                        this.visit(node.args[0]);
                    }
                    return 'void';
                }
                if (node.callee === 'input') {
                    if (node.args.length > 1) {
                        this.error(node.line, `Built-in function 'input' expects at most 1 argument (prompt text), but got ${node.args.length}.`);
                    } else if (node.args.length === 1) {
                        const promptType = this.visit(node.args[0]);
                        if (promptType && promptType !== 'string' && promptType !== 'error') {
                            this.error(node.line, `Prompt argument for 'input' must be a string, got '${promptType}' instead.`);
                        }
                    }
                    // input returns string to represent entered value
                    return 'string';
                }
                return 'error';
            }

            case 'BinaryExpression': {
                const leftType = this.visit(node.left);
                const rightType = this.visit(node.right);

                if (leftType === 'error' || rightType === 'error') return 'error';

                const op = node.operator;

                // Logical Operations: &&, ||
                if (op === '&&' || op === '||') {
                    if (leftType !== 'bool' || rightType !== 'bool') {
                        this.error(node.line, `Logical operator '${op}' expects operands of type 'bool', but got '${leftType}' and '${rightType}'.`);
                        return 'error';
                    }
                    return 'bool';
                }

                // Equality Operations: ==, !=
                if (op === '==' || op === '!=') {
                    const isLeftNumeric = (leftType === 'num' || leftType === 'deci');
                    const isRightNumeric = (rightType === 'num' || rightType === 'deci');

                    if (isLeftNumeric && isRightNumeric) {
                        return 'bool';
                    }

                    if (leftType !== rightType) {
                        this.error(node.line, `Comparison operator '${op}' cannot compare value of type '${leftType}' with value of type '${rightType}'.`);
                        return 'error';
                    }
                    return 'bool';
                }

                // Relational Operations: <, >, <=, >=
                if (['<', '>', '<=', '>='].includes(op)) {
                    const isLeftNumeric = (leftType === 'num' || leftType === 'deci');
                    const isRightNumeric = (rightType === 'num' || rightType === 'deci');

                    if (!isLeftNumeric || !isRightNumeric) {
                        this.error(node.line, `Relational operator '${op}' expects numeric operands (num/deci), but got '${leftType}' and '${rightType}'.`);
                        return 'error';
                    }
                    return 'bool';
                }

                // Arithmetic Operations: +, -, *, /, %
                if (['+', '-', '*', '/', '%'].includes(op)) {
                    // String concatenation exception for '+'
                    if (op === '+' && (leftType === 'string' || rightType === 'string')) {
                        return 'string';
                    }

                    const isLeftNumeric = (leftType === 'num' || leftType === 'deci');
                    const isRightNumeric = (rightType === 'num' || rightType === 'deci');

                    if (!isLeftNumeric || !isRightNumeric) {
                        this.error(node.line, `Arithmetic operator '${op}' expects numeric operands, but got '${leftType}' and '${rightType}'.`);
                        return 'error';
                    }

                    // Numeric promotion
                    if (leftType === 'deci' || rightType === 'deci') {
                        return 'deci';
                    }
                    return 'num';
                }

                return 'error';
            }

            case 'UnaryExpression': {
                const operandType = this.visit(node.operand);
                if (operandType === 'error') return 'error';

                if (node.operator === '!') {
                    if (operandType !== 'bool') {
                        this.error(node.line, `Logical negation '!' expects operand of type 'bool', but got '${operandType}'.`);
                        return 'error';
                    }
                    return 'bool';
                }

                if (node.operator === '-') {
                    if (operandType !== 'num' && operandType !== 'deci') {
                        this.error(node.line, `Arithmetic negation '-' expects numeric operand, but got '${operandType}'.`);
                        return 'error';
                    }
                    return operandType;
                }

                return 'error';
            }

            case 'Literal':
                return node.valueType;

            case 'Identifier': {
                const varType = this.lookupVariable(node.name);
                if (!varType) {
                    this.error(node.line, `Undeclared variable: '${node.name}' has not been declared in the current scope.`);
                    return 'error';
                }
                return varType;
            }

            default:
                console.warn(`Unknown AST node type: ${node.type}`);
                return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SemanticAnalyzer;
}
