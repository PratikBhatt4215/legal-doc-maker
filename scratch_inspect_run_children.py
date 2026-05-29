import zipfile
import xml.etree.ElementTree as ET

docx_path = "/Users/pratikkumar/IdeaProjects/Sharedrepo/legal_doc_maker/src/app/templates/District Court/CLAIM/Death Claim.docx"

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read("word/document.xml")
    
root = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

paragraphs = root.findall('.//w:p', namespaces)

for p_idx in [1, 2]:
    print(f"\n--- Paragraph {p_idx} ---")
    p = paragraphs[p_idx]
    runs = p.findall('.//w:r', namespaces)
    for i, r in enumerate(runs):
        print(f"Run {i}:")
        for child in r:
            tag = child.tag.split('}')[-1]
            text = child.text if tag == 't' else ''
            print(f"  <{tag}> {repr(text)}")
