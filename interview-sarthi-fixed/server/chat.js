let isProcessing = false;

async function sendToBot(text) {
    if (isProcessing || !text.trim()) return; 

    isProcessing = true;
    console.log("Processing...");

    try {
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Tell server we are sending JSON
            },
            body: JSON.stringify({ message: text }) // Must be an object
        });

        const data = await response.json();
        
        // Use the data
        console.log("Bot Response:", data.reply);
        // yourSpeakFunction(data.reply); 

    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        isProcessing = false; // Always reset so user can talk again
    }
}