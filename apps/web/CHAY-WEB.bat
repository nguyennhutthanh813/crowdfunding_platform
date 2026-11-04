@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
if errorlevel 1 goto bad_folder

where node >nul 2>&1
if errorlevel 1 goto missing_node
for /f "delims=" %%V in ('node -p "process.versions.node.split('.')[0]"') do set "GOP_NODE_MAJOR=%%V"
if not defined GOP_NODE_MAJOR goto missing_node
if %GOP_NODE_MAJOR% LSS 24 goto old_node

set "GOP_PNPM=corepack pnpm"
where corepack >nul 2>&1
if errorlevel 1 (
  set "GOP_PNPM=pnpm"
  where pnpm >nul 2>&1
  if errorlevel 1 goto missing_pnpm
)

powershell -NoProfile -Command "try { $c=[Net.Sockets.TcpClient]::new('127.0.0.1',3100); $c.Close(); exit 1 } catch { exit 0 }"
if errorlevel 1 goto port_busy

if not exist "node_modules\next\package.json" (
  echo [Góp] Cài dependency lần đầu. Máy cần kết nối mạng.
  call %GOP_PNPM% install --frozen-lockfile
  if errorlevel 1 goto install_failed
)

set "GOP_LOCAL_DB=1"
set "GOP_LOCAL_DB_NAME=gop-mock"
set "VERCEL="
set "NEXT_PUBLIC_SITE_URL=http://localhost:3100"

echo [Góp] Dữ liệu local: .local-data\gop-mock.sqlite
echo [Góp] Sẽ mở http://localhost:3100 khi server sẵn sàng.
echo [Góp] Đóng cửa sổ này hoặc nhấn Ctrl+C để dừng web.
if not defined GOP_NO_BROWSER (
  start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$u='http://localhost:3100'; for($i=0;$i -lt 60;$i++){try{if((Invoke-WebRequest -UseBasicParsing -Uri ($u+'/api/v1/health') -TimeoutSec 2).StatusCode -eq 200){Start-Process $u; exit 0}}catch{}; Start-Sleep -Milliseconds 500}"
)
call %GOP_PNPM% dev --port 3100
if errorlevel 1 goto server_failed
echo [Góp] Web đã dừng.
exit /b 0

:bad_folder
echo [Góp] Không mở được thư mục dự án.
goto failed
:missing_node
echo [Góp] Cần cài Node.js 24 trở lên, sau đó chạy lại file này.
goto failed
:old_node
echo [Góp] Node.js hiện tại quá cũ. Cần phiên bản 24 trở lên.
goto failed
:missing_pnpm
echo [Góp] Cần pnpm hoặc Corepack trong PATH để chạy dự án.
goto failed
:port_busy
echo [Góp] Cổng 3100 đang được sử dụng. Hãy dừng server cũ rồi chạy lại file này.
goto failed
:install_failed
echo [Góp] Cài dependency chưa xong. Kiểm tra kết nối mạng và thử lại.
goto failed
:server_failed
echo [Góp] Server dừng vì lỗi. Xem dòng thông báo ở trên.
:failed
if not defined GOP_NO_PAUSE pause
exit /b 1
