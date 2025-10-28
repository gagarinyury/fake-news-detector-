# 🧪 Testing Checklist - Pre-Submission

## ✅ Critical Path Testing (5 minutes)

### Test 1: Manual Analysis Flow
**Goal:** Verify core AI feature works

1. Load extension in Chrome (`chrome://extensions`)
2. Navigate to any news article (e.g., `https://www.bbc.com/news`)
3. Click extension icon → Click "Full Analysis"
4. Side Panel opens
5. Click "Analyze Current Page"
6. **Expected:**
   - Progress bar shows 0% → 100%
   - Score displays (0-100)
   - Verdict shows
   - Red flags listed
   - Claims with accuracy badges
   - Summary generated
   - Language detected
   - Metrics (time, model, suspicion) displayed

**✅ PASS** if all elements display correctly

---

### Test 2: Auto-Analysis Flow (NEW FIX)
**Goal:** Verify auto-analysis listener works

**Setup:**
1. Open Side Panel settings
2. Set "Analysis Mode" to **SMART**
3. Set delay to **3s**
4. Click "Save Settings"

**Test:**
1. Navigate to news site (e.g., `https://www.nytimes.com`)
2. Wait 3 seconds
3. **Expected:**
   - Badge changes to "..." (analyzing)
   - Side Panel auto-opens
   - Status shows "Auto-analyzing page..."
   - Analysis completes automatically
   - Badge updates to score

**✅ PASS** if auto-analysis triggers without clicking button

---

### Test 3: Suspicious Page Detection
**Goal:** Verify priority analysis for suspicious content

**Test:**
1. Navigate to page with suspicious URL pattern
   - Example: Any page with clickbait title containing "You won't believe"
   - Or: Page with suspicious TLD (.xyz, .tk)
2. **Expected:**
   - Badge shows ⚠️ immediately
   - Auto-analysis triggers faster (1s delay instead of 3s)
   - Status shows "⚠️ Analyzing suspicious content (XX/100)..."

**✅ PASS** if suspicious pages get priority treatment

---

### Test 4: Badge System (3 Levels)
**Goal:** Verify badge intelligence

**Level 1 - INSTANT (Known Sites):**
1. Navigate to `https://www.reuters.com`
2. **Expected:** Badge shows "97" instantly (green)

**Level 2 - CACHED:**
1. Analyze any page (manual or auto)
2. Refresh the page
3. **Expected:** Badge shows cached score (~10ms)

**Level 3 - AI:**
1. Navigate to unknown news site
2. Wait for auto-analysis (or click manual)
3. **Expected:** Badge shows "..." during analysis, then score

**✅ PASS** if all 3 levels work correctly

---

### Test 5: Prompt Customization
**Goal:** Verify killer feature works

1. Open Side Panel
2. Expand "✏️ Custom AI Prompts (Advanced)"
3. Edit system prompt: Add "Always include emoji in verdict"
4. Click "Save Custom Prompts"
5. Trigger analysis
6. **Expected:** Verdict includes emoji (showing custom prompt worked)

**✅ PASS** if custom prompts are applied

---

### Test 6: Error Handling
**Goal:** Verify graceful degradation

1. Navigate to `chrome://extensions` (invalid page)
2. Click extension icon
3. **Expected:** Status shows "Cannot analyze this page type"

**✅ PASS** if error message is user-friendly

---

## 🔍 Quick Visual Check (1 minute)

### UI Elements Present:
- [ ] Badge shows on all HTTP(S) pages
- [ ] Popup UI loads quickly
- [ ] Side Panel has all sections:
  - [ ] Analyze button
  - [ ] Results section
  - [ ] Prompt Editor
  - [ ] Settings
  - [ ] Debug Logs
- [ ] Styles look professional (no broken CSS)

---

## 🚀 Final Verification

### Before Submission:
1. **Reload extension** in `chrome://extensions`
2. **Test critical path** (Test 1 + Test 2)
3. **Check console** for errors (F12 → Console)
4. **Verify icons** display correctly (16px, 32px, 128px)
5. **Review README.md** one last time

### Expected Console Output:
```
✅ Background service worker loaded
✅ Side Panel loaded
✅ Auto-analysis listener registered
✅ Content script loaded
```

**NO RED ERRORS** should appear in console

---

## 📊 Success Criteria

| Test | Status | Notes |
|------|--------|-------|
| Manual Analysis | ✅ | Core feature |
| Auto-Analysis | ✅ | NEW FIX |
| Suspicious Detection | ✅ | Wow factor |
| Badge System | ✅ | 3 levels |
| Prompt Editor | ✅ | Killer feature |
| Error Handling | ✅ | Graceful |

**ALL TESTS MUST PASS** before submission! ✅

---

## 🐛 Known Issues (None Expected)

If any issues found during testing, document here:
- Issue: _________
- Severity: High/Medium/Low
- Workaround: _________

---

**Last Updated:** 2025-10-28
**Status:** Ready for Testing ✅
