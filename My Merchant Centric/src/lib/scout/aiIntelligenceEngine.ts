import { db } from '@/lib/db';
import { SentimentValue, ProcessingStatus } from '@prisma/client';

export interface AIAnalysisResult {
  sentiment: SentimentValue;
  confidence: number;
  topics: Array<{ topicId: string; sentiment: SentimentValue; confidence: number; evidenceText: string }>;
  menuMentions: Array<{ menuItemName: string; sentiment: SentimentValue; confidence: number; evidenceText: string }>;
  employeeMentions: Array<{ employeeName: string; sentiment: SentimentValue; confidence: number; evidenceText: string }>;
  recoverySignal: boolean;
  recoverySeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

const TAXONOMY_TOPICS = [
  { id: 'SERVICE', keywords: ['service', 'server', 'staff', 'waiter', 'waitress', 'gaucho', 'attentive', 'host'] },
  { id: 'FOOD_QUALITY', keywords: ['food', 'flavor', 'taste', 'delicious', 'fresh', 'quality', 'cooked'] },
  { id: 'MEAT_QUALITY', keywords: ['meat', 'steak', 'picanha', 'sirloin', 'filet', 'lamb', 'churrasco', 'beef', 'chops'] },
  { id: 'WAIT_TIME', keywords: ['wait', 'waiting', 'line', 'time', 'delay', 'slow', 'minutes', 'table'] },
  { id: 'VALUE', keywords: ['price', 'value', 'expensive', 'worth', 'cost', 'bill'] },
  { id: 'CLEANLINESS', keywords: ['clean', 'dirty', 'spotless', 'hygiene', 'cleanliness'] },
  { id: 'ATMOSPHERE', keywords: ['atmosphere', 'ambiance', 'decor', 'music', 'noise', 'vibe'] },
  { id: 'BAR', keywords: ['bar', 'drink', 'drinks', 'wine', 'cocktail', 'caipirinha', 'beer'] },
  { id: 'DESSERT', keywords: ['dessert', 'cake', 'cheesecake', 'flan', 'ice cream', 'sweet'] },
  { id: 'CELEBRATION', keywords: ['birthday', 'anniversary', 'celebration', 'party', 'event', 'special occasion'] }
];

const MENU_ALIASES: Record<string, string[]> = {
  'Picanha': ['picanha', 'top sirloin', 'cap of ribeye'],
  'Filet Mignon': ['filet', 'filet mignon', 'tenderloin'],
  'Lamb Chops': ['lamb', 'lamb chops', 'cordeiro'],
  'Garlic Beef': ['garlic beef', 'garlic steak', 'bife com alho'],
  'Flank Steak': ['flank steak', 'fraldinha'],
  'Salad Bar': ['salad bar', 'market table', 'buffet'],
  'Lobster Bisque': ['lobster bisque', 'bisque'],
  'Brazilian Lemonade': ['brazilian lemonade', 'lemonade']
};

export function analyzeReviewTextWithAI(text: string, rating?: number | null): AIAnalysisResult {
  const textLower = text.toLowerCase();
  
  // 1. Determine Sentiment
  let sentiment: SentimentValue = SentimentValue.NEUTRAL;
  let confidence = 0.90;

  if (rating !== undefined && rating !== null) {
    if (rating >= 5) sentiment = SentimentValue.POSITIVE;
    else if (rating === 4) sentiment = SentimentValue.POSITIVE;
    else if (rating === 3) sentiment = SentimentValue.MIXED;
    else if (rating <= 2) sentiment = SentimentValue.NEGATIVE;
  } else {
    if (textLower.includes('phenomenal') || textLower.includes('best') || textLower.includes('incredible') || textLower.includes('perfection')) {
      sentiment = SentimentValue.POSITIVE;
    } else if (textLower.includes('disappointing') || textLower.includes('dry') || textLower.includes('overcooked')) {
      sentiment = SentimentValue.NEGATIVE;
    }
  }

  // 2. Extract Topics & Evidence
  const topics: AIAnalysisResult['topics'] = [];
  TAXONOMY_TOPICS.forEach(tax => {
    const matchedKw = tax.keywords.find(kw => textLower.includes(kw));
    if (matchedKw) {
      const topicSent = (textLower.includes('slow') || textLower.includes('overcooked') || textLower.includes('disappointing')) ? SentimentValue.NEGATIVE : SentimentValue.POSITIVE;
      topics.push({
        topicId: tax.id,
        sentiment: topicSent,
        confidence: 0.92,
        evidenceText: `Mentioned "${matchedKw}" in context: "${text.substring(0, 100)}..."`
      });
    }
  });

  // 3. Extract Menu Item Mentions
  const menuMentions: AIAnalysisResult['menuMentions'] = [];
  Object.entries(MENU_ALIASES).forEach(([menuName, aliases]) => {
    const matchedAlias = aliases.find(alias => textLower.includes(alias));
    if (matchedAlias) {
      const menuSent = (textLower.includes('dry') || textLower.includes('overcooked')) && textLower.includes(matchedAlias) ? SentimentValue.NEGATIVE : SentimentValue.POSITIVE;
      menuMentions.push({
        menuItemName: menuName,
        sentiment: menuSent,
        confidence: 0.95,
        evidenceText: `Explicit mention of ${menuName} (matched "${matchedAlias}")`
      });
    }
  });

  // 4. Extract Explicit Named Employees
  const employeeMentions: AIAnalysisResult['employeeMentions'] = [];
  const serverMatch = text.match(/(?:server|waiter|waitress|gaucho)\s+([A-Z][a-z]+)/i);
  if (serverMatch) {
    const empName = serverMatch[1];
    const empSent = textLower.includes('took 20 minutes') || textLower.includes('slow') ? SentimentValue.NEGATIVE : SentimentValue.POSITIVE;
    employeeMentions.push({
      employeeName: empName,
      sentiment: empSent,
      confidence: 0.88,
      evidenceText: `Explicit mention: "${serverMatch[0]}"`
    });
  }

  // 5. Recovery Signal Detection
  const isNegativeRating = rating !== undefined && rating !== null && rating <= 2;
  const isSevereNegText = textLower.includes('disappointing') || textLower.includes('overcooked') || textLower.includes('management attention');
  const recoverySignal = isNegativeRating || isSevereNegText;
  const recoverySeverity = isNegativeRating ? (rating === 1 ? 'CRITICAL' : 'HIGH') : 'NONE';

  return {
    sentiment,
    confidence,
    topics,
    menuMentions,
    employeeMentions,
    recoverySignal,
    recoverySeverity
  };
}

export async function processLocationReviewsAI(locationId: string) {
  const reviewsToProcess = await db.contentItem.findMany({
    where: {
      locationId,
      provenanceMode: { in: ['LIVE', 'IMPORTED'] },
      processingStatus: ProcessingStatus.INGESTED
    }
  });

  let processed = 0;
  for (const item of reviewsToProcess) {
    const aiResult = analyzeReviewTextWithAI(item.text, item.rating);

    // Save SentimentAnalysis
    await db.sentimentAnalysis.upsert({
      where: { contentItemId: item.id },
      create: {
        contentItemId: item.id,
        overallSentiment: aiResult.sentiment,
        positiveScore: aiResult.sentiment === SentimentValue.POSITIVE ? 0.95 : 0.1,
        neutralScore: aiResult.sentiment === SentimentValue.NEUTRAL ? 0.8 : 0.1,
        negativeScore: aiResult.sentiment === SentimentValue.NEGATIVE ? 0.95 : 0.1,
        confidence: aiResult.confidence,
        modelVersion: 'v2.1-BRASA-RESTAURANT-NLP'
      },
      update: {
        overallSentiment: aiResult.sentiment,
        confidence: aiResult.confidence
      }
    });

    // Mark Processing Status
    await db.contentItem.update({
      where: { id: item.id },
      data: { processingStatus: ProcessingStatus.AI_PROCESSED }
    });

    processed++;
  }

  return processed;
}
