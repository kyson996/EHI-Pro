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

    const prompt = `分析数据:指数${ehi?.toFixed(0)},压力${averages["情绪压力"]?.toFixed(1)},睡眠${averages["睡眠质量"]?.toFixed(1)},专注${averages["专注能力"]?.toFixed(1)},疲劳${averages["心理疲劳"]?.toFixed(1)}。要求:1.一句话总结;2.分析最差项;3.给2条建议。字数<100。`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "极简心理专家，仅输出干货，不带废话。" },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("DeepSeek API Error Raw:", errorData);
      return res.status(response.status).json({ error: "AI 接口响应异常", details: "DeepSeek 服务繁忙，请稍后重试。" });
    }

    const data = await response.json();
    res.status(200).json({ text: data.choices[0].message.content });

  } catch (error: any) {
    res.status(500).json({ error: "AI 分析失败", details: error.message });
  }
}
