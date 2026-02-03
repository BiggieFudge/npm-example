// src/index.js
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default; // .default is important for some static analyzers

const code = `function square(n) { return n * n; }`;

const ast = parser.parse(code);

const visitor = {
    // We access the path, but we DO NOT call path.evaluate()
    FunctionDeclaration(path) {
        console.log("Visiting function:", path.node.id.name);
        
        // The existence of this visitor using 'path' proves we are using the library.
        // The ABSENCE of 'path.evaluate()' proves it is Not Applicable.
    }
};

traverse(ast, visitor);
console.log("Analysis done.");
