import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

async function startServer() {
  const app = express();
  app.use(express.json());

  // AI 分析接口：由服务器代劳，绕过国内跨域和网络限制
  app.post("/api/analyze", async (req, res) => {
    try {
      const { ehi, averages, apiKey } = req.body;
      const prompt = `你是一位资深心理健康专家。分析数据：指数${ehi?.toFixed(0)}, 压力${averages["情绪压力"]?.toFixed(1)}, 睡眠${averages["睡眠质量"]?.toFixed(1)}, 专注${averages["专注能力"]?.toFixed(1)}, 疲劳${averages["心理疲劳"]?.toFixed(1)}。要求：1.专业总结；2.分析最差项；3.给2条微习惯建议。150字内。`;

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是一位精炼的心理健康专家。" },
            { role: "user", content: prompt }
          ],
          stream: false
        })
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "AI 请求失败" });
    }
  });

  // Vite 模式
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
