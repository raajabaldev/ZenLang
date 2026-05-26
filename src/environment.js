class Environment {
    /**
     * @param {Environment} parent - The outer scope environment, or null for global scope
     */
    constructor(parent = null) {
        this.values = new Map();
        this.parent = parent;
    }

    /**
     * Declares a variable in the immediate local scope
     * @param {string} name - Variable name
     * @param {any} value - Variable initial value
     */
    define(name, value) {
        this.values.set(name, value);
    }

    /**
     * Resolves and retrieves the value of a variable, traversing scope layers
     * @param {string} name - Variable name
     * @returns {any} - Variable value
     */
    get(name) {
        if (this.values.has(name)) {
            return this.values.get(name);
        }

        if (this.parent !== null) {
            return this.parent.get(name);
        }

        throw new Error(`Runtime Error: Variable '${name}' is not defined.`);
    }

    /**
     * Updates the value of an existing variable, traversing to the scope of definition
     * @param {string} name - Variable name
     * @param {any} value - New value
     */
    assign(name, value) {
        if (this.values.has(name)) {
            this.values.set(name, value);
            return;
        }

        if (this.parent !== null) {
            this.parent.assign(name, value);
            return;
        }

        throw new Error(`Runtime Error: Variable '${name}' is not defined.`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Environment;
}
