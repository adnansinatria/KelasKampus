// lib/tryoutScoring.ts
// IRT 3PL Scoring Engine dengan Fallback

interface Question {
  id: string;
  jawaban_benar: string;
  irt_discrimination?: number;
  irt_difficulty?: number;
  irt_guessing?: number;
  topik?: string;
  kategori?: string;
}

interface ScoringResult {
  success: boolean;
  method: 'irt' | 'weighted' | 'simple';
  finalScore: number;
  theta?: number;
  standardError?: number;
  statistics: {
    correct: number;
    wrong: number;
    unanswered: number;
    totalQuestions: number;
    accuracy: number;
  };
  topicAnalysis?: Array<{
    topik: string;
    correct: number;
    wrong: number;
    unanswered: number;
    total: number;
    percentage: number;
  }>;
  performanceLevel: string;
}

// ============================================
// IRT 3PL MODEL
// ============================================

function probability3PL(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

function estimateThetaNewtonRaphson(
  responses: boolean[],
  discriminations: number[],
  difficulties: number[],
  guessings: number[],
  maxIterations: number = 20,
  tolerance: number = 0.001
): { theta: number; se: number } {
  let theta = 0; // Initial guess

  for (let iter = 0; iter < maxIterations; iter++) {
    let firstDerivative = 0;
    let secondDerivative = 0;

    for (let i = 0; i < responses.length; i++) {
      const a = discriminations[i];
      const b = difficulties[i];
      const c = guessings[i];
      const p = probability3PL(theta, a, b, c);

      const u = responses[i] ? 1 : 0;
      const q = 1 - p;

      // First derivative (information)
      const pStar = (p - c) / (1 - c);
      const qStar = 1 - pStar;
      
      firstDerivative += (a * pStar * qStar * (u - p)) / (p * q);

      // Second derivative
      const term1 = (a * a * pStar * qStar * (qStar - pStar)) / (p * q);
      const term2 = ((u - p) * a * a * pStar * qStar * (1 - 2 * pStar)) / (p * p * q * q);
      secondDerivative -= (term1 - term2);
    }

    const change = firstDerivative / secondDerivative;
    theta -= change;

    if (Math.abs(change) < tolerance) {
      break;
    }
  }

  // Calculate standard error
  let information = 0;
  for (let i = 0; i < responses.length; i++) {
    const a = discriminations[i];
    const b = difficulties[i];
    const c = guessings[i];
    const p = probability3PL(theta, a, b, c);
    const pStar = (p - c) / (1 - c);
    const qStar = 1 - pStar;
    
    information += (a * a * pStar * qStar) / ((1 - c) * (1 - c) * p * (1 - p));
  }

  const standardError = information > 0 ? 1 / Math.sqrt(information) : 1;

  return { theta, se: standardError };
}

function thetaToScore(theta: number, min: number = 0, max: number = 100): number {
  // Convert theta (typically -3 to 3) to score (0 to 100)
  const normalized = (theta + 3) / 6; // Normalize to 0-1
  const score = min + normalized * (max - min);
  return Math.max(min, Math.min(max, Math.round(score)));
}

// ============================================
// MAIN SCORING FUNCTIONS
// ============================================

export function calculateIRTScore(
  questions: Question[],
  userAnswers: Record<string, string>
): ScoringResult {
  console.log('🔄 Attempting IRT 3PL scoring...');

  try {
    // Validate IRT parameters
    const validQuestions = questions.filter(q => 
      typeof q.irt_discrimination === 'number' &&
      typeof q.irt_difficulty === 'number' &&
      typeof q.irt_guessing === 'number' &&
      !isNaN(q.irt_discrimination) &&
      !isNaN(q.irt_difficulty) &&
      !isNaN(q.irt_guessing)
    );

    if (validQuestions.length < questions.length * 0.5) {
      console.warn('⚠️ Insufficient IRT parameters (< 50%)');
      throw new Error('Insufficient IRT data');
    }

    // Prepare data
    const responses: boolean[] = [];
    const discriminations: number[] = [];
    const difficulties: number[] = [];
    const guessings: number[] = [];

    validQuestions.forEach(q => {
      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.jawaban_benar;
      
      responses.push(isCorrect);
      discriminations.push(q.irt_discrimination!);
      difficulties.push(q.irt_difficulty!);
      guessings.push(q.irt_guessing!);
    });

    // Estimate theta
    const { theta, se } = estimateThetaNewtonRaphson(
      responses,
      discriminations,
      difficulties,
      guessings
    );

    // Convert to 0-100 score
    const finalScore = thetaToScore(theta);

    // Calculate statistics
    const statistics = calculateStatistics(questions, userAnswers);

    // Topic analysis
    const topicAnalysis = analyzeByTopic(questions, userAnswers);

    // Performance level
    const performanceLevel = getPerformanceLevel(finalScore);

    console.log('✅ IRT scoring successful:', { theta, se, finalScore });

    return {
      success: true,
      method: 'irt',
      finalScore,
      theta,
      standardError: se,
      statistics,
      topicAnalysis,
      performanceLevel,
    };

  } catch (error) {
    console.error('❌ IRT scoring failed:', error);
    throw error;
  }
}

export function calculateWeightedScore(
  questions: Question[],
  userAnswers: Record<string, string>
): ScoringResult {
  console.log('🔄 Attempting weighted scoring...');

  try {
    // Use difficulty as weight (harder questions = more points)
    const validQuestions = questions.filter(q => 
      typeof q.irt_difficulty === 'number' && !isNaN(q.irt_difficulty)
    );

    if (validQuestions.length < questions.length * 0.3) {
      console.warn('⚠️ Insufficient difficulty data for weighted scoring');
      throw new Error('Insufficient difficulty data');
    }

    let totalWeight = 0;
    let earnedWeight = 0;

    validQuestions.forEach(q => {
      const difficulty = q.irt_difficulty!;
      // Convert difficulty to weight (normalize to 1-3 range)
      const weight = Math.max(1, Math.min(3, 2 + difficulty));
      
      totalWeight += weight;
      
      const userAnswer = userAnswers[q.id];
      if (userAnswer === q.jawaban_benar) {
        earnedWeight += weight;
      }
    });

    const finalScore = Math.round((earnedWeight / totalWeight) * 100);
    const statistics = calculateStatistics(questions, userAnswers);
    const topicAnalysis = analyzeByTopic(questions, userAnswers);
    const performanceLevel = getPerformanceLevel(finalScore);

    console.log('✅ Weighted scoring successful:', { finalScore });

    return {
      success: true,
      method: 'weighted',
      finalScore,
      statistics,
      topicAnalysis,
      performanceLevel,
    };

  } catch (error) {
    console.error('❌ Weighted scoring failed:', error);
    throw error;
  }
}

export function calculateSimpleScore(
  questions: Question[],
  userAnswers: Record<string, string>
): ScoringResult {
  console.log('🔄 Using simple percentage scoring...');

  const statistics = calculateStatistics(questions, userAnswers);
  const finalScore = Math.round(statistics.accuracy);
  const topicAnalysis = analyzeByTopic(questions, userAnswers);
  const performanceLevel = getPerformanceLevel(finalScore);

  console.log('✅ Simple scoring complete:', { finalScore });

  return {
    success: true,
    method: 'simple',
    finalScore,
    statistics,
    topicAnalysis,
    performanceLevel,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateStatistics(
  questions: Question[],
  userAnswers: Record<string, string>
): ScoringResult['statistics'] {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  questions.forEach(q => {
    const userAnswer = userAnswers[q.id];
    
    if (!userAnswer) {
      unanswered++;
    } else if (userAnswer === q.jawaban_benar) {
      correct++;
    } else {
      wrong++;
    }
  });

  const totalQuestions = questions.length;
  const accuracy = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

  return {
    correct,
    wrong,
    unanswered,
    totalQuestions,
    accuracy,
  };
}

function analyzeByTopic(
  questions: Question[],
  userAnswers: Record<string, string>
): ScoringResult['topicAnalysis'] {
  const topicMap = new Map<string, { correct: number; wrong: number; unanswered: number; total: number }>();

  questions.forEach(q => {
    const topic = q.topik || q.kategori || 'General';
    
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { correct: 0, wrong: 0, unanswered: 0, total: 0 });
    }

    const stats = topicMap.get(topic)!;
    stats.total++;

    const userAnswer = userAnswers[q.id];
    if (!userAnswer) {
      stats.unanswered++;
    } else if (userAnswer === q.jawaban_benar) {
      stats.correct++;
    } else {
      stats.wrong++;
    }
  });

  return Array.from(topicMap.entries()).map(([topik, stats]) => ({
    topik,
    ...stats,
    percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
  }));
}

function getPerformanceLevel(score: number): string {
  if (score >= 85) return 'Sangat Baik';
  if (score >= 70) return 'Baik';
  if (score >= 55) return 'Cukup';
  return 'Perlu Peningkatan';
}