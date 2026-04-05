
const https = require('https');

function testGemini() {
  const apiKey = "AIzaSyCiHQxxRafrhyDeXQEGwwUiRKP8RaASqMM";
  const model = "gemini-2.5-flash"; // Trying the model used in the code
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const data = JSON.stringify({
    contents: [{
      parts: [{
        text: "Hello, health assistant AI. Test message."
      }]
    }]
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(url, options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      try {
        console.log(JSON.stringify(JSON.parse(responseData), null, 2));
      } catch (e) {
        console.log('Raw Response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error("Test failed:", error);
  });

  req.write(data);
  req.end();
}

testGemini();
