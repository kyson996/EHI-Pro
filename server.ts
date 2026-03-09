import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Proxy Endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { ehi, averages } = req.body;
      
      // Helper to clean keys
      const cleanKey = (key: string | undefined) => {
        if (!key) return undefined;
        return key.trim().replace(/^["']|["']$/g, '');
      };

      const deepseekKey = cleanKey(process.env.DEEPSEEK_API_KEY);
      
      if (!deepseekKey || deepseekKey.length < 10) {
        console.error("Server Error: DEEPSEEK_API_KEY is missing");
        return res.status(500).json({ 
          error: "未配置 DeepSeek API 密钥", 
          details: "请在 Settings -> Secrets 中添加 DEEPSEEK_API_KEY"
        });
      }

      console.log("Using DeepSeek engine for analysis...");
      
      // Optimized prompt for speed and quality
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
        2. 核心分析：重点分析得分最高（最差）的维度，指出潜在原因。
        3. 改善行动：提供3条立即可以执行的微小习惯建议。
        
        格式：Markdown，字数控制在300字以内，语气温暖且专业。
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
            { role: "system", content: "你是一位高效、专业的心理健康分析助手。回答要精炼、准确，避免废话。" },
            { role: "user", content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.7,
          stream: false
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        console.error("DeepSeek API Error:", data);
        throw new Error(data.error?.message || "DeepSeek 调用失败");
      }

      res.json({ text: data.choices[0].message.content });

    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      res.status(500).json({ error: "AI 分析失败", details: error.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
