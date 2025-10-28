# 06_PROMPT_SCHEMA_SPEC — Промпты и JSON Schema для LanguageModel

**Цель:** зафиксировать строгий выходной формат через `initialPrompts` + JSON Schema (если поддерживается).

## System Prompt (для LanguageModel.create)
```javascript
const session = await LanguageModel.create({
  initialPrompts: [{
    role: 'system',
    content: `You are a rigorous fact-checking assistant analyzing news articles for credibility.

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

No prose. No markdown. Pure JSON only.`
  }]
});
```

## User Prompt Template
```javascript
const userPrompt = `Analyze this article for misinformation indicators.

Page: ${title}
URL: ${url}
Language: ${detectedLang || 'auto'}

Return STRICT JSON as defined in system prompt.

Article text:
${trimmedText}`;

const response = await session.prompt(userPrompt);
```

## Пример корректного ответа
```json
{
  "credibility_score": 62,
  "verdict": "Likely mixed: credible base but sensational framing.",
  "red_flags": ["Clickbait headline", "No primary source link"],
  "claims": [
    { "text": "The policy will be implemented nationwide by January." },
    { "text": "Experts agree that risks are minimal." }
  ]
}
```

## Обработка ошибок
- Если ответ не JSON → повторный запрос:  
  *"Your previous output was not valid JSON. Return ONLY JSON as specified."*
- Обрезать тройные кавычки и блоки ```json ... ``` при парсинге.
- Удалять висячие запятые перед `]`/`}`.

## Acceptance
- На 10+ страницах ≥ 90% ответов парсятся без ручных правок.
