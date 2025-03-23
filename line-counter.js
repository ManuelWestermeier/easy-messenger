import path from "path";
import fs from "fs";

let lines = 0;

function read(pathName) {
  const isDir = fs.statSync(pathName).isDirectory();
  if (isDir) {
    const files = fs.readdirSync(pathName);
    for (const fileName of files) {
      read(path.join(pathName, fileName));
    }
  } else {
    if (
      [".js", ".jsx", ".html", ".json", ".md", ".env", ".gitignore"].includes(
        path.extname(pathName)
      )
    )
      lines += fs.readFileSync(pathName).toString("utf-8").split("\n").length;
  }
}

const files = fs
  .readdirSync("./")
  .filter(
    (pathName) =>
      pathName != "node_modules" &&
      pathName != "docs" &&
      pathName != "package-lock.json"
  );

files.forEach(read);

console.log(lines);
