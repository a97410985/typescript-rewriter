import ts from "typescript";
import hash from "object-hash";

const source = `
    const two = 2;
    const four = 4;
`;

const source2 = `
const obj = {
    code: 100,
    message: "network error"
}
`;

const source3 = `
const obj = {
  code: 100,
  message: "network error"
}
const obj2 = {
  message: "login error",
  code: 200
}
`;

const source4 = `
const obj = {
  code: 100,
  message: "network error"
}
if (obj.code === 100) {
  // ...
}
`;

const defineInterface = {
  "540ed81a49e41e6c3afa82f0f05f8576b730cc1e": {
    networkAccessError: {
      oriCode: 100,
      code: 8901,
      message: "network access error",
    },
    loginError: {
      oriCode: 200,
      code: 8902,
      message: "account login error",
    },
  },
} as { [index: string]: any };

// 先管理單一個pattern，生出一個const object介面，然後提供引用常數物件的函數
class referenceManager {
  generatedObjName: string;
  patternHash: string;
  constructor(patternHash: string, generatedObjName: string) {
    this.generatedObjName = generatedObjName;
    this.patternHash = patternHash;
  }

  generatedReferenceConstObj(defineInterface: { [index: string]: any }) {
    ts.createVariableStatement(
      [ts.createModifier(ts.SyntaxKind.ConstKeyword)],
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            ts.createIdentifier("testVar"),
            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.createStringLiteral("test")
          ),
        ],
        ts.NodeFlags.Const
      )
    );
  }

  makeReferenceConstObj(
    defineInterface: {
      [index: string]: any;
    },
    objLiteral: Map<string, any>
  ): ts.PropertyAccessExpression {
    // 目前先寫死用code判斷引用哪個東東
    let targetCode = objLiteral.get("code");
    let candidates = defineInterface[this.patternHash] as {
      [index: string]: any;
    };
    let matchObj = Object.entries(candidates).find(
      (candidate) => candidate[1].oriCode === targetCode
    );
    console.log("matchObj : ", matchObj);
    if (!matchObj) throw Error("no match");
    return ts.createPropertyAccess(
      ts.createIdentifier(this.generatedObjName),
      ts.createIdentifier(matchObj[0])
    );
    // return ts.createCall(ts.createIdentifier("foo"), undefined, undefined);
    // return ts.createObjectLiteral();
  }
}

function numberTransformer<T extends ts.Node>(): ts.TransformerFactory<T> {
  return (context) => {
    const visit: ts.Visitor = (node) => {
      if (ts.isNumericLiteral(node)) {
        return ts.createStringLiteral(node.text);
      }
      return ts.visitEachChild(node, (child) => visit(child), context);
    };
    return (node) => ts.visitNode(node, visit);
  };
}

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
let patterns = {} as { [index: string]: Map<string, string | null> };

export function literalObjPatternCollector<
  T extends ts.Node
>(): ts.TransformerFactory<T> {
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
        if (!patterns[hashValue]) {
          patterns[hashValue] = sortedPattern;
        }
      }

      return ts.visitEachChild(node, (child) => visit(child), context);
    };

    return (node) => ts.visitNode(node, visit);
  };
}

export function objRemappingTransformer<
  T extends ts.Node
>(): ts.TransformerFactory<T> {
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
        const patternCandidates = defineInterface[hashValue];
        // 先用code來做比對，照理來說應該可以客製化比對的欄位
        // ori前綴的會是作為轉換基準的參考
        let oriKey = "code";
        let referenceKey =
          "ori" + oriKey.charAt(0).toLocaleUpperCase() + oriKey.slice(1);
        console.log(
          "Object.entries(patternCandidates): ",
          Object.entries(patternCandidates)
        );

        const patternCandidateEntries = Object.entries(patternCandidates);
        let candidate: any = Object.entries(patternCandidates).find(
          (candidate: any) => {
            if (candidate[1][referenceKey] === objLiteral.get(oriKey)) {
              return true;
            }
            return false;
          }
        );
        if (candidate) {
          // 在這裡可以有兩種想做的事情，一個是把code換掉
          const manager = new referenceManager(
            "540ed81a49e41e6c3afa82f0f05f8576b730cc1e",
            "ErrorType"
          );

          console.log(
            "aaaaaaaa : ",
            manager.makeReferenceConstObj(defineInterface, objLiteral)
          );
          return manager.makeReferenceConstObj(defineInterface, objLiteral);

          // console.log("candidate : ", candidate);
          // objLiteral.set(oriKey, candidate[1][oriKey]);
          // // 建立新的object literal
          // const propertyAssignments: ts.PropertyAssignment[] = [];
          // objLiteral.forEach((value, key) => {
          //   propertyAssignments.push(
          //     ts.createPropertyAssignment(key, ts.createLiteral(value))
          //   );
          // });
          // return ts.createObjectLiteral(propertyAssignments);
        }
      }
      return ts.visitEachChild(node, (child) => visit(child), context);
    };
    return (node) => ts.visitNode(node, visit);
  };
}

let result = ts.transpileModule(source3, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
  transformers: {
    before: [literalObjPatternCollector(), objRemappingTransformer()],
  },
});
const printer: ts.Printer = ts.createPrinter();
console.log("===result code===\n", result.outputText);
console.log("patterns : ", patterns);
``;
