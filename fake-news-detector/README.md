# 🔍 Fake News Detector

**On-device AI fact-checking powered by Chrome Built-in AI (Gemini Nano)**

[![Chrome Version](https://img.shields.io/badge/Chrome-138%2B-blue)](https://www.google.com/chrome/)
[![Manifest](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![AI](https://img.shields.io/badge/AI-Gemini%20Nano-orange)](https://developer.chrome.com/docs/ai/built-in)

## ✨ Features

### 🤖 Intelligent Badge System
- **3-Level Intelligence:**
  - 🟢 **Instant** (0ms): Offline score from known sources database (26 trusted domains)
  - 🟡 **Cached** (10ms): Previous AI analysis results (24h TTL)
  - 🔵 **On-Demand** (5-10s): Full on-device AI fact-checking

### 🔍 Smart Detection
- **Known Sources Database:** Instant credibility scores for major news outlets
- **Cache Management:** Fast retrieval of previous analyses
- **Privacy-First:** All processing happens on your device

### 📊 Comprehensive Analysis
- **Credibility Score** (0-100) with color-coded badge
- **Red Flags** detection (sources, bias, emotional language)
- **Claim Extraction** with accuracy assessment and evidence
- **Interactive Highlighting** on page with tooltips
- **Language Detection** and summarization

### ⚙️ Advanced Customization
- **🏆 Custom Prompt Editor** (Killer Feature!)
  - Edit system and user prompts in real-time
  - Template variables: `{{title}}`, `{{url}}`, `{{text}}`, `{{suspicionScore}}`
  - Save/reset functionality with persistent storage
  - Empower researchers to customize AI behavior for different use cases

### 📈 Transparency
- **Analysis Metrics:** Time, model used, suspicion score
- **Debug Logs:** Full analysis trace with download option
- **Cache Management:** 24-hour TTL with manual clear

## 📋 Requirements

- **Chrome 138+** with Built-in AI APIs enabled
- **~22 GB** free disk space (for Gemini Nano model)
- **Internet** (first-time model download only)

### Verify AI Availability

1. Open `chrome://on-device-internals/`
2. Check that **Gemini Nano** status is "Ready" or "Downloading"
3. If unavailable, follow [Chrome AI setup guide](https://developer.chrome.com/docs/ai/built-in)

## 🚀 Installation

1. **Clone or download** this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `fake-news-detector` folder
6. Wait for AI model download (first time only, ~1.5 GB)

## 🎯 Usage

> **⚠️ Note:** Auto-analysis requires manual trigger via "Analyze" button. Background auto-analysis code is implemented but requires Side Panel to be open first (will be enhanced in future release).

### Manual Analysis Workflow
1. Navigate to any news article (e.g., BBC, NYTimes, etc.)
2. Click extension icon in toolbar
3. Click **"Full Analysis"** button in popup
4. Side Panel opens automatically
5. Click **"Analyze Current Page"** button
6. View detailed results:
   - Credibility Score (0-100) with color coding
   - Red Flags (bias, sources, emotional language)
   - Key Claims with accuracy assessment
   - Summary and language detection
   - Analysis metrics (time, model, suspicion score)
7. Optionally: Click **"Highlight Claims"** in popup to see claims highlighted on the page

### Customize AI Behavior
1. Open Side Panel
2. Expand **"✏️ Custom AI Prompts (Advanced)"**
3. Edit system/user prompts
4. Click **"Save Custom Prompts"**
5. Next analysis uses your prompts

## 📂 Project Structure

```
fake-news-detector/
├── manifest.json                    # Manifest V3
├── src/
│   ├── background/
│   │   └── background.js           # Orchestration, auto-analysis, badge
│   ├── sidepanel/
│   │   ├── panel.html              # Full analysis UI
│   │   ├── panel.js                # AI integration, prompt management
│   │   └── panel.css               # Responsive styles
│   ├── popup/
│   │   ├── popup.html              # Quick view UI
│   │   ├── popup.js                # Cache display, actions
│   │   └── popup.css               # Compact styles
│   ├── content/
│   │   ├── content.js              # Text extraction, highlighting
│   │   └── overlay.css             # Highlight/tooltip styles
│   ├── shared/
│   │   ├── settings.js             # User preferences (sync)
│   │   ├── prompts.js              # Prompt management & templating
│   │   ├── errorHandler.js         # Centralized error handling
│   │   ├── logger.js               # Debug logging
│   │   ├── knownSites.js           # Offline credibility DB (26 domains)
│   │   ├── json.js                 # JSON parsing utilities
│   │   └── hashing.js              # URL hashing for cache keys
│   └── assets/
│       └── icons/                  # Extension icons (16/32/128px)
└── README.md
```

## 🔧 How It Works

### Architecture: Hybrid Popup + Side Panel

```
┌─────────────────┐
│  Page Load      │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────┐
│  Background Service Worker              │
│  • Check knownSites → Badge (instant)   │
│  • Check cache → Badge (cached)         │
│  • Calculate suspicion score            │
│  • If suspicious OR news → Schedule AI  │
└────────┬────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────┐
│  Side Panel (AI Analysis)               │
│  • Initialize Gemini Nano session       │
│  • Detect language                      │
│  • Generate summary                     │
│  • Analyze credibility with prompts     │
│  • Parse structured JSON output         │
│  • Cache result → Update badge          │
└─────────────────────────────────────────┘
```

### Message Protocol

**Background ↔ Content Script:**
```javascript
GET_PAGE_TEXT        → {ok, text, url, title}
HIGHLIGHT_CLAIMS     → {claims[], riskMap{}} → {ok, count}
CLEAR_HIGHLIGHTS     → {ok}
```

**Popup/Side Panel ↔ Background:**
```javascript
GET_CACHED_ANALYSIS  → {url} → {ok, data}
OPEN_SIDE_PANEL      → {tabId} → {ok}
REQUEST_PAGE_TEXT    → {tabId} → {ok, text, url, title}
CACHE_RESULT         → {url, result} → {ok}
AUTO_ANALYZE_REQUEST → {tabId, url, title, suspicionScore}
```

## 🧠 AI Technology Stack

### Chrome Built-in AI APIs

| API | Purpose | Usage |
|-----|---------|-------|
| **ai.languageModel** | Credibility analysis | Score, verdict, red flags, claims |
| **ai.summarizer** | Text summarization | Key points extraction |
| **translation.languageDetector** | Language detection | Auto-detect article language |

### Hybrid API Strategy

Supports **both new and legacy** Chrome AI APIs:

- **New API** (Chrome 128+): `systemPrompt`, `responseConstraint`
- **Legacy API** (Chrome 138): `initialPrompts`, plain prompt
- **Graceful fallback:** Auto-detect and use available API

### Prompt System

**Template variables:**
- `{{title}}` - Page title
- `{{url}}` - Page URL
- `{{text}}` - Article text (truncated)
- `{{suspicionScore}}` - Heuristic suspicion (0-100)

**Conditional blocks:**
```
{{#suspicionScore}}
  ⚠️ SUSPICIOUS INDICATORS DETECTED
  Pay extra attention to clickbait and sources.
{{/suspicionScore}}
```

## 🔒 Privacy & Security

- ✅ **100% On-Device Processing** (no external API calls)
- ✅ **No Data Collection** (nothing leaves your browser)
- ✅ **No Telemetry** (no analytics or tracking)
- ✅ **Offline-First** (works without internet after setup)
- ✅ **Open Source** (inspect all code)
- ✅ **Minimal Permissions:**
  - `activeTab` - Access current page only
  - `storage` - Cache results locally
  - `sidePanel` - Full analysis UI
  - `scripting` - Content script injection

## 🎨 UI/UX Highlights

### Badge Intelligence
- **Green (75-100):** High credibility
- **Yellow (40-74):** Mixed credibility
- **Red (0-39):** Low credibility
- **⚠️:** Suspicious content detected
- **?:** Not analyzed yet
- **...:** Analysis in progress

### Side Panel Features
- **Collapsible sections** for clean UI
- **Prompt editor** with syntax highlighting
- **Settings persistence** via `chrome.storage.sync`
- **Debug logs** with download/clear
- **Responsive design** (400px width)

## 📚 Specifications

This project follows 18 architectural specifications:

- ✅ **00_BUILD_CHAIN**: Project structure
- ✅ **01_ARCH_SPEC**: Hybrid architecture
- ✅ **02_MANIFEST_SPEC**: Manifest V3
- ✅ **03_UI_SPEC**: Popup UI
- ✅ **04_CONTENT_SCRIPT_SPEC**: Text extraction & highlighting
- ✅ **05_POPUP_LOGIC_SPEC**: Popup logic
- ✅ **06_PROMPT_SCHEMA_SPEC**: Prompt system
- ✅ **14_SIDE_PANEL_SPEC**: Side Panel UI
- ✅ **15_BADGE_AUTO_SPEC**: Auto-analysis
- ✅ **16_KNOWN_SITES_SPEC**: Offline database
- ✅ **17_ERROR_HANDLING_SPEC**: Error handling
- ✅ **18_SHARED_UTILS_SPEC**: Utilities

## 🐛 Troubleshooting

### AI Not Available
1. Check `chrome://on-device-internals/`
2. Verify Chrome 138+ with AI enabled
3. Ensure 22 GB+ free disk space
4. Restart Chrome and wait for model download

### Badge Not Updating
1. Check extension is loaded (`chrome://extensions`)
2. Verify Settings: Auto-analysis mode is not OFF
3. Check console for errors (Developer Tools)

### Highlighting Not Working
1. Ensure page has completed loading
2. Check that claims have valid snippets (2-4 words)
3. Try refreshing the page

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- [ ] Multimodal analysis (images, videos)
- [ ] Cloud fallback (optional API verification)
- [ ] Automated tests
- [ ] Localization (i18n)
- [ ] Performance optimizations

## 📄 License

MIT License - see LICENSE file for details

## 🏆 Built for Google Chrome Built-in AI Challenge

This project demonstrates:
- ✅ Innovative use of Chrome Built-in AI APIs
- ✅ Privacy-first on-device processing
- ✅ Context-aware intelligent analysis
- ✅ User empowerment through customization
- ✅ Production-ready implementation

---

**Made with ❤️ using Chrome Built-in AI (Gemini Nano)**
