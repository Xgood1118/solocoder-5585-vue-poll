# 5585-vue-poll R4 评估结果

## 编译 + 启动
- Vite dev server: http://localhost:8135
- WS server: http://localhost:8136/time returns correct serverTime
- 两者正常运行

## R1 5 bug 回归
1. 复制投票 (structuredClone): FIXED (JSON.parse/stringify)
2. WebSocket Mock: FIXED (真实 WebSocket + 自动重连)
3. 时间对账: FIXED (本地 /time endpoint 优先 + WS time_sync 协议修复)
4. 草稿自动恢复: PRESENT (useDrafts + localStorage 持久化)
5. 防刷 3 道防线: PRESENT (UA 黑白名单 + 环境检测 + Canvas 指纹 + 频率熔断)

## R2 残留
WebSocket 跨标签: FIXED (BroadcastChannel + localStorage + WS 三轨同步)
PollResult subscribeToPollSync: 正确连接

## R3 核心 bug — 时间对账 8.9e11
### 根因: WS time_sync 协议不匹配
- useWebSocket.ts connect() 发送: `{ type: 'time_sync', clientBefore: Date.now() }`
- ws-server.ts 期望: `{ type: 'time_sync', payload: { clientBefore: Date.now() } }`
- 由于无 payload 包装 => payload?.clientBefore = undefined => 0
- 服务器回复 clientBefore: 0
- 客户端计算: offset = serverTime - (0 + Date.now()/2) ≈ 8.9e11
- 这个错误 offset 覆盖了 HTTP 端获取的正确 offset!

### R3 已有修复
- TIME_ENDPOINTS[0] = localhost:8136/time (kind: local)
- 本地端点正确返回 unix ms

### R3 遗留: milliSeconds 仍在误读
- timeSync.ts 第 72 行 `serverTime = data.milliSeconds`
- timeapi.io 返回 milliSeconds=711 (秒的毫秒部分, 不是 unix ms)
- 因 local endpoint 在索引 0, ws-server 正常时永不触发
- ws-server 挂掉才会 fallback 到这里

## 测试结果
- 首页加载: OK
- 新建页面渲染: OK
- 发布投票: OK
- 投票卡片显示: OK
- 参与投票/提交: OK
- 控制台错误: 0
- 时间同步偏移: -2ms

## 结论: 产物不满意

## Bug 汇总
1. WS time_sync 协议不匹配 — client 发 flat, server 等 payload (已修复)
2. timeapi milliSeconds 误读 — 缺少值域校验 (未修, 但 ws-server 正常时不影响)
