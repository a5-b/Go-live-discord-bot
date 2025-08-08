global.navigator = { userAgent: "node.js" };

import { config } from "dotenv";
config();

import fs from "fs";
import { exec } from "child_process";
import util from "util";
import { Client } from "discord.js-selfbot-v13";
import { Streamer, streamLivestreamVideo } from "@dank074/discord-video-stream";
import ffmpegPath from "ffmpeg-static";

const execPromise = util.promisify(exec);

const client = new Client({ checkUpdate: false });
const streamer = new Streamer(client);

// إعدادات البث
const GUILD_ID = "1279854199798235197";
const VOICE_CHANNEL_ID = "1330949990142709790";

const VIDEO_URL = "https://shahidha.net/files/30897/%5BAnimeiat.co%5DKobayashi-san_Chi_no_Maid_Dragon_2nd_Season_-_EP03%5B720p%5D.mp4";
const LOCAL_FILE = "./kobayashi_ep03_720p.mp4";

// تحميل الفيديو إن لم يكن موجودًا
async function downloadVideoWithWget(url, dest) {
  if (fs.existsSync(dest)) {
    console.log("📁 الملف موجود مسبقًا");
    return;
  }

  console.log("📥 جاري تحميل الفيديو...");
  try {
    await execPromise(`wget -O "${dest}" "${url}"`);
    console.log("✅ تم التحميل بنجاح");
  } catch (err) {
    console.error("❌ فشل التحميل:", err);
    throw err;
  }
}

async function start() {
  try {
    await client.login(process.env.bot2_TOKEN);
    console.log(`✅ تسجيل الدخول كـ ${client.user.username}`);

    await downloadVideoWithWget(VIDEO_URL, LOCAL_FILE);

    await streamer.joinVoice(GUILD_ID, VOICE_CHANNEL_ID);
    console.log("✅ تم الانضمام إلى الروم");

    const udp = await streamer.createStream({
      width: 1280,
      height: 720,
      fps: 30,
      bitrateKbps: 2500,
      h26xPreset: "ultrafast",
      ffmpegPath,
      minimizeLatency: true,
    });

    // تفعيل Go Live
    udp.mediaConnection.setVideoStatus(true);
    udp.mediaConnection.setSpeaking(true);
    console.log("🎥 تم تفعيل البث");

    console.log("⌛ الانتظار 3 ثواني...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("🚀 بدأ ffmpeg");

    const result = await streamLivestreamVideo(LOCAL_FILE, udp, {
      ffmpegArgs: [
        "-fflags", "+genpts",
        "-re", // محاكاة وقت حقيقي
        "-i", LOCAL_FILE,
        "-async", "1",
        "-vsync", "1",
        "-flush_packets", "1",
        "-max_interleave_delta", "0",
        "-preset", "ultrafast",
        "-g", "60",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-f", "mpegts",
        "-codec:v", "libx264",
        "-b:v", "2500k",
        "-bufsize", "2500k",
        "-maxrate", "2500k",
        "-codec:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-b:a", "128k",
        "pipe:1"
      ]
    });

    console.log("✅ تم البث:", result);

    udp.mediaConnection.setSpeaking(false);
    udp.mediaConnection.setVideoStatus(false);
    console.log("🛑 إيقاف البث");

  } catch (err) {
    console.error("❌ خطأ:", err);
  }
}

start();