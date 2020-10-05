"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_1 = __importDefault(require("typescript"));
var printer = typescript_1.default.createPrinter();
var sourceFile = typescript_1.default.createSourceFile("test.ts", "const x : number = 42", typescript_1.default.ScriptTarget.ES2015, true, typescript_1.default.ScriptKind.TS);
var add = typescript_1.default.createAdd(typescript_1.default.createLiteral(42), typescript_1.default.createLiteral(50));
var display = typescript_1.default.createArrayLiteral([typescript_1.default.createLiteral("a"), typescript_1.default.createLiteral("b")], true);
var arrowFunction = typescript_1.default.createArrowFunction([], [], [
    typescript_1.default.createParameter([], [], undefined, "x", undefined, typescript_1.default.createTypeReferenceNode("number", [])),
], typescript_1.default.createKeywordTypeNode(typescript_1.default.SyntaxKind.StringKeyword), undefined, typescript_1.default.createLiteral(42));
var arrayTypeNode = typescript_1.default.createArrayTypeNode(typescript_1.default.createKeywordTypeNode(typescript_1.default.SyntaxKind.StringKeyword));
var assignment = typescript_1.default.createAssignment(typescript_1.default.createIdentifier("firstName"), typescript_1.default.createLiteral("kevin"));
var result = printer.printNode(typescript_1.default.EmitHint.Unspecified, assignment, sourceFile);
console.log(result);
//# sourceMappingURL=play.js.map