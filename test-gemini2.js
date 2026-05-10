async function run() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + 'AIzaSyDNXq8aicE0_yTRfXEuEHQfq4-bkVQLONk');
  const data = await res.json();
  console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
}
run();
