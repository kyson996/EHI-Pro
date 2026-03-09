export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { ehi, averages } = await req.json();
    const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim().replace(/^["']|["']$/g, '');

    if (!deepseekKey) {
      return new Response(JSON.stringify({ error: "缺少 API Key" }), { status: 500 });
    }

    const prompt = `分析数据:指数${ehi?.toFixed(0)},压力${averages["情绪压力"]?.toFixed(1)},睡眠${averages["睡眠质量"]?.toFixed(1)},专注${averages["专注能力"]?.toFixed(1)},疲劳${averages["心理疲劳"]?.toFixed(1)}。要求:1.总结;2.分析最差项;3.给2条建议。字数<150。`;

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

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "DeepSeek 接口异常" }), { status: 500 });
    }

    // 使用 TransformStream 处理流
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return controller.close();
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
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch (e) {}
            }
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
