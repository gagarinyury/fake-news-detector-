/**
 * Safe JSON parsing for LanguageModel responses
 * Handles markdown code blocks and trailing commas
 */
export function parseJSON(str) {
  if (!str || typeof str !== 'string') return null;

  try {
    // Remove markdown code blocks: ```json ... ```
    str = str.replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1');

    // Remove trailing commas before ] or }
    str = str.replace(/,(\s*[}\]])/g, '$1');

    // Trim whitespace
    str = str.trim();

    return JSON.parse(str);
  } catch (error) {
    console.error('JSON parse failed:', error, 'Input:', str.slice(0, 200));
    return null;
  }
}
