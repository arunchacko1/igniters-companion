// Preflight check for the Groq API key.
// Run with: npm run check:ai
//
// It confirms three things, in order:
//   1. An API key is present in the environment.
//   2. The key authenticates (can list models).
//   3. The key can actually generate a chat completion.

// The app reads the key from this env variable, so we use the same one here.
const ENV_VAR = "GROQ_API_KEY";
const MODEL = "llama-3.3-70b-versatile";
const BASE = "https://api.groq.com/openai/v1";

async function checkAi() {
  const key = process.env[ENV_VAR];

  // Step 1: is the key even set?
  if (!key) {
    console.error(`❌ ${ENV_VAR} is not set. Add it to .env.local`);
    console.error("   Get a free key at https://console.groq.com/keys");
    process.exit(1);
  }
  // Print the variable name, never the secret value.
  console.log(`🔑 Found API key in ${ENV_VAR} (value hidden)\n`);

  // Groq uses a bearer token in the Authorization header.
  const authHeader = { Authorization: `Bearer ${key}` };

  // Step 2: confirm authentication by listing models.
  console.log("→ Checking authentication...");
  const authRes = await fetch(`${BASE}/models`, { headers: authHeader });

  if (authRes.status === 401 || authRes.status === 403) {
    console.error(`❌ Key is invalid or unauthorized (HTTP ${authRes.status}).`);
    console.error("   Create a new key at https://console.groq.com/keys");
    process.exit(1);
  }
  if (!authRes.ok) {
    console.error(`❌ Unexpected error listing models (HTTP ${authRes.status}).`);
    process.exit(1);
  }
  console.log("✅ Authenticated — the key is valid.\n");

  // Step 3: try one real chat completion to confirm it works end to end.
  console.log(`→ Testing chat completion on ${MODEL}...`);
  const genRes = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: "Say hello in 3 words." }],
    }),
  });

  if (genRes.ok) {
    console.log("✅ Success — the API key is working. You're good to go!");
    return;
  }

  // Read the error body so we can give a precise message.
  const body = await genRes.text();

  if (genRes.status === 429) {
    console.error("⚠️  Rate limited (HTTP 429). The key works — just wait a minute and retry.");
    process.exit(1);
  }
  if (genRes.status === 401 || genRes.status === 403) {
    console.error(`❌ Key is invalid or unauthorized for generation (HTTP ${genRes.status}).`);
    process.exit(1);
  }

  console.error(`❌ Unexpected error (HTTP ${genRes.status}):\n${body}`);
  process.exit(1);
}

checkAi().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
