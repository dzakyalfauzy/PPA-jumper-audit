import sys
import PyPDF2

def dump_pdf(filename):
    with open(filename, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for i, page in enumerate(reader.pages):
            print(f"--- Page {i+1} ---")
            print(page.extract_text())

dump_pdf('report_reference.pdf')
