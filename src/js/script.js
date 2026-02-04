document.addEventListener('DOMContentLoaded', () => {

    /* taskbar buttons */
    const terminalBtn = document.getElementById('btn-terminal');
    const explorerBtn = document.getElementById('btn-explorer');
    const welcomeBtn = document.getElementById('btn-welcome');

    /* clock logic */
    function updateClock() {
        const timeElement = document.getElementById('time');
        const dateElement = document.getElementById('date');
        const clockTray = document.getElementById('clock-tray');

        if (!timeElement || !dateElement) return;

        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        const dateOptions = { month: '2-digit', day: '2-digit', year: 'numeric' };
        const dateString = now.toLocaleDateString(undefined, dateOptions);

        timeElement.textContent = `${hours}:${minutes} ${ampm}`;
        dateElement.textContent = dateString;


        if (clockTray) {
            const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
            const monthName = now.toLocaleDateString('en-US', { month: 'long' });
            const dayNum = now.getDate();


            const ordinal = (n) => {
                const s = ["th", "st", "nd", "rd"];
                const v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]);
            };

            const fullDateText = `${dayName}, ${monthName} ${ordinal(dayNum)}`;
            clockTray.setAttribute('data-title', fullDateText);
        }


        const widgetHours = document.getElementById('widget-hours');
        const widgetMinutes = document.getElementById('widget-minutes');
        const widgetDate = document.getElementById('widget-date');

        if (widgetHours && widgetMinutes) {
            widgetHours.textContent = String(hours).padStart(2, '0');
            widgetMinutes.textContent = minutes;
        }

        if (widgetDate) {
            const widgetDateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
            widgetDate.textContent = now.toLocaleDateString(undefined, widgetDateOptions);
        }
    }

    updateClock();
    setInterval(updateClock, 1000);

    /* github api */
    const apiUrl1 = 'https://api.github.com/repos/Extravi/Installer/releases';
    const apiUrl2 = 'https://api.github.com/repos/Extravi/Bloxshade/releases';
    const apiUrl3 = 'https://api.github.com/repos/Extravi/bloxshade-args/releases';

    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }
        return await response.json();
    }

    function getReleaseDownloads(releases) {
        return releases.reduce((acc, release) => acc + release.assets.reduce((sum, asset) => sum + asset.download_count, 0), 0);
    }

    async function updateDownloadCounts() {
        const installerEl = document.getElementById('dl-installer');
        const bloxshadeEl = document.getElementById('dl-bloxshade');
        const argsEl = document.getElementById('dl-args');
        const totalEl = document.getElementById('dl-total');

        if (!installerEl || !bloxshadeEl || !argsEl || !totalEl) return;

        try {
            console.log('%cFetching GitHub download counts…', 'color:#d0bcff');
            const [releases1, releases2, releases3] = await Promise.all([
                fetchData(apiUrl1),
                fetchData(apiUrl2),
                fetchData(apiUrl3)
            ]);

            const count1 = getReleaseDownloads(releases1);
            const count2 = getReleaseDownloads(releases2);
            const count3 = getReleaseDownloads(releases3);
            const total = count1 + count2 + count3;

            installerEl.textContent = count1.toLocaleString();
            bloxshadeEl.textContent = count2.toLocaleString();
            argsEl.textContent = count3.toLocaleString();
            totalEl.textContent = total.toLocaleString();
        } catch (error) {
            console.error('Error fetching downloads:', error);
            installerEl.textContent = bloxshadeEl.textContent = argsEl.textContent = totalEl.textContent = '—';
        }
    }

    async function calculateTotalStarCount() {
        const starCountEl = document.getElementById('total-stars-count');
        if (!starCountEl) return;

        try {
            let page = 1;
            let totalStars = 0;

            while (true) {
                const response = await fetch(`https://api.github.com/users/Extravi/repos?per_page=100&page=${page}`);
                if (!response.ok) break;

                const data = await response.json();
                if (data.length === 0) break;

                totalStars += data.reduce((sum, repo) => sum + repo.stargazers_count, 0);
                if (data.length < 100) break;
                page++;
            }

            starCountEl.textContent = totalStars.toLocaleString();
        } catch (error) {
            console.error('Error fetching stars:', error);
            starCountEl.textContent = '—';
        }
    }

    updateDownloadCounts();
    calculateTotalStarCount();

    /* widget drag setup */
    setupDraggable('clock-widget');
    setupDraggable('downloads-widget');
    setupDraggable('music-widget');

    const musicWidget = document.getElementById('music-widget');
    if (musicWidget) {
        let startX, startY;
        musicWidget.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
        });
        musicWidget.addEventListener('click', (e) => {
            if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5) {
                window.open('https://www.youtube.com/watch?v=L7Hh8QxRpWY', '_blank');
            }
        });
    }

    let highestZ = 100;

    /* window management */
    const terminalWindow = document.getElementById('terminal-window');
    const closeBtn = document.getElementById('term-close');
    const minBtn = document.getElementById('term-min');
    const maxBtn = document.getElementById('term-max');
    const cmdInput = document.querySelector('.cmd-input');


    function openOrFocusWindow(windowEl, taskbarBtn) {
        if (!windowEl || !taskbarBtn) return;


        if (windowEl.style.display === 'none' || windowEl.classList.contains('terminal-minimized')) {
            windowEl.style.display = 'flex';
            taskbarBtn.classList.add('active');
            setTimeout(() => {
                windowEl.classList.remove('terminal-minimized');
            }, 10);

            highestZ++;
            windowEl.style.zIndex = highestZ;
        } else {

            highestZ++;
            windowEl.style.zIndex = highestZ;

        }
    }


    function handleTaskbarClick(windowEl, taskbarBtn) {
        if (!windowEl || !taskbarBtn) return;

        const isMinimized = windowEl.classList.contains('terminal-minimized') || windowEl.style.display === 'none';
        const isTopmost = parseInt(windowEl.style.zIndex) === highestZ;

        if (isMinimized) {

            windowEl.style.display = 'flex';
            taskbarBtn.classList.add('active');
            setTimeout(() => {
                windowEl.classList.remove('terminal-minimized');
            }, 10);
            highestZ++;
            windowEl.style.zIndex = highestZ;
        } else {

            if (isTopmost) {

                windowEl.classList.add('terminal-minimized');
                taskbarBtn.classList.remove('active');
                setTimeout(() => {
                    windowEl.style.display = 'none';
                }, 200);
            } else {

                highestZ++;
                windowEl.style.zIndex = highestZ;
            }
        }
    }

    if (terminalBtn && terminalWindow) {

        terminalBtn.addEventListener('click', () => {
            handleTaskbarClick(terminalWindow, terminalBtn);
            if (!terminalWindow.classList.contains('terminal-minimized')) {
                cmdInput.focus();
            }
        });


        closeBtn.addEventListener('click', () => {
            terminalWindow.classList.add('terminal-minimized');
            terminalBtn.classList.remove('active');
            setTimeout(() => {
                terminalWindow.style.display = 'none';
            }, 200);
        });


        minBtn.addEventListener('click', () => {
            terminalWindow.classList.add('terminal-minimized');
            terminalBtn.classList.remove('active');
            setTimeout(() => {
                terminalWindow.style.display = 'none';
            }, 200);
        });


        maxBtn.addEventListener('click', () => {
            if (terminalWindow.classList.contains('terminal-maximized')) {

                terminalWindow.classList.remove('terminal-maximized');

                if (terminalWindow.dataset.w) terminalWindow.style.width = terminalWindow.dataset.w;
                if (terminalWindow.dataset.h) terminalWindow.style.height = terminalWindow.dataset.h;
                if (terminalWindow.dataset.x) terminalWindow.style.left = terminalWindow.dataset.x;
                if (terminalWindow.dataset.y) terminalWindow.style.top = terminalWindow.dataset.y;
            } else {

                const rect = terminalWindow.getBoundingClientRect();
                terminalWindow.dataset.w = terminalWindow.style.width || rect.width + 'px';
                terminalWindow.dataset.h = terminalWindow.style.height || rect.height + 'px';
                terminalWindow.dataset.x = terminalWindow.style.left || rect.left + 'px';
                terminalWindow.dataset.y = terminalWindow.style.top || rect.top + 'px';


                terminalWindow.style.width = '';
                terminalWindow.style.height = '';
                terminalWindow.classList.add('terminal-maximized');
            }
        });


        document.querySelector('.terminal-content').addEventListener('click', () => {
            cmdInput.focus();
        });


        terminalWindow.addEventListener('mousedown', () => {
            highestZ++;
            terminalWindow.style.zIndex = highestZ;
        });


        setupDraggableWindow('terminal-window', 'terminal-header', 'term-max');

        setupResizableWindow('terminal-window');



        const explorerWindow = document.getElementById('explorer-window');
        const expCloseBtn = document.getElementById('exp-close');
        const expMinBtn = document.getElementById('exp-min');
        const expMaxBtn = document.getElementById('exp-max');

        if (explorerBtn && explorerWindow) {
            setupWindowControls(explorerBtn, explorerWindow, expCloseBtn, expMinBtn, expMaxBtn);
            setupDraggableWindow('explorer-window', 'explorer-header', 'exp-max');
            setupResizableWindow('explorer-window');
            fetchRepos();
        }



        const welcomeWindow = document.getElementById('welcome-window');
        const welcomeCloseBtn = document.getElementById('welcome-close');

        if (welcomeBtn && welcomeWindow) {

            const wx = Math.max(0, (window.innerWidth - 400) / 2);
            const wy = Math.max(0, (window.innerHeight - 600) / 2);
            welcomeWindow.style.left = `${wx}px`;
            welcomeWindow.style.top = `${wy}px`;


            welcomeWindow.style.display = 'flex';
            welcomeWindow.classList.add('terminal-minimized');
            welcomeBtn.classList.add('active');

            highestZ++;
            welcomeWindow.style.zIndex = highestZ;

            setTimeout(() => {
                welcomeWindow.classList.remove('terminal-minimized');
            }, 100);


            welcomeBtn.addEventListener('click', () => {
                handleTaskbarClick(welcomeWindow, welcomeBtn);
            });


            if (welcomeCloseBtn) {
                welcomeCloseBtn.addEventListener('click', () => {
                    welcomeWindow.classList.add('terminal-minimized');
                    welcomeBtn.classList.remove('active');
                    setTimeout(() => {
                        welcomeWindow.style.display = 'none';
                    }, 200);
                });
            }


            welcomeWindow.addEventListener('mousedown', () => {
                highestZ++;
                welcomeWindow.style.zIndex = highestZ;
            });


            setupDraggableWindow('welcome-window', 'welcome-header', null);
            setupResizableWindow('welcome-window');


            const welcomeExplorerBtn = document.getElementById('welcome-app-explorer');
            const welcomeTerminalBtn = document.getElementById('welcome-app-terminal');

            if (welcomeExplorerBtn && explorerBtn) {
                welcomeExplorerBtn.addEventListener('click', () => {
                    const explorerWindow = document.getElementById('explorer-window');
                    if (explorerWindow.style.display === 'none' || explorerWindow.classList.contains('terminal-minimized')) {
                        explorerBtn.click();
                    } else {
                        highestZ++;
                        explorerWindow.style.zIndex = highestZ;
                    }
                });
            }

            if (welcomeTerminalBtn && terminalBtn) {
                welcomeTerminalBtn.addEventListener('click', () => {
                    const terminalWindow = document.getElementById('terminal-window');
                    if (terminalWindow.style.display === 'none' || terminalWindow.classList.contains('terminal-minimized')) {
                        terminalBtn.click();
                    } else {
                        highestZ++;
                        terminalWindow.style.zIndex = highestZ;
                    }
                });
            }
        }
    }

    function setupWindowControls(taskbarBtn, windowEl, closeBtn, minBtn, maxBtn) {

        taskbarBtn.addEventListener('click', () => {
            handleTaskbarClick(windowEl, taskbarBtn);
        });


        closeBtn.addEventListener('click', () => {
            windowEl.classList.add('terminal-minimized');
            taskbarBtn.classList.remove('active');
            setTimeout(() => {
                windowEl.style.display = 'none';
            }, 200);
        });


        minBtn.addEventListener('click', () => {
            windowEl.classList.add('terminal-minimized');
            taskbarBtn.classList.remove('active');
            setTimeout(() => {
                windowEl.style.display = 'none';
            }, 200);
        });


        maxBtn.addEventListener('click', () => {
            if (windowEl.classList.contains('terminal-maximized')) {
                windowEl.classList.remove('terminal-maximized');
                if (windowEl.dataset.w) windowEl.style.width = windowEl.dataset.w;
                if (windowEl.dataset.h) windowEl.style.height = windowEl.dataset.h;
                if (windowEl.dataset.x) windowEl.style.left = windowEl.dataset.x;
                if (windowEl.dataset.y) windowEl.style.top = windowEl.dataset.y;
            } else {
                const rect = windowEl.getBoundingClientRect();
                windowEl.dataset.w = windowEl.style.width || rect.width + 'px';
                windowEl.dataset.h = windowEl.style.height || rect.height + 'px';
                windowEl.dataset.x = windowEl.style.left || rect.left + 'px';
                windowEl.dataset.y = windowEl.style.top || rect.top + 'px';

                windowEl.style.width = '';
                windowEl.style.height = '';
                windowEl.classList.add('terminal-maximized');
            }
        });


        windowEl.addEventListener('mousedown', () => {
            highestZ++;
            windowEl.style.zIndex = highestZ;
        });
    }

    /* repository fetching */
    async function fetchRepos() {
        const repoList = document.getElementById('repo-list');
        const searchInput = document.getElementById('repo-search');
        const countEl = document.getElementById('repo-count');
        const statusEl = document.getElementById('repo-status');

        if (!repoList) return;

        const langColors = {
            'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'HTML': '#e34c26', 'CSS': '#563d7c',
            'Python': '#3572A5', 'Java': '#b07219', 'C#': '#178600', 'C++': '#f34b7d',
            'Vue': '#41b883', 'React': '#61dafb', 'Dart': '#00B4AB', 'Shell': '#89e051',
            'Go': '#00ADD8', 'Ruby': '#701516', 'PHP': '#4F5D95'
        };

        let resizeHandlerAttached = false;
        let allRepos = [];

        function clampDescription(descEl) {
            if (!descEl) return;
            const fullText = descEl.dataset.fullDesc || descEl.textContent.trim();
            descEl.dataset.fullDesc = fullText;
            descEl.textContent = fullText;
            descEl.style.maxHeight = 'none';
            descEl.style.webkitLineClamp = 'unset';

            const computed = window.getComputedStyle(descEl);
            const lineHeight = parseFloat(computed.lineHeight) || 18;
            const maxLines = 3;
            const maxHeight = lineHeight * maxLines;

            if (descEl.scrollHeight <= maxHeight + 1) {
                descEl.style.maxHeight = `${maxHeight}px`;
                return;
            }

            let low = 0;
            let high = fullText.length;
            let best = '';

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const candidate = `${fullText.slice(0, mid).trimEnd()}…`;
                descEl.textContent = candidate;
                if (descEl.scrollHeight <= maxHeight + 1) {
                    best = candidate;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            descEl.textContent = best || `${fullText.slice(0, 1)}…`;
            descEl.style.maxHeight = `${maxHeight}px`;
        }

        function clampAllDescriptions() {
            const descEls = repoList.querySelectorAll('.repo-desc');
            descEls.forEach(descEl => {
                descEl.textContent = descEl.dataset.fullDesc || descEl.textContent;
                requestAnimationFrame(() => clampDescription(descEl));
            });
        }

        function render(repos) {
            repoList.innerHTML = '';
            repos.forEach(repo => {
                const langColor = langColors[repo.language] || '#8b949e';
                const date = new Date(repo.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const rawDesc = repo.description ? repo.description.trim() : 'No description provided.';

                const card = document.createElement('a');
                card.href = repo.html_url;
                card.target = "_blank";
                card.className = "repo-card";

                card.innerHTML = `
                    <div class="repo-name">
                        <span class="material-icons-round">book</span>
                        ${repo.name}
                    </div>
                    <div class="repo-desc"></div>
                    <div class="repo-stats">
                        <div class="stat-group">
                            <div class="stat-item tooltip" title="Language">
                                <span class="language-dot" style="background-color: ${langColor}"></span>
                                ${repo.language || 'Plain'}
                            </div>
                            <div class="stat-item tooltip" title="Last Updated">
                                <span class="material-icons-round" style="font-size:14px">update</span>
                                ${date}
                            </div>
                        </div>
                        <div class="stat-group">
                            <div class="stat-item tooltip" title="Stars">
                                <span class="material-icons-round">star_outline</span>
                                ${repo.stargazers_count}
                            </div>
                            <div class="stat-item tooltip" title="Forks">
                                <span class="material-icons-round">call_split</span>
                                ${repo.forks_count}
                            </div>
                        </div>
                    </div>
                `;
                repoList.appendChild(card);
                const descEl = card.querySelector('.repo-desc');
                if (descEl) {
                    descEl.textContent = rawDesc;
                    descEl.dataset.fullDesc = rawDesc;
                    requestAnimationFrame(() => clampDescription(descEl));
                }
            });


            requestAnimationFrame(() => clampAllDescriptions());
        }
        try {
            let page = 1;
            allRepos = [];

            if (statusEl) statusEl.textContent = "Fetching from GitHub...";

            while (true) {
                const response = await fetch(`https://api.github.com/users/Extravi/repos?per_page=100&page=${page}`);
                if (!response.ok) break;

                const data = await response.json();
                if (data.length === 0) break;

                allRepos = allRepos.concat(data);
                if (data.length < 100) break;
                page++;
            }


            allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);

            console.log(`%cFetched ${allRepos.length} repositories.`, 'color: #d0bcff; font-weight: bold;');

            if (countEl) countEl.textContent = `${allRepos.length} items`;
            if (statusEl) statusEl.textContent = "All repositories loaded";

            render(allRepos);

            if (!resizeHandlerAttached) {
                window.addEventListener('resize', clampAllDescriptions);
                resizeHandlerAttached = true;
            }


            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = allRepos.filter(repo =>
                        repo.name.toLowerCase().includes(term) ||
                        (repo.description && repo.description.toLowerCase().includes(term))
                    );
                    render(filtered);
                    if (countEl) countEl.textContent = `${filtered.length} items`;
                });
            }

        } catch (e) {
            repoList.innerHTML = '<div class="loading-container"><span class="material-icons-round" style="font-size: 48px; color: #ff5252;">error</span><div class="loading-text">Error loading repositories</div></div>';
            console.error(e);
            if (statusEl) statusEl.textContent = "Connection Error";
        }
    }

    /* window dragging */
    function setupDraggableWindow(elementId, handleId, maxButtonId) {
        const element = document.getElementById(elementId);
        const handle = document.getElementById(handleId);

        const snapLeft = document.getElementById('snap-preview-left');
        const snapRight = document.getElementById('snap-preview-right');
        const snapTop = document.getElementById('snap-preview-top');

        if (!element || !handle) return;

        let isDragging = false;
        let isMaximizedDrag = false;
        let startX, startY, initialLeft, initialTop;
        let snapType = null;

        handle.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);


        handle.addEventListener('dblclick', () => {
            if (!maxButtonId) return;
            const maxBtn = document.getElementById(maxButtonId);
            if (maxBtn) maxBtn.click();
        });

        function dragStart(e) {
            if (e.target.closest('.control-btn')) return;

            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            startX = e.clientX;
            startY = e.clientY;

            isDragging = true;
            isMaximizedDrag = element.classList.contains('terminal-maximized');

            element.classList.add('is-dragging');
            handle.style.cursor = 'grabbing';

            highestZ++;
            element.style.zIndex = highestZ;
        }

        function dragEnd() {
            if (!isDragging) return;
            isDragging = false;
            isMaximizedDrag = false;

            handle.style.cursor = 'default';


            if (snapLeft) snapLeft.classList.remove('visible');
            if (snapRight) snapRight.classList.remove('visible');
            if (snapTop) snapTop.classList.remove('visible');


            if (snapType) {

                element.classList.remove('is-dragging');


                void element.offsetWidth;

                if (snapType === 'left') {
                    element.style.top = '10px';
                    element.style.left = '10px';
                    element.style.width = 'calc(50% - 15px)';
                    element.style.height = 'calc(100vh - 70px)';
                    element.classList.remove('terminal-maximized');
                } else if (snapType === 'right') {
                    element.style.top = '10px';
                    element.style.left = 'calc(50% + 5px)';
                    element.style.width = 'calc(50% - 15px)';
                    element.style.height = 'calc(100vh - 70px)';
                    element.classList.remove('terminal-maximized');
                } else if (snapType === 'top') {

                    const rect = element.getBoundingClientRect();
                    element.dataset.w = element.style.width || rect.width + 'px';
                    element.dataset.h = element.style.height || rect.height + 'px';
                    element.dataset.x = element.style.left || rect.left + 'px';
                    element.dataset.y = element.style.top || rect.top + 'px';

                    element.classList.add('terminal-maximized');

                    element.style.top = '';
                    element.style.left = '';
                    element.style.width = '';
                    element.style.height = '';
                }
            } else {
                element.classList.remove('is-dragging');
            }
            snapType = null;
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;


            if (isMaximizedDrag) {

                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    isMaximizedDrag = false;
                    element.classList.remove('terminal-maximized');


                    if (element.dataset.w) element.style.width = element.dataset.w;
                    else element.style.width = '600px';

                    if (element.dataset.h) element.style.height = element.dataset.h;
                    else element.style.height = '400px';




                    const mouseRatio = startX / window.innerWidth;
                    const newWidth = parseFloat(element.style.width);








                    initialLeft = e.clientX - (newWidth * mouseRatio);
                    initialTop = e.clientY - 21;



                    startX = e.clientX;
                    startY = e.clientY;
                } else {
                    return;
                }
            }

            let newLeft = initialLeft + (e.clientX - startX);
            let newTop = initialTop + (e.clientY - startY);


            const taskbarHeight = 50;




            const windowW = window.innerWidth;
            const elementW = element.offsetWidth;


            const minLeft = -elementW * 0.5;
            const maxLeft = windowW - (elementW * 0.5);

            const minTop = 0;
            const maxTop = window.innerHeight - taskbarHeight - 50;

            if (newLeft < minLeft) newLeft = minLeft;
            if (newLeft > maxLeft) newLeft = maxLeft;
            if (newTop < minTop) newTop = minTop;
            if (newTop > maxTop) newTop = maxTop;

            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;



            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const screenW = window.innerWidth;
            const snapThreshold = 20;


            if (snapLeft) snapLeft.classList.remove('visible');
            if (snapRight) snapRight.classList.remove('visible');
            if (snapTop) snapTop.classList.remove('visible');
            snapType = null;

            if (mouseX < snapThreshold) {
                if (snapLeft) snapLeft.classList.add('visible');
                snapType = 'left';
            } else if (mouseX > screenW - snapThreshold) {
                if (snapRight) snapRight.classList.add('visible');
                snapType = 'right';
            } else if (mouseY < snapThreshold) {
                if (snapTop) snapTop.classList.add('visible');
                snapType = 'top';
            }
        }
    }

    function setupResizableWindow(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const resizers = element.querySelectorAll('.resizer');
        let isResizing = false;
        let currentResizer;
        let original_width;
        let original_height;
        let original_x;
        let original_y;
        let original_mouse_x;
        let original_mouse_y;

        for (const resizer of resizers) {
            resizer.addEventListener('mousedown', function (e) {
                if (element.classList.contains('terminal-maximized')) return;

                isResizing = true;
                currentResizer = resizer;
                original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
                original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
                original_x = element.offsetLeft;
                original_y = element.offsetTop;
                original_mouse_x = e.pageX;
                original_mouse_y = e.pageY;

                element.classList.add('is-dragging');

                e.preventDefault();
                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
            });
        }

        function resize(e) {
            if (!isResizing) return;

            const dx = e.pageX - original_mouse_x;
            const dy = e.pageY - original_mouse_y;

            let newWidth = original_width;
            let newHeight = original_height;
            let newLeft = original_x;
            let newTop = original_y;


            const minW = 200;
            const minH = 150;

            if (currentResizer.classList.contains('bottom-right')) {
                newWidth = original_width + dx;
                newHeight = original_height + dy;
            } else if (currentResizer.classList.contains('bottom-left')) {
                newWidth = original_width - dx;
                newHeight = original_height + dy;
                newLeft = original_x + dx;
            } else if (currentResizer.classList.contains('top-right')) {
                newWidth = original_width + dx;
                newHeight = original_height - dy;
                newTop = original_y + dy;
            } else if (currentResizer.classList.contains('top-left')) {
                newWidth = original_width - dx;
                newHeight = original_height - dy;
                newLeft = original_x + dx;
                newTop = original_y + dy;
            } else if (currentResizer.classList.contains('bottom')) {
                newHeight = original_height + dy;
            } else if (currentResizer.classList.contains('right')) {
                newWidth = original_width + dx;
            } else if (currentResizer.classList.contains('top')) {
                newHeight = original_height - dy;
                newTop = original_y + dy;
            } else if (currentResizer.classList.contains('left')) {
                newWidth = original_width - dx;
                newLeft = original_x + dx;
            }


            if (newWidth >= minW) {
                element.style.width = newWidth + 'px';
                if (currentResizer.classList.contains('left') || currentResizer.classList.contains('top-left') || currentResizer.classList.contains('bottom-left')) {
                    element.style.left = newLeft + 'px';
                }
            }

            if (newHeight >= minH) {
                element.style.height = newHeight + 'px';
                if (currentResizer.classList.contains('top') || currentResizer.classList.contains('top-left') || currentResizer.classList.contains('top-right')) {
                    element.style.top = newTop + 'px';
                }
            }
        }

        function stopResize() {
            isResizing = false;
            element.classList.remove('is-dragging');
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
    }

    function setupDraggable(id) {
        const widget = document.getElementById(id);
        if (!widget) return;

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        widget.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === widget || widget.contains(e.target)) {
                isDragging = true;
                highestZ++;
                widget.style.zIndex = highestZ;
            }
        }

        function dragEnd(e) {
            isDragging = false;
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                let newX = e.clientX - initialX;
                let newY = e.clientY - initialY;

                const layoutLeft = widget.offsetLeft;
                const layoutTop = widget.offsetTop;
                const width = widget.offsetWidth;
                const height = widget.offsetHeight;

                const taskbarHeight = 50;

                const minX = -layoutLeft;
                const maxX = window.innerWidth - width - layoutLeft;
                const minY = -layoutTop;
                const maxY = window.innerHeight - taskbarHeight - height - layoutTop;

                currentX = Math.min(Math.max(newX, minX), maxX);
                currentY = Math.min(Math.max(newY, minY), maxY);

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, widget);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }
    }


    function setupDesktopSelection() {
        let isSelecting = false;
        let startX, startY;
        const selectionBox = document.createElement('div');
        selectionBox.className = 'selection-box';
        document.body.appendChild(selectionBox);

        document.addEventListener('mousedown', (e) => {





            if (e.target.closest('.terminal-window') ||
                e.target.closest('.taskbar') ||
                e.target.closest('.material-widget') ||
                e.target.closest('button') ||
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'A') {
                return;
            }


            if (e.button !== 0) return;

            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;


            selectionBox.style.left = `${startX}px`;
            selectionBox.style.top = `${startY}px`;
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
            selectionBox.classList.remove('fading-out');




        });

        document.addEventListener('mousemove', (e) => {
            if (!isSelecting) return;

            if (!selectionBox.classList.contains('visible')) {

                if (Math.abs(e.clientX - startX) > 2 || Math.abs(e.clientY - startY) > 2) {
                    selectionBox.classList.add('visible');
                } else {
                    return;
                }
            }

            const currentX = e.clientX;
            const currentY = e.clientY;

            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            selectionBox.style.left = `${left}px`;
            selectionBox.style.top = `${top}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isSelecting) {
                isSelecting = false;
                if (selectionBox.classList.contains('visible')) {
                    selectionBox.classList.add('fading-out');
                    setTimeout(() => {

                        if (!isSelecting) {
                            selectionBox.classList.remove('visible');
                            selectionBox.classList.remove('fading-out');
                        }
                    }, 200);
                }
            }
        });
    }

    setupDesktopSelection();


    function setupTooltips() {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        document.body.appendChild(tooltip);



        const targets = document.querySelectorAll('.menu-button, .tray-button, .control-btn');

        targets.forEach(el => {


            if (el.hasAttribute('title')) {
                const title = el.getAttribute('title');
                el.setAttribute('data-title', title);
                el.removeAttribute('title');
            }

            el.addEventListener('mouseenter', (e) => {
                const text = el.getAttribute('data-title');
                if (!text) return;

                tooltip.textContent = text;
                tooltip.classList.add('visible');

                const rect = el.getBoundingClientRect();
                const tipRect = tooltip.getBoundingClientRect();


                let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

                let top = rect.top - tipRect.height - 10;


                if (left < 10) left = 10;
                if (left + tipRect.width > window.innerWidth - 10) left = window.innerWidth - tipRect.width - 10;




                if (top < 10) {
                    top = rect.bottom + 10;
                }

                tooltip.style.left = `${left}px`;
                tooltip.style.top = `${top}px`;
            });

            el.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
            });
        });
    }
    setupTooltips();


    const startBtn = document.getElementById('btn-start');
    const startMenu = document.getElementById('start-menu');
    setupFloatingMenu(startBtn, startMenu);


    const startExplorer = document.getElementById('start-explorer');
    const startTerminal = document.getElementById('start-terminal');
    const startWelcome = document.getElementById('start-welcome');

    if (startExplorer && explorerBtn) {
        startExplorer.addEventListener('click', () => {

            const explorerWindow = document.getElementById('explorer-window');
            if (explorerWindow) {
                openOrFocusWindow(explorerWindow, explorerBtn);
            }
            toggleMenu(startMenu, startBtn, false);
        });
    }

    if (startTerminal && terminalBtn) {
        startTerminal.addEventListener('click', () => {
            const terminalWindow = document.getElementById('terminal-window');
            if (terminalWindow) {
                openOrFocusWindow(terminalWindow, terminalBtn);
            }
            toggleMenu(startMenu, startBtn, false);
        });
    }

    if (startWelcome && welcomeBtn) {
        startWelcome.addEventListener('click', () => {
            const welcomeWindow = document.getElementById('welcome-window');
            if (welcomeWindow) {
                openOrFocusWindow(welcomeWindow, welcomeBtn);
            }
            toggleMenu(startMenu, startBtn, false);
        });
    }


    const startSearchInput = startMenu.querySelector('.start-search input');
    if (startSearchInput) {
        startSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const pinnedItems = startMenu.querySelectorAll('.pinned-item');

            pinnedItems.forEach(item => {
                const name = item.querySelector('span:last-child').textContent.toLowerCase();
                if (name.includes(term)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }


    const dashboardBtn = document.getElementById('btn-dashboard');
    const notifCenter = document.getElementById('notification-center');
    setupFloatingMenu(dashboardBtn, notifCenter);



    function setupFloatingMenu(triggerBtn, menuEl) {
        if (!triggerBtn || !menuEl) return;

        triggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isVisible = menuEl.classList.contains('visible');
            toggleMenu(menuEl, triggerBtn, !isVisible);
        });


        document.addEventListener('click', (e) => {
            if (menuEl.classList.contains('visible') &&
                !menuEl.contains(e.target) &&
                e.target !== triggerBtn &&
                !triggerBtn.contains(e.target)) {
                toggleMenu(menuEl, triggerBtn, false);
            }
        });
    }

    function toggleMenu(menuEl, triggerBtn, show) {
        if (show) {
            menuEl.style.display = 'flex';

            void menuEl.offsetWidth;
            menuEl.classList.add('visible');
            triggerBtn.classList.add('active');

            highestZ++;

            if (menuEl.id === 'start-menu' || menuEl.id === 'notification-center') {
                menuEl.style.zIndex = 9999;
            } else {
                menuEl.style.zIndex = highestZ + 10;
            }
        } else {
            menuEl.classList.remove('visible');
            triggerBtn.classList.remove('active');
            setTimeout(() => {
                if (!menuEl.classList.contains('visible')) {
                    menuEl.style.display = 'none';
                }
            }, 200);
        }
    }


    const showDesktopBtn = document.getElementById('btn-show-desktop');
    let windowsHidden = false;
    let hiddenWindows = [];

    if (showDesktopBtn) {
        showDesktopBtn.addEventListener('click', () => {
            const allWindows = document.querySelectorAll('.terminal-window');

            if (!windowsHidden) {

                hiddenWindows = [];
                allWindows.forEach(win => {
                    if (win.style.display !== 'none' && !win.classList.contains('terminal-minimized')) {
                        hiddenWindows.push(win);


                        win.classList.add('terminal-minimized');



                        if (win.id === 'terminal-window') terminalBtn.classList.remove('active');
                        if (win.id === 'explorer-window') explorerBtn.classList.remove('active');
                        if (win.id === 'welcome-window') welcomeBtn.classList.remove('active');

                        setTimeout(() => {
                            if (windowsHidden) win.style.display = 'none';
                        }, 200);
                    }
                });
                windowsHidden = true;
            } else {




                hiddenWindows.forEach(win => {
                    win.style.display = 'flex';

                    setTimeout(() => {
                        win.classList.remove('terminal-minimized');
                    }, 10);

                    highestZ++;
                    win.style.zIndex = highestZ;


                    if (win.id === 'terminal-window') terminalBtn.classList.add('active');
                    if (win.id === 'explorer-window') explorerBtn.classList.add('active');
                    if (win.id === 'welcome-window') welcomeBtn.classList.add('active');
                });

                windowsHidden = false;
                hiddenWindows = [];
            }
        });
    }

    window.addEventListener('load', () => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 800);
            }, 500);
        }
    });

});