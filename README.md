# ffmpeg_sever Demo

## 项目介绍
#### 核心依赖
- fluent-ffmpeg

#### 功能
- 添加字幕
- 视频拼接

#### 使用
- 安装依赖
  ```bash
  yarn install
  ```
- 将视频源放入 `resources` 目录（如只需要查看项目内视频合成，可跳过该步骤）
- 修改 `src/main.ts` 中的 `videos` 数组中的视频源文件名以及字幕（如只需要查看项目内视频合成，可跳过该步骤）
- 运行项目
  ```bash
  yarn dev
  ```
- 查看 `output` 目录下的结果
