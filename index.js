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

// ➤ LINE 顯示名稱對照表（手動 mapping）
const displayNameMap = {
  "U5732372307f3bf9ce8274a8fa8f29e28": "思揚",
  "U10091b695d5dee103bed9965b714715d": "文菱",
  // 繼續加...
};

// ➤ 健康檢查
app.get("/webhook", (req, res) => res.status(200).send("OK"));

// ➤ 主 webhook 處理邏輯
app.post("/webhook", middleware(config), async (req, res) => {
  for (const event of req.body.events || []) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const text = event.message.text.trim();
    const upper = text.toUpperCase();

    // ➤ 關鍵字條件 @@**
    if (!upper.startsWith("@@**")) continue;

    const src = event.source;
    let lineId = "";
    let displayName = "";

    try {
      // ========== 來源：私訊 ==========
      if (src.type === "user") {
        lineId = src.userId;
      }

      // ========== 來源：群組 ==========
      else if (src.type === "group") {
        lineId = src.userId || src.groupId;
      }

      // ========== 來源：聊天室 ==========
      else if (src.type === "room") {
        lineId = src.userId || src.roomId;
      }

      // ------------------------------
      // 嘗試取得顯示名稱
      // ------------------------------
      displayName = displayNameMap[lineId] || "NA";

      try {
        if (src.userId) {
          const profile = await client.getProfile(src.userId);
          if (profile.displayName) displayName = profile.displayName;
        }
      } catch (err) {
        console.warn("⚠️ getProfile 失敗（未加好友或封鎖）→ 使用 mapping / NA");
      }

      // ------------------------------
      // 寫入 Google Sheet
      // ------------------------------
      await fetch(process.env.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId,
          displayName,
          message: text.replace(/^@@\*\*\s*/, ""), // ✅ 去除開頭的 @@** + 空白
        }),
      });

      console.log(`✅ Saved => ${displayName} (${lineId}) : ${text}`);
    } catch (err) {
      console.error("❌ 寫入失敗：", err.message);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Keyword Bot running at ${PORT}`));
