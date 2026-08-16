# B站ASMR/白噪声助眠音频播放器

> 基于 B站音源的纯音频播放器，专注 ASMR、白噪声、助眠内容。无视频播放，无互动功能，极简专注睡眠体验。
>
> 技术方案版本：v2.0（对应工作区根目录《任务内容.md》）
> 目标平台：仅手机端（Android / iOS）

## 技术栈

- React Native 0.74 + Expo SDK 51 + TypeScript
- react-native-track-player（音频播放 + 锁屏/通知栏控制）
- React Native Paper（Material Design 3 组件）
- React Navigation（页面路由）
- Zustand（状态管理）
- expo-sqlite / expo-file-system（本地数据与文件缓存）
- axios（B站公开 API 请求）

## 功能清单

- ✅ B站视频音频搜索（关键词屏蔽过滤）
- ✅ B站视频音频在线播放（后台/锁屏）
- ✅ B站直播音频播放（无进度条，不可快进/后退）
- ✅ 音频下载（仅音频）
- ✅ 定时关闭（睡眠定时器，30秒淡出）
- ✅ 歌单管理
- ✅ 关键词屏蔽（黑名单/白名单双模式）
- ✅ 专辑封面（爬取视频封面 + 本地缓存）
- ✅ AI字幕显示（尽力而为，获取不到不影响播放）
- ✅ 个人中心（关注/收藏，路由到 B站 URL）
- ✅ 插件化多源架构（MusicSource 接口已预留，第一期仅 B站源）
- ✅ 缓存机制（音频流地址 TTL 2小时，封面 7天）

## 目录结构

```
src/
├── components/        # 可复用 UI 组件
├── screens/           # 页面
├── services/
│   ├── sources/       # 音源插件（MusicSource 接口 + BilibiliSource）
│   ├── player/        # TrackPlayer 封装与后台播放服务
│   ├── download/      # 音频下载管理
│   ├── filter/        # 关键词过滤
│   ├── subtitle/      # AI字幕服务
│   └── router/        # B站 URL 路由
├── store/             # Zustand 状态
├── db/                # SQLite 表结构与迁移
└── utils/             # B站API / WBI签名 / 缓存 / 定时器
```

## 运行

```bash
npm install
npm start          # 启动 Expo Dev Server，使用 Expo Go 扫码预览
npm run android    # Android 真机/模拟器（需要 Android Studio）
npm run ios        # iOS（需要 macOS + Xcode）
npm run typecheck  # TypeScript 类型检查
```

## 重要说明与已知限制

1. **Expo SDK 版本修正**：《任务内容.md》中写的是 `expo ^51.x + react-native ^0.73.x`，
   实际 SDK 51 对应 RN 0.74，本仓库使用 `expo ~51.0.0 + react-native 0.74.5` 保证版本匹配。
2. **WBI 签名**：`src/utils/wbi-sign.ts` 实现了完整 WBI 签名，该算法是高风险不可控链路，
   若 B站变更需及时更新此文件；设置页提供"清理过期缓存"同时重置 WBI key 缓存。
3. **直播流为 FLV**：B站直播接口不提供纯音频流，返回 FLV/HLS 完整流。
   react-native-track-player 对 FLV 的支持有限，若直播无法直接播放，
   需要后续接入 ffmpeg 转码或使用 HLS 源（`ffmpeg-kit-react-native` 已作为 optionalDependency 预留）。
4. **后台睡眠定时**：纯 JS `setTimeout` 在 App 长时间后台运行时可能延迟触发。
   生产环境建议引入原生后台计时器。前台/锁屏播放场景可正常使用。
5. **API 接入策略**：默认免登录公开 API；受限时可调用 `setBilibiliCookie()` 注入 Cookie
   （优先级2），优先级3为 WebView 方式（未实现）。

## 免责声明

本项目仅供学习交流使用。请遵守 B站服务条款，勿用于商业用途。
