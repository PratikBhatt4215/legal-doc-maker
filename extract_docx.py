import zipfile
import xml.etree.ElementTree as ET
import sys

docx_path = sys.argv[1]

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read("word/document.xml")
    
root = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

paragraphs = root.findall('.//w:p', namespaces)

for p in paragraphs:
    texts = p.findall('.//w:t', namespaces)
    p_text = "".join([t.text for t in texts if t.text])
    print(p_text)
