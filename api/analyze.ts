export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { ehi, averages } = await req.json();
    const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();

    if (!deepseekKey) {
      return new Response(JSON.stringify({ error: "缺少 API Key" }), { status: 500 });
    }

    const prompt = `分析数据:
- 情绪指数: ${ehi?.toFixed(0)}/100
- 情绪压力: ${averages["情绪压力"]?.toFixed(1)}/5
- 睡眠质量: ${averages["睡眠质量"]?.toFixed(1)}/5
- 专注能力: ${averages["专注能力"]?.toFixed(1)}/5
- 心理疲劳: ${averages["心理疲劳"]?.toFixed(1)}/5

要求:
1. 给出一段专业且温暖的总结。
2. 深入分析分数最差的一项（如专注力或睡眠），说明其对心理健康的潜在影响。
3. 提供2条具体的、可立即执行的微习惯建议（包含具体数字，如时间、次数）。
4. 语言通顺，严禁使用不完整的句子。总字数控制在150-200字。`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是一位资深的心理健康专家，擅长通过数据提供专业、温暖且具体的建议。请确保输出完整的中文句子，不要断句。" },
          { role: "user", content: prompt }
        ],
        stream: true
      })
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
