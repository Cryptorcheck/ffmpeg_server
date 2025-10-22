import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

interface VideoPart {
  path: string;
  subtitle: string;
}

const videos: VideoPart[] = [
  { path: "resources/01.mp4", subtitle: "subtitle resources/01.mp4" },
  { path: "resources/02.mp4", subtitle: "subtitle resources/02.mp4" },
  { path: "resources/03.mp4", subtitle: "subtitle resources/03.mp4" },
];

const outputDir = "output";
const tempDir = "temp";

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
function addSubtitle(
  inputPath: string,
  subtitle: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 请根据系统调整字体路径
    const fontfile = "/System/Library/Fonts/Supplemental/Arial.ttf";

    ffmpeg(inputPath)
      .videoFilters([
        {
          filter: "drawtext",
          options: {
            fontfile,
            text: subtitle,
            fontsize: 36,
            fontcolor: "white",
            box: 1,
            boxcolor: "black@0.5",
            boxborderw: 8,
            x: "(w-text_w)/2",
            y: "h-80",
            enable: "between(t,0,99999)",
          },
        },
      ])
      .videoCodec("libx264")
      .outputOptions([
        "-preset veryfast",
        "-crf 18",
        "-pix_fmt yuv420p",
        "-r 25", // 目标帧率
      ])
      .audioCodec("aac")
      .audioBitrate("128k")
      .on("start", (cmd) => {
        console.log("ffmpeg (subtitle) cmd:", cmd);
      })
      .on("stderr", (line) => {
        console.log("[ffmpeg-subtitle err]", line);
      })
      .on("end", () => {
        console.log("生成带字幕文件:", outputPath);
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("addSubtitle error:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

function concatVideosWithFilter(
  inputFiles: string[],
  outputFile: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (inputFiles.length === 0) {
      return reject(new Error("视频文件列表为空"));
    }

    const listFilePath = path.resolve(__dirname, "filelist.txt");
    const fileListContent = inputFiles
      .map((file) => `file '${path.resolve(file)}'`)
      .join("\n");

    fs.writeFileSync(listFilePath, fileListContent);

    ffmpeg()
      .input(listFilePath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c:v libx264", "-c:a aac"]) // 不重新编码，速度快
      .on("start", (cmd) => console.log("exec cmd：", cmd))
      .on("progress", (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r进度：${progress.percent.toFixed(2)}%`);
        }
      })
      .on("error", (err) => {
        console.error("\n❌ 合并失败：", err.message);
        fs.unlinkSync(listFilePath);
        reject(err);
      })
      .on("end", () => {
        console.log("\n✅ 合并完成:", outputFile);
        fs.unlinkSync(listFilePath);
        resolve();
      })
      .save(outputFile);
  });
}

async function main() {
  try {
    console.log("▶️ 开始处理...");
    const tempOutputs: string[] = [];

    for (const [i, video] of videos.entries()) {
      const tempOutput = path.join(tempDir, `part${i + 1}_subtitled.mp4`);
      console.log(`为 ${video.path} 添加字幕 -> ${tempOutput}`);
      await addSubtitle(video.path, video.subtitle, tempOutput);
      tempOutputs.push(tempOutput);
    }

    const finalOutput = path.join(outputDir, "final.mp4");

    console.log("开始合并（filter_complex concat）...");
    await concatVideosWithFilter(tempOutputs, finalOutput);

    console.log("✅ 完成！输出文件:", finalOutput);
  } catch (err) {
    console.error("❌ Failure: ", err);
  }
}

main();
