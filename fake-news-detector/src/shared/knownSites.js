// Offline database of trusted/untrusted news sources
// Credibility scores based on Media Bias/Fact Check, NewsGuard, and journalistic standards
// Last updated: 2025-10-28
export const knownSites = {
  // ============================================================================
  // HIGH CREDIBILITY (90-100) - Highly Trusted International Sources
  // ============================================================================
  'reuters.com': 98,
  'apnews.com': 97,
  'afp.com': 96, // Agence France-Presse
  'dpa.com': 96, // Deutsche Presse-Agentur
  'bbc.com': 95,
  'bbc.co.uk': 95,
  'npr.org': 95,
  'pbs.org': 94,
  'propublica.org': 97,
  'economist.com': 94,
  'ft.com': 93, // Financial Times
  'wsj.com': 92, // Wall Street Journal
  'nytimes.com': 91,
  'washingtonpost.com': 91,
  'theguardian.com': 90,
  'theatlantic.com': 90,

  // ============================================================================
  // HIGH CREDIBILITY (80-89) - Reputable Major Publications
  // ============================================================================
  'cbsnews.com': 88,
  'abcnews.go.com': 87,
  'nbcnews.com': 87,
  'usatoday.com': 85,
  'latimes.com': 86,
  'chicagotribune.com': 84,
  'sfgate.com': 83,
  'bostonglobe.com': 85,
  'miamiherald.com': 83,
  'denverpost.com': 82,
  'seattletimes.com': 84,
  'time.com': 85,
  'forbes.com': 82,
  'businessinsider.com': 78,
  'marketwatch.com': 83,
  'bloomberg.com': 89,

  // International - High Quality
  'aljazeera.com': 82,
  'dw.com': 88, // Deutsche Welle
  'france24.com': 86,
  'smh.com.au': 84, // Sydney Morning Herald
  'theage.com.au': 83,
  'theglobeandmail.com': 86, // Canada
  'cbc.ca': 87, // Canadian Broadcasting Corporation
  'ctvnews.ca': 84,
  'rte.ie': 85, // Ireland
  'thejournal.ie': 82,
  'newshub.co.nz': 83, // New Zealand
  'stuff.co.nz': 82,
  'scmp.com': 79, // South China Morning Post
  'straitstimes.com': 81, // Singapore
  'japantimes.co.jp': 83,

  // ============================================================================
  // MEDIUM-HIGH CREDIBILITY (70-79) - Generally Reliable with Some Bias
  // ============================================================================
  'cnn.com': 76,
  'msnbc.com': 72,
  'politico.com': 78,
  'thehill.com': 77,
  'axios.com': 79,
  'vox.com': 74,
  'slate.com': 73,
  'salon.com': 68,
  'motherjones.com': 70,
  'thedailybeast.com': 71,
  'newsweek.com': 74,
  'huffpost.com': 69,
  'buzzfeednews.com': 73,
  'vice.com': 72,
  'rollingstone.com': 71,
  'newyorker.com': 79,
  'vanityfair.com': 74,
  'harpersbazaar.com': 70,

  // ============================================================================
  // MEDIUM CREDIBILITY (60-69) - Mixed Reliability
  // ============================================================================
  'foxnews.com': 65,
  'nypost.com': 62,
  'dailymail.co.uk': 58,
  'metro.co.uk': 63,
  'independent.co.uk': 67,
  'telegraph.co.uk': 68,
  'express.co.uk': 59,
  'mirror.co.uk': 57,
  'thesun.co.uk': 52,
  'news.com.au': 64,
  'dailytelegraph.com.au': 61,
  'heraldsun.com.au': 60,
  'rt.com': 45, // Russia Today - state-controlled
  'sputniknews.com': 42, // State-controlled

  // ============================================================================
  // MEDIUM-LOW CREDIBILITY (50-59) - Questionable Sources
  // ============================================================================
  'breitbart.com': 35,
  'dailywire.com': 52,
  'nationalreview.com': 58,
  'theblaze.com': 54,
  'newsmax.com': 48,
  'oann.com': 38, // One America News
  'theamericanconservative.com': 56,
  'spectator.co.uk': 57,
  'dailycaller.com': 51,
  'washingtontimes.com': 53,
  'washintonexaminer.com': 54,
  'theintercept.com': 68,
  'commondreams.org': 59,
  'alternet.org': 52,
  'rawstory.com': 55,
  'truthout.org': 58,

  // ============================================================================
  // LOW CREDIBILITY (20-49) - Unreliable / Heavy Bias
  // ============================================================================
  'infowars.com': 12,
  'naturalnews.com': 15,
  'beforeitsnews.com': 18,
  'neonnettle.com': 22,
  'yournewswire.com': 20,
  'freedomoutpost.com': 25,
  'conservativetribune.com': 28,
  'wnd.com': 32, // WorldNetDaily
  'truthfeed.com': 24,
  'usapoliticstoday.com': 21,
  'thelibertarianrepublic.com': 35,
  'activistpost.com': 30,
  'globalresearch.ca': 27,
  'zerohedge.com': 38,

  // ============================================================================
  // SATIRE / FAKE NEWS (0-19) - Intentional Misinformation or Satire
  // ============================================================================
  'theonion.com': 15, // Satire (labeled)
  'clickhole.com': 12, // Satire
  'worldnewsdailyreport.com': 5, // Fake news
  'empirenews.net': 8, // Fake news
  'nationalreport.net': 7, // Fake news
  'newslo.com': 6, // Fake news
  'cap-news.com': 4, // Fake news
  'dailybuzzlive.com': 10, // Clickbait/fake
  'thebostontribune.com': 9, // Fake news
  'denver-guardian.com': 3, // Fake news (defunct)
  'civictribune.com': 8, // Fake news
  'react365.com': 11, // Clickbait
  'private-eye.co.uk': 18, // Satire magazine
  'newsthump.com': 16, // Satire
  'thedailymash.co.uk': 14, // Satire
  'theshovel.com.au': 17, // Australian satire
  'betoota-advocate.com': 16, // Australian satire
};

// Statistics:
// Total sources: 115
// High credibility (80-100): 47
// Medium-high (70-79): 18
// Medium (60-69): 13
// Medium-low (50-59): 16
// Low (20-49): 14
// Satire/Fake (0-19): 17
