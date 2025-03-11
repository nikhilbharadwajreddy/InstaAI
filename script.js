document.getElementById("loginBtn").addEventListener("click", function() {
    window.location.href = 
    "https://www.instagram.com/oauth/authorize" +
    "?client_id=2388890974807228" +
    "&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/auth.html" +
    "&response_type=code" +
    "&scope=instagram_basic,instagram_manage_comments,instagram_manage_messages";
});


document.addEventListener("DOMContentLoaded", function () {
    // Ensure the button exists before adding event listener
    const webhookButton = document.getElementById("testWebhook");
    if (webhookButton) {
        webhookButton.addEventListener("click", async function() {
            try {
                const response = await fetch("https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/webhook", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ test: "Webhook Triggered!" })
                });

                const data = await response.json();
                document.getElementById("output").innerText = JSON.stringify(data, null, 2);
            } catch (error) {
                document.getElementById("output").innerText = "Error: " + error.message;
            }
        });
    } else {
        console.error("Webhook button not found!");
    }
});

