import zipfile
import xml.etree.ElementTree as ET

docx_path = "/Users/pratikkumar/IdeaProjects/Sharedrepo/legal_doc_maker/src/app/templates/District Court/FAMILY COURT/Muslim Law/mehar ki rashi vasooli hetu civil suite.docx"

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read("word/document.xml")
    
root = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

paragraphs = root.findall('.//w:p', namespaces)
p2 = paragraphs[2]
runs = p2.findall('.//w:r', namespaces)

for i, r in enumerate(runs):
    print(f"Run {i}:")
    for child in r:
        tag = child.tag.split('}')[-1]
        text = child.text if tag == 't' else ''
        print(f"  <{tag}> {repr(text)}")
