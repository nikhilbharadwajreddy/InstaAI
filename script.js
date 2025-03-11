document.getElementById("loginBtn").addEventListener("click", function() {
    window.location.href = "https://www.instagram.com/oauth/authorize?client_id=2388890974807228&redirect_uri=https://your-site.com/auth&response_type=code&scope=instagram_business_basic";
});

document.getElementById("testWebhook").addEventListener("click", async function() {
    const response = await fetch("https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "webhook triggered!" })
    });

    const data = await response.json();
    document.getElementById("output").innerText = JSON.stringify(data, null, 2);
});
