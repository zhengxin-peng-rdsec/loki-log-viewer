# Loki Log Viewer

一个面向内网使用的 Loki 日志查看工作台，支持多 Loki 连接、多日志源、用户组授权、LogQL 查询、实时 tail、日志过滤、高亮、导出和 Grafana Explore 风格的标签下拉查询。

当前版本是轻量内网版：配置由内置 Python 代理保存为服务端 JSON 文件，适合小团队内网使用和生产化前验证。它不是强安全的企业级权限系统。

## 功能

- 多 Loki 连接管理，支持在日志源上绑定指定 Loki。
- 用户、用户组、日志源、权限配置。
- 用户名密码登录。
- 普通用户只能查看授权日志源。
- 管理员可管理 Loki 连接、用户、用户组、日志源和授权。
- 授权支持无权限、只读、编辑；编辑权限仅允许修改该日志源 LogQL。
- Kick start query：通过 Label filters 下拉选择标签、操作符和值，生成 LogQL。
- 标签值级联：先选 `job` 后再选 `filename` / `group` 时，后续值会按前置条件过滤。
- 日志历史查询（单次最多 5000 行）、实时 tail、自动滚动、自动换行、全屏日志流。
- 包含、排除、正则、大小写敏感和日志级别过滤。
- JSON 日志解析和日志详情弹窗。
- 浅色、深色、跟随系统主题。
- 配置服务端持久化，换浏览器仍可加载。

## 目录

```text
index.html              前端页面
styles.css              页面样式
app.js                  前端逻辑
loki-proxy.py           静态文件服务、Loki 代理、配置持久化
loki-proxy.config.json  本地开发用 Loki 代理配置
```

## 快速启动

```bash
cd <APP_DIR>
python3 loki-proxy.py --host <LISTEN_HOST> --port <LISTEN_PORT>
```

访问：

```text
http://<LISTEN_HOST>:<LISTEN_PORT>
```

默认账号：

```text
admin / admin123
erp-dev / dev123
mall-dev / dev123
```

首次登录后建议立即修改默认密码。

## 配置文件

内置代理会保存两类文件。

Loki 代理配置：

```text
loki-proxy.config.json
```

应用状态配置：

```text
loki-viewer.state.json
```

应用状态包括：

```text
用户
用户组
Loki 连接
日志源
日志源授权
主题和界面设置
```

原始日志内容不会保存到本地或服务端。查询结果只存在浏览器当前页面内存里，点击“导出”时才会下载为本地文本文件。

## 内网部署

示例变量：

```text
APP_DIR=<APP_DIR>
DATA_DIR=<DATA_DIR>
LISTEN_HOST=<LISTEN_HOST>
LISTEN_PORT=<LISTEN_PORT>
LOKI_URL=<LOKI_URL>
```

安装依赖：

```bash
# CentOS / RHEL
yum install -y python3

# Debian / Ubuntu
apt-get update && apt-get install -y python3
```

上传代码后准备目录：

```bash
mkdir -p "$APP_DIR"
mkdir -p "$DATA_DIR"
```

创建 Loki 初始配置：

```bash
cat >"$DATA_DIR/loki-proxy.config.json" <<EOF
{
  "lokiUrl": "$LOKI_URL",
  "tenantId": ""
}
EOF
```

前台测试启动：

```bash
python3 "$APP_DIR/loki-proxy.py" \
  --host "$LISTEN_HOST" \
  --port "$LISTEN_PORT" \
  --config "$DATA_DIR/loki-proxy.config.json" \
  --state "$DATA_DIR/loki-viewer.state.json"
```

访问：

```text
http://<LISTEN_HOST>:<LISTEN_PORT>
```

如果只绑定某个内网地址，其他地址不可访问是正常的。需要多网卡访问时，请按实际网络环境设置 `<LISTEN_HOST>`。

## systemd

创建运行用户：

```bash
useradd --system --shell /sbin/nologin lokiviewer
chown -R lokiviewer:lokiviewer <DATA_DIR>
```

创建服务：

```ini
[Unit]
Description=Loki Log Viewer
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=lokiviewer
Group=lokiviewer
WorkingDirectory=<APP_DIR>
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 <APP_DIR>/loki-proxy.py --host <LISTEN_HOST> --port <LISTEN_PORT> --config <DATA_DIR>/loki-proxy.config.json --state <DATA_DIR>/loki-viewer.state.json
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

保存为：

```text
/etc/systemd/system/loki-log-viewer.service
```

启动：

```bash
systemctl daemon-reload
systemctl enable --now loki-log-viewer
systemctl status loki-log-viewer --no-pager
```

查看日志：

```bash
journalctl -u loki-log-viewer -f
```

## API

代理暴露这些接口：

```text
GET  /api/config       读取当前 Loki 代理配置
POST /api/config       保存当前 Loki 代理配置
GET  /api/state        读取应用状态
POST /api/state        保存应用状态
*    /api/loki/...     转发 Loki API
```

测试：

```bash
curl http://<LISTEN_HOST>:<LISTEN_PORT>/api/config
curl http://<LISTEN_HOST>:<LISTEN_PORT>/api/state
curl http://<LISTEN_HOST>:<LISTEN_PORT>/api/loki/loki/api/v1/labels
curl http://<LISTEN_HOST>:<LISTEN_PORT>/api/loki/loki/api/v1/label/job/values
```

## Loki 查询

默认通过代理访问 Loki：

```text
浏览器 -> /api/loki -> Loki
```

管理员可以在系统配置里新增多个 Loki 连接，然后在日志源配置中绑定具体连接。查询某个日志源时，前端会先激活该日志源绑定的 Loki 连接，再发起查询。

Kick start query 的下拉逻辑：

- 标签名通过 `/loki/api/v1/labels` 获取。
- 第一层标签值通过 `/loki/api/v1/label/{name}/values` 获取，尽量展示完整值。
- 第二层及后续标签值通过 `/loki/api/v1/series?match[]={...}` 获取，并按前置条件过滤。

示例：

```logql
{job="<JOB_NAME>", filename="<LOG_FILE>"} |= "ERROR"
```

## 实时日志

实时 tail 优先使用 Loki WebSocket。WebSocket 异常关闭时，页面会自动退回 2 秒轮询 `query_range`，避免实时视图完全不可用。

如果 Loki 多租户依赖 `X-Scope-OrgID`，HTTP 查询会带该 header；浏览器原生 WebSocket 不能自定义 header，所以实时 tail 需要通过当前代理转发。

## 更新部署

只更新前端逻辑或样式：

```bash
scp app.js <USER>@<SERVER>:<APP_DIR>/app.js
scp styles.css <USER>@<SERVER>:<APP_DIR>/styles.css
```

浏览器强刷：

```text
Ctrl + F5
```

更新 `loki-proxy.py` 后需要重启服务：

```bash
scp loki-proxy.py <USER>@<SERVER>:<APP_DIR>/loki-proxy.py
systemctl restart <SERVICE_NAME>
```

## 备份

至少备份这两个文件：

```text
<DATA_DIR>/loki-proxy.config.json
<DATA_DIR>/loki-viewer.state.json
```

示例：

```bash
tar czf loki-log-viewer-backup-$(date +%F).tar.gz <DATA_DIR>
```

## 安全边界

当前版本适合内网轻量使用，但不建议直接暴露公网。

已支持：

- 服务端保存配置。
- 基础用户名密码登录。
- 前端权限视图控制。
- Loki 通过内置代理访问。

当前限制：

- 密码保存在服务端 JSON 状态文件中，尚未做哈希。
- 权限模型仍偏轻量，不适合作为强安全边界。
- 没有查询审计、审批、配置版本和脱敏。
- 多人同时编辑配置时，最后保存者会覆盖前一次状态。

如果要作为正式企业平台，建议继续改造：

- 密码哈希和服务端 Session。
- 后端强制 RBAC 校验。
- SQLite 或 PostgreSQL 持久化。
- 查询审计、导出审计。
- 查询时间范围、行数、并发限制。
- 日志脱敏和敏感字段保护。
- HTTPS、VPN 或统一身份认证。
