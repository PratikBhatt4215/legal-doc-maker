import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = "/Users/pratikkumar/IdeaProjects/Sharedrepo/legal_doc_maker/src/app/templates/District Court/formate/Agreement to sale agriculture land.docx"

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read("word/document.xml")
    
root = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

paragraphs = root.findall('.//w:p', namespaces)
p6 = paragraphs[6]

print("P6 elements:")
for idx, child in enumerate(p6):
    # Print the tag name without namespace prefix for readability
    tag = child.tag.split('}')[-1]
    if tag == 'r':
        texts = child.findall('.//w:t', namespaces)
        t_content = "".join([t.text for t in texts if t.text])
        print(f"  Run {idx}: text={repr(t_content)}")
    else:
        print(f"  Element {idx}: tag={tag}")
