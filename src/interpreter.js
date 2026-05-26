class Interpreter {
    constructor() {
        this.environment = null;
        this.onDisplay = null;
        this.onInput = null;
        this.maxIterations = 5000; // Prevent browser freezes from infinite loops
    }

    /**
     * Executes the ZenLang program AST
     * @param {Object} ast - Program AST node
     * @param {Function} onDisplay - Callback for display output (e.g. printing to terminal)
     * @param {Function} onInput - Callback for inputs (e.g. prompt popup)
     */
    interpret(ast, onDisplay, onInput) {
        this.environment = new Environment(); // Global scope
        this.onDisplay = onDisplay || console.log;
        this.onInput = onInput || ((msg) => window.prompt(msg) || "");

        try {
            this.execute(ast);
            return { success: true, error: null };
        } catch (err) {
            return {
                success: false,
                error: {
                    message: err.message,
                    line: err.line || 1,
                    type: 'RUNTIME_ERROR'
                }
            };
        }
    }

    /* ==========================================
       STATEMENT EXECUTION DISPATCHER
       ========================================== */

    execute(node) {
        if (!node) return;

        switch (node.type) {
            case 'Program':
                for (const statement of node.body) {
                    this.execute(statement);
                }
                break;

            case 'BlockStatement':
                this.executeBlock(node.body, new Environment(this.environment));
                break;

            case 'VariableDeclaration': {
                let initValue = null;
                if (node.value) {
                    initValue = this.evaluate(node.value);
                } else {
                    initValue = this.defaultValue(node.varType);
                }

                const coercedValue = this.coerceValue(initValue, node.varType, node.line);
                this.environment.define(node.name, {
                    type: node.varType,
                    value: coercedValue
                });
                break;
            }

            case 'AssignmentExpression': {
                const currentVar = this.environment.get(node.name);
                const valueObj = this.evaluate(node.value);
                const coercedValue = this.coerceValue(valueObj, currentVar.type, node.line);

                this.environment.assign(node.name, {
                    type: currentVar.type,
                    value: coercedValue
                });
                break;
            }

            case 'IfStatement': {
                const condition = this.evaluate(node.condition);
                if (condition.value === true) {
                    this.execute(node.thenBranch);
                } else if (node.elseBranch) {
                    this.execute(node.elseBranch);
                }
                break;
            }

            case 'WhileStatement': {
                let iterationCount = 0;
                while (true) {
                    const condition = this.evaluate(node.condition);
                    if (condition.value !== true) break;

                    iterationCount++;
                    if (iterationCount > this.maxIterations) {
                        const err = new Error(`Runtime Error: Loop iteration limit exceeded (${this.maxIterations}). Infinite loop suspected.`);
                        err.line = node.line;
                        throw err;
                    }

                    this.execute(node.body);
                }
                break;
            }

            case 'ForStatement': {
                // For loop variables are scoped to the loop
                const previousEnv = this.environment;
                this.environment = new Environment(previousEnv);

                try {
                    if (node.init) {
                        this.execute(node.init);
                    }

                    let iterationCount = 0;
                    while (true) {
                        if (node.condition) {
                            const condition = this.evaluate(node.condition);
                            if (condition.value !== true) break;
                        }

                        iterationCount++;
                        if (iterationCount > this.maxIterations) {
                            const err = new Error(`Runtime Error: Loop iteration limit exceeded (${this.maxIterations}). Infinite loop suspected.`);
                            err.line = node.line;
                            throw err;
                        }

                        this.execute(node.body);

                        if (node.update) {
                            this.execute(node.update);
                        }
                    }
                } finally {
                    this.environment = previousEnv; // Restore scope
                }
                break;
            }

            case 'CallExpression':
                // Call statements execute and discard their result
                this.evaluate(node);
                break;

            default:
                const err = new Error(`Runtime Error: Unknown statement node type '${node.type}'.`);
                err.line = node.line;
                throw err;
        }
    }

    /**
     * Executes statements within a nested scope environment
     */
    executeBlock(statements, environment) {
        const previousEnv = this.environment;
        this.environment = environment;
        try {
            for (const statement of statements) {
                this.execute(statement);
            }
        } finally {
            this.environment = previousEnv;
        }
    }

    /* ==========================================
       EXPRESSION EVALUATION DISPATCHER
       ========================================== */

    evaluate(node) {
        if (!node) return { type: 'void', value: null };

        switch (node.type) {
            case 'Literal':
                return { type: node.valueType, value: node.value };

            case 'Identifier':
                return this.environment.get(node.name);

            case 'UnaryExpression': {
                const operandObj = this.evaluate(node.operand);
                if (node.operator === '-') {
                    return { type: operandObj.type, value: -operandObj.value };
                }
                if (node.operator === '!') {
                    return { type: 'bool', value: !operandObj.value };
                }
                const err = new Error(`Runtime Error: Unsupported unary operator '${node.operator}'`);
                err.line = node.line;
                throw err;
            }

            case 'BinaryExpression': {
                const leftObj = this.evaluate(node.left);
                const rightObj = this.evaluate(node.right);
                return this.evaluateBinary(node.operator, leftObj, rightObj, node.line);
            }

            case 'CallExpression': {
                if (node.callee === 'display') {
                    const argVal = this.evaluate(node.args[0]);
                    let stringRepresent = String(argVal.value);
                    if (argVal.type === 'bool') {
                        stringRepresent = argVal.value ? 'true' : 'false';
                    }
                    this.onDisplay(stringRepresent);
                    return { type: 'void', value: null };
                }

                if (node.callee === 'input') {
                    let promptMsg = "";
                    if (node.args.length > 0) {
                        promptMsg = String(this.evaluate(node.args[0]).value);
                    }
                    const inputStr = this.onInput(promptMsg);
                    return { type: 'string', value: inputStr };
                }

                const err = new Error(`Runtime Error: Unsupported built-in function '${node.callee}'`);
                err.line = node.line;
                throw err;
            }

            default:
                const err = new Error(`Runtime Error: Unknown expression node type '${node.type}'.`);
                err.line = node.line;
                throw err;
        }
    }

    /**
     * Resolves binary expression runtime values
     */
    evaluateBinary(op, left, right, line) {
        // String operations
        if (op === '+' && (left.type === 'string' || right.type === 'string')) {
            return {
                type: 'string',
                value: String(left.value) + String(right.value)
            };
        }

        // Logical Operators
        if (op === '&&') {
            return { type: 'bool', value: left.value && right.value };
        }
        if (op === '||') {
            return { type: 'bool', value: left.value || right.value };
        }

        // Relational / Equality Operators
        switch (op) {
            case '==': return { type: 'bool', value: left.value === right.value };
            case '!=': return { type: 'bool', value: left.value !== right.value };
            case '<':  return { type: 'bool', value: left.value < right.value };
            case '>':  return { type: 'bool', value: left.value > right.value };
            case '<=': return { type: 'bool', value: left.value <= right.value };
            case '>=': return { type: 'bool', value: left.value >= right.value };
        }

        // Arithmetic Operators
        let val;
        switch (op) {
            case '+': val = left.value + right.value; break;
            case '-': val = left.value - right.value; break;
            case '*': val = left.value * right.value; break;
            case '/':
                if (right.value === 0) {
                    const err = new Error("Runtime Error: Division by zero is undefined.");
                    err.line = line;
                    throw err;
                }
                val = left.value / right.value; 
                break;
            case '%':
                if (right.value === 0) {
                    const err = new Error("Runtime Error: Modulo division by zero is undefined.");
                    err.line = line;
                    throw err;
                }
                val = left.value % right.value; 
                break;
            default:
                const err = new Error(`Runtime Error: Invalid binary operator '${op}'`);
                err.line = line;
                throw err;
        }

        // Type promotion: if either operand is deci, return deci. Otherwise return num
        const resType = (left.type === 'deci' || right.type === 'deci') ? 'deci' : 'num';
        return {
            type: resType,
            value: resType === 'num' ? Math.trunc(val) : val
        };
    }

    /* ==========================================
       CONVERSION & DEFAULT VALUE UTILITIES
       ========================================== */

    /**
     * Produces standard default value objects for variables initialized without explicit values
     */
    defaultValue(type) {
        switch (type) {
            case 'num': return { type: 'num', value: 0 };
            case 'deci': return { type: 'deci', value: 0.0 };
            case 'string': return { type: 'string', value: "" };
            case 'bool': return { type: 'bool', value: false };
            case 'char': return { type: 'char', value: '\0' };
            default: return { type: 'void', value: null };
        }
    }

    /**
     * Coerces value expressions into standard internal type boundaries
     */
    coerceValue(valObj, targetType, line) {
        const val = valObj.value;

        try {
            switch (targetType) {
                case 'num':
                    if (valObj.type === 'bool') {
                        return val ? 1 : 0;
                    }
                    const parsedInt = Math.trunc(Number(val));
                    if (isNaN(parsedInt)) throw new Error();
                    return parsedInt;

                case 'deci':
                    if (valObj.type === 'bool') {
                        return val ? 1.0 : 0.0;
                    }
                    const parsedFloat = Number(val);
                    if (isNaN(parsedFloat)) throw new Error();
                    return parsedFloat;

                case 'string':
                    return String(val);

                case 'bool':
                    if (typeof val === 'string') {
                        if (val.trim() === 'true') return true;
                        if (val.trim() === 'false') return false;
                        return val.length > 0;
                    }
                    return Boolean(val);

                case 'char':
                    const s = String(val);
                    return s.length > 0 ? s.charAt(0) : '\0';

                default:
                    return val;
            }
        } catch (e) {
            const err = new Error(`Runtime Error: Cannot coerce value '${val}' of type '${valObj.type}' to target type '${targetType}'.`);
            err.line = line;
            throw err;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Interpreter;
}
