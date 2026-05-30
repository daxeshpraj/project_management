const fs = require("fs");
const path = require("path");

const logoPath = path.join(__dirname, "../public/hk-tech-logo.png");
const outPath = path.join(__dirname, "../src/config/hkTechLogoBase64.js");
const b64 = fs.readFileSync(logoPath).toString("base64");

fs.writeFileSync(
  outPath,
  `export const HK_TECH_LOGO_DATA_URL = "data:image/png;base64,${b64}";\n`
);
console.log("Wrote", outPath, "length", b64.length);
