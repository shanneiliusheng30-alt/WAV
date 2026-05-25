import { FFmpeg } from "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/ffmpeg.min.js";
import { fetchFile, toBlobURL } from "https://unpkg.com/@ffmpeg/util@0.12.10/dist/ffmpeg-util.min.js";

const ffmpeg = new FFmpeg();

const fileInput = document.getElementById("fileInput");
const formatSelect = document.getElementById("formatSelect");
const convertBtn = document.getElementById("convertBtn");
const progressEl = document.getElementById("progress");
const statusEl = document.getElementById("status");
const downloadArea = document.getElementById("downloadArea");

async function loadFFmpeg() {
  if (ffmpeg.loaded) return;

  statusEl.textContent = "FFmpeg 読み込み中...";
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  statusEl.textContent = "FFmpeg 読み込み完了";
}

async function convert() {
  const file = fileInput.files?.[0];
  if (!file) {
    alert("先に MP4 / MOV ファイルを選んでね");
    return;
  }

  const ext = formatSelect.value;
  const inputName = "input." + (file.name.split(".").pop() || "mp4");
  const outputName = `output.${ext}`;

  await loadFFmpeg();

  statusEl.textContent = "ファイル準備中...";
  progressEl.value = 0;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  let args;
  if (ext === "mp3") {
    args = ["-i", inputName, "-vn", "-acodec", "libmp3lame", "-q:a", "2", outputName];
  } else if (ext === "wav") {
    args = ["-i", inputName, "-vn", "-acodec", "pcm_s16le", outputName];
  } else if (ext === "aac") {
    args = ["-i", inputName, "-vn", "-c:a", "aac", "-b:a", "192k", outputName];
  }

  statusEl.textContent = "変換中...";
  progressEl.value = 30;

  await ffmpeg.exec(args);

  progressEl.value = 80;
  statusEl.textContent = "出力取得中...";

  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data.buffer], { type: getMimeType(ext) });
  const url = URL.createObjectURL(blob);

  downloadArea.innerHTML = "";
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  a.textContent = `ダウンロード (${ext.toUpperCase()})`;
  downloadArea.appendChild(a);

  progressEl.value = 100;
  statusEl.textContent = "完了！";
}

function getMimeType(ext) {
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "aac") return "audio/aac";
  return "application/octet-stream";
}

convertBtn.addEventListener("click", () => {
  convert().catch((e) => {
    console.error(e);
    statusEl.textContent = "エラーが発生した…（コンソールを確認して）";
  });
});
