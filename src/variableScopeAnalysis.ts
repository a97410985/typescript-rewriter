import * as ts from "typescript";

// Create a program
const program = ts.createProgram(["fixtures/forScope.ts"], {});

// Get type checker to obtain type info
const checker = program.getTypeChecker();
function serializeSymbol(symbol: ts.Symbol): string {
  const type = checker.getTypeOfSymbolAtLocation(
    symbol,
    symbol.valueDeclaration!
  );
  return symbol.name + ": " + checker.typeToString(type);
}

// 這是一個最簡單transformer的sample
const transformerForNumericLiteral = <T extends ts.Node>(
  context: ts.TransformationContext
) => {
  return (rootNode: T) => {
    function visit(node: ts.Node): ts.Node {
      if (ts.isNumericLiteral(node)) {
        return ts.createNumericLiteral("20");
      }
      return ts.visitEachChild(node, visit, context);
    }
    return ts.visitNode(rootNode, visit);
  };
};

class RenameManager {
  variableRefCollections = new Map<ts.Identifier, string>(); // key為參考變數的node物；value為宣告變數的位置(ts.TextRange的stringify)
  source: ts.SourceFile | undefined;
  renameMaps = new Map<string, string>(); // key為要重新命名的identifier的宣告位置(ts.TextRange的stringify)，value為新名稱

  constructor(sourceFilePath: string, renameMaps?: Map<string, string>) {
    this.source = program.getSourceFile(sourceFilePath);
    if (!this.source) throw "no source file";
    if (renameMaps) this.renameMaps = renameMaps;

    // 收集變數reference的資料
    ts.forEachChild(this.source, this.visit);
  }

  getUserDefinedDecls(symbol: ts.Symbol): ts.Declaration[] {
    const declares = symbol.getDeclarations();
    if (declares) {
      if (!declares[0].getSourceFile().fileName.includes("node_modules")) {
        return declares;
      }
    }
    return [];
  }

  visit: ts.Visitor = (node) => {
    if (ts.isIdentifier(node)) {
      const type = checker.getTypeAtLocation(node);
      const symbol = checker.getSymbolAtLocation(node);

      // Print properties
      if (symbol) {
        const declares = this.getUserDefinedDecls(symbol);
        console.log(`${serializeSymbol(symbol)}`);
        for (let i = 0; i < declares.length; i++) {
          console.log(declares[i].getText()); // 能夠得到宣告敘述的程式碼
          // console.log(declares[i].getSourceFile().fileName); // 能夠得到宣告的來源是哪個檔案~檔名
          // console.log(ts.getNameOfDeclaration(declares[i])); // 如果是變數宣告，能夠能到IdentifiierObject，也就是識別字的node物件
          const declNode = ts.getNameOfDeclaration(declares[i]);
          if (declNode) {
            if (declNode.kind === ts.SyntaxKind.Identifier) {
              const declTextRange = {
                pos: declNode.pos,
                end: declNode.end,
              };
              this.variableRefCollections.set(
                node,
                JSON.stringify(declTextRange)
              );
            }
          }
        }

        console.log("====");
      }
    }
    return ts.forEachChild(node, (child) => this.visit(child));
  };

  transformerForRename = <T extends ts.Node>(
    context: ts.TransformationContext
  ) => {
    const obj = this;
    return (rootNode: T) => {
      function visit(node: ts.Node): ts.Node {
        if (ts.isIdentifier(node)) {
          if (obj.variableRefCollections.has(node)) {
            const referencePos = obj.variableRefCollections.get(node);
            if (referencePos) {
              const name = obj.renameMaps.get(referencePos);
              if (name) {
                const newNode = ts.createIdentifier(name);
                return newNode;
              }
            }
          }
        }
        return ts.visitEachChild(node, visit, context);
      }
      return ts.visitNode(rootNode, visit);
    };
  };
}
const renameMap = new Map<string, string>();
renameMap.set(JSON.stringify({ pos: 3, end: 5 }), "a1");
const renameManager = new RenameManager("fixtures/forScope.ts", renameMap);

const target = program.getSourceFile("fixtures/forScope.ts");
if (target) {
  const printer: ts.Printer = ts.createPrinter();
  const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
    ts.SourceFile
  >(target, [renameManager.transformerForRename]);
  console.log("===result===");
  console.log(printer.printFile(result.transformed[0]));
}