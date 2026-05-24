import pdfplumber

def main():
    pdf_path = "Varejo - Área 02 - SUL POA - 07052026.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        for idx, page in enumerate(pdf.pages):
            print(f"--- PAGE {idx+1} ---")
            text = page.extract_text()
            print(text)

if __name__ == "__main__":
    main()
