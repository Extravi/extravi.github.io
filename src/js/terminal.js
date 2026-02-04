document.addEventListener('DOMContentLoaded', () => {
    const terminalContent = document.querySelector('.terminal-content');
    const cmdInput = document.querySelector('.cmd-input');
    const terminalWindow = document.getElementById('terminal-window');

    if (!terminalContent || !cmdInput) return;

    /* mock file system */
    const fileSystem = {
        '~': {
            type: 'dir',
            children: {
                'projects': {
                    type: 'dir',
                    children: {
                        'website.html': { type: 'file', content: 'You are looking at it!' }
                    }
                },
                'contact': { type: 'file', content: 'dante@extravi.dev' }
            }
        }
    };

    let currentPath = ['~'];
    let commandHistory = [];
    let historyIndex = -1;

    /* event listeners */
    terminalContent.addEventListener('click', () => {
        cmdInput.focus();
    });

    cmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = cmdInput.value;
            processCommand(command);
            cmdInput.value = '';
            scrollToBottom();


            if (command.trim() !== '') {
                commandHistory.push(command);
                historyIndex = commandHistory.length;
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                cmdInput.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                cmdInput.value = commandHistory[historyIndex];
            } else {
                historyIndex = commandHistory.length;
                cmdInput.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleTabCompletion();
        }
    });

    const availableCommands = [
        'help', 'ls', 'cd', 'cat', 'clear',
        'pwd', 'whoami', 'date', 'echo',
        'reboot', 'exit'
    ];

    /* tab completion */
    function handleTabCompletion() {
        const rawInput = cmdInput.value;
        const parts = rawInput.split(' ');
        const lastWord = parts[parts.length - 1];


        if (parts.length === 1) {
            const matches = availableCommands.filter(cmd => cmd.startsWith(lastWord));
            if (matches.length === 1) {
                cmdInput.value = matches[0] + ' ';
            }
        }

        else {
            const currentDirObj = getDirObject(currentPath);
            if (currentDirObj && currentDirObj.children) {
                const files = Object.keys(currentDirObj.children);
                const matches = files.filter(f => f.startsWith(lastWord));

                if (matches.length === 1) {
                    const match = matches[0];
                    const isDir = currentDirObj.children[match].type === 'dir';


                    parts[parts.length - 1] = match + (isDir ? '/' : '');
                    cmdInput.value = parts.join(' ');
                }
            }
        }
    }

    /* command processing */
    function processCommand(cmdRaw) {
        const cmd = cmdRaw.trim();


        const historyLine = document.createElement('div');
        historyLine.className = 'history-line';
        historyLine.innerHTML = `
            <span class="prompt">${getPrompt()}</span>
            <span class="command-text">${escapeHtml(cmd)}</span>
        `;
        terminalContent.insertBefore(historyLine, cmdInput.parentElement);

        if (cmd === '') return;

        const args = cmd.split(/\s+/);
        const commandName = args[0].toLowerCase();
        const cmdArgs = args.slice(1);


        let output = '';

        switch (commandName) {
            case 'help':
                output = formatOutput(`
Available commands:
  <span class="cmd-help">help</span>     - Show this help message
  <span class="cmd-help">ls</span>       - List directory contents
  <span class="cmd-help">cd</span>       - Change directory
  <span class="cmd-help">cat</span>      - Print file content
  <span class="cmd-help">clear</span>    - Clear terminal screen
  <span class="cmd-help">pwd</span>      - Print working directory
  <span class="cmd-help">whoami</span>   - Print current user
  <span class="cmd-help">date</span>     - Print current date/time
  <span class="cmd-help">echo</span>     - Print arguments
                `);
                break;
            case 'clear':

                const lines = terminalContent.querySelectorAll('.history-line, .output-block');
                lines.forEach(line => line.remove());
                return;
            case 'ls':
                output = listDirectory(cmdArgs);
                break;
            case 'cd':
                output = changeDirectory(cmdArgs);
                break;
            case 'cat':
                output = catFile(cmdArgs);
                break;
            case 'pwd':
                output = formatOutput(getCurrentPathString());
                break;
            case 'whoami':
                output = formatOutput('dante');
                break;
            case 'date':
                output = formatOutput(new Date().toString());
                break;
            case 'echo':
                output = formatOutput(cmdArgs.join(' '));
                break;
            case 'reboot':
                location.reload();
                break;
            case 'exit':
                const closeBtn = document.getElementById('term-close');
                if (closeBtn) {
                    closeBtn.click();
                } else if (terminalWindow) {
                    terminalWindow.style.display = 'none';
                }
                break;
            default:
                output = formatOutput(`command not found: ${commandName}`, 'error');
        }

        if (output) {
            const outputBlock = document.createElement('div');
            outputBlock.className = 'output-block';
            outputBlock.innerHTML = output;
            terminalContent.insertBefore(outputBlock, cmdInput.parentElement);
        }
    }

    function getPrompt() {
        return `dante@extravi.dev:${getCurrentPathString()}$`;
    }

    function getCurrentPathString() {
        if (currentPath.length === 1) return '~';
        return '~/' + currentPath.slice(1).join('/');
    }

    function resolvePath(pathStr) {


        let tempPath = [...currentPath];
        if (pathStr === '/') {

            return ['~'];
        }
        if (pathStr.startsWith('/')) {


            return null;
        }

        const parts = pathStr.split('/');
        for (const part of parts) {
            if (part === '' || part === '.') continue;
            if (part === '..') {
                if (tempPath.length > 1) tempPath.pop();
            } else if (part === '~') {
                tempPath = ['~'];
            } else {
                tempPath.push(part);
            }
        }
        return tempPath;
    }

    function getDirObject(pathArr) {
        let current = fileSystem['~'];
        for (let i = 1; i < pathArr.length; i++) {
            const part = pathArr[i];
            if (current.children && current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        return current;
    }

    function listDirectory(args) {
        const targetPath = args.length > 0 ? resolvePath(args[0]) : currentPath;
        if (!targetPath) return formatOutput(`ls: cannot access '${args[0]}': No such file or directory`, 'error');

        const dirObj = getDirObject(targetPath);

        if (!dirObj || dirObj.type !== 'dir') {
            return formatOutput(`ls: cannot access '${args[0] || ''}': Not a directory`, 'error');
        }

        const items = Object.entries(dirObj.children).map(([name, data]) => {
            const isDir = data.type === 'dir';
            return `<span class="${isDir ? 'dir-name' : 'file-name'}">${name}${isDir ? '/' : ''}</span>`;
        });
        return formatOutput(items.join('  '));
    }

    function changeDirectory(args) {
        if (args.length === 0) {
            currentPath = ['~'];
            updatePrompt();
            return '';
        }

        const newPath = resolvePath(args[0]);
        const targetDir = getDirObject(newPath);

        if (targetDir && targetDir.type === 'dir') {
            currentPath = newPath;
            updatePrompt();
            return '';
        } else {
            return formatOutput(`cd: ${args[0]}: No such file or directory`, 'error');
        }
    }

    function catFile(args) {
        if (args.length === 0) return formatOutput('cat: missing operand', 'error');

        const parts = args[0].split('/');
        const fileName = parts.pop();

        const currentDirObj = getDirObject(currentPath);
        if (currentDirObj.children[fileName]) {
            const file = currentDirObj.children[fileName];
            if (file.type === 'file') {
                return formatOutput(file.content.replace(/\n/g, '<br>'));
            } else {
                return formatOutput(`cat: ${fileName}: Is a directory`, 'error');
            }
        } else {
            return formatOutput(`cat: ${fileName}: No such file or directory`, 'error');
        }
    }

    function updatePrompt() {
        const promptSpan = document.querySelector('.input-line .prompt');
        if (promptSpan) {
            promptSpan.textContent = getPrompt();
        }
    }

    function formatOutput(text, type = '') {
        return `<div class="term-msg ${type}">${text}</div>`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function scrollToBottom() {
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }
});