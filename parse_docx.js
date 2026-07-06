const fs = require('fs');
const AdmZip = require('adm-zip');

function extractTextFromDocx(filePath) {
    try {
        const zip = new AdmZip(filePath);
        const documentXml = zip.readAsText("word/document.xml");
        
        // Very basic regex to extract text between <w:t> tags
        const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
        let text = '';
        let match;
        
        while ((match = regex.exec(documentXml)) !== null) {
            text += match[1] + '\n';
        }
        
        console.log(`\n--- Extracted from ${filePath} ---`);
        console.log(text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').substring(0, 1500) + "...\n");
    } catch(e) {
        console.error("Error reading " + filePath, e);
    }
}

try {
  require.resolve('adm-zip');
  extractTextFromDocx('./src/app/templates/Terms and Conditions.docx');
  extractTextFromDocx('./src/app/templates/नियम और शर्तें.docx');
} catch(e) {
  console.log("adm-zip not found, let's install it temporarily or use unzip");
}
