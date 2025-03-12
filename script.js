// script.js - Updated OAuth Login for Instagram
document.addEventListener("DOMContentLoaded", function() {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", function() {
            const clientId = "2388890974807228";
            const redirectUri = encodeURIComponent("https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html");
            // Build scope string; encodeURIComponent converts commas to %2C
            const scope = encodeURIComponent("instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights");
            
            // Construct the OAuth URL with additional parameters
            const oauthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
            
            // Redirect to Instagram's OAuth login page
            window.location.href = oauthUrl;
        });
    }
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

