# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-10-28

### Added
- 🤖 **Core AI Analysis Engine**
  - On-device credibility scoring (0-100)
  - Red flag detection (sources, bias, emotional language)
  - Claim extraction with accuracy assessment
  - Summary generation using AI Summarizer API
  - Language detection using Translation API

- 🏆 **Custom Prompt Editor** (Killer Feature)
  - Real-time prompt customization
  - Template variables support: `{{title}}`, `{{url}}`, `{{text}}`, `{{suspicionScore}}`
  - Save/Reset functionality
  - Persistent storage across sessions

- 🚨 **Context-Aware Suspicious Detection**
  - Heuristic scoring based on URL patterns
  - Clickbait title detection
  - Suspicious TLD identification
  - Priority analysis for high-risk content

- 🎯 **3-Level Intelligent Badge System**
  - Level 1: Instant offline scores (knownSites database)
  - Level 2: Cached AI analysis results
  - Level 3: Full on-device AI analysis
  - Smart fallback cascade

- ⚙️ **Configurable Auto-Analysis**
  - OFF mode: Manual analysis only
  - SMART mode: Auto-analyze news sites
  - ALWAYS mode: Analyze all HTTP(S) pages
  - Adjustable delay (0-10s throttling)

- 📊 **Analysis Transparency**
  - Real-time metrics (time, model, suspicion score)
  - Debug logs with download option
  - Cache management UI

- 🎨 **Professional UI**
  - Popup quick view
  - Side Panel full analysis
  - Interactive highlighting on page
  - Responsive design

- 📚 **Comprehensive Documentation**
  - README.md with installation guide
  - ARCHITECTURE.md with technical details
  - TESTING_CHECKLIST.md for QA
  - SUBMISSION_READY.md for final review

### Fixed
- ✅ **Critical: Auto-analysis listener** (v1.0.0-rc2)
  - Added `chrome.runtime.onMessage` listener in `panel.js`
  - Auto-analysis now triggers correctly on page load
  - Suspicious page detection now functional
  - Message flow: Background → Side Panel working end-to-end

### Technical Details
- **API Compatibility:** Supports both new (Chrome 138+) and legacy AI APIs
- **Error Handling:** Classified errors with user-friendly messages
- **Privacy:** 100% on-device processing, no external calls
- **Performance:** 3-level badge system with intelligent caching

### Known Issues
- None (all critical bugs fixed)

---

## Development Timeline

- **Day 1 (4 hours):** Core architecture, badge system, basic UI
- **Day 2 (6 hours):** AI integration, prompt system, auto-analysis
- **Day 3 (3 hours):** Polish, documentation, testing
- **Final Audit (1 hour):** Bug discovery and fix
- **Total Time:** ~14 hours

---

## Submission Info

- **Version:** 1.0.0
- **Date:** October 28, 2025
- **Competition:** Google Chrome Built-in AI Challenge
- **Status:** ✅ Ready for submission
- **Confidence:** High 🏆

---

## Credits

Built for the Google Chrome Built-in AI Challenge.

**Technologies:**
- Chrome Manifest V3
- Chrome Built-in AI APIs (Gemini Nano)
- Vanilla JavaScript (no frameworks)
- Modern CSS (responsive design)

**Special Thanks:**
- Chrome AI team for excellent documentation
- Claude Code for development assistance
