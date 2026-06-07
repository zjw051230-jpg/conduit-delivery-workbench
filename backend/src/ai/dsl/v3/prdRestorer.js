const { chatCompletion } = require("../../model/openaiCompatibleClient");
const { loadDslV3PromptAssets } = require("./promptAssets");

async function restorePrdFromDsl(dsl, { ark, chatCompletionImpl = chatCompletion } = {}) {
  const assets = loadDslV3PromptAssets();
  const result = await chatCompletionImpl({
    ark,
    temperature: 0.1,
    messages: [
      { role: "system", content: assets.restorerPrompt },
      { role: "user", content: JSON.stringify({ dsl, enumDictionary: assets.enumDictionary }, null, 2) },
    ],
  });

  return {
    status: result.configured ? "restored" : "failed",
    content: result.content,
    modelUsage: result.usage || null,
    latencyMs: result.latencyMs || 0,
  };
}

module.exports = { restorePrdFromDsl };
