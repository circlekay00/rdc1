/**
 * IMPORT EXCEL TO FIRESTORE
 * --------------------------------------------------
 * Place this file in your ROOT folder (C:\Users\KB\rdc1)
 * Place your Excel file in the SRC folder (C:\Users\KB\rdc1\src\items.xlsx)
 * --------------------------------------------------
 */

import admin from "firebase-admin";
import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Helper for __dirname in ES Modules (Required when "type": "module" is in package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------
 * CONFIGURATION
 * ------------------------- */
// This looks for the key in the ROOT folder
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json"); 
// This looks for the Excel file inside the SRC folder
const EXCEL_FILE_PATH = path.join(__dirname, "src", "items.xlsx"); 
const APP_ID = 'rdc1'; 

console.log(`🔍 Current Directory: ${__dirname}`);
console.log(`📂 Looking for Excel at: ${EXCEL_FILE_PATH}`);

/* -------------------------
 * File Check
 * ------------------------- */
if (!fs.existsSync(EXCEL_FILE_PATH)) {
  console.error(`❌ ERROR: Excel file not found at ${EXCEL_FILE_PATH}`);
  console.error(`Please ensure "items.xlsx" is inside the "src" folder.`);
  process.exit(1);
}

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ ERROR: serviceAccountKey.json not found at ${SERVICE_ACCOUNT_PATH}`);
  console.error(`Please ensure the JSON key is in the ROOT folder.`);
  process.exit(1);
}

/* -------------------------
 * Firebase Admin Init
 * ------------------------- */
// For ES Modules, we read the JSON file content manually
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/* -------------------------
 * Search Token Generator
 * ------------------------- */
function generateSearchTokens(values) {
  const tokens = new Set();
  values.forEach(value => {
    if (!value) return;
    const cleaned = value.toString().toLowerCase().replace(/[^a-z0-9 ]/g, " ");
    cleaned.split(/\s+/).forEach(word => {
      if (word.length < 1) return;
      for (let start = 0; start < word.length; start++) {
        for (let end = start + 1; end <= word.length; end++) {
          const gram = word.substring(start, end);
          if (gram.length <= 15) tokens.add(gram);
        }
      }
    });
  });
  return Array.from(tokens);
}

/* -------------------------
 * Import Logic
 * ------------------------- */
async function importItems() {
  try {
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📄 Found ${data.length} data rows`);

    const collectionPath = `artifacts/${APP_ID}/public/data/gemini`;
    let batch = db.batch();
    let batchCount = 0;
    let totalCount = 0;

    for (const row of data) {
      const item = {
        description: row['Item Description']?.toString().trim() || "",
        category: row['Item Category']?.toString().trim() || "General",
        upc: row['Item UPC']?.toString().trim() || "",
        itemNumber: row['Item Number']?.toString().trim() || ""
      };

      if (!item.description && !item.upc && !item.itemNumber) continue;

      const searchTokens = generateSearchTokens([
        item.description, item.category, item.itemNumber, item.upc
      ]);

      const docRef = db.collection(collectionPath).doc();
      batch.set(docRef, {
        ...item,
        searchTokens,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      batchCount++;
      totalCount++;

      if (batchCount === 500) {
        await batch.commit();
        console.log(`✅ Committed ${totalCount} items...`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    console.log(`🎉 Success! ${totalCount} items added to Firestore.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

importItems();