import express from "express";
import { Client, middleware } from "@line/bot-sdk";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

// ➤ LINE 顯示名稱對照表（你要在這裡新增自己的 ID）
const displayNameMap = {
  "Uxxxxxx123456789": "小明",
  "Uyyyyyy987654321": "Curtis",
  "Czzzzzzzzzzzzzzz": "活動群組",
  // 可以持續加下去
};

// ➤ 健康檢查
app.get("/webhook", (req, res) => res.status(200).send("OK"));

// ➤ 主 webhook
app.post("/webhook", middleware(config), async (req, res) => {
  for (const event of req.body.events || []) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const text = event.message.text.trim();
    const upper = text.toUpperCase();

    // ➤ 必須匹配關鍵字（你現在的關鍵字是 @@**）
    if (!upper.startsWith("@@**")) continue;

    let lineId = "";
    let displayName = "";

    try {
      const src = event.source.type;

      if (src === "user") {
        lineId = event.source.userId;

        // 使用你的 displayNameMap，如果沒有→NA
        displayName = displayNameMap[lineId] || "NA";

      } else if (src === "group") {
        lineId = event.source.groupId;

        displayName = displayNameMap[lineId] || "(群組)";
      } else if (src === "room") {
        lineId = event.source.roomId;

        displayName = displayNameMap[lineId] || "(聊天室)";
      }

      // ➤ 將資料寫入 Google Sheet
      await fetch(process.env.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId,
          displayName,
          message: text
        })
      });

      console.log(`Saved: ${displayName} (${lineId}) => ${text}`);

    } catch (err) {
      console.error("Error:", err);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Keyword Bot running on port ${PORT}`));
