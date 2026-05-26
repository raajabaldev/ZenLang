const Lexer = require('./src/lexer.js');
const Parser = require('./src/parser.js');
const SemanticAnalyzer = require('./src/semantic.js');
const Interpreter = require('./src/interpreter.js');
const Environment = require('./src/environment.js');

const tests = [
    {
        name: "Valid Basic Execution (Arithmetic & Coercion)",
        code: `
            num x = 10;
            deci pi = 3.14;
            deci result = x * pi;
            display(result);
        `,
        expectedSuccess: true,
        expectedOutput: ["31.4"],
        expectErrors: []
    },
    {
        name: "Type Mismatch Error (String to Num)",
        code: `
            num x = "hello";
        `,
        expectedSuccess: false,
        expectErrors: ["Type mismatch: cannot assign value of type 'string' to variable 'x' of type 'num'."]
    },
    {
        name: "Undeclared Variable Error",
        code: `
            y = 20;
        `,
        expectedSuccess: false,
        expectErrors: ["Undeclared variable: 'y' must be declared before it can be assigned a value."]
    },
    {
        name: "Duplicate Variable Declaration Error",
        code: `
            num x = 5;
            deci x = 10.5;
        `,
        expectedSuccess: false,
        expectErrors: ["Duplicate declaration: variable 'x' is already declared in this scope."]
    },
    {
        name: "While Loop Execution",
        code: `
            num i = 0;
            while (i < 3) {
                display(i);
                i = i + 1;
            }
        `,
        expectedSuccess: true,
        expectedOutput: ["0", "1", "2"],
        expectErrors: []
    }
];

let passedCount = 0;

console.log("====================================================");
console.log("RUNNING ZENLANG COMPILER TEST SUITE");
console.log("====================================================\n");

tests.forEach((test, idx) => {
    console.log(`Test ${idx + 1}: ${test.name}`);
    console.log("-".repeat(40));

    try {
        const lexer = new Lexer();
        const lexResult = lexer.tokenize(test.code);

        if (lexResult.errors.length > 0) {
            if (test.expectedSuccess) {
                throw new Error(`Lexical Errors occurred: ${JSON.stringify(lexResult.errors)}`);
            } else {
                console.log("✓ Caught expected Lexical errors.");
                passedCount++;
                return;
            }
        }

        const parser = new Parser(lexResult.tokens);
        const parseResult = parser.parse();

        if (parseResult.errors.length > 0) {
            if (test.expectedSuccess) {
                throw new Error(`Parser Errors occurred: ${JSON.stringify(parseResult.errors)}`);
            } else {
                console.log("✓ Caught expected Syntax errors.");
                passedCount++;
                return;
            }
        }

        const semanticAnalyzer = new SemanticAnalyzer();
        const semanticErrors = semanticAnalyzer.analyze(parseResult);

        if (semanticErrors.length > 0) {
            if (test.expectedSuccess) {
                throw new Error(`Semantic Errors occurred: ${JSON.stringify(semanticErrors)}`);
            } else {
                // Verify expected errors are captured
                const errorMsgs = semanticErrors.map(e => e.message);
                const matchedAll = test.expectErrors.every(expected => 
                    errorMsgs.some(actual => actual.includes(expected))
                );
                
                if (matchedAll) {
                    console.log("✓ Caught expected Semantic errors:");
                    errorMsgs.forEach(m => console.log(`   - ${m}`));
                    passedCount++;
                } else {
                    throw new Error(`Expected errors: ${test.expectErrors.join(", ")}, but got: ${errorMsgs.join(", ")}`);
                }
                return;
            }
        }

        if (!test.expectedSuccess) {
            throw new Error("Expected semantic analysis to fail, but it succeeded.");
        }

        // Test interpreter execution
        const interpreter = new Interpreter();
        const outputs = [];
        const interpResult = interpreter.interpret(
            parseResult,
            (val) => outputs.push(String(val)),
            () => "mock_input"
        );

        if (!interpResult.success) {
            throw new Error(`Runtime Error: ${interpResult.error.message}`);
        }

        // Verify outputs
        if (test.expectedOutput) {
            const matches = test.expectedOutput.length === outputs.length &&
                            test.expectedOutput.every((val, i) => val === outputs[i]);
            if (!matches) {
                throw new Error(`Output mismatch. Expected: ${JSON.stringify(test.expectedOutput)}, Got: ${JSON.stringify(outputs)}`);
            }
        }

        console.log("✓ Test passed successfully.");
        if (outputs.length > 0) {
            console.log(`  Console outputs: ${outputs.join(", ")}`);
        }
        passedCount++;

    } catch (err) {
        console.error(`✗ Test failed: ${err.message}`);
    }
    console.log();
});

console.log("====================================================");
console.log(`SUMMARY: ${passedCount}/${tests.length} tests passed.`);
console.log("====================================================");

if (passedCount !== tests.length) {
    process.exit(1);
} else {
    process.exit(0);
}
