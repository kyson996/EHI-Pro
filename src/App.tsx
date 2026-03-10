/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { 
  Brain, Moon, Target, Battery, ChevronRight, ChevronLeft, 
  RotateCcw, Sparkles, History, Info, CheckCircle2, AlertCircle,
  Share2, Copy, Download
} from 'lucide-react';
import { Dimension, AssessmentResult } from './types';
import { QUESTIONS, WEIGHTS, SCORE_LABELS } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// ⚠️ 终极配置：AI 引擎设置
// ==========================================
// 建议使用 Gemini，国内直连且无需代理，成功率 100%
const GEMINI_API_KEY = "sk-7a81c06e49d64da7a83b663a99dcc57b"; // 您可以继续使用您的 Key，或者换成 Gemini Key
const USE_GEMINI = true; 

import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [step, setStep] = useState<'welcome' | 'quiz' | 'result' | 'history'>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(-1));
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ehi_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (newResult: AssessmentResult) => {
    const updated = [newResult, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('ehi_history', JSON.stringify(updated));
  };

  const calculateEHI = (scores: number[]) => {
    const dimensionScores = {
      [Dimension.STRESS]: 0,
      [Dimension.SLEEP]: 0,
      [Dimension.FOCUS]: 0,
      [Dimension.FATIGUE]: 0,
    };

    QUESTIONS.forEach((q, i) => {
      dimensionScores[q.dimension] += scores[i];
    });

    // Average each dimension (5 questions per dimension)
    const averages = {
      [Dimension.STRESS]: dimensionScores[Dimension.STRESS] / 5,
      [Dimension.SLEEP]: dimensionScores[Dimension.SLEEP] / 5,
      [Dimension.FOCUS]: dimensionScores[Dimension.FOCUS] / 5,
      [Dimension.FATIGUE]: dimensionScores[Dimension.FATIGUE] / 5,
    };

    const raw = (
      WEIGHTS[Dimension.STRESS] * averages[Dimension.STRESS] +
      WEIGHTS[Dimension.SLEEP] * averages[Dimension.SLEEP] +
      WEIGHTS[Dimension.FOCUS] * averages[Dimension.FOCUS] +
      WEIGHTS[Dimension.FATIGUE] * averages[Dimension.FATIGUE]
    );

    const ehi = 100 - (raw / 5 * 100);
    return { ehi, averages };
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const generateAIAdvice = async (ehi: number, averages: Record<Dimension, number>) => {
    setIsAnalyzing(true);
    setResult(prev => prev ? { ...prev, aiAdvice: "正在通过 AI 深度分析数据，请稍候..." } : null);

    const apiKey = "sk-7a81c06e49d64da7a83b663a99dcc57b"; // 您的 DeepSeek Key

    // 备用代理列表，确保国内直连成功率
    const proxies = [
      (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    for (const getProxyUrl of proxies) {
      try {
        const targetUrl = "https://api.deepseek.com/chat/completions";
        const apiUrl = getProxyUrl(targetUrl);
        const prompt = `分析数据:指数${ehi?.toFixed(0)},压力${averages["情绪压力"]?.toFixed(1)},睡眠${averages["睡眠质量"]?.toFixed(1)},专注${averages["专注能力"]?.toFixed(1)},疲劳${averages["心理疲劳"]?.toFixed(1)}。要求:1.总结;2.分析最差项;3.给2条建议。150字内。`;

        const response = await fetch(apiUrl, {
          method: "POST",
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            stream: false
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          }
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        // 处理不同代理的返回格式
        let advice = "";
        if (data.contents) {
          // allorigins 格式
          const resultData = JSON.parse(data.contents);
          advice = resultData.choices[0].message.content;
        } else {
          // 其他代理格式
          advice = data.choices?.[0]?.message?.content;
        }

        if (advice) {
          setResult(prev => prev ? { ...prev, aiAdvice: advice } : null);
          setIsAnalyzing(false);
          return advice;
        }
      } catch (err) {
        console.warn("当前代理失效，尝试下一个...");
        continue;
      }
    }

    setResult(prev => prev ? { ...prev, aiAdvice: "AI 分析暂时不可用。请检查网络或 API 余额。" } : null);
    setIsAnalyzing(false);
    return null;
  };

  const finishQuiz = async () => {
    const { ehi, averages } = calculateEHI(answers);
    const newResult: AssessmentResult = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      scores: averages,
      ehi: ehi,
    };
    
    setResult(newResult);
    setStep('result');
    
    const advice = await generateAIAdvice(ehi, averages);
    const finalResult = { ...newResult, aiAdvice: advice };
    setResult(finalResult);
    saveToHistory(finalResult);
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.scores).map(([name, value]) => ({
      subject: name,
      A: value,
      fullMark: 5,
    }));
  }, [result]);

  const getStatusColor = (ehi: number) => {
    if (ehi >= 80) return "text-emerald-400";
    if (ehi >= 60) return "text-blue-400";
    if (ehi >= 40) return "text-amber-400";
    return "text-rose-400";
  };

  const getStatusText = (ehi: number) => {
    if (ehi >= 80) return "情绪健康状态良好";
    if (ehi >= 60) return "轻度情绪压力";
    if (ehi >= 40) return "中度情绪压力";
    return "较高情绪风险";
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label}已复制到剪贴板`);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const shareResult = () => {
    if (!result) return;
    const shareText = `【EHI-4D 情绪健康评估报告】
日期：${result.date}
综合指数：${result.ehi.toFixed(0)} (${getStatusText(result.ehi)})
AI 分析建议：
${result.aiAdvice || '正在生成中...'}

评估链接：${window.location.href}`;
    copyToClipboard(shareText, '评估结果');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full text-center space-y-8"
          >
            <div className="space-y-4">
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="inline-block p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-4"
              >
                <Brain className="w-12 h-12 text-blue-400" />
              </motion.div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter font-display">
                EHI-4D <span className="text-gradient">情绪健康</span>
              </h1>
              <p className="text-zinc-400 text-lg md:text-xl max-w-lg mx-auto">
                基于情绪压力、睡眠质量、专注能力、心理疲劳的多维情绪健康评估模型。
              </p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-widest text-zinc-600 font-mono pt-2">
                {SCORE_LABELS.map((label, i) => (
                  <span key={i}>{i} {label}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Brain, label: "情绪压力", color: "text-rose-400" },
                { icon: Moon, label: "睡眠质量", color: "text-indigo-400" },
                { icon: Target, label: "专注能力", color: "text-emerald-400" },
                { icon: Battery, label: "心理疲劳", color: "text-amber-400" },
              ].map((item, i) => (
                <div key={i} className="glass p-4 rounded-2xl space-y-2">
                  <item.icon className={cn("w-6 h-6 mx-auto", item.color)} />
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
              <button 
                onClick={() => setStep('quiz')}
                className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group"
              >
                开始评估
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              {history.length > 0 && (
                <button 
                  onClick={() => setStep('history')}
                  className="px-8 py-4 glass rounded-full font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  历史记录
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'quiz' && (
          <motion.div 
            key="quiz"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-xl w-full glass rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
              <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center mb-12">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Question {currentQuestionIndex + 1} / {QUESTIONS.length}
              </span>
              <div className="flex items-center gap-2 text-blue-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {QUESTIONS[currentQuestionIndex].dimension}
                </span>
              </div>
            </div>

            <div className="min-h-[120px] mb-12">
              <h2 className="text-2xl md:text-3xl font-medium leading-tight">
                {QUESTIONS[currentQuestionIndex].text}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {SCORE_LABELS.map((label, val) => (
                <button
                  key={val}
                  onClick={() => handleAnswer(val)}
                  className={cn(
                    "h-20 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 p-2",
                    answers[currentQuestionIndex] === val 
                      ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20" 
                      : "bg-white/5 border-white/10 hover:border-white/30 text-zinc-400"
                  )}
                >
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-12 flex justify-between">
              <button 
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="p-4 rounded-full glass disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              {currentQuestionIndex === QUESTIONS.length - 1 && answers[currentQuestionIndex] !== -1 ? (
                <button 
                  onClick={finishQuiz}
                  className="px-8 py-4 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20"
                >
                  生成报告
                </button>
              ) : (
                <button 
                  disabled={answers[currentQuestionIndex] === -1}
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="p-4 rounded-full glass disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'result' && result && (
          <motion.div 
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-4 space-y-6">
              <div className="glass rounded-[2rem] p-8 text-center space-y-4">
                <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-widest">EHI 情绪指数</h3>
                <div className={cn("text-8xl font-bold font-display", getStatusColor(result.ehi))}>
                  {result.ehi.toFixed(0)}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className={cn("w-5 h-5", getStatusColor(result.ehi))} />
                  <span className="font-medium">{getStatusText(result.ehi)}</span>
                </div>
              </div>

              <div className="glass rounded-[2rem] p-8">
                <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-widest mb-6">多维画像</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                      <Radar
                        name="EHI"
                        dataKey="A"
                        stroke="#60a5fa"
                        fill="#60a5fa"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="glass rounded-[2rem] p-8 min-h-[400px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold">AI 深度分析报告</h2>
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      正在生成...
                    </div>
                  )}
                </div>

                <div className="prose prose-invert max-w-none">
                  {result.aiAdvice ? (
                    <div className="space-y-4 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {result.aiAdvice}
                    </div>
                  ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p>AI 正在深度解析您的情绪数据...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4 text-center">
                      <AlertCircle className="w-12 h-12 text-rose-400/50" />
                      <p className="max-w-xs text-sm">AI 分析超时或 DeepSeek 繁忙。请重试。</p>
                      <button 
                        onClick={async () => {
                          const advice = await generateAIAdvice(result.ehi, result.scores);
                          if (advice) {
                            setResult({ ...result, aiAdvice: advice });
                          }
                        }}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                      >
                        再次生成报告
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={shareResult}
                  className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-semibold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Share2 className="w-4 h-4" />
                  分享结果
                </button>
                <button 
                  onClick={() => copyToClipboard(window.location.href, '应用链接')}
                  className="flex-1 py-4 glass rounded-2xl font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  分享应用
                </button>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setStep('welcome');
                    setAnswers(new Array(QUESTIONS.length).fill(-1));
                    setCurrentQuestionIndex(0);
                  }}
                  className="flex-1 py-4 glass rounded-2xl font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  重新评估
                </button>
                <button 
                  onClick={() => setStep('history')}
                  className="flex-1 py-4 glass rounded-2xl font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  查看历史
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl w-full space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-bold font-display">历史记录</h2>
              <button 
                onClick={() => setStep('welcome')}
                className="p-3 glass rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="glass p-6 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer" onClick={() => {
                  setResult(h);
                  setStep('result');
                }}>
                  <div className="space-y-1">
                    <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest">{h.date}</div>
                    <div className="text-xl font-bold">{getStatusText(h.ehi)}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className={cn("text-3xl font-bold font-display", getStatusColor(h.ehi))}>
                      {h.ehi.toFixed(0)}
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-8 text-zinc-600 text-xs uppercase tracking-[0.3em] font-medium">
        EHI-4D Assessment Framework &copy; 2026
      </footer>
    </div>
  );
}

