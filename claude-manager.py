#!/usr/bin/env python3
"""
Claude Config Manager - Web interface для управления .claude.json
"""

import http.server
import socketserver
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

CLAUDE_CONFIG_PATH = Path.home() / '.claude.json'
PORT = 8765

class ClaudeConfigHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)

        if parsed_path.path == '/':
            self.send_html()
        elif parsed_path.path == '/api/config':
            self.send_config()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/save':
            self.save_config()
        else:
            self.send_response(404)
            self.end_headers()

    def send_html(self):
        html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Config Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        h1 {
            color: #4ec9b0;
            margin-bottom: 10px;
        }

        .config-path {
            background: #252526;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-family: Monaco, monospace;
            font-size: 12px;
            color: #858585;
        }

        .stats {
            background: #252526;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .stat-item {
            background: #2d2d30;
            padding: 10px;
            border-radius: 4px;
        }

        .stat-label {
            font-size: 12px;
            color: #858585;
            margin-bottom: 5px;
        }

        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #4ec9b0;
        }

        .controls {
            background: #252526;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }

        button:hover {
            background: #1177bb;
        }

        button:disabled {
            background: #555;
            cursor: not-allowed;
        }

        button.danger {
            background: #c5302d;
        }

        button.danger:hover:not(:disabled) {
            background: #e03e3a;
        }

        button.success {
            background: #107c10;
        }

        button.success:hover:not(:disabled) {
            background: #13a813;
        }

        .search-box {
            flex: 1;
            min-width: 250px;
        }

        input[type="text"] {
            width: 100%;
            padding: 10px;
            background: #3c3c3c;
            border: 1px solid #555;
            color: #d4d4d4;
            border-radius: 4px;
            font-size: 14px;
        }

        .projects-table {
            background: #252526;
            border-radius: 8px;
            overflow: hidden;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        thead {
            background: #2d2d30;
        }

        th {
            text-align: left;
            padding: 12px;
            font-weight: 600;
            color: #4ec9b0;
            border-bottom: 1px solid #3e3e42;
        }

        tbody tr {
            border-bottom: 1px solid #3e3e42;
            transition: background 0.2s;
        }

        tbody tr:hover {
            background: #2d2d30;
            cursor: pointer;
        }

        tbody tr.selected {
            background: #264f78;
        }

        td {
            padding: 12px;
        }

        .size-bar {
            height: 20px;
            background: #3e3e42;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }

        .size-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #107c10, #4ec9b0);
            transition: width 0.3s;
        }

        .size-text {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 11px;
            color: #d4d4d4;
            font-weight: bold;
        }

        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #858585;
        }

        .warning {
            background: #5a4120;
            border-left: 4px solid #ffd700;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
        }

        .success-message {
            background: #1a3d1a;
            border-left: 4px solid #13a813;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
        }

        .sort-btn {
            background: transparent;
            color: #4ec9b0;
            padding: 0 5px;
            font-size: 12px;
        }

        .sort-btn:hover {
            background: #3e3e42;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Claude Config Manager</h1>
        <p style="color: #858585; margin-bottom: 20px;">Управление историей проектов</p>

        <div class="config-path">
            📁 Конфиг: <span id="config-path">Загрузка...</span>
        </div>

        <div id="content">
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-label">Размер файла</div>
                    <div class="stat-value" id="total-size">Загрузка...</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Всего проектов</div>
                    <div class="stat-value" id="total-projects">-</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Выбрано</div>
                    <div class="stat-value" id="selected-count">0</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Экономия после удаления</div>
                    <div class="stat-value" id="savings">0 MB</div>
                </div>
            </div>

            <div class="controls">
                <div class="search-box">
                    <input type="text" id="search" placeholder="Поиск по пути проекта...">
                </div>
                <button onclick="selectAll()">Выбрать все</button>
                <button onclick="deselectAll()">Снять выбор</button>
                <button onclick="selectLargest()">Топ-10 больших</button>
                <button class="danger" onclick="deleteSelected()">Удалить выбранное</button>
                <button class="success" onclick="saveConfig()" id="save-btn" disabled>💾 Сохранить изменения</button>
            </div>

            <div id="message-area"></div>

            <div class="warning">
                ⚠️ <strong>Внимание:</strong> После удаления истории проектов вы потеряете историю сообщений для выбранных проектов.
                MCP настройки и другие параметры сохранятся. Файл будет сохранён напрямую в ~/.claude.json
            </div>

            <div class="projects-table">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">
                                <input type="checkbox" id="select-all" onchange="toggleAll(this.checked)">
                            </th>
                            <th>
                                Проект
                                <button class="sort-btn" onclick="sortBy('path')">↕</button>
                            </th>
                            <th style="width: 120px;">
                                История
                                <button class="sort-btn" onclick="sortBy('history')">↕</button>
                            </th>
                            <th style="width: 300px;">
                                Размер
                                <button class="sort-btn" onclick="sortBy('size')">↕</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="projects-body">
                        <tr>
                            <td colspan="4" class="loading">Загрузка данных...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        let config = null;
        let projects = [];
        let sortColumn = 'size';
        let sortDirection = 'desc';
        let hasChanges = false;

        // Автозагрузка при старте
        window.addEventListener('DOMContentLoaded', loadConfig);
        document.getElementById('search').addEventListener('input', filterProjects);

        async function loadConfig() {
            try {
                const response = await fetch('/api/config');
                const data = await response.json();

                document.getElementById('config-path').textContent = data.path;
                config = data.config;
                processConfig();
            } catch (error) {
                showMessage('Ошибка загрузки конфига: ' + error.message, 'error');
            }
        }

        function processConfig() {
            projects = [];

            if (!config.projects) {
                showMessage('В файле нет секции projects', 'error');
                return;
            }

            for (const [path, data] of Object.entries(config.projects)) {
                const dataStr = JSON.stringify(data);
                projects.push({
                    path: path,
                    data: data,
                    historyCount: data.history ? data.history.length : 0,
                    size: dataStr.length,
                    selected: false
                });
            }

            updateStats();
            renderProjects();
        }

        function updateStats() {
            const totalSize = JSON.stringify(config).length;
            const totalProjects = projects.length;
            const selected = projects.filter(p => p.selected).length;
            const savings = projects.filter(p => p.selected).reduce((sum, p) => sum + p.size, 0);

            document.getElementById('total-size').textContent = formatSize(totalSize);
            document.getElementById('total-projects').textContent = totalProjects;
            document.getElementById('selected-count').textContent = selected;
            document.getElementById('savings').textContent = formatSize(savings);
        }

        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        }

        function renderProjects() {
            const tbody = document.getElementById('projects-body');
            const searchTerm = document.getElementById('search').value.toLowerCase();

            const sorted = [...projects].sort((a, b) => {
                let aVal, bVal;
                if (sortColumn === 'path') {
                    aVal = a.path;
                    bVal = b.path;
                } else if (sortColumn === 'history') {
                    aVal = a.historyCount;
                    bVal = b.historyCount;
                } else {
                    aVal = a.size;
                    bVal = b.size;
                }

                if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });

            const filtered = searchTerm
                ? sorted.filter(p => p.path.toLowerCase().includes(searchTerm))
                : sorted;

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="loading">Ничего не найдено</td></tr>';
                return;
            }

            const maxSize = Math.max(...projects.map(p => p.size));

            tbody.innerHTML = filtered.map(project => {
                const percentage = (project.size / maxSize) * 100;
                return `
                    <tr class="${project.selected ? 'selected' : ''}" onclick="toggleProject('${escapeHtml(project.path)}')">
                        <td>
                            <input type="checkbox" ${project.selected ? 'checked' : ''}
                                   onclick="event.stopPropagation(); toggleProject('${escapeHtml(project.path)}')">
                        </td>
                        <td style="font-family: 'Monaco', monospace; font-size: 12px;">
                            ${escapeHtml(project.path)}
                        </td>
                        <td style="text-align: center; color: #858585;">
                            ${project.historyCount} записей
                        </td>
                        <td>
                            <div class="size-bar">
                                <div class="size-bar-fill" style="width: ${percentage}%"></div>
                                <span class="size-text">${formatSize(project.size)}</span>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function toggleProject(path) {
            const project = projects.find(p => p.path === path);
            if (project) {
                project.selected = !project.selected;
                updateStats();
                renderProjects();
            }
        }

        function toggleAll(checked) {
            const searchTerm = document.getElementById('search').value.toLowerCase();
            const filtered = searchTerm
                ? projects.filter(p => p.path.toLowerCase().includes(searchTerm))
                : projects;

            filtered.forEach(p => p.selected = checked);
            updateStats();
            renderProjects();
        }

        function selectAll() {
            document.getElementById('select-all').checked = true;
            toggleAll(true);
        }

        function deselectAll() {
            document.getElementById('select-all').checked = false;
            toggleAll(false);
        }

        function selectLargest() {
            deselectAll();
            const sorted = [...projects].sort((a, b) => b.size - a.size);
            sorted.slice(0, 10).forEach(p => p.selected = true);
            updateStats();
            renderProjects();
        }

        function sortBy(column) {
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'desc';
            }
            renderProjects();
        }

        function filterProjects() {
            renderProjects();
        }

        function deleteSelected() {
            const selected = projects.filter(p => p.selected);
            if (selected.length === 0) {
                alert('Ничего не выбрано');
                return;
            }

            const confirm = window.confirm(
                `Вы уверены что хотите удалить историю для ${selected.length} проектов?\\n\\n` +
                `Это освободит ${formatSize(selected.reduce((sum, p) => sum + p.size, 0))}`
            );

            if (!confirm) return;

            selected.forEach(project => {
                delete config.projects[project.path];
            });

            projects = projects.filter(p => !p.selected);

            hasChanges = true;
            document.getElementById('save-btn').disabled = false;

            updateStats();
            renderProjects();

            showMessage(`Удалено ${selected.length} проектов. Нажмите "Сохранить изменения" чтобы применить.`, 'success');
        }

        async function saveConfig() {
            const saveBtn = document.getElementById('save-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Сохранение...';

            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(config)
                });

                const result = await response.json();

                if (result.success) {
                    hasChanges = false;
                    showMessage('✅ Конфиг успешно сохранён! Перезапустите Claude Code чтобы изменения вступили в силу.', 'success');
                    saveBtn.textContent = '💾 Сохранено';
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showMessage('Ошибка сохранения: ' + error.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Сохранить изменения';
            }
        }

        function showMessage(text, type) {
            const messageArea = document.getElementById('message-area');
            const className = type === 'success' ? 'success-message' : 'warning';
            messageArea.innerHTML = `<div class="${className}">${text}</div>`;

            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 10000);
        }
    </script>
</body>
</html>'''

        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def send_config(self):
        try:
            with open(CLAUDE_CONFIG_PATH, 'r', encoding='utf-8') as f:
                config = json.load(f)

            response = {
                'path': str(CLAUDE_CONFIG_PATH),
                'config': config
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error = {'error': str(e)}
            self.wfile.write(json.dumps(error).encode('utf-8'))

    def save_config(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            new_config = json.loads(body.decode('utf-8'))

            # Backup
            backup_path = CLAUDE_CONFIG_PATH.with_suffix('.json.backup')
            if CLAUDE_CONFIG_PATH.exists():
                import shutil
                shutil.copy2(CLAUDE_CONFIG_PATH, backup_path)

            # Save
            with open(CLAUDE_CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(new_config, f, indent=2, ensure_ascii=False)

            response = {'success': True, 'backup': str(backup_path)}

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error = {'success': False, 'error': str(e)}
            self.wfile.write(json.dumps(error).encode('utf-8'))

    def log_message(self, format, *args):
        # Suppress default logging
        pass

def main():
    if not CLAUDE_CONFIG_PATH.exists():
        print(f"❌ Файл не найден: {CLAUDE_CONFIG_PATH}")
        return

    print("🚀 Claude Config Manager")
    print(f"📁 Конфиг: {CLAUDE_CONFIG_PATH}")
    print(f"🌐 Сервер запущен: http://localhost:{PORT}")
    print("\n✨ Откройте браузер и перейдите по ссылке выше")
    print("   Ctrl+C для остановки\n")

    with socketserver.TCPServer(("", PORT), ClaudeConfigHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Остановка сервера...")

if __name__ == '__main__':
    main()
