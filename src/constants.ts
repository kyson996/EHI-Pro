import { Dimension, Question } from "./types";

export const QUESTIONS: Question[] = [
  // 压力 (Stress) - Weight: 0.30
  { id: 0, text: "最近是否经常感到焦虑或紧张？", dimension: Dimension.STRESS },
  { id: 1, text: "是否容易因为小事感到烦躁？", dimension: Dimension.STRESS },
  { id: 2, text: "是否经常感到心理压力较大？", dimension: Dimension.STRESS },
  { id: 3, text: "是否难以让自己真正放松？", dimension: Dimension.STRESS },
  { id: 4, text: "是否经常担忧未来？", dimension: Dimension.STRESS },

  // 睡眠 (Sleep) - Weight: 0.25
  { id: 5, text: "入睡是否困难？", dimension: Dimension.SLEEP },
  { id: 6, text: "夜间是否容易醒来？", dimension: Dimension.SLEEP },
  { id: 7, text: "是否感觉睡眠不足？", dimension: Dimension.SLEEP },
  { id: 8, text: "睡醒后是否仍然疲惫？", dimension: Dimension.SLEEP },
  { id: 9, text: "睡眠作息是否不规律？", dimension: Dimension.SLEEP },

  // 专注 (Focus) - Weight: 0.25
  { id: 10, text: "学习或工作时是否容易分心？", dimension: Dimension.FOCUS },
  { id: 11, text: "阅读时是否难以长时间集中注意力？", dimension: Dimension.FOCUS },
  { id: 12, text: "是否感觉完成任务效率较低？", dimension: Dimension.FOCUS },
  { id: 13, text: "是否难以保持长时间专注？", dimension: Dimension.FOCUS },
  { id: 14, text: "是否经常忘记刚刚处理的事情？", dimension: Dimension.FOCUS },

  // 疲劳 (Fatigue) - Weight: 0.20
  { id: 15, text: "是否经常感觉精神疲惫？", dimension: Dimension.FATIGUE },
  { id: 16, text: "是否感觉缺乏做事情的动力？", dimension: Dimension.FATIGUE },
  { id: 17, text: "是否对原本感兴趣的事情兴趣下降？", dimension: Dimension.FATIGUE },
  { id: 18, text: "是否经常感到心理压力消耗很大？", dimension: Dimension.FATIGUE },
  { id: 19, text: "是否需要频繁休息才能恢复状态？", dimension: Dimension.FATIGUE },
];

export const WEIGHTS = {
  [Dimension.STRESS]: 0.30,
  [Dimension.SLEEP]: 0.25,
  [Dimension.FOCUS]: 0.25,
  [Dimension.FATIGUE]: 0.20,
};

export const SCORE_LABELS = [
  "从不",
  "很少",
  "偶尔",
  "经常",
  "很多",
  "几乎总是",
];

