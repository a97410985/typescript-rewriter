import * as path from "path";
import * as ts from "typescript";

const outputPath = path.resolve(__dirname, "output/2-print-code.ts");

const source = ts.createSourceFile(outputPath, "", ts.ScriptTarget.Latest);

const ast = ts.createVariableDeclarationList(
  [
    ts.createVariableDeclaration(
      ts.createIdentifier("test"),
      ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      ts.createLiteral("hello!")
    ),
  ],
  ts.NodeFlags.Const
);

const printer = ts.createPrinter();
const code = printer.printNode(ts.EmitHint.Unspecified, ast, source);
console.log(code);
