import ts from "typescript";

const printer: ts.Printer = ts.createPrinter();
const sourceFile: ts.SourceFile = ts.createSourceFile(
  "test.ts",
  "const x : number = 42",
  ts.ScriptTarget.ES2015,
  true,
  ts.ScriptKind.TS
);
const add = ts.createAdd(ts.createLiteral(42), ts.createLiteral(50));
const display = ts.createArrayLiteral(
  [ts.createLiteral("a"), ts.createLiteral("b")],
  true
);
const arrowFunction = ts.createArrowFunction(
  [],
  [],
  [
    ts.createParameter(
      [],
      [],
      undefined,
      "x",
      undefined,
      ts.createTypeReferenceNode("number", [])
    ),
  ],
  ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  undefined,
  ts.createLiteral(42)
);
const arrayTypeNode = ts.createArrayTypeNode(
  ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
);
const assignment = ts.createAssignment(
  ts.createIdentifier("firstName"),
  ts.createLiteral("kevin")
);
const result = printer.printNode(
  ts.EmitHint.Unspecified,
  assignment,
  sourceFile
);
console.log(result);
