import * as ts from "typescript";

const program = ts.createProgram(["fixtures/test.ts"], {});

const source = program.getSourceFile("fixtures/test.ts");

if (source) {
  console.log(source.statements);

  console.log("--- declared function names ---");
  ts.forEachChild(source, (node) => {
    if (ts.isFunctionDeclaration(node)) {
      console.log(node.name && node.name.text);
    }
  });
}
