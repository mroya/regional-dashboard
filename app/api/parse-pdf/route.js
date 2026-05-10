export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const [pdfjsLib, pdfjsWorker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
    ]);
    globalThis.pdfjsWorker = pdfjsWorker;

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    });
    const pdf = await loadingTask.promise;

    const allRows = [];
    let fullText = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const rowsMap = new Map();
      fullText += textContent.items.map((item) => item.str).join(' ') + '\n';

      textContent.items.forEach((item) => {
        const [, , , , x, y] = item.transform;
        const roundedY = Math.round(y * 10) / 10;
        if (!rowsMap.has(roundedY)) rowsMap.set(roundedY, []);

        rowsMap.get(roundedY).push({
          x,
          text: item.str,
        });
      });

      const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);
      sortedY.forEach((y) => {
        const texts = rowsMap.get(y).sort((a, b) => a.x - b.x);
        const rowCols = [];
        let currentStr = texts[0]?.text || '';
        let lastX = texts[0]?.x || 0;

        for (let i = 1; i < texts.length; i++) {
          const dx = texts[i].x - lastX;
          if (dx > 8) {
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
    }

    const extractData = {
      geral: {
        mediaDia: '0',
        filiaisMeta: '0%',
        filiaisAbaixo: '0%',
      },
      filiais: [],
      departamentos: {
        medicamento: [],
        generico: [],
        semBio: [],
        higiene: [],
        panvel: [],
      },
      trocoAmigo: [],
      rawRows: allRows,
      text: fullText,
    };

    return new Response(JSON.stringify(extractData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
