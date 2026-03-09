import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // AI Proxy Endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { ehi, averages } = req.body;
      const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim().replace(/^["']|["']$/g, '');
      
      if (!deepseekKey) {
        return res.status(500).json({ error: "未配置 API 密钥" });
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

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

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
      console.error("AI Proxy Error:", error);
      res.status(500).end(`分析失败: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
