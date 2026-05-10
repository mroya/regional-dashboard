const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyDNXq8aicE0_yTRfXEuEHQfq4-bkVQLONk');
async function run() {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  try {
    const result = await model.generateContent('Hi');
    console.log(result.response.text());
  } catch (e) {
    console.error('Error with gemini-1.5-flash:', e.message);
  }
}
run();
