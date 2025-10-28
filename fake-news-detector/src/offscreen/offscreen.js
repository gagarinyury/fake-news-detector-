// Offscreen Document - AI API calls
import { parseJSON } from '../shared/json.js';
import {
  logError,
  withTimeout,
  withRetry,
  checkAvailability,
  createProgressMonitor,
  ERROR_TYPES
} from '../shared/errorHandler.js';

console.log('Fake News Detector: Offscreen document loaded');

// ============================================================================
// AI SESSION MANAGEMENT
// ============================================================================

let languageModelSession = null;

async function checkAI() {
  const checks = {
    languageModel: 'ai' in self && 'languageModel' in self.ai,
    summarizer: 'ai' in self && 'summarizer' in self.ai,
    languageDetector: 'translation' in self && 'languageDetector' in self.translation
  };

  console.log('AI availability:', checks);

  if (!checks.languageModel) {
    const error = new Error('AI_UNAVAILABLE: LanguageModel not available in offscreen');
    logError(error, { context: 'checkAI' });
    throw error;
  }

  return checks;
}

async function getLanguageModelSession() {
  if (!languageModelSession) {
    try {
      const availability = await self.ai.languageModel.availability();
      console.log('LanguageModel availability:', availability);

      // Check availability status
      const availCheck = checkAvailability(availability);
      if (!availCheck.available) {
        const error = new Error('AI_UNAVAILABLE: LanguageModel not supported on this device');
        logError(error, { context: 'getLanguageModelSession', availability });
        throw error;
      }

      if (availCheck.downloading) {
        console.log('LanguageModel requires download...', availCheck.error.message);
      }

      // Create session with download progress monitor
      languageModelSession = await self.ai.languageModel.create({
        systemPrompt: `You are a rigorous fact-checking assistant analyzing news articles for credibility.

Evaluate based on:
- Presence of sources and citations
- Emotional vs neutral language
- Facts vs opinions ratio
- Logical consistency
- Grammar and writing quality
- Sensational or clickbait patterns
- Missing context or cherry-picked data

Return ONLY valid JSON with these exact keys:
- "credibility_score": integer 0-100 (higher = more credible)
- "verdict": brief explanation string (max 140 chars)
- "red_flags": array of strings describing issues (max 7 items)
- "claims": array of objects with "text" key (max 20 items, each text max 280 chars)

No prose. No markdown. Pure JSON only.`,
        monitor: createProgressMonitor((percentage) => {
          console.log(`Model download progress: ${percentage}%`);
        })
      });

      console.log('LanguageModel session created');

    } catch (error) {
      // Handle quota exceeded and platform errors
      if (error.name === 'QuotaExceededError') {
        const quotaError = new Error('QUOTA_EXCEEDED: Not enough disk space (~22 GB required)');
        logError(quotaError, { context: 'getLanguageModelSession', originalError: error.name });
        throw quotaError;
      }

      if (error.name === 'NotSupportedError') {
        const platformError = new Error('PLATFORM_UNSUPPORTED: Your OS/device does not support Chrome Built-in AI');
        logError(platformError, { context: 'getLanguageModelSession', originalError: error.name });
        throw platformError;
      }

      logError(error, { context: 'getLanguageModelSession' });
      throw error;
    }
  }

  return languageModelSession;
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

async function detectLanguage(text) {
  try {
    if (!('translation' in self && 'canDetect' in self.translation)) {
      console.warn('LanguageDetector not available');
      return 'unknown';
    }

    const canDetect = await self.translation.canDetect();
    if (canDetect === 'no') {
      return 'unknown';
    }

    const detector = await self.translation.createDetector();
    const results = await detector.detect(text.slice(0, 6000));

    if (results && results.length > 0) {
      return results[0].detectedLanguage;
    }

    return 'unknown';
  } catch (error) {
    console.error('Language detection failed:', error);
    return 'unknown';
  }
}

// ============================================================================
// SUMMARIZATION
// ============================================================================

async function summarizeText(text) {
  try {
    if (!('ai' in self && 'summarizer' in self.ai)) {
      console.warn('Summarizer not available');
      return null;
    }

    const availability = await self.ai.summarizer.availability();
    if (availability === 'no') {
      return null;
    }

    const summarizer = await self.ai.summarizer.create({
      type: 'key-points',
      format: 'markdown',
      length: 'short'
    });

    const summary = await summarizer.summarize(text.slice(0, 60000));
    return summary;
  } catch (error) {
    console.error('Summarization failed:', error);
    return null;
  }
}

// ============================================================================
// CREDIBILITY ANALYSIS
// ============================================================================

async function analyzeText({ text, url, title }) {
  console.log('Analyzing text:', { url, title, textLength: text.length });

  try {
    await checkAI();

    // 1. Language detection
    const lang = await detectLanguage(text);
    console.log('Detected language:', lang);

    // 2. Summarization
    const summary = await summarizeText(text);
    console.log('Summary generated:', !!summary);

    // 3. Credibility analysis with timeout and retry
    const session = await getLanguageModelSession();
    const trimmed = text.slice(0, 40000);

    const prompt = `Analyze this article for misinformation indicators.

Page: ${title}
URL: ${url}
Language: ${lang}

Return STRICT JSON as defined in system prompt.

Article text:
${trimmed}`;

    console.log('Sending prompt to LanguageModel...');

    // Wrap prompt with timeout (30 seconds)
    const rawResponse = await withTimeout(
      session.prompt(prompt),
      30000
    );

    console.log('Raw response:', rawResponse.slice(0, 200));

    // Parse JSON with retry logic
    let parsed = parseJSON(rawResponse);

    if (!parsed) {
      console.warn('First JSON parse failed, retrying...');

      // Retry once with timeout
      const retryResponse = await withTimeout(
        session.prompt('Your previous output was not valid JSON. Return ONLY JSON as specified in the system prompt.'),
        30000
      );

      parsed = parseJSON(retryResponse);

      if (!parsed) {
        // Return partial result with warning
        logError(
          new Error('JSON_PARSE_FAILED: Could not parse AI response after retry'),
          { context: 'analyzeText', url }
        );

        return {
          score: 50,
          verdict: 'Analysis incomplete - response format error',
          red_flags: ['Unable to parse AI response'],
          claims: [],
          summary,
          lang,
          warning: 'JSON_PARSE_FAILED'
        };
      }
    }

    // Validate required fields
    if (typeof parsed.credibility_score !== 'number') {
      logError(
        new Error('INVALID_RESPONSE: Missing credibility_score'),
        { context: 'analyzeText', parsed }
      );

      return {
        score: 50,
        verdict: 'Analysis incomplete - missing score',
        red_flags: parsed.red_flags || [],
        claims: parsed.claims || [],
        summary,
        lang,
        warning: 'INVALID_RESPONSE'
      };
    }

    const result = {
      score: Math.max(0, Math.min(100, parsed.credibility_score)),
      verdict: parsed.verdict || 'No verdict provided',
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      summary,
      lang
    };

    console.log('Analysis complete:', { score: result.score, claims: result.claims.length });
    return result;

  } catch (error) {
    logError(error, { context: 'analyzeText', url, title });
    throw error;
  }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ANALYZE_TEXT') {
    console.log('Received ANALYZE_TEXT request');

    analyzeText(msg.data)
      .then(result => {
        console.log('Sending analysis result');
        sendResponse({ ok: true, data: result });
      })
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ ok: false, error: error.message });
      });

    return true; // async response
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

(async () => {
  try {
    await checkAI();
    console.log('AI APIs check passed');
  } catch (error) {
    console.error('AI APIs not available:', error);
  }
})();
