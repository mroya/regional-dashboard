const fs = require('fs');

async function run() {
  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');
  console.log('Sending request to http://localhost:3000/api/analyze-pdf ...');
  
  const response = await fetch('http://localhost:3000/api/analyze-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      referenceDate: '2026-05-07'
    })
  });
  
  console.log('Response Status:', response.status);
  const data = await response.json();
  if (response.ok) {
    console.log('Success! Data keys:', Object.keys(data.data));
    console.log('Geral:', data.data.geral);
    console.log('Filiais count:', data.data.filiais.length);
    console.log('Departamentos count:', data.data.departamentos.length);
  } else {
    console.error('Error Response:', data);
  }
}

run().catch(console.error);
