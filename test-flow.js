const fs = require('fs');
async function test() {
  const files = fs.readdirSync('.');
  const pdfName = files.find(f => f.endsWith('.pdf'));
  const fileBuf = fs.readFileSync(pdfName);
  const blob = new Blob([fileBuf], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob);

  console.log('Sending parse-pdf request...');
  const res = await fetch('http://localhost:3000/api/parse-pdf', {
    method: 'POST',
    body: formData
  });
  console.log('parse-pdf status:', res.status);
  const data = await res.json();
  if (!res.ok) {
    console.log('Error:', data);
    return;
  }
  
  console.log('Sending analyze-pdf request...');
  const res2 = await fetch('http://localhost:3000/api/analyze-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: data.text,
      referenceDate: '2026-05-10'
    })
  });
  console.log('analyze-pdf status:', res2.status);
  const data2 = await res2.json();
  console.log('analyze-pdf result:', data2);
}
test().catch(console.error);
