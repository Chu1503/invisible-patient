import type { MentalState, RiskLevel } from "./store";

const ZBI_CLUSTERS = {
  timeDeprivation:   ["no time","never have time","can't rest","always on","no break","around the clock","24/7","constant","never sleep","can't sleep"],
  socialIsolation:   ["alone","isolated","lonely","no one understands","no friends","can't go out","stuck at home","no life","disconnected","cut off"],
  guiltyAnger:       ["angry at him","angry at her","hate myself","feel guilty","guilt","bad person","shouldn't feel","hate being angry","ashamed","monster","awful person"],
  lossOfSelf:        ["lost myself","lost my identity","don't know who i am","used to be","forgot what i like","given up everything","nothing left for me","invisible"],
  financialStress:   ["can't afford","money","financial","bills","debt","expensive","broke","no money","insurance"],
  relationshipStrain:["family doesn't help","no support","doing it alone","all on me","burden","no one helps"],
};

const CRISIS_KEYWORDS = [
  "want to die","kill myself","kill him","kill her","kill the patient",
  "end my life","end it all","don't want to be here","better off dead",
  "can't go on","no reason to live","suicide","suicidal","harm myself",
  "hurt myself","want to disappear forever","want to kill","going to kill",
  "hurt him","hurt her","hurt them",
];

const POSITIVE_WORDS = [
  "proud","grateful","thankful","hopeful","better","stronger","managed","laughed",
  "smiled","happy","joy","peaceful","calm","relieved","good","wonderful","love",
  "strength","progress","improving","okay","fine","blessed","appreciate",
];

const NEGATIVE_WORDS = [
  "terrible","awful","horrible","miserable","hopeless","worthless","useless",
  "exhausted","drained","broken","defeated","trapped","suffocating","drowning",
  "failing","lost","empty","numb","desperate","frightened","angry","furious",
  "hate","disgusted","ashamed","guilty","alone","isolated","abandoned",
];

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw)).length;
}

export function calculateResonanceScore(allUserMessages: string[]): number {
  if (!allUserMessages.length) return 50;
  const combined = allUserMessages.join(" ");
  const words = combined.split(/\s+/).filter((w) => w.length > 0);
  const sentences = combined.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (!words.length) return 50;

  // Sentiment ratio (40% weight)
  const posCount = countMatches(combined, POSITIVE_WORDS);
  const negCount = countMatches(combined, NEGATIVE_WORDS);
  const total = posCount + negCount;
  const sentimentRatio = total === 0 ? 0.5 : posCount / total;
  const sentimentScore = sentimentRatio * 100;

  // Lexical diversity / Type-Token Ratio (30% weight)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")));
  const ttr = uniqueWords.size / words.length;
  const ttrScore = Math.min(100, Math.max(0, ((ttr - 0.3) / 0.5) * 100));

  // Mean sentence length (15% weight)
  const avgSentLen = sentences.length > 0 ? words.length / sentences.length : 5;
  const sentLenScore = avgSentLen < 3 ? 10 : avgSentLen < 6 ? 35 : avgSentLen < 10 ? 65 : avgSentLen < 20 ? 90 : 70;

  // Elaboration ratio (15% weight)
  const wordCountScore = Math.min(100, (words.length / 150) * 100);

  return Math.min(100, Math.max(0, Math.round(
    sentimentScore * 0.40 + ttrScore * 0.30 + sentLenScore * 0.15 + wordCountScore * 0.15
  )));
}

export interface AnalysisResult {
  mentalState: MentalState;
  zbiEstimate: number;
  zbiAnswers: number[];
  resonanceScore: number;
  emotions: string[];
  riskLevel: RiskLevel;
  dominantThemes: string[];
  hasCrisisSignals: boolean;
}

export function analyzeConversation(
  messages: { role: string; content: string }[],
  zbiAnswers: number[] = []
): AnalysisResult {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  const userText = userMessages.join(" ");

  const zbiScores = {
    timeDeprivation:   countMatches(userText, ZBI_CLUSTERS.timeDeprivation) * 6,
    socialIsolation:   countMatches(userText, ZBI_CLUSTERS.socialIsolation) * 7,
    guiltyAnger:       countMatches(userText, ZBI_CLUSTERS.guiltyAnger) * 8,
    lossOfSelf:        countMatches(userText, ZBI_CLUSTERS.lossOfSelf) * 7,
    financialStress:   countMatches(userText, ZBI_CLUSTERS.financialStress) * 5,
    relationshipStrain:countMatches(userText, ZBI_CLUSTERS.relationshipStrain) * 5,
  };

  const zbiEstimate = zbiAnswers.length > 0
    ? Math.round((zbiAnswers.reduce((a, b) => a + b, 0) / 48) * 48)
    : Math.min(48, Object.values(zbiScores).reduce((a, b) => a + b, 0));

  const hasCrisisSignals = countMatches(userText, CRISIS_KEYWORDS) > 0;
  const resonanceScore = calculateResonanceScore(userMessages);

  const dominantThemes: string[] = [];
  if (zbiScores.guiltyAnger >= 8)     dominantThemes.push("Guilt-Anger Cycle");
  if (zbiScores.lossOfSelf >= 7)      dominantThemes.push("Identity Loss");
  if (zbiScores.socialIsolation >= 7) dominantThemes.push("Social Isolation");
  if (zbiScores.timeDeprivation >= 6) dominantThemes.push("Time Deprivation");
  if (zbiScores.financialStress >= 5) dominantThemes.push("Financial Stress");

  const lower = userText.toLowerCase();
  const emotions: string[] = [];
  if (lower.match(/\bangry?\b|\bfurious\b/))  emotions.push("anger");
  if (lower.match(/\bguilty?\b|\bashamed\b/)) emotions.push("guilt");
  if (lower.match(/\btired\b|\bexhausted\b/)) emotions.push("exhaustion");
  if (lower.match(/\blonely\b|\balone\b/))    emotions.push("isolation");
  if (lower.match(/\bhopeless\b/))            emotions.push("hopelessness");
  if (lower.match(/\banxious\b|\bworried\b/)) emotions.push("anxiety");
  if (lower.match(/\bsad\b|\bcrying\b/))      emotions.push("sadness");
  if (lower.match(/\bproud\b|\bgrateful\b/))  emotions.push("pride");
  if (lower.match(/\boverwhelmed\b/))         emotions.push("overwhelm");
  if (lower.match(/\bfrustrat/))              emotions.push("frustration");
  if (lower.match(/\bhelpless\b/))            emotions.push("helplessness");

  let riskLevel: RiskLevel = "low";
  if (hasCrisisSignals)       riskLevel = "crisis";
  else if (zbiEstimate >= 36) riskLevel = "high";
  else if (zbiEstimate >= 24) riskLevel = "moderate";

  const positiveCount = countMatches(userText, POSITIVE_WORDS);
  let mentalState: MentalState = "calm";
  if (hasCrisisSignals)                    mentalState = "overwhelmed";
  else if (zbiScores.guiltyAnger >= 8)     mentalState = "anxious";
  else if (zbiScores.socialIsolation >= 7) mentalState = "restless";
  else if (zbiScores.timeDeprivation >= 6) mentalState = "tired";
  else if (positiveCount >= 2)             mentalState = "hopeful";
  else if (zbiEstimate > 6)               mentalState = "restless";

  return { mentalState, zbiEstimate, zbiAnswers, resonanceScore, emotions, riskLevel, dominantThemes, hasCrisisSignals };
}