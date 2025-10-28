// Offline database of trusted/untrusted news sources
export const knownSites = {
  // High credibility (80-100)
  'reuters.com': 97,
  'apnews.com': 96,
  'bbc.com': 95,
  'bbc.co.uk': 95,
  'npr.org': 94,
  'theguardian.com': 92,
  'nytimes.com': 90,
  'washingtonpost.com': 90,
  'economist.com': 93,
  'wsj.com': 91,
  'ft.com': 92,
  'theatlantic.com': 88,
  'propublica.org': 94,

  // Medium credibility (50-79)
  'cnn.com': 75,
  'foxnews.com': 65,
  'buzzfeednews.com': 70,
  'usatoday.com': 78,
  'politico.com': 76,
  'time.com': 80,
  'newsweek.com': 72,

  // Low credibility / Satire (0-49)
  'theonion.com': 20, // satire
  'infowars.com': 10,
  'breitbart.com': 30,
  'naturalnews.com': 15,
  'beforeitsnews.com': 12,
  'worldnewsdailyreport.com': 5, // satire/fake
};
