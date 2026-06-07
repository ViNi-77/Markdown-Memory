import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
// Load environment variables early
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API endpoints
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { documentContent, task, customPrompt, apiKey: clientApiKey } = req.body;
      
      if (!documentContent) {
        return res.status(400).json({ error: 'documentContent is required' });
      }
      
      // Use client-provided key or fallback to server environment variable
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Gemini API key is not configured. Please set it in Settings.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      let prompt = '';
      if (task === 'defect-analysis') {
        prompt = `
あなたはトヨタ生産現場の「不具合傾向分析AIエージェント」です。
トレーサビリティ（トレサビ）システムから出力されたCSV・Excelデータをユーザーがアップロードもしくはペーストすることでデータを受け取り、不具合傾向の分析・異常検知・現場へのアクション提案を行います。

データを受け取ったら、必ず以下の構成で回答してください。

📊 データ概要
データ期間：
総件数：
対象工程・部品：

🚨 異常検知サマリー（赤信号）
直近の傾向と過去平均を比較して、閾値を超えている・増加傾向にある項目を列挙してください。
形式：「【工程名/部品名】：〇〇が△△件（前週比+XX%）→ 要注意」

📈 不具合傾向レポート
全体の不具合件数推移（増加・減少・横ばい）
工程別・部品別の上位3件
直行率への影響（わかる範囲で）

💡 ネクストアクション（現場へのおすすめ）
現場の組長・品質担当がすぐに動けるよう、優先度順に3〜5つ提示してください。
形式：「① 〇〇工程の△△を確認する（理由：〜〜）」

⚠️ AIからの注意書き
このレポートはデータに基づく傾向分析です
最終的なOK/NG判断・原因特定は必ず現場担当者が行ってください
データに欠損・異常値がある場合はその旨を明記します

分析時のルール
データが少ない・不完全でも、わかる範囲で分析して「データ不足の旨」を明記する
専門用語は使いすぎず、現場の組長が読んでわかる言葉で書く
数値は必ず根拠を示す（例：「3件増加（先週5件→今週8件）」）
異常がない場合は「異常なし・良好」と明示する（あいまいにしない）
TPSの観点から、付加価値の低い作業・停滞・過剰処理があれば指摘する

以下の対象データを分析してください：
対象データ:
${documentContent}`;
      } else if (task === 'custom' && customPrompt) {
        prompt = `あなたはトヨタ生産現場の「不具合傾向分析AIエージェント」です。
ユーザーからの追加質問に対応してください。\n\n質問・指示: ${customPrompt}\n\n対象データ:\n${documentContent}`;
      } else {
        prompt = `以下のドキュメントについて分析してください。\n\n${documentContent}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });
      
      res.json({ result: response.text });
    } catch (error: any) {
      console.error('Error generating AI response:', error);
      res.status(500).json({ error: error.message || 'Failed to generate AI response' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
