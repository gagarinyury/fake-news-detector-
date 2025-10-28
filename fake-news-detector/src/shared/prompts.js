/**
 * Prompt Management Module
 * Centralized prompts with customization support
 */

// ============================================================================
// DEFAULT PROMPTS
// ============================================================================

export const DEFAULT_SYSTEM_PROMPT = `You are a rigorous fact-checking assistant analyzing news articles for credibility.

Evaluate based on:
- Presence of sources and citations
- Emotional vs neutral language
- Facts vs opinions ratio
- Logical consistency
- Grammar and writing quality
- Sensational or clickbait patterns
- Missing context or cherry-picked data

CRITICAL: You MUST return ONLY valid JSON matching this exact schema:
{
  "score": <number 0-100>,
  "verdict": "<string max 140 chars>",
  "red_flags": [<array of strings, max 7 items>],
  "claims": [
    {
      "claim": "<factual statement, max 20 words>",
      "snippet": "<SHORT 2-4 word exact phrase from article text>",
      "evidence": "<source name or empty string>",
      "accuracy": "<Accurate|Questionable|Unverified>"
    }
  ]
}

IMPORTANT FOR HIGHLIGHTING:
- "snippet" must be a SHORT 2-4 word phrase
- "snippet" must appear EXACTLY in the article text
- Examples: "Category 5", "175 mph winds", "seven deaths"
- BAD snippets: long sentences, paraphrases, text not in article

No prose. No markdown. Pure JSON only.`;

export const DEFAULT_USER_PROMPT_TEMPLATE = `Analyze this article for credibility and extract key claims.

Title: {{title}}
URL: {{url}}
{{#suspicionScore}}
⚠️  SUSPICIOUS INDICATORS DETECTED (Score: {{suspicionScore}}/100)
Pay extra attention to:
- Clickbait patterns
- Missing sources
- Emotional manipulation
- Misleading headlines
{{/suspicionScore}}

Text (first 2000 chars):
{{text}}

CRITICAL: For each claim, "snippet" must be SHORT (2-4 words) and appear EXACTLY in text above.

Return JSON following the schema from system prompt.`;

// ============================================================================
// PROMPT STORAGE
// ============================================================================

/**
 * Get custom prompts from storage (or defaults)
 */
export async function getPrompts() {
  try {
    const result = await chrome.storage.sync.get('customPrompts');
    return {
      systemPrompt: result.customPrompts?.system || DEFAULT_SYSTEM_PROMPT,
      userPromptTemplate: result.customPrompts?.userTemplate || DEFAULT_USER_PROMPT_TEMPLATE
    };
  } catch (error) {
    console.error('Failed to load custom prompts:', error);
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE
    };
  }
}

/**
 * Save custom prompts
 */
export async function savePrompts(systemPrompt, userPromptTemplate) {
  try {
    await chrome.storage.sync.set({
      customPrompts: {
        system: systemPrompt,
        userTemplate: userPromptTemplate,
        updatedAt: Date.now()
      }
    });
    console.log('Custom prompts saved');
    return true;
  } catch (error) {
    console.error('Failed to save custom prompts:', error);
    throw error;
  }
}

/**
 * Reset prompts to defaults
 */
export async function resetPrompts() {
  try {
    await chrome.storage.sync.remove('customPrompts');
    console.log('Prompts reset to defaults');
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE
    };
  } catch (error) {
    console.error('Failed to reset prompts:', error);
    throw error;
  }
}

// ============================================================================
// PROMPT RENDERING
// ============================================================================

/**
 * Render user prompt with variables
 * Simple mustache-style templating
 */
export function renderPrompt(template, variables) {
  let rendered = template;

  // Handle conditional blocks: {{#var}}...{{/var}}
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, 'g');

    if (value) {
      // Include block if value is truthy
      rendered = rendered.replace(conditionalRegex, '$1');
    } else {
      // Remove block if value is falsy
      rendered = rendered.replace(conditionalRegex, '');
    }
  });

  // Handle simple variables: {{var}}
  Object.keys(variables).forEach(key => {
    const value = variables[key] || '';
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });

  return rendered;
}

/**
 * Build complete user prompt for analysis
 */
export async function buildAnalysisPrompt(options) {
  const { title, url, text, suspicionScore = 0 } = options;
  const prompts = await getPrompts();

  return renderPrompt(prompts.userPromptTemplate, {
    title,
    url,
    text: text.slice(0, 2000),
    suspicionScore: suspicionScore >= 50 ? suspicionScore : null
  });
}

// ============================================================================
// JSON SCHEMA FOR STRUCTURED OUTPUT
// ============================================================================

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    score: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Credibility score 0-100"
    },
    verdict: {
      type: "string",
      maxLength: 140,
      description: "Brief assessment in 1-2 sentences"
    },
    red_flags: {
      type: "array",
      items: { type: "string" },
      maxItems: 7,
      description: "Array of suspicious patterns"
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string", description: "Full factual statement (max 20 words)" },
          snippet: { type: "string", description: "2-4 word phrase from article for highlighting" },
          evidence: { type: "string", description: "Source name or empty string" },
          accuracy: {
            type: "string",
            enum: ["Accurate", "Questionable", "Unverified"],
            description: "Assessment of claim accuracy"
          }
        },
        required: ["claim", "snippet", "evidence", "accuracy"]
      },
      minItems: 5,
      maxItems: 10
    }
  },
  required: ["score", "verdict", "red_flags", "claims"]
};
