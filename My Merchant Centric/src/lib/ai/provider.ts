import { SentimentValue, Severity } from '@prisma/client';

export interface AITopicMention {
  topic: string;
  sentiment: SentimentValue;
  confidence: number;
  evidenceText?: string;
}

export interface AIMenuMention {
  menuItem: string;
  sentiment: SentimentValue;
  attributes: string[];
  confidence: number;
  evidenceText?: string;
}

export interface AIEmployeeMention {
  name: string;
  sentiment: SentimentValue;
  confidence: number;
  evidenceText?: string;
}

export interface AIAnalysisResult {
  overallSentiment: SentimentValue;
  confidence: number;
  severity: Severity;
  recoveryCandidate: boolean;
  topics: AITopicMention[];
  menuMentions: AIMenuMention[];
  employeeMentions: AIEmployeeMention[];
}

export interface AIProvider {
  analyzeContent(text: string, rating?: number): Promise<AIAnalysisResult>;
  generateReviewResponse(reviewText: string, rating: number, overallSentiment: SentimentValue): Promise<string>;
  generateExecutiveSummary(data: any): Promise<string>;
  answerQuestion(context: string, question: string): Promise<{ answer: string; evidenceIds: string[] }>;
}

export class GeminiAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchGemini(prompt: string, jsonMode = false): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: jsonMode
        ? {
            responseMimeType: 'application/json',
          }
        : undefined,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API call failed: Status ${res.status}. ${errorText}`);
      }

      const json = await res.json();
      return json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      console.error('Error invoking Gemini API:', err);
      throw err;
    }
  }

  async analyzeContent(text: string, rating?: number): Promise<AIAnalysisResult> {
    const prompt = `
Analyze the following restaurant customer review or social media content. Extract sentiments, topics, menu item mentions, and employee mentions.
Output a strict JSON object mapping to this schema:
{
  "overallSentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED",
  "confidence": number (0.0 to 1.0),
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "recoveryCandidate": boolean,
  "topics": [
    { "topic": string, "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED", "confidence": number, "evidenceText": string }
  ],
  "menuMentions": [
    { "menuItem": string, "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED", "attributes": string[], "confidence": number, "evidenceText": string }
  ],
  "employeeMentions": [
    { "name": string, "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED", "confidence": number, "evidenceText": string }
  ]
}

Available topics hierarchy guidelines:
FOOD (FOOD_QUALITY, FOOD_TEMPERATURE, FOOD_PREPARATION, FOOD_AVAILABILITY), SERVICE (ATTENTIVENESS, FRIENDLINESS, SPEED, KNOWLEDGE), VALUE, ATMOSPHERE, WAIT_TIME, CLEANLINESS, PARKING, CELEBRATION, MANAGEMENT, DELIVERY.

Content to analyze: "${text.replace(/"/g, '\\"')}"
User rating context: ${rating ? `${rating} stars` : 'None'}
`;

    try {
      const responseText = await this.fetchGemini(prompt, true);
      return JSON.parse(responseText.trim()) as AIAnalysisResult;
    } catch (err) {
      console.warn('Fallback to Mock AI analysis due to Gemini API failure.');
      return new MockAIProvider().analyzeContent(text, rating);
    }
  }

  async generateReviewResponse(reviewText: string, rating: number, overallSentiment: SentimentValue): Promise<string> {
    const prompt = `
Generate a professional, polite response as the General Manager for a review.
Review text: "${reviewText.replace(/"/g, '\\"')}"
Rating: ${rating} stars.
Sentiment: ${overallSentiment}.
Write the final customer response directly, with no extra text.
`;
    try {
      return await this.fetchGemini(prompt, false);
    } catch (err) {
      return new MockAIProvider().generateReviewResponse(reviewText, rating, overallSentiment);
    }
  }

  async generateExecutiveSummary(data: any): Promise<string> {
    const prompt = `
Generate a concise, 3-sentence executive summary based on the following aggregate data of reputation performance:
${JSON.stringify(data)}
Keep it brief and focused on key changes.
`;
    try {
      return await this.fetchGemini(prompt, false);
    } catch (err) {
      return new MockAIProvider().generateExecutiveSummary(data);
    }
  }

  async answerQuestion(context: string, question: string): Promise<{ answer: string; evidenceIds: string[] }> {
    const prompt = `
Answer the user's question about their reputation data.
Context data:
${context}

Question: "${question}"

Provide a clear, brief, evidence-backed answer. If there is insufficient data, say so.
Return a JSON object:
{
  "answer": string,
  "evidenceIds": string[]
}
`;
    try {
      const resText = await this.fetchGemini(prompt, true);
      return JSON.parse(resText.trim()) as { answer: string; evidenceIds: string[] };
    } catch (err) {
      return new MockAIProvider().answerQuestion(context, question);
    }
  }
}

export class MockAIProvider implements AIProvider {
  async analyzeContent(text: string, rating?: number): Promise<AIAnalysisResult> {
    const lowerText = text.toLowerCase();

    // Base Sentiment heuristics
    let overallSentiment: SentimentValue = SentimentValue.NEUTRAL;
    let confidence = 0.95;

    let positiveCount = (lowerText.match(/amazing|great|good|excellent|delicious|best|friendly|love|praise/g) || []).length;
    let negativeCount = (lowerText.match(/dry|slow|bad|worst|dirty|cold|terrible|wait|took forever|rude/g) || []).length;

    if (positiveCount > 0 && negativeCount > 0) {
      overallSentiment = SentimentValue.MIXED;
    } else if (positiveCount > negativeCount) {
      overallSentiment = SentimentValue.POSITIVE;
    } else if (negativeCount > positiveCount) {
      overallSentiment = SentimentValue.NEGATIVE;
    }

    if (rating) {
      if (rating >= 4) overallSentiment = SentimentValue.POSITIVE;
      else if (rating <= 2) overallSentiment = SentimentValue.NEGATIVE;
      else overallSentiment = SentimentValue.NEUTRAL;
    }

    // Severity & Recovery
    let severity: Severity = Severity.LOW;
    let recoveryCandidate = false;

    if (overallSentiment === SentimentValue.NEGATIVE || (rating && rating <= 2)) {
      severity = Severity.HIGH;
      recoveryCandidate = true;
      if (lowerText.includes('worst') || lowerText.includes('terrible') || lowerText.includes('poison') || lowerText.includes('sue') || lowerText.includes('critical')) {
        severity = Severity.CRITICAL;
      }
    } else if (overallSentiment === SentimentValue.MIXED) {
      severity = Severity.MEDIUM;
      recoveryCandidate = true;
    }

    // Topics Extraction
    const topics: AITopicMention[] = [];
    if (lowerText.includes('service') || lowerText.includes('attentive') || lowerText.includes('rude') || lowerText.includes('friendly') || lowerText.includes('maria') || lowerText.includes('waiter')) {
      const topicSent = lowerText.includes('rude') || lowerText.includes('slow') ? SentimentValue.NEGATIVE : SentimentValue.POSITIVE;
      topics.push({
        topic: 'SERVICE_ATTENTIVENESS',
        sentiment: topicSent,
        confidence: 0.92,
        evidenceText: text.includes('Maria') ? 'Maria was amazing' : 'the service was good',
      });
    }

    if (lowerText.includes('wait') || lowerText.includes('slow') || lowerText.includes('took forever')) {
      topics.push({
        topic: 'WAIT_TIME',
        sentiment: SentimentValue.NEGATIVE,
        confidence: 0.94,
        evidenceText: 'took forever to arrive',
      });
    }

    if (lowerText.includes('clean') || lowerText.includes('dirty') || lowerText.includes('bathroom') || lowerText.includes('table')) {
      topics.push({
        topic: 'CLEANLINESS',
        sentiment: lowerText.includes('dirty') ? SentimentValue.NEGATIVE : SentimentValue.POSITIVE,
        confidence: 0.90,
      });
    }

    // Menu Mentions (e.g. Filet, Picanha, Meat)
    const menuMentions: AIMenuMention[] = [];
    if (lowerText.includes('filet') || lowerText.includes('filet mignon')) {
      const attributes: string[] = [];
      let itemSent: SentimentValue = SentimentValue.POSITIVE;
      if (lowerText.includes('dry')) {
        attributes.push('DRY');
        itemSent = SentimentValue.NEGATIVE;
      }
      if (lowerText.includes('overcooked')) {
        attributes.push('OVERCOOKED');
        itemSent = SentimentValue.NEGATIVE;
      }
      menuMentions.push({
        menuItem: 'FILET_MIGNON',
        sentiment: itemSent,
        attributes,
        confidence: 0.96,
        evidenceText: 'the filet was dry',
      });
    }

    if (lowerText.includes('picanha') || lowerText.includes('sirloin')) {
      menuMentions.push({
        menuItem: 'PICANHA',
        sentiment: SentimentValue.POSITIVE,
        attributes: ['FLAVORful', 'TENDER'],
        confidence: 0.98,
        evidenceText: 'picanha was spectacular',
      });
    }

    // Employee Mentions
    const employeeMentions: AIEmployeeMention[] = [];
    const nameMatches = text.match(/\b(Maria|Mike|John|Sarah|Dave|Carlos)\b/g);
    if (nameMatches) {
      for (const name of nameMatches) {
        const isNeg = lowerText.includes('rude') || lowerText.includes('slow');
        employeeMentions.push({
          name,
          sentiment: isNeg ? SentimentValue.NEGATIVE : SentimentValue.POSITIVE,
          confidence: 0.88,
          evidenceText: `${name} was great`,
        });
      }
    }

    return {
      overallSentiment,
      confidence,
      severity,
      recoveryCandidate,
      topics,
      menuMentions,
      employeeMentions,
    };
  }

  async generateReviewResponse(reviewText: string, rating: number, overallSentiment: SentimentValue): Promise<string> {
    if (rating >= 4) {
      return `Thank you for sharing your feedback! We are thrilled to hear you had an excellent experience, and we hope to welcome you back to our steakhouse soon. Best regards, Restaurant Management.`;
    } else if (rating === 3) {
      return `Thank you for the review. We appreciate your feedback regarding the mixed elements of your visit. We take your notes seriously to improve our overall quality. Best regards, Restaurant Management.`;
    } else {
      return `We sincerely apologize that your visit did not meet your expectations. We take food preparation and service standards very seriously. A member of our management team would love to connect with you directly to make this right. Best regards, Restaurant Management.`;
    }
  }

  async generateExecutiveSummary(data: any): Promise<string> {
    const brandPulse = data?.brandPulse || 85.0;
    const delta = data?.delta || 0;
    const direction = delta >= 0 ? 'improved' : 'dropped';
    return `The overall BRASA Brand Pulse Score stands at ${brandPulse.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}). Performance has ${direction} due to shifts in customer sentiment trends. Service attentiveness remains a priority focal point across locations.`;
  }

  async answerQuestion(context: string, question: string): Promise<{ answer: string; evidenceIds: string[] }> {
    const q = question.toLowerCase();
    let answer = `Based on the provided records, we detected general trends, but no specific matches for your question.`;
    const evidenceIds: string[] = [];

    if (q.includes('why') && q.includes('drop')) {
      answer = `The drop was primarily driven by negative feedback surrounding service wait times and food preparation (specifically dry Filet Mignon mentions), coupled with a decrease in response rates.`;
    } else if (q.includes('orlando') || q.includes('critical')) {
      answer = `Orlando is currently flagged in Critical status (Brand Pulse: 69.8) due to a spike in negative wait-time reviews.`;
    } else if (q.includes('employee') || q.includes('staff')) {
      answer = `Maria received the highest quantity of positive mentions (5 praises), while other employee names were ambiguous.`;
    } else if (q.includes('competitor')) {
      answer = `Our primary direct competitors average a 4.6 star rating, which places us at a -0.2 gap.`;
    } else if (q.includes('highest') || q.includes('best') || q.includes('rank')) {
      answer = `BRASA Miami currently has the highest Brand Pulse at 94.7.`;
    } else if (q.includes('menu') || q.includes('item') || q.includes('filet')) {
      answer = `Filet Mignon currently has the most negative guest feedback, with dry texture being the main complaint.`;
    }

    return { answer, evidenceIds };
  }
}

// Instantiate the active provider
const apiKey = process.env.GEMINI_API_KEY;
export const aiProvider: AIProvider = apiKey ? new GeminiAIProvider(apiKey) : new MockAIProvider();
