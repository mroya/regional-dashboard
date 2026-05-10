import pdfplumber
import json
import re
import os

def clean_num(text):
    if not text: return "0"
    return text.strip().replace('R$', '').strip()

def extract_pdf_data(pdf_path):
    data = {
        "geral": {"diasUteis": "31", "diasRestantes": "24"},
        "filiais": [],
        "departamentos": []
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        # 1. Extrair Tabelas da Primeira Página
        page = pdf.pages[0]
        tables = page.extract_tables()
        
        # Procurar pela tabela de Indicadores Gerais
        for table in tables:
            for row in table:
                joined = " ".join([str(c) for c in row if c]).upper()
                
                # Captura Dias Úteis/Restantes
                if "DIAS ÚTEIS" in joined:
                    nums = re.findall(r'\d+', joined)
                    if len(nums) >= 2:
                        data["geral"]["diasUteis"] = nums[0]
                        data["geral"]["diasRestantes"] = nums[1]
                
                # Captura Meses (Topo do Dash)
                months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
                if any(m in joined for m in months) and len(row) >= 8:
                    data["filiais"].append({
                        "id": row[0],
                        "vdaEft": clean_num(row[1]),
                        "mediaDia": clean_num(row[2]),
                        "rtRep": clean_num(row[8] if len(row) > 8 else "0%")
                    })

        # 2. Extrair a Tabela de Resumo (Geral, Med, HB, Clinic)
        # Esta tabela costuma ser capturada como texto corrido ou tabela pequena
        text = page.extract_text()
        summary_matches = re.findall(r'(GERAL|MED|HB \(N-MED\)|CLINIC)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,%\-]+)\s+([\d.]+)', text)
        
        for match in summary_matches:
            data["departamentos"].append({
                "id": "SUMMARY",
                "departamento": match[0],
                "vdaEft": match[1],
                "metaDia": match[2],
                "projecao": match[3],
                "desvioPerc": match[4],
                "vlrDesvio": match[5]
            })

    return data

if __name__ == "__main__":
    # Busca o PDF mais recente na pasta
    files = [f for f in os.listdir('.') if f.endswith('.pdf')]
    if files:
        latest_pdf = files[0] # Pega o primeiro PDF encontrado
        print(f"Processando: {latest_pdf}")
        result = extract_pdf_data(latest_pdf)
        
        with open('public/dashboard_data.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print("Sucesso! Dados salvos em public/dashboard_data.json")
    else:
        print("Nenhum arquivo PDF encontrado na pasta raiz.")
