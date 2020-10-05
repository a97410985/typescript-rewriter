"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_1 = __importDefault(require("typescript"));
var object_hash_1 = __importDefault(require("object-hash"));
var source = "\n    const two = 2;\n    const four = 4;\n";
var source2 = "\nconst obj = {\n    code: 100,\n    message: \"network error\"\n}\n";
var source3 = "\nconst obj = {\n  code: 100,\n  message: \"network error\"\n}\nconst obj2 = {\n  message: \"login error\",\n  code: 200\n}\n";
var source4 = "\nconst obj = {\n  code: 100,\n  message: \"network error\"\n}\nif (obj.code === 100) {\n  // ...\n}\n";
var defineInterface = {
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
};
// 先管理單一個pattern，生出一個const object介面，然後提供引用的函數
var referenceManager = /** @class */ (function () {
    function referenceManager(patternHash, generatedObjName) {
        this.generatedObjName = generatedObjName;
        this.patternHash = patternHash;
    }
    referenceManager.prototype.generatedReferenceConstObj = function (defineInterface) {
        typescript_1.default.createVariableStatement([typescript_1.default.createModifier(typescript_1.default.SyntaxKind.ConstKeyword)], typescript_1.default.createVariableDeclarationList([
            typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier("testVar"), typescript_1.default.createKeywordTypeNode(typescript_1.default.SyntaxKind.StringKeyword), typescript_1.default.createStringLiteral("test")),
        ], typescript_1.default.NodeFlags.Const));
    };
    referenceManager.prototype.makeReferenceConstObj = function (defineInterface, objLiteral) {
        // 目前先寫死用code判斷引用哪個東東
        var targetCode = objLiteral.get("code");
        var candidates = defineInterface[this.patternHash];
        var matchObj = Object.entries(candidates).find(function (candidate) { return candidate[1].oriCode === targetCode; });
        console.log("matchObj : ", matchObj);
        if (!matchObj)
            throw Error("no match");
        return typescript_1.default.createPropertyAccess(typescript_1.default.createIdentifier(this.generatedObjName), typescript_1.default.createIdentifier(matchObj[0]));
        // return ts.createCall(ts.createIdentifier("foo"), undefined, undefined);
        // return ts.createObjectLiteral();
    };
    return referenceManager;
}());
function numberTransformer() {
    return function (context) {
        var visit = function (node) {
            if (typescript_1.default.isNumericLiteral(node)) {
                return typescript_1.default.createStringLiteral(node.text);
            }
            return typescript_1.default.visitEachChild(node, function (child) { return visit(child); }, context);
        };
        return function (node) { return typescript_1.default.visitNode(node, visit); };
    };
}
function sortKeys(obj) {
    var sortedKeys = Array.from(obj.keys()).sort(function (key1, key2) {
        if (key1 < key2)
            return -1;
        else if (key1 > key2)
            return +1;
        return 0;
    });
    var temp = new Map();
    sortedKeys.forEach(function (key) {
        var oriValue = obj.get(key);
        if (oriValue)
            temp.set(key, oriValue);
    });
    return temp;
}
var patterns = {};
function literalObjPatternCollector() {
    return function (context) {
        var visit = function (node) {
            if (typescript_1.default.isObjectLiteralExpression(node)) {
                var pattern_1 = new Map();
                typescript_1.default.forEachChild(node, function (child) {
                    if (typescript_1.default.isObjectLiteralElement(child)) {
                        // node may is PropertyAssignment
                        var id_1 = "";
                        typescript_1.default.forEachChild(child, function (dchild) {
                            if (typescript_1.default.isIdentifier(dchild)) {
                                id_1 = dchild.text;
                                pattern_1.set(id_1, null);
                            }
                            else {
                                if (typescript_1.default.isNumericLiteral(dchild)) {
                                    pattern_1.set(id_1, "number");
                                }
                                else if (typescript_1.default.isStringLiteral(dchild)) {
                                    pattern_1.set(id_1, "string");
                                }
                            }
                        });
                    }
                });
                // 由於擁有相同的property但property順序不同的物件會產生不同的雜湊值，所以使用hash來判斷物件屬性相異與否會有問題
                // 產生一個新的物件，會按照key排序
                // TODO: 目前如果是多層嵌套的這樣的做法還是會有問題
                var sortedPattern = sortKeys(pattern_1);
                var hashValue = object_hash_1.default(sortedPattern);
                if (!patterns[hashValue]) {
                    patterns[hashValue] = sortedPattern;
                }
            }
            return typescript_1.default.visitEachChild(node, function (child) { return visit(child); }, context);
        };
        return function (node) { return typescript_1.default.visitNode(node, visit); };
    };
}
function objRemappingTransformer() {
    return function (context) {
        var visit = function (node) {
            if (typescript_1.default.isObjectLiteralExpression(node)) {
                var objPattern_1 = new Map();
                var objLiteral_1 = new Map();
                typescript_1.default.forEachChild(node, function (child) {
                    if (typescript_1.default.isObjectLiteralElement(child)) {
                        var id_2 = "";
                        typescript_1.default.forEachChild(child, function (dChild) {
                            if (typescript_1.default.isIdentifier(dChild)) {
                                id_2 = dChild.getText();
                                objPattern_1.set(dChild.getText(), null);
                                objLiteral_1.set(dChild.getText(), null);
                            }
                            else {
                                if (typescript_1.default.isNumericLiteral(dChild)) {
                                    objPattern_1.set(id_2, "number");
                                    var value = dChild.getText();
                                    if (value) {
                                        objLiteral_1.set(id_2, parseInt(dChild.getText()));
                                    }
                                    else {
                                        objLiteral_1.set(id_2, dChild.getText());
                                    }
                                }
                                else if (typescript_1.default.isStringLiteral(dChild)) {
                                    objPattern_1.set(id_2, "string");
                                    var value = dChild
                                        .getText()
                                        .substr(1, dChild.getText().length - 2); // 要把雙引號去掉
                                    objLiteral_1.set(id_2, value);
                                }
                            }
                        });
                    }
                });
                var sortedPattern = sortKeys(objPattern_1);
                var hashValue = object_hash_1.default(sortedPattern);
                var patternCandidates = defineInterface[hashValue];
                // 先用code來做比對，照理來說應該可以客製化比對的欄位
                // ori前綴的會是作為轉換基準的參考
                var oriKey_1 = "code";
                var referenceKey_1 = "ori" + oriKey_1.charAt(0).toLocaleUpperCase() + oriKey_1.slice(1);
                console.log("Object.entries(patternCandidates): ", Object.entries(patternCandidates));
                var patternCandidateEntries = Object.entries(patternCandidates);
                var candidate = Object.entries(patternCandidates).find(function (candidate) {
                    if (candidate[1][referenceKey_1] === objLiteral_1.get(oriKey_1)) {
                        return true;
                    }
                    return false;
                });
                if (candidate) {
                    // 在這裡可以有兩種想做的事情，一個是把code換掉
                    var manager = new referenceManager("540ed81a49e41e6c3afa82f0f05f8576b730cc1e", "ErrorType");
                    console.log("aaaaaaaa : ", manager.makeReferenceConstObj(defineInterface, objLiteral_1));
                    return manager.makeReferenceConstObj(defineInterface, objLiteral_1);
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
            return typescript_1.default.visitEachChild(node, function (child) { return visit(child); }, context);
        };
        return function (node) { return typescript_1.default.visitNode(node, visit); };
    };
}
var result = typescript_1.default.transpileModule(source3, {
    compilerOptions: { module: typescript_1.default.ModuleKind.CommonJS },
    transformers: {
        before: [literalObjPatternCollector(), objRemappingTransformer()],
    },
});
var printer = typescript_1.default.createPrinter();
console.log("===result code===\n", result.outputText);
console.log("patterns : ", patterns);
"";
//# sourceMappingURL=index.js.map