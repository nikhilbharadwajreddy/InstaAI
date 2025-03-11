document.getElementById("loginBtn").addEventListener("click", function() {
    window.location.href = 
    "https://www.instagram.com/oauth/authorize" +
    "?client_id=2388890974807228" +
    "&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/auth.html" +
    "&response_type=code" +
    "&scope=instagram_basic,instagram_manage_comments,instagram_manage_messages";
});


document.getElementById("webhookTestBtn").addEventListener("click", async function() {
    try {
        const response = await fetch("https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test: "Webhook Triggered!" })
        });

        const data = await response.json();
        document.getElementById("responseBox").innerText = JSON.stringify(data, null, 2);
    } catch (error) {
        document.getElementById("responseBox").innerText = "Error: " + error.message;
    }
});

