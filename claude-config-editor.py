#!/usr/bin/env python3
"""
Claude Config Editor - Полноценный редактор .claude.json
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
    <title>Claude Config Editor</title>
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
            max-width: 1600px;
            margin: 0 auto;
        }

        h1 {
            color: #4ec9b0;
            margin-bottom: 10px;
        }

        h2 {
            color: #4ec9b0;
            font-size: 18px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
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

        .top-controls {
            background: #252526;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }

        .tabs {
            display: flex;
            gap: 5px;
            margin-bottom: 20px;
            border-bottom: 2px solid #3e3e42;
        }

        .tab {
            padding: 12px 24px;
            background: #252526;
            border: none;
            color: #858585;
            cursor: pointer;
            border-radius: 4px 4px 0 0;
            transition: all 0.2s;
            font-size: 14px;
        }

        .tab:hover {
            background: #2d2d30;
            color: #d4d4d4;
        }

        .tab.active {
            background: #1e1e1e;
            color: #4ec9b0;
            border-bottom: 2px solid #4ec9b0;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .section {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #3e3e42;
        }

        .badge {
            background: #0e639c;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }

        .badge.large {
            background: #c5302d;
        }

        .badge.medium {
            background: #ffd700;
            color: #1e1e1e;
        }

        .badge.small {
            background: #107c10;
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

        button.small {
            padding: 6px 12px;
            font-size: 12px;
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

        input[type="text"] {
            width: 100%;
            padding: 10px;
            background: #3c3c3c;
            border: 1px solid #555;
            color: #d4d4d4;
            border-radius: 4px;
            font-size: 14px;
        }

        .mcp-server-card {
            background: #2d2d30;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
        }

        .mcp-server-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .mcp-server-name {
            font-size: 16px;
            font-weight: bold;
            color: #4ec9b0;
        }

        .mcp-server-info {
            font-family: Monaco, monospace;
            font-size: 12px;
            color: #858585;
            background: #1e1e1e;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
        }

        .json-viewer {
            background: #1e1e1e;
            padding: 15px;
            border-radius: 4px;
            font-family: Monaco, monospace;
            font-size: 12px;
            color: #d4d4d4;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }

        .json-key {
            color: #9cdcfe;
        }

        .json-string {
            color: #ce9178;
        }

        .json-number {
            color: #b5cea8;
        }

        .json-boolean {
            color: #569cd6;
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

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .stat-card {
            background: #2d2d30;
            padding: 15px;
            border-radius: 8px;
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

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #555;
            transition: .4s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: #107c10;
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }

        .search-box {
            flex: 1;
            min-width: 250px;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #858585;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Claude Config Editor</h1>
        <p style="color: #858585; margin-bottom: 20px;">Полный редактор конфигурации Claude Code</p>

        <div class="config-path">
            📁 Конфиг: <span id="config-path">Загрузка...</span>
        </div>

        <div class="top-controls">
            <button class="success" onclick="saveConfig()" id="save-btn" disabled>💾 Сохранить все изменения</button>
            <button onclick="reloadConfig()">🔄 Перезагрузить</button>
            <button class="danger" onclick="createBackup()">📦 Создать бэкап</button>
            <div style="flex: 1;"></div>
            <div style="color: #858585; font-size: 12px;">
                Последнее сохранение: <span id="last-save">никогда</span>
            </div>
        </div>

        <div id="message-area"></div>

        <div class="tabs">
            <button class="tab active" onclick="switchTab('overview')">📊 Обзор</button>
            <button class="tab" onclick="switchTab('projects')">📁 Проекты истории</button>
            <button class="tab" onclick="switchTab('mcp')">🔌 MCP серверы</button>
            <button class="tab" onclick="switchTab('settings')">⚙️ Настройки</button>
            <button class="tab" onclick="switchTab('raw')">📝 Raw JSON</button>
        </div>

        <!-- Overview Tab -->
        <div id="tab-overview" class="tab-content active">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Размер конфига</div>
                    <div class="stat-value" id="overview-size">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Проектов</div>
                    <div class="stat-value" id="overview-projects">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">MCP серверов</div>
                    <div class="stat-value" id="overview-mcp">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Запусков</div>
                    <div class="stat-value" id="overview-startups">-</div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h2>🔍 Быстрый анализ</h2>
                </div>
                <div id="quick-analysis"></div>
            </div>
        </div>

        <!-- Projects Tab -->
        <div id="tab-projects" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h2>📁 История проектов <span class="badge" id="projects-badge">0</span></h2>
                    <div>
                        <button onclick="selectAllProjects()">Выбрать все</button>
                        <button onclick="deselectAllProjects()">Снять выбор</button>
                        <button onclick="selectLargestProjects()">Топ-10 больших</button>
                        <button class="danger" onclick="deleteSelectedProjects()">Удалить выбранное</button>
                    </div>
                </div>
                <div class="search-box" style="margin-bottom: 15px;">
                    <input type="text" id="projects-search" placeholder="Поиск по пути проекта..." onkeyup="filterProjects()">
                </div>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50px;">
                                    <input type="checkbox" id="select-all-projects" onchange="toggleAllProjects(this.checked)">
                                </th>
                                <th onclick="sortProjects('path')">Проект ↕</th>
                                <th style="width: 100px;" onclick="sortProjects('history')">История ↕</th>
                                <th style="width: 300px;" onclick="sortProjects('size')">Размер ↕</th>
                            </tr>
                        </thead>
                        <tbody id="projects-body">
                            <tr><td colspan="4" class="no-data">Загрузка...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MCP Tab -->
        <div id="tab-mcp" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h2>🔌 MCP серверы <span class="badge" id="mcp-badge">0</span></h2>
                    <button onclick="addMcpServer()">+ Добавить сервер</button>
                </div>
                <div id="mcp-servers-list"></div>
            </div>
        </div>

        <!-- Settings Tab -->
        <div id="tab-settings" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h2>⚙️ Основные настройки</h2>
                </div>
                <div id="settings-list"></div>
            </div>
        </div>

        <!-- Raw JSON Tab -->
        <div id="tab-raw" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h2>📝 Raw JSON</h2>
                    <button onclick="copyRawJson()">📋 Копировать</button>
                </div>
                <div class="json-viewer" id="raw-json"></div>
            </div>
        </div>
    </div>

    <script>
        let config = null;
        let projects = [];
        let sortColumn = 'size';
        let sortDirection = 'desc';
        let hasChanges = false;

        window.addEventListener('DOMContentLoaded', loadConfig);

        async function loadConfig() {
            try {
                const response = await fetch('/api/config');
                const data = await response.json();

                document.getElementById('config-path').textContent = data.path;
                config = data.config;

                processConfig();
                renderAllTabs();
            } catch (error) {
                showMessage('Ошибка загрузки конфига: ' + error.message, 'error');
            }
        }

        function processConfig() {
            projects = [];

            if (config.projects) {
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
            }
        }

        function renderAllTabs() {
            renderOverview();
            renderProjects();
            renderMcpServers();
            renderSettings();
            renderRawJson();
        }

        function renderOverview() {
            const totalSize = JSON.stringify(config).length;
            const projectsCount = config.projects ? Object.keys(config.projects).length : 0;
            const mcpCount = config.mcpServers ? Object.keys(config.mcpServers).length : 0;

            document.getElementById('overview-size').textContent = formatSize(totalSize);
            document.getElementById('overview-projects').textContent = projectsCount;
            document.getElementById('overview-mcp').textContent = mcpCount;
            document.getElementById('overview-startups').textContent = config.numStartups || 0;

            // Quick analysis
            let analysis = '<div style="color: #858585;">';

            if (totalSize > 5 * 1024 * 1024) {
                analysis += '⚠️ Конфиг большой (' + formatSize(totalSize) + '). Рекомендуется очистить историю старых проектов.<br><br>';
            }

            if (projectsCount > 20) {
                analysis += '📁 Много проектов (' + projectsCount + '). Удалите неиспользуемые через вкладку "Проекты истории".<br><br>';
            }

            if (mcpCount === 0) {
                analysis += '🔌 MCP серверы не настроены.<br><br>';
            } else {
                analysis += '✅ Активно ' + mcpCount + ' MCP серверов.<br><br>';
            }

            analysis += '</div>';
            document.getElementById('quick-analysis').innerHTML = analysis;
        }

        function renderProjects() {
            const tbody = document.getElementById('projects-body');
            const searchTerm = document.getElementById('projects-search').value.toLowerCase();

            document.getElementById('projects-badge').textContent = projects.length;

            if (projects.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="no-data">Нет проектов</td></tr>';
                return;
            }

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

            const maxSize = Math.max(...projects.map(p => p.size));

            tbody.innerHTML = filtered.map(project => {
                const percentage = (project.size / maxSize) * 100;
                let sizeClass = 'small';
                if (project.size > 500000) sizeClass = 'large';
                else if (project.size > 100000) sizeClass = 'medium';

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
                            ${project.historyCount}
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

        function renderMcpServers() {
            const container = document.getElementById('mcp-servers-list');
            const mcpServers = config.mcpServers || {};
            const serverNames = Object.keys(mcpServers);

            document.getElementById('mcp-badge').textContent = serverNames.length;

            if (serverNames.length === 0) {
                container.innerHTML = '<div class="no-data">Нет MCP серверов</div>';
                return;
            }

            container.innerHTML = serverNames.map(name => {
                const server = mcpServers[name];
                return `
                    <div class="mcp-server-card">
                        <div class="mcp-server-header">
                            <div class="mcp-server-name">🔌 ${escapeHtml(name)}</div>
                            <button class="danger small" onclick="deleteMcpServer('${escapeHtml(name)}')">Удалить</button>
                        </div>
                        <div class="mcp-server-info">
                            <div><strong>Command:</strong> ${escapeHtml(server.command || 'N/A')}</div>
                            ${server.args ? '<div><strong>Args:</strong> ' + JSON.stringify(server.args) + '</div>' : ''}
                            ${server.env ? '<div><strong>Env:</strong> ' + JSON.stringify(server.env) + '</div>' : ''}
                            ${server.cwd ? '<div><strong>CWD:</strong> ' + escapeHtml(server.cwd) + '</div>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderSettings() {
            const container = document.getElementById('settings-list');
            const settings = {
                'Theme': config.theme || 'light',
                'Auto Updates': config.autoUpdates ? 'Enabled' : 'Disabled',
                'Auto Compact': config.autoCompactEnabled ? 'Enabled' : 'Disabled',
                'Install Method': config.installMethod || 'N/A',
                'Number of Startups': config.numStartups || 0,
            };

            let html = '<table style="width: 100%;"><tbody>';
            for (const [key, value] of Object.entries(settings)) {
                html += `
                    <tr style="border-bottom: 1px solid #3e3e42;">
                        <td style="padding: 12px; font-weight: bold;">${key}</td>
                        <td style="padding: 12px; color: #858585;">${value}</td>
                    </tr>
                `;
            }
            html += '</tbody></table>';

            container.innerHTML = html;
        }

        function renderRawJson() {
            const container = document.getElementById('raw-json');
            container.textContent = JSON.stringify(config, null, 2);
        }

        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            event.target.classList.add('active');
            document.getElementById('tab-' + tabName).classList.add('active');
        }

        function toggleProject(path) {
            const project = projects.find(p => p.path === path);
            if (project) {
                project.selected = !project.selected;
                markChanged();
                renderProjects();
            }
        }

        function toggleAllProjects(checked) {
            const searchTerm = document.getElementById('projects-search').value.toLowerCase();
            const filtered = searchTerm
                ? projects.filter(p => p.path.toLowerCase().includes(searchTerm))
                : projects;

            filtered.forEach(p => p.selected = checked);
            markChanged();
            renderProjects();
        }

        function selectAllProjects() {
            document.getElementById('select-all-projects').checked = true;
            toggleAllProjects(true);
        }

        function deselectAllProjects() {
            document.getElementById('select-all-projects').checked = false;
            toggleAllProjects(false);
        }

        function selectLargestProjects() {
            deselectAllProjects();
            const sorted = [...projects].sort((a, b) => b.size - a.size);
            sorted.slice(0, 10).forEach(p => p.selected = true);
            markChanged();
            renderProjects();
        }

        function sortProjects(column) {
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

        function deleteSelectedProjects() {
            const selected = projects.filter(p => p.selected);
            if (selected.length === 0) {
                alert('Ничего не выбрано');
                return;
            }

            if (!confirm(`Удалить историю для ${selected.length} проектов?`)) return;

            selected.forEach(project => {
                delete config.projects[project.path];
            });

            projects = projects.filter(p => !p.selected);
            markChanged();
            renderAllTabs();

            showMessage(`Удалено ${selected.length} проектов.`, 'success');
        }

        function deleteMcpServer(name) {
            if (!confirm(`Удалить MCP сервер "${name}"?`)) return;

            delete config.mcpServers[name];
            markChanged();
            renderAllTabs();

            showMessage(`MCP сервер "${name}" удалён.`, 'success');
        }

        function addMcpServer() {
            const name = prompt('Имя MCP сервера:');
            if (!name) return;

            const command = prompt('Команда:');
            if (!command) return;

            if (!config.mcpServers) config.mcpServers = {};

            config.mcpServers[name] = {
                command: command,
                args: []
            };

            markChanged();
            renderAllTabs();
            showMessage(`MCP сервер "${name}" добавлен.`, 'success');
        }

        function markChanged() {
            hasChanges = true;
            document.getElementById('save-btn').disabled = false;
        }

        async function saveConfig() {
            const saveBtn = document.getElementById('save-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Сохранение...';

            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                const result = await response.json();

                if (result.success) {
                    hasChanges = false;
                    const now = new Date().toLocaleTimeString('ru-RU');
                    document.getElementById('last-save').textContent = now;
                    showMessage('✅ Конфиг сохранён! Перезапустите Claude Code.', 'success');
                    saveBtn.textContent = '💾 Сохранено';
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showMessage('Ошибка: ' + error.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Сохранить все изменения';
            }
        }

        function reloadConfig() {
            if (hasChanges && !confirm('Несохранённые изменения будут потеряны. Продолжить?')) {
                return;
            }
            location.reload();
        }

        function createBackup() {
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `claude-config-backup-${timestamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showMessage('Бэкап создан и скачан', 'success');
        }

        function copyRawJson() {
            const text = JSON.stringify(config, null, 2);
            navigator.clipboard.writeText(text);
            showMessage('JSON скопирован в буфер обмена', 'success');
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
        pass

def main():
    if not CLAUDE_CONFIG_PATH.exists():
        print(f"❌ Файл не найден: {CLAUDE_CONFIG_PATH}")
        return

    print("🚀 Claude Config Editor")
    print(f"📁 Конфиг: {CLAUDE_CONFIG_PATH}")
    print(f"🌐 http://localhost:{PORT}")
    print("\n✨ Откройте браузер")
    print("   Ctrl+C для остановки\n")

    with socketserver.TCPServer(("", PORT), ClaudeConfigHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Остановка...")

if __name__ == '__main__':
    main()
