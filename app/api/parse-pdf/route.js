import PDFParser from 'pdf2json';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return new Promise((resolve) => {
      const pdfParser = new PDFParser();
      
      pdfParser.on("pdfParser_dataError", errData => {
        resolve(new Response(JSON.stringify({ error: errData.parserError }), { status: 500 }));
      });
      
      pdfParser.on("pdfParser_dataReady", pdfData => {
        // Group texts by Y coordinate to form rows
        let allRows = [];
        
        pdfData.Pages.forEach(page => {
          const rowsMap = new Map();
          
          page.Texts.forEach(text => {
            const y = Math.round(text.y * 10) / 10; // Round to 1 decimal place to group roughly same line
            if (!rowsMap.has(y)) rowsMap.set(y, []);
            
            // decodeURIComponent because pdf2json encodes text
            let decodedText = '';
            try {
              decodedText = decodeURIComponent(text.R[0].T);
            } catch (e) {
              decodedText = unescape(text.R[0].T);
            }
            
            rowsMap.get(y).push({
              x: text.x,
              text: decodedText
            });
          });
          
          // Sort by Y, then for each row sort by X
          const sortedY = Array.from(rowsMap.keys()).sort((a, b) => a - b);
          sortedY.forEach(y => {
            const texts = rowsMap.get(y).sort((a, b) => a.x - b.x);
            let rowCols = [];
            let currentStr = texts[0].text;
            let lastX = texts[0].x;
            
            for (let i = 1; i < texts.length; i++) {
              const dx = texts[i].x - lastX;
              // Se a distância X for maior que 0.4, é uma nova coluna
              if (dx > 0.4) {
                rowCols.push(currentStr.trim());
                currentStr = texts[i].text;
              } else {
                currentStr += texts[i].text;
              }
              lastX = texts[i].x;
            }
            rowCols.push(currentStr.trim());
            allRows.push(rowCols);
          });
        });

        // Basic Heuristic to find KPIs
        // This is a robust fallback if coordinates vary
        
        const extractData = {
          geral: {
            mediaDia: "0",
            filiaisMeta: "0%",
            filiaisAbaixo: "0%",
          },
          filiais: [],
          departamentos: {
            medicamento: [],
            generico: [],
            semBio: [],
            higiene: [],
            panvel: []
          },
          trocoAmigo: [],
          rawRows: allRows // Sending raw rows so frontend can debug/display if needed
        };

        // We will do a full parse on the frontend using rawRows, 
        // because we can iterate over the tabular rows easily.
        
        resolve(new Response(JSON.stringify(extractData), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      });
      
      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
