const fs = require('fs');
const { execSync } = require('child_process');

function extractTextFromDocx(filePath) {
    try {
        execSync(`unzip -p "${filePath}" word/document.xml > temp.xml`);
        const documentXml = fs.readFileSync('temp.xml', 'utf8');
        
        // Very basic regex to extract text between <w:t> tags
        const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
        let text = '';
        let match;
        
        while ((match = regex.exec(documentXml)) !== null) {
            text += match[1] + '\n';
        }
        
        console.log(`\n--- Extracted from ${filePath} ---`);
        console.log(text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    } catch(e) {
        console.error("Error reading " + filePath, e.message);
    }
}

extractTextFromDocx('./src/app/templates/Terms and Conditions.docx');
extractTextFromDocx('./src/app/templates/नियम और शर्तें.docx');
