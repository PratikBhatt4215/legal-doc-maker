import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = "/Users/pratikkumar/IdeaProjects/Sharedrepo/legal_doc_maker/src/app/templates/District Court/CLAIM/Section 5 Limitation act 1963 Injured Claim.docx"

if not os.path.exists(docx_path):
    print("File not found:", docx_path)
    exit(1)

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read("word/document.xml")
    
root = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

# Let's extract paragraphs and print the text of all paragraphs
paragraphs = root.findall('.//w:p', namespaces)
print(f"Total paragraphs: {len(paragraphs)}")

for idx, p in enumerate(paragraphs[:38]):
    texts = p.findall('.//w:t', namespaces)
    p_text = "".join([t.text for t in texts if t.text])
    if p_text.strip():
        print(f"P {idx}: {repr(p_text)}")
