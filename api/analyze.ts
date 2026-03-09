import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ehi, averages } = req.body;
    
    const cleanKey = (key: string | undefined) => {
      if (!key) return undefined;
      return key.trim().replace(/^["']|["']$/g, '');
    };

    const deepseekKey = cleanKey(process.env.DEEPSEEK_API_KEY);
    
    if (!deepseekKey || deepseekKey.length < 10) {
      return res.status(500).json({ 
        error: "未配置 DeepSeek API 密钥", 
        details: "请在 Vercel 项目设置的 Environment Variables 中添加 DEEPSEEK_API_KEY"
      });
    }

    const prompt = `
      作为心理健康专家，请对以下 EHI-4D 情绪健康数据进行极简、专业的分析。
      
      数据：
      - 综合指数: ${ehi?.toFixed(0)}/100
      - 情绪压力: ${averages["情绪压力"]?.toFixed(1)}/5
      - 睡眠质量: ${averages["睡眠质量"]?.toFixed(1)}/5
      - 专注能力: ${averages["专注能力"]?.toFixed(1)}/5
      - 心理疲劳: ${averages["心理疲劳"]?.toFixed(1)}/5
      
      要求：
      1. 状态总结：用一句话概括当前心理状态。
      2. 核心分析：重点分析得分最高（最差）的维度。
      3. 改善行动：提供3条立即可以执行的微小习惯建议。
      
      格式：Markdown，字数控制在300字以内。
    `;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是一位高效、专业的心理健康分析助手。" },
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "DeepSeek 调用失败");

    res.status(200).json({ text: data.choices[0].message.content });

  } catch (error: any) {
    res.status(500).json({ error: "AI 分析失败", details: error.message });
  }
}
