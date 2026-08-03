RaptorQR 离线部署包
===================

本目录以及 web 子目录中的文件均为本地资源，运行时不需要访问互联网。

Windows
-------
双击 start-windows.cmd。脚本会优先使用已有的 Python 或 Node.js；如果两者
都没有，则自动使用 Windows 自带的 PowerShell 本地服务器。

macOS / Linux
-------------
双击或在终端运行：

  ./start-unix.sh

目标电脑需要有 Python 3 或 Node.js，项目依赖和 pnpm 不需要安装。

使用方式
--------
启动器会打开 http://localhost:4173。端口被占用时会自动尝试后续端口。
请保持启动器窗口开启；关闭窗口或按 Ctrl-C 即可停止。

不要直接双击 web/index.html。浏览器会阻止 file:// 页面加载本项目使用的
ES Module、Web Worker 和 WASM。

摄像头说明
----------
同一台电脑访问 localhost 时可以使用摄像头。手机通过普通 HTTP 局域网地址
访问时，浏览器会因为不是可信 HTTPS 上下文而禁用摄像头；GIF File 模式不受
这个限制。如果必须让手机摄像头在完全离线的局域网中工作，需要配置手机信任
的本地 CA，并使用覆盖该主机名/IP 的 HTTPS 证书。

完整性
------
offline-manifest.json 记录了部署包内每个文件的大小和 SHA-256。拷贝介质不
可靠时可以据此校验文件是否损坏。
