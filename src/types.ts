export enum Dimension {
  STRESS = "情绪压力",
  SLEEP = "睡眠质量",
  FOCUS = "专注能力",
  FATIGUE = "心理疲劳",
}

export interface Question {
  id: number;
  text: string;
  dimension: Dimension;
}

export interface AssessmentResult {
  id: string;
  date: string;
  scores: Record<Dimension, number>;
  ehi: number;
  aiAdvice?: string;
}
