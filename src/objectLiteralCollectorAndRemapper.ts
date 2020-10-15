import * as ts from "typescript";
import hash from "object-hash";

function sortKeys(obj: Map<string, string | null>) {
  let sortedKeys = Array.from(obj.keys()).sort((key1, key2) => {
    if (key1 < key2) return -1;
    else if (key1 > key2) return +1;
    return 0;
  });

  const temp = new Map<string, string | null>();
  sortedKeys.forEach((key) => {
    const oriValue = obj.get(key);
    if (oriValue) temp.set(key, oriValue);
  });
  return temp;
}

export class ObjectLiteralTransformer {
  patterns = {} as { [index: string]: Map<string, string | null> }; // {"obj-hash": Map<name, type>}
  defineInterface: objectLiteralInterface = {}; // 用來作為轉換的定義，會以ori前綴的作為轉換的基準
  generatedConstObjCode = "";

  // 程式的來源與相關ts工具
  source: ts.SourceFile | undefined;
  program: ts.Program | undefined;
  checker: ts.TypeChecker | undefined;

  // defineInterface會定義objectLiteral的名稱以及各個屬性要轉換成什麼，屬性會以ori前綴來判定轉換的根據，如果沒有ori前綴的
  constructor(
    sourceFilePath: string,
    defineInterface?: objectLiteralInterface
  ) {
    if (defineInterface) this.defineInterface = defineInterface;

    this.program = ts.createProgram([sourceFilePath], {});
    this.checker = this.program.getTypeChecker();
    this.source = this.program.getSourceFile(sourceFilePath);
    if (!this.checker) throw "no checker";
    if (!this.source) throw "no source file";
  }

  convertMapsToObjects(mapInstance: Map<string, string | null>) {
    const obj: { [key: string]: string | null } = {};
    for (let prop of Array.from(mapInstance)) {
      const key = prop[0];
      obj[key] = prop[1];
    }
    return obj;
  }

  getPatternInterface(): string {
    // this.pattern {"obj-hash": Map<name, type>}
    const allPattern: {
      "obj-hash": string;
      "pattern-shape": { [key: string]: string | null };
    }[] = [];
    Object.entries(this.patterns).forEach((pattern) => {
      allPattern.push({
        "obj-hash": pattern[0],
        "pattern-shape": this.convertMapsToObjects(pattern[1]),
      });
    });
    return JSON.stringify(allPattern, null);
  }

  literalObjPatternCollector<T extends ts.Node>(): ts.TransformerFactory<T> {
    return (context) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isObjectLiteralExpression(node)) {
          let pattern = new Map<string, string | null>();

          ts.forEachChild(node, (child) => {
            if (ts.isObjectLiteralElement(child)) {
              // node may is PropertyAssignment
              let id = "";
              ts.forEachChild(child, (dchild) => {
                if (ts.isIdentifier(dchild)) {
                  id = dchild.text;
                  pattern.set(id, null);
                } else {
                  if (ts.isNumericLiteral(dchild)) {
                    pattern.set(id, "number");
                  } else if (ts.isStringLiteral(dchild)) {
                    pattern.set(id, "string");
                  }
                }
              });
            }
          });
          // 由於擁有相同的property但property順序不同的物件會產生不同的雜湊值，所以使用hash來判斷物件屬性相異與否會有問題
          // 產生一個新的物件，會按照key排序
          // TODO: 目前如果是多層嵌套的這樣的做法還是會有問題
          let sortedPattern = sortKeys(pattern);
          const hashValue = hash(sortedPattern);
          if (!this.patterns[hashValue]) {
            this.patterns[hashValue] = sortedPattern;
          }
        }

        return ts.visitEachChild(node, (child) => visit(child), context);
      };

      return (node) => ts.visitNode(node, visit);
    };
  }

  generatedReferenceConstObj() {
    const constObjs = Object.entries(this.defineInterface);
    const variableStmts: ts.VariableStatement[] = [];
    constObjs.forEach((obj) => {
      const propertyAssignments: ts.PropertyAssignment[] = [];
      Object.entries(obj[1].defines).forEach((props) => {
        const levelTwoPropsAssignments: ts.PropertyAssignment[] = [];
        Object.entries(props[1]).forEach((prop) => {
          if (
            !prop[0].includes("ori") &&
            !(prop[0].charAt(3) === prop[0].charAt(3).toLocaleUpperCase())
          ) {
            let valueLiteral;
            if (typeof prop[1] === "string") {
              valueLiteral = ts.createStringLiteral(prop[1]);
            } else if (typeof prop[1] === "number") {
              valueLiteral = ts.createNumericLiteral(prop[1].toString());
            } else {
              throw "cannot generate property's value literal";
            }
            levelTwoPropsAssignments.push(
              ts.createPropertyAssignment(
                ts.createIdentifier(prop[0]),
                valueLiteral
              )
            );
          }
        });
        propertyAssignments.push(
          ts.createPropertyAssignment(
            ts.createIdentifier(props[0]),
            ts.createObjectLiteral(levelTwoPropsAssignments, true)
          )
        );
      });
      variableStmts.push(
        ts.createVariableStatement(
          undefined,
          ts.createVariableDeclarationList(
            [
              ts.createVariableDeclaration(
                ts.createIdentifier(obj[1].name),
                ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword),
                ts.createObjectLiteral(propertyAssignments, true)
              ),
            ],
            ts.NodeFlags.Const
          )
        )
      );
    });
    const printer: ts.Printer = ts.createPrinter();
    let code = "";
    variableStmts.forEach((stmt) => {
      code += printer.printNode(ts.EmitHint.Unspecified, stmt, this.source!);
    });
    return code;
  }

  objRemappingTransformer<T extends ts.Node>(): ts.TransformerFactory<T> {
    if (Object.keys(this.defineInterface).length === 0) {
      throw Error("defineInterface is empty");
    }

    this.generatedConstObjCode = this.generatedReferenceConstObj();

    return (context) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isObjectLiteralExpression(node)) {
          let objPattern = new Map<string, string | null>();
          let objLiteral = new Map<string, any>();
          ts.forEachChild(node, (child) => {
            if (ts.isObjectLiteralElement(child)) {
              let id = "";
              ts.forEachChild(child, (dChild) => {
                if (ts.isIdentifier(dChild)) {
                  id = dChild.getText();
                  objPattern.set(dChild.getText(), null);
                  objLiteral.set(dChild.getText(), null);
                } else {
                  if (ts.isNumericLiteral(dChild)) {
                    objPattern.set(id, "number");
                    const value = dChild.getText();
                    if (value) {
                      objLiteral.set(id, parseInt(dChild.getText()));
                    } else {
                      objLiteral.set(id, dChild.getText());
                    }
                  } else if (ts.isStringLiteral(dChild)) {
                    objPattern.set(id, "string");
                    const value = dChild
                      .getText()
                      .substr(1, dChild.getText().length - 2); // 要把雙引號去掉
                    objLiteral.set(id, value);
                  }
                }
              });
            }
          });
          let sortedPattern = sortKeys(objPattern);
          const hashValue = hash(sortedPattern);
          const patternCandidates = this.defineInterface[hashValue];
          const identifierProp = patternCandidates.identifierProp;
          const oriKey =
            "ori" +
            identifierProp.charAt(0).toLocaleUpperCase() +
            identifierProp.slice(1);
          let candidate = Object.entries(patternCandidates.defines).find(
            (candidate) => {
              // 先檢查做為識別的屬性是否出現ori前綴，如果沒有，就是將其抽離出來再引用；
              // 如果有ori前綴，也是抽離出來再引用，不過定義為新的code
              if (candidate[1][oriKey]) {
                if (candidate[1][oriKey] === objLiteral.get(identifierProp)) {
                  return true;
                }
              } else {
                if (
                  candidate[1][identifierProp] ===
                  objLiteral.get(identifierProp)
                ) {
                  return true;
                }
              }
              return false;
            }
          );
          if (candidate) {
            console.log(candidate);
            return ts.createPropertyAccess(
              ts.createIdentifier(patternCandidates.name),
              ts.createIdentifier(candidate[0])
            );
          }
        }

        return ts.visitEachChild(node, (child) => visit(child), context);
      };
      return (node) => ts.visitNode(node, visit);
    };
  }
}
