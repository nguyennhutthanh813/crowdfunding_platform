import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourceRoot = path.resolve("src");

function listFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return entry.isFile() && fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

function tagName(node) {
  return node.tagName.getText().split(".").at(-1);
}

function attributesOf(node) {
  return node.attributes.properties.filter(ts.isJsxAttribute);
}

function findAttribute(node, name) {
  return attributesOf(node).find((item) => item.name.getText() === name);
}

function literalAttributeValue(attribute) {
  if (!attribute?.initializer) return attribute ? "" : null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  return attribute.initializer.getText();
}

function hasWorkingHandler(node, name) {
  const attribute = findAttribute(node, name);
  if (!attribute?.initializer) return false;
  const source = attribute.initializer.getText().replace(/\s/g, "");
  return !/^\{?\(?.*\)?=>\{\}\}?$/.test(source);
}

function isInsideForm(node) {
  let parent = node.parent;
  while (parent) {
    if (
      (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) &&
      tagName(ts.isJsxElement(parent) ? parent.openingElement : parent) === "form"
    ) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

const issues = [];
const counts = { button: 0, link: 0, field: 0, select: 0, form: 0 };

for (const file of listFiles(sourceRoot)) {
  const text = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function report(node, code, detail) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    issues.push({
      code,
      detail,
      file: path.relative(process.cwd(), file).replaceAll("\\", "/"),
      line: position.line + 1,
    });
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagName(node);

      if (tag === "button") {
        counts.button += 1;
        const type = literalAttributeValue(findAttribute(node, "type"));
        const canSubmit = type === "submit" || (!type && isInsideForm(node));
        if (!canSubmit && !hasWorkingHandler(node, "onClick")) {
          report(node, "BUTTON_WITHOUT_ACTION", "Button không có onClick hoặc submit.");
        }
      }

      if (tag === "Link" || tag === "a") {
        counts.link += 1;
        const href = literalAttributeValue(findAttribute(node, "href"));
        if (href === null) {
          report(node, "LINK_WITHOUT_HREF", `${tag} không có href.`);
        } else if (["", "#", "javascript:void(0)"].includes(href)) {
          report(node, "LINK_PLACEHOLDER", `${tag} đang dùng href tạm: ${href || "rỗng"}.`);
        }
      }

      if (["input", "select", "textarea"].includes(tag)) {
        counts.field += 1;
        const id = findAttribute(node, "id");
        const name = findAttribute(node, "name");
        if (!id && !name) {
          report(
            node,
            "FORM_FIELD_WITHOUT_ID_OR_NAME",
            `${tag} thiếu id/name nên trình duyệt khó nhận diện trường nhập.`,
          );
        }
      }

      if (tag === "select") {
        counts.select += 1;
        if (!hasWorkingHandler(node, "onChange")) {
          report(node, "SELECT_WITHOUT_CHANGE", "Select không có onChange.");
        }
      }

      if (tag === "form") {
        counts.form += 1;
        const hasAction = findAttribute(node, "action");
        if (!hasAction && !hasWorkingHandler(node, "onSubmit")) {
          report(node, "FORM_WITHOUT_SUBMIT", "Form không có action hoặc onSubmit.");
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

console.table(issues);
console.log(
  `UI_CONTROL_AUDIT:${issues.length === 0 ? "PASS" : "FAIL"} ` +
    `buttons=${counts.button} links=${counts.link} fields=${counts.field} selects=${counts.select} forms=${counts.form}`,
);

if (issues.length > 0) process.exitCode = 1;
