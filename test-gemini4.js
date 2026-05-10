async function run() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + 'AIzaSyDuCx8ACdhn6IT4pRwMjeegM-g2BUjV3g4');
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Data:', JSON.stringify(data, null, 2));
}
run();
