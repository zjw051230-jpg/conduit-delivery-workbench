async function chatCompletion({ ark, messages, temperature = 0.2 }) {
  const configured = Boolean(ark?.apiKey && ark?.model && ark?.baseUrl);
  if (!configured) {
    return {
      configured: false,
      content: "ARK_API_KEY or ARK_MODEL is not configured.",
      usage: null,
      latencyMs: 0,
    };
  }

  const startedAt = Date.now();
  const response = await fetch(`${ark.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ark.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ark.model,
      messages,
      temperature,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || response.statusText;
    throw new Error(`Model request failed: ${message}`);
  }

  return {
    configured: true,
    content: payload.choices?.[0]?.message?.content || "",
    usage: payload.usage || null,
    latencyMs: Date.now() - startedAt,
  };
}

module.exports = { chatCompletion };
