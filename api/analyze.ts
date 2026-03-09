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

  const prompt = `分析数据:指数${ehi?.toFixed(0)},压力${averages["情绪压力"]?.toFixed(1)},睡眠${averages["睡眠质量"]?.toFixed(1)},专注${averages["专注能力"]?.toFixed(1)},疲劳${averages["心理疲劳"]?.toFixed(1)}。要求:1.总结;2.分析最差项;3.给2条建议。字数<100。`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "极简心理专家，仅输出干货。" },
          { role: "user", content: prompt }
        ],
        stream: true
      })
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.includes('[DONE]')) continue;
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0].delta?.content || "";
            if (content) res.write(content);
          } catch (e) {}
        }
      }
    }
    res.end();
  } catch (error: any) {
    res.status(500).end(`分析失败: ${error.message}`);
  }
}
