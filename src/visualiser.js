class ASTVisualizer {
    /**
     * Renders AST nodes inside a target DOM element
     * @param {Object} ast - Program AST root node
     * @param {HTMLElement} container - DOM container element
     */
    static render(ast, container) {
        container.innerHTML = '';
        if (!ast) {
            container.innerHTML = '<div class="console-message warning">No AST generated yet. Run compilation.</div>';
            return;
        }

        const treeRoot = this.createNodeDom(ast);
        container.appendChild(treeRoot);
    }

    /**
     * Recursively constructs the tree structure using HTML DOM nodes
     * @param {Object} node - AST node to translate to HTML
     * @param {string} [branchName=""] - Optional branch label for structure context (e.g., 'Condition', 'Body')
     */
    static createNodeDom(node, branchName = "") {
        if (!node) return document.createTextNode('');

        const nodeEl = document.createElement('div');
        nodeEl.className = 'ast-node';

        const headerEl = document.createElement('div');
        headerEl.className = 'ast-header';

        const { title, icon, children } = this.getNodeMeta(node);

        // Toggle Expand/Collapse button
        const toggleEl = document.createElement('span');
        toggleEl.className = 'ast-toggle';
        if (children && children.length > 0) {
            toggleEl.innerHTML = '▼';
            toggleEl.classList.add('collapsible');
        } else {
            toggleEl.innerHTML = '•';
        }

        // Branch Prefix (e.g., "Condition: ")
        const branchEl = document.createElement('span');
        if (branchName) {
            branchEl.className = 'ast-branch-name';
            branchEl.textContent = `${branchName}: `;
        }

        // Icon
        const iconEl = document.createElement('span');
        iconEl.className = 'ast-icon';
        iconEl.textContent = icon;

        // Title
        const titleEl = document.createElement('span');
        titleEl.className = 'ast-title';
        titleEl.textContent = title;

        headerEl.appendChild(toggleEl);
        if (branchName) headerEl.appendChild(branchEl);
        headerEl.appendChild(iconEl);
        headerEl.appendChild(titleEl);
        nodeEl.appendChild(headerEl);

        // Render children
        if (children && children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'ast-children';

            children.forEach(child => {
                if (child.node) {
                    const childDom = this.createNodeDom(child.node, child.label);
                    childrenContainer.appendChild(childDom);
                }
            });

            nodeEl.appendChild(childrenContainer);

            // Collapsible listener
            headerEl.addEventListener('click', (e) => {
                // Prevent bubbling on nested header clicks
                e.stopPropagation();
                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'block';
                    toggleEl.innerHTML = '▼';
                } else {
                    childrenContainer.style.display = 'none';
                    toggleEl.innerHTML = '▶';
                }
            });
        }

        return nodeEl;
    }

    /**
     * Maps an AST node to visual titles, icons, and children configurations
     * @param {Object} node - AST node
     */
    static getNodeMeta(node) {
        let title = node.type;
        let icon = '📄';
        let children = [];

        switch (node.type) {
            case 'Program':
                title = 'Program';
                icon = '📁';
                children = node.body.map((stmt, idx) => ({ node: stmt, label: `Stmt[${idx}]` }));
                break;

            case 'BlockStatement':
                title = 'Block Statement';
                icon = '📦';
                children = node.body.map((stmt, idx) => ({ node: stmt, label: `Body[${idx}]` }));
                break;

            case 'VariableDeclaration':
                title = `Declare ${node.name} (${node.varType})`;
                icon = '🔑';
                if (node.value) {
                    children.push({ node: node.value, label: 'Initializer' });
                }
                break;

            case 'AssignmentExpression':
                title = `Assign ${node.name}`;
                icon = '📝';
                children.push({ node: node.value, label: 'Value' });
                break;

            case 'BinaryExpression':
                title = `Binary Op: ${node.operator}`;
                icon = '⚖️';
                children.push({ node: node.left, label: 'Left' });
                children.push({ node: node.right, label: 'Right' });
                break;

            case 'UnaryExpression':
                title = `Unary Op: ${node.operator}`;
                icon = '➕';
                children.push({ node: node.operand, label: 'Operand' });
                break;

            case 'Literal':
                // Check if string contains quotes, format nicely
                const valStr = typeof node.value === 'string' ? `"${node.value}"` : node.value;
                title = `Literal: ${valStr} (${node.valueType})`;
                icon = '💎';
                break;

            case 'Identifier':
                title = `Identifier: ${node.name}`;
                icon = '🆔';
                break;

            case 'IfStatement':
                title = 'When';
                icon = '🔀';
                children.push({ node: node.condition, label: 'Condition' });
                children.push({ node: node.thenBranch, label: 'Then' });
                if (node.elseBranch) {
                    children.push({ node: node.elseBranch, label: 'Else' });
                }
                break;

            case 'WhileStatement':
                title = 'While Loop';
                icon = '🔁';
                children.push({ node: node.condition, label: 'Condition' });
                children.push({ node: node.body, label: 'Body' });
                break;

            case 'ForStatement':
                title = 'For Loop';
                icon = '🔄';
                if (node.init) children.push({ node: node.init, label: 'Init' });
                if (node.condition) children.push({ node: node.condition, label: 'Condition' });
                if (node.update) children.push({ node: node.update, label: 'Update' });
                children.push({ node: node.body, label: 'Body' });
                break;

            case 'CallExpression':
                title = `Call: ${node.callee}()`;
                icon = '📞';
                children = node.args.map((arg, idx) => ({ node: arg, label: `Arg[${idx}]` }));
                break;
        }

        return { title, icon, children };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ASTVisualizer;
}
