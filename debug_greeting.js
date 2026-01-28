// Native fetch

const API_URL = 'http://localhost:3001/api/greeting';

async function checkGreeting() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        console.log('Current Greeting:', data);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkGreeting();
