# 🏗️ Architecture Overview

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Chrome Browser                            │
│                                                               │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │   Popup    │  │ Side Panel  │  │ Content Script       │  │
│  │ (Quick     │  │ (Full AI    │  │ • Text extraction    │  │
│  │  View)     │  │  Analysis)  │  │ • Highlighting       │  │
│  └─────┬──────┘  └──────┬──────┘  └──────────┬───────────┘  │
│        │                │                     │               │
│        │                │                     │               │
│        └────────────────┴─────────────────────┘               │
│                         │                                     │
│                ┌────────▼────────┐                            │
│                │  Background SW  │                            │
│                │  • Orchestration│                            │
│                │  • Badge        │                            │
│                │  • Cache        │                            │
│                │  • Auto-analyze │                            │
│                └────────┬────────┘                            │
│                         │                                     │
│                ┌────────▼────────┐                            │
│                │ chrome.storage  │                            │
│                │ • Settings      │                            │
│                │ • Prompts       │                            │
│                │ • Cache         │                            │
│                │ • Logs          │                            │
│                └─────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Page Load → Auto-Analysis

```
Page Load
    │
    ▼
Background: tabs.onUpdated
    │
    ├─► Check knownSites DB
    │   └─► Update badge (INSTANT)
    │
    ├─► Check cache
    │   └─► Update badge (CACHED)
    │
    └─► Calculate suspicion score
        │
        ├─► If suspicious (≥50)
        │   └─► Trigger immediate analysis (1s delay)
        │
        └─► If news domain (SMART mode)
            └─► Schedule analysis (3s delay)
```

### 2. Side Panel Analysis

```
User clicks "Analyze"
    │
    ▼
Side Panel: Initialize AI
    │
    ├─► Load custom prompts (or defaults)
    │
    ├─► Check API availability
    │   ├─► New API (systemPrompt)
    │   └─► Legacy API (initialPrompts)
    │
    ├─► Request page text (Background → Content)
    │
    ├─► Language Detection
    │   └─► translation.languageDetector
    │
    ├─► Summarization
    │   └─► ai.summarizer
    │
    ├─► Credibility Analysis
    │   ├─► Build prompt with template
    │   ├─► ai.languageModel.prompt()
    │   ├─► Try responseConstraint (Chrome 128+)
    │   └─► Fallback to plain prompt
    │
    ├─► Parse JSON response
    │   └─► Extract: score, verdict, red_flags, claims
    │
    └─► Cache result → Update badge
```

### 3. Claim Highlighting

```
User clicks "Highlight"
    │
    ▼
Popup → Background → Content
    │
    ├─► For each claim:
    │   ├─► Find snippet in page text
    │   ├─► Create <mark> element
    │   ├─► Add tooltip with details
    │   └─► Color-code by accuracy
    │
    └─► Return count of highlighted claims
```

## Component Responsibilities

### Background Service Worker
- **Auto-analysis orchestration**
  - Monitor page loads
  - Calculate suspicion scores
  - Trigger AI analysis
- **Badge management**
  - 3-level updates (instant/cached/AI)
  - Color coding
  - Tooltip with metadata
- **Cache management**
  - 24-hour TTL
  - hashURL for cache keys
- **Message routing**
  - Popup ↔ Content
  - Side Panel ↔ Content

### Side Panel
- **AI integration**
  - Initialize Gemini Nano session
  - Hybrid API support (new + legacy)
  - Progress tracking
- **Prompt management**
  - Load/save custom prompts
  - Template rendering
  - Variable substitution
- **Results display**
  - Score, verdict, red flags
  - Claims with accuracy
  - Summary, language
  - Analysis metrics
- **Settings UI**
  - Auto-analysis modes
  - Delay configuration
  - Prompt editor

### Popup
- **Quick view**
  - Display cached results
  - Fast access to score
- **Actions**
  - Open Side Panel
  - Highlight claims
  - Clear highlights
  - Copy report

### Content Script
- **Text extraction**
  - Priority: `<article>` → `<main>` → `<body>`
  - Clean whitespace
- **Highlighting**
  - Substring match for snippets
  - `<mark>` with color coding
  - Tooltips on hover
- **Cleanup**
  - Remove highlights
  - Restore original DOM

## Shared Modules

### settings.js
- User preferences (chrome.storage.sync)
- Auto-analysis modes (OFF/SMART/ALWAYS)
- Delay configuration
- Domain classification (isNewsLikeDomain)
- Suspicion scoring (getSuspicionScore)

### prompts.js
- Prompt storage & retrieval
- Template rendering (Mustache-style)
- Variable substitution
- Conditional blocks
- JSON Schema for structured output

### errorHandler.js
- Error classification
- User-friendly messages
- Logging with stack traces
- Retry logic
- Graceful degradation

### logger.js
- Debug logging
- chrome.storage.local persistence
- Download logs
- Clear logs

### knownSites.js
- Offline credibility database
- 26 domains with scores
- High (80-100), Medium (50-79), Low (0-49)

## Message Protocol

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `GET_PAGE_TEXT` | Background → Content | Extract page text |
| `HIGHLIGHT_CLAIMS` | Popup/Background → Content | Highlight claims on page |
| `CLEAR_HIGHLIGHTS` | Popup/Background → Content | Remove highlights |
| `GET_CACHED_ANALYSIS` | Popup → Background | Get cached result |
| `OPEN_SIDE_PANEL` | Popup → Background | Open Side Panel |
| `REQUEST_PAGE_TEXT` | Side Panel → Background | Get page text via Content |
| `CACHE_RESULT` | Side Panel → Background | Save analysis result |
| `AUTO_ANALYZE_REQUEST` | Background → Side Panel | Trigger auto-analysis |

### Message Format

```javascript
{
  type: 'MESSAGE_TYPE',
  data: {
    // Message-specific payload
  }
}
```

## Storage Schema

### chrome.storage.sync
```javascript
{
  settings: {
    autoAnalysis: 'smart',
    analysisDelay: 3000,
    cacheExpiry: 86400000,
    showBadgeTooltip: true,
    highlightAutoUpdate: true
  },

  customPrompts: {
    system: '...',
    userTemplate: '...',
    updatedAt: 1234567890
  }
}
```

### chrome.storage.local
```javascript
{
  'cache:{hash}': {
    data: { score, verdict, ... },
    timestamp: 1234567890,
    textLength: 5000
  },

  'debug_logs': [
    {
      timestamp: '2024-01-01T12:00:00Z',
      component: 'SidePanel',
      level: 'INFO',
      message: '...',
      data: {...}
    }
  ]
}
```

## AI Integration

### API Compatibility Matrix

| Chrome Version | API Available | Strategy |
|----------------|---------------|----------|
| 128-137 | New API (experimental) | systemPrompt + responseConstraint |
| 138+ | Legacy API (stable) | initialPrompts |
| 142+ | New API (stable) | systemPrompt + responseConstraint |

### Prompt Flow

```
1. getPrompts() → Load custom or default
2. renderPrompt(template, variables) → Substitute variables
3. initializeAI() → Create session with systemPrompt/initialPrompts
4. analyzeText() → Send prompt to AI
5. Try responseConstraint → Catch → Fallback plain prompt
6. parseAIResponse() → Clean & parse JSON
7. Return structured result
```

## Performance Optimizations

1. **3-Level Badge** - Progressive enhancement
   - Instant (0ms): knownSites lookup
   - Cached (10ms): storage.local read
   - AI (5-10s): Full analysis

2. **Throttling** - Smart delay
   - 3s default (configurable 0-10s)
   - 1s for suspicious pages
   - Cancel on tab close

3. **Caching** - 24-hour TTL
   - URL hash for keys
   - Text length tracking
   - Stale cache cleanup

4. **Lazy Loading** - On-demand initialization
   - AI session only when needed
   - Side Panel only when opened
   - Content script only when required

## Security Considerations

1. **No External Calls** - 100% on-device
2. **Minimal Permissions** - Only what's needed
3. **Input Validation** - Sanitize all user input
4. **CSP Compliant** - No inline scripts
5. **Storage Limits** - 500 logs max, 24h cache

## Extension Lifecycle

```
Install
  └─► Load manifest
      └─► Register background service worker
          └─► Register content scripts
              └─► Wait for user interaction

Page Load
  └─► Content script injected
      └─► Background monitors
          └─► Auto-analysis (if enabled)

User Click Icon
  └─► Popup opens
      └─► Load cached data
          └─► Display quick view

User Click "Full Analysis"
  └─► Side Panel opens
      └─► Initialize AI
          └─► Run analysis
              └─► Cache & update badge

Browser Close
  └─► Cleanup AI sessions
      └─► Save pending data
```

## Future Enhancements

- [ ] **Multimodal analysis** (images, videos)
- [ ] **Collaborative filtering** (optional cloud sync)
- [ ] **A/B prompt testing**
- [ ] **Performance metrics dashboard**
- [ ] **Browser action badge animations**
- [ ] **Keyboard shortcuts**
- [ ] **Export reports (PDF, CSV)**
