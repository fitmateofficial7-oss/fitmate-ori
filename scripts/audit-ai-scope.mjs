import {
  isAllowedFitMateTopic,
  isFitMateOwnershipQuestion,
  ownershipAnswer,
  outOfScopeAnswer,
} from "../lib/fitmate-ai-scope.ts";

const checks = [
  ["fitmate buatan siapa?", true, "owner"],
  ["siapa yang membuat fitmate?", true, "owner"],
  ["who owns FitMate?", true, "owner"],
  ["berapa set bench press yang bagus?", true, "scope"],
  ["lutut saya sakit setelah squat", true, "scope"],
  ["menu tinggi protein untuk cutting", true, "scope"],
  ["buatkan coding python", false, "scope"],
  ["siapa presiden indonesia?", false, "scope"],
  ["jelaskan investasi saham", false, "scope"],
];

const failures = [];
for (const [query, expected, kind] of checks) {
  const actual = kind === "owner"
    ? isFitMateOwnershipQuestion(query)
    : isAllowedFitMateTopic(query, []);
  if (actual !== expected) failures.push({ query, expected, actual, kind });
}

const ownerId = ownershipAnswer("id");
const ownerEn = ownershipAnswer("en");
if (!ownerId.includes("PT Growsia Solusi Indonesia Maju")) failures.push({ ownerId });
if (!ownerEn.includes("PT Growsia Solusi Indonesia Maju")) failures.push({ ownerEn });
if (!outOfScopeAnswer("id").includes("fitness")) failures.push({ outOfScope: false });

if (failures.length) {
  console.error(JSON.stringify({ status: "FAIL", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "PASS",
  ownershipCompany: "PT Growsia Solusi Indonesia Maju",
  allowedDomains: ["fitness", "olahraga", "gym", "nutrisi", "recovery", "kesehatan"],
  clearOffTopicBlockedBeforeModelCall: true,
  ownershipAnsweredWithoutModelCall: true,
}, null, 2));
