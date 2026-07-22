// 游戏配置
const CONFIG = {
    CANVAS_SIZE: 400,
    GRID_SIZE: 20,
    INITIAL_SPEED: 60,        // 初始速度：60毫秒（起步较慢）
    SPEED_INCREMENT: 5,
    MIN_SPEED: 40,            // 最快速度：40毫秒（速度上限）
    AI_ENABLED: true,
    AI_REACTION_DELAY: 50,    // AI反应延迟（毫秒）- 更快的反应速度
    INITIAL_POINTS: 100,      // 初始积分
    MAX_OFFLINE_POINTS: 100,  // 离线最多获得100积分
    OFFLINE_GAIN_RATE: 10000, // 离线获得积分间隔（10秒=10000毫秒）
    OFFLINE_GAIN_AMOUNT: 1,   // 每次离线获得的积分
    FOOD_SPAWN_INTERVAL: 15000, // 额外食物刷新间隔（15秒=15000毫秒）
    SPEED_BOOST_PER_10_POINTS: 0.01 // 每10积分提升1%速度（减少1%的移动间隔）
};

// 蛇的配置
const SNAKE_CONFIG = [
    { name: '沫桐', color: '#2ecc71', lightColor: '#4cd137', borderColor: '#27ae60' },
    { name: '童谣', color: '#3498db', lightColor: '#5dade2', borderColor: '#2980b9' },
    { name: '斌飞', color: '#e74c3c', lightColor: '#ec7063', borderColor: '#c0392b' },
    { name: '曹', color: '#f39c12', lightColor: '#f8c471', borderColor: '#d68910' }
];

// 食物类型（使用emoji作为图标）
const FOOD_TYPES = [
    '🍎', '🍊', '🍋', '🍌', '🍉',
    '🍇', '🍓', '🫐', '🍑', '🥭',
    '🍍', '🥥', '🥝', '🍒', '🍈'
];

// 游戏状态
const GAME_STATE = {
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

// 方向常量
const DIRECTION = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridCount = CONFIG.CANVAS_SIZE / CONFIG.GRID_SIZE;

        // DOM 元素
        this.scoreElements = {
            '沫桐': document.getElementById('score1'),
            '童谣': document.getElementById('score2'),
            '斌飞': document.getElementById('score3'),
            '曹': document.getElementById('score4')
        };
        this.highScoreElement = document.getElementById('highScore');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.pointsElement = document.getElementById('playerPoints');
        this.betAmountInput = document.getElementById('betAmount');
        this.betButtons = document.querySelectorAll('.bet-btn');

        // 游戏变量
        this.snakes = [];  // 所有蛇的数组
        this.scores = {};  // 各蛇得分
        this.alive = {};   // 各蛇存活状态
        this.foods = [];   // 食物数组（支持多个食物）
        this.highScore = this.loadHighScore();
        this.gameState = GAME_STATE.READY;
        this.gameLoop = null;
        this.foodSpawnTimer = null;  // 食物刷新定时器
        this.gameStartTime = 0;      // 游戏开始时间
        this.speed = CONFIG.INITIAL_SPEED;

        // 积分系统
        this.playerPoints = this.loadPlayerPoints();
        this.lastOnlineTime = this.loadLastOnlineTime();
        this.betSnake = null;       // 下注的蛇
        this.betAmount = 0;         // 下注金额

        // 排行榜系统
        this.winRecords = this.loadWinRecords();
        this.totalGames = this.loadTotalGames();

        // 食物图片
        this.currentFoodEmoji = this.getRandomFood();

        this.init();
    }

    getRandomFood() {
        return FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
    }

    init() {
        this.setupEventListeners();
        this.updateHighScore();
        this.calculateOfflinePoints();
        this.updatePlayerPoints();
        this.updateLeaderboard();
        this.drawWelcomeScreen();
    }

    setupEventListeners() {
        // 按钮事件
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resetBtn.addEventListener('click', () => this.resetGame());

        // 下注按钮事件
        this.betButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleBet(e.target.dataset.snake));
        });

        // 键盘事件（空格键暂停）
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                if (this.gameState === GAME_STATE.PLAYING || this.gameState === GAME_STATE.PAUSED) {
                    this.togglePause();
                    e.preventDefault();
                }
            }
        });
    }

    handleBet(snakeName) {
        if (this.gameState !== GAME_STATE.READY) {
            alert('请等待游戏结束后再下注！');
            return;
        }

        const betAmount = parseInt(this.betAmountInput.value);

        // 验证下注金额
        if (isNaN(betAmount) || betAmount <= 0) {
            alert('请输入有效的下注金额！');
            return;
        }

        if (betAmount > this.playerPoints) {
            alert(`积分不足！你当前有 ${this.playerPoints} 积分。`);
            return;
        }

        // 设置下注
        this.betSnake = snakeName;
        this.betAmount = betAmount;

        // 更新UI
        this.updateBetDisplay();
        alert(`已下注 ${betAmount} 积分支持 ${snakeName}！\n如果 ${snakeName} 获胜，你将获得 ${betAmount * 3} 积分！`);
    }

    startGame() {
        // 检查是否有下注
        if (!this.betSnake || this.betAmount <= 0) {
            alert('请先选择一条蛇并下注！');
            return;
        }

        // 扣除下注积分
        this.playerPoints -= this.betAmount;
        this.savePlayerPoints();
        this.updatePlayerPoints();

        this.gameState = GAME_STATE.PLAYING;
        this.speed = CONFIG.INITIAL_SPEED;
        this.gameStartTime = Date.now();  // 记录游戏开始时间
        this.snakes = [];
        this.scores = {};
        this.alive = {};
        this.foods = [];  // 清空食物数组

        // 初始化4条蛇的位置（四个角落）
        const positions = [
            { x: 3, y: 3, direction: DIRECTION.RIGHT },      // 左上角 - 沫同
            { x: this.gridCount - 4, y: 3, direction: DIRECTION.LEFT },      // 右上角 - 童谣
            { x: 3, y: this.gridCount - 4, direction: DIRECTION.RIGHT },     // 左下角 - 斌飞
            { x: this.gridCount - 4, y: this.gridCount - 4, direction: DIRECTION.LEFT }  // 右下角 - 曹
        ];

        SNAKE_CONFIG.forEach((config, index) => {
            const pos = positions[index];
            const dirX = pos.direction.x;
            const dirY = pos.direction.y;

            // 获取蛇名字的最后一个字
            const displayChar = config.name[config.name.length - 1];

            this.snakes.push({
                name: config.name,
                color: config.color,
                lightColor: config.lightColor,
                borderColor: config.borderColor,
                displayChar: displayChar,  // 存储显示字符
                segments: [
                    { x: pos.x, y: pos.y },
                    { x: pos.x - dirX, y: pos.y - dirY },
                    { x: pos.x - dirX * 2, y: pos.y - dirY * 2 }
                ],
                direction: pos.direction,
                lastMoveTime: Date.now()
            });

            this.scores[config.name] = 0;
            this.alive[config.name] = true;
        });

        // 生成第一个食物
        this.generateFood();

        // 启动食物刷新定时器（每15秒生成一个新食物）
        this.startFoodSpawnTimer();

        this.updateAllScores();
        this.updateButtons();
        this.startGameLoop();
    }

    startGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }

    startFoodSpawnTimer() {
        // 清除旧的定时器
        if (this.foodSpawnTimer) {
            clearInterval(this.foodSpawnTimer);
        }
        // 每15秒生成食物
        this.foodSpawnTimer = setInterval(() => {
            if (this.gameState === GAME_STATE.PLAYING) {
                const elapsedTime = Date.now() - this.gameStartTime;
                // 游戏开始15秒后，每次刷新2个食物；之前刷新1个
                const foodCount = elapsedTime >= 15000 ? 2 : 1;
                for (let i = 0; i < foodCount; i++) {
                    this.generateFood();
                }
            }
        }, CONFIG.FOOD_SPAWN_INTERVAL);
    }

    stopFoodSpawnTimer() {
        if (this.foodSpawnTimer) {
            clearInterval(this.foodSpawnTimer);
            this.foodSpawnTimer = null;
        }
    }

    update() {
        if (this.gameState !== GAME_STATE.PLAYING) {
            return;
        }

        const currentTime = Date.now();
        let gameOver = false;
        let winner = null;

        // 更新每条蛇
        this.snakes.forEach((snake, index) => {
            if (!this.alive[snake.name]) {
                return;  // 已死亡的蛇跳过
            }

            // 计算这条蛇的移动间隔（基于得分）
            const snakeScore = this.scores[snake.name] || 0;
            const speedBoost = Math.floor(snakeScore / 10) * CONFIG.SPEED_BOOST_PER_10_POINTS;
            const snakeSpeed = Math.max(CONFIG.MIN_SPEED, CONFIG.INITIAL_SPEED * (1 - speedBoost));

            // 检查这条蛇是否应该移动
            const timeSinceLastMove = currentTime - snake.lastMoveTime;
            if (timeSinceLastMove < snakeSpeed) {
                return;  // 还没到移动时间
            }

            snake.lastMoveTime = currentTime;

            // AI决策
            const head = snake.segments[0];
            const nextDirection = this.getAINextDirection(snake, head);
            if (nextDirection) {
                snake.direction = nextDirection;
            }

            // 计算新头部位置
            const newHead = {
                x: head.x + snake.direction.x,
                y: head.y + snake.direction.y
            };

            // 检查碰撞
            if (this.checkWallCollision(newHead) || this.checkSnakeCollision(newHead, snake.segments) || this.checkAllSnakesCollision(newHead, index)) {
                this.alive[snake.name] = false;
                return;
            }

            // 添加新头部
            snake.segments.unshift(newHead);

            // 检查是否吃到食物
            let ateFood = false;
            for (let i = this.foods.length - 1; i >= 0; i--) {
                const food = this.foods[i];
                if (newHead.x === food.x && newHead.y === food.y) {
                    this.scores[snake.name] += 10;
                    this.updateAllScores();
                    this.foods.splice(i, 1);  // 移除被吃掉的食物
                    this.generateFood();  // 立即生成新食物
                    ateFood = true;
                    // 速度提升现在由得分自动计算，不需要全局加速
                    break;
                }
            }

            if (!ateFood) {
                snake.segments.pop();
            }
        });

        // 检查游戏是否结束
        const aliveSnakes = this.snakes.filter(snake => this.alive[snake.name]);
        if (aliveSnakes.length <= 1) {
            if (aliveSnakes.length === 1) {
                winner = aliveSnakes[0].name;
            } else {
                winner = '平局';
            }
            this.gameOver(winner);
            return;
        }

        this.draw();
    }

    checkWallCollision(position) {
        // 检查墙壁碰撞
        return position.x < 0 || position.x >= this.gridCount ||
               position.y < 0 || position.y >= this.gridCount;
    }

    checkSnakeCollision(position, segments) {
        // 检查与自己身体的碰撞
        return segments.some(segment =>
            segment.x === position.x && segment.y === position.y
        );
    }

    checkAllSnakesCollision(position, excludeIndex) {
        // 检查与其他蛇的碰撞
        return this.snakes.some((snake, index) => {
            if (index === excludeIndex || !this.alive[snake.name]) {
                return false;
            }
            return snake.segments.some(segment =>
                segment.x === position.x && segment.y === position.y
            );
        });
    }

    getAINextDirection(snake, head) {
        // 找到最近的食物
        let closestFood = null;
        let minDistance = Infinity;

        this.foods.forEach(food => {
            const distance = Math.abs(head.x - food.x) + Math.abs(head.y - food.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestFood = food;
            }
        });

        // AI决策：计算到最近食物的方向并避免即死
        const possibleDirections = [
            DIRECTION.UP,
            DIRECTION.DOWN,
            DIRECTION.LEFT,
            DIRECTION.RIGHT
        ];

        // 过滤掉反方向
        const validDirections = possibleDirections.filter(dir => {
            return !(dir.x === -snake.direction.x && dir.y === -snake.direction.y);
        });

        // 评分每个方向
        const scoredDirections = validDirections.map(dir => {
            const nextPos = {
                x: head.x + dir.x,
                y: head.y + dir.y
            };

            // 检查是否会立即碰撞
            if (this.checkWallCollision(nextPos) ||
                this.checkSnakeCollision(nextPos, snake.segments) ||
                this.checkAllSnakesCollision(nextPos, this.snakes.indexOf(snake))) {
                return { dir, score: -1000 };
            }

            // 如果有食物，计算到最近食物的曼哈顿距离
            if (closestFood) {
                const distanceToFood = Math.abs(nextPos.x - closestFood.x) +
                                       Math.abs(nextPos.y - closestFood.y);
                return { dir, score: -distanceToFood };
            } else {
                // 如果没有食物，倾向于向中心移动
                const centerX = Math.floor(this.gridCount / 2);
                const centerY = Math.floor(this.gridCount / 2);
                const distanceToCenter = Math.abs(nextPos.x - centerX) +
                                        Math.abs(nextPos.y - centerY);
                return { dir, score: -distanceToCenter };
            }
        });

        // 选择得分最高的方向
        scoredDirections.sort((a, b) => b.score - a.score);

        // 返回得分最高且安全的方向，如果都不安全则返回得分最高的
        return scoredDirections[0] ? scoredDirections[0].dir : snake.direction;
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.gridCount),
                y: Math.floor(Math.random() * this.gridCount),
                emoji: this.getRandomFood()
            };
        } while (
            // 检查是否与蛇身重叠
            this.snakes.some(snake =>
                snake.segments.some(segment =>
                    segment.x === newFood.x && segment.y === newFood.y
                )
            ) ||
            // 检查是否与其他食物重叠
            this.foods.some(food =>
                food.x === newFood.x && food.y === newFood.y
            )
        );

        this.foods.push(newFood);
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

        // 绘制网格
        this.drawGrid();

        // 绘制所有蛇
        this.snakes.forEach(snake => {
            if (!this.alive[snake.name]) {
                return;  // 死亡的蛇不绘制
            }

            snake.segments.forEach((segment, index) => {
                // 绘制背景
                this.ctx.fillStyle = index === 0 ? snake.color : snake.lightColor;
                this.ctx.strokeStyle = snake.borderColor;
                this.ctx.fillRect(
                    segment.x * CONFIG.GRID_SIZE + 1,
                    segment.y * CONFIG.GRID_SIZE + 1,
                    CONFIG.GRID_SIZE - 2,
                    CONFIG.GRID_SIZE - 2
                );
                this.ctx.strokeRect(
                    segment.x * CONFIG.GRID_SIZE + 1,
                    segment.y * CONFIG.GRID_SIZE + 1,
                    CONFIG.GRID_SIZE - 2,
                    CONFIG.GRID_SIZE - 2
                );

                // 绘制蛇名字的最后一个字
                this.ctx.fillStyle = 'white';
                this.ctx.font = `bold ${CONFIG.GRID_SIZE - 8}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    snake.displayChar,
                    segment.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
                    segment.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2
                );
            });
        });

        // 绘制所有食物（大号emoji）
        this.ctx.font = `${CONFIG.GRID_SIZE - 2}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.foods.forEach(food => {
            this.ctx.fillText(
                food.emoji,
                food.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
                food.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2
            );
        });
    }

    drawGrid() {
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 0.5;

        for (let i = 0; i <= this.gridCount; i++) {
            // 垂直线
            this.ctx.beginPath();
            this.ctx.moveTo(i * CONFIG.GRID_SIZE, 0);
            this.ctx.lineTo(i * CONFIG.GRID_SIZE, CONFIG.CANVAS_SIZE);
            this.ctx.stroke();

            // 水平线
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * CONFIG.GRID_SIZE);
            this.ctx.lineTo(CONFIG.CANVAS_SIZE, i * CONFIG.GRID_SIZE);
            this.ctx.stroke();
        }
    }

    drawWelcomeScreen() {
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('贪吃蛇AI大乱斗', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 60);

        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillText('🟢 沫桐', CONFIG.CANVAS_SIZE / 2 - 80, CONFIG.CANVAS_SIZE / 2 - 20);

        this.ctx.fillStyle = '#3498db';
        this.ctx.fillText('🔵 童谣', CONFIG.CANVAS_SIZE / 2 + 80, CONFIG.CANVAS_SIZE / 2 - 20);

        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillText('🔴 斌飞', CONFIG.CANVAS_SIZE / 2 - 80, CONFIG.CANVAS_SIZE / 2 + 10);

        this.ctx.fillStyle = '#f39c12';
        this.ctx.fillText('🟠 曹', CONFIG.CANVAS_SIZE / 2 + 80, CONFIG.CANVAS_SIZE / 2 + 10);

        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('点击"开始游戏"观看AI对战', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 + 50);
    }

    togglePause() {
        if (this.gameState === GAME_STATE.PLAYING) {
            this.gameState = GAME_STATE.PAUSED;
            this.pauseBtn.textContent = '继续';
            clearInterval(this.gameLoop);

            // 显示暂停文字
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂停', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2);
        } else if (this.gameState === GAME_STATE.PAUSED) {
            this.gameState = GAME_STATE.PLAYING;
            this.pauseBtn.textContent = '暂停';
            this.startGameLoop();
        }
    }

    gameOver(winner) {
        this.gameState = GAME_STATE.GAME_OVER;
        clearInterval(this.gameLoop);
        this.stopFoodSpawnTimer();  // 停止食物刷新定时器

        // 计算最高分
        const maxScore = Math.max(...Object.values(this.scores));
        if (maxScore > this.highScore) {
            this.highScore = maxScore;
            this.saveHighScore();
            this.updateHighScore();
        }

        // 记录获胜结果
        if (winner !== '平局') {
            this.winRecords[winner] = (this.winRecords[winner] || 0) + 1;
            this.saveWinRecords();
        }
        this.totalGames += 1;
        this.saveTotalGames();
        this.updateLeaderboard();

        // 处理下注结果
        let betResult = '';
        let pointsChange = 0;
        if (this.betSnake && this.betAmount > 0) {
            if (winner === this.betSnake) {
                // 下注成功，获得3倍积分
                pointsChange = this.betAmount * 3;
                this.playerPoints += pointsChange;
                betResult = `恭喜！${this.betSnake} 获胜！\n你赢得了 ${pointsChange} 积分！`;
            } else {
                // 下注失败
                betResult = `很遗憾，${this.betSnake} 没有获胜。\n你失去了 ${this.betAmount} 积分。`;
            }
            this.savePlayerPoints();
            this.updatePlayerPoints();
        }

        // 显示游戏结束
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束!', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 90);

        if (winner !== '平局') {
            this.ctx.font = '28px Arial';
            this.ctx.fillText(`${winner} 获胜！`, CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 50);
        } else {
            this.ctx.font = '28px Arial';
            this.ctx.fillText('平局！', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 50);
        }

        // 显示下注结果
        if (betResult) {
            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = pointsChange > 0 ? '#2ecc71' : '#e74c3c';
            const lines = betResult.split('\n');
            lines.forEach((line, index) => {
                this.ctx.fillText(line, CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 15 + index * 20);
            });
        }

        // 显示所有得分
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        let yOffset = 35;
        SNAKE_CONFIG.forEach(config => {
            const score = this.scores[config.name];
            const status = this.alive[config.name] ? '✓' : '✗';
            this.ctx.fillText(`${config.name}: ${score} 分 ${status}`, CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 + yOffset);
            yOffset += 22;
        });

        this.updateButtons();

        // 显示结果提示
        if (betResult) {
            setTimeout(() => alert(betResult), 500);
        }
    }

    resetGame() {
        this.gameState = GAME_STATE.READY;
        clearInterval(this.gameLoop);
        this.stopFoodSpawnTimer();  // 停止食物刷新定时器
        this.scores = {};
        this.alive = {};
        this.foods = [];  // 清空食物数组
        this.betSnake = null;
        this.betAmount = 0;
        this.updateAllScores();
        this.updateButtons();
        this.updateBetDisplay();
        this.drawWelcomeScreen();
    }

    updateAllScores() {
        SNAKE_CONFIG.forEach(config => {
            const score = this.scores[config.name] || 0;
            if (this.scoreElements[config.name]) {
                this.scoreElements[config.name].textContent = score;
            }
        });
    }

    updateBetDisplay() {
        this.betButtons.forEach(btn => {
            if (btn.dataset.snake === this.betSnake) {
                btn.classList.add('bet-selected');
                btn.textContent = `${btn.dataset.snake} (已下注 ${this.betAmount})`;
            } else {
                btn.classList.remove('bet-selected');
                btn.textContent = btn.dataset.snake;
            }
        });
    }

    // 积分系统函数
    calculateOfflinePoints() {
        const now = Date.now();
        const timeDiff = now - this.lastOnlineTime;
        const intervalsElapsed = Math.floor(timeDiff / CONFIG.OFFLINE_GAIN_RATE);

        if (intervalsElapsed > 0) {
            // 离线获得的积分最多100
            const potentialGain = intervalsElapsed * CONFIG.OFFLINE_GAIN_AMOUNT;
            const actualGain = Math.min(potentialGain, CONFIG.MAX_OFFLINE_POINTS);

            this.playerPoints += actualGain;

            if (actualGain > 0) {
                setTimeout(() => {
                    alert(`欢迎回来！\n离线期间获得了 ${actualGain} 积分！\n当前积分：${this.playerPoints}`);
                }, 100);
            }
        }

        this.lastOnlineTime = now;
        this.saveLastOnlineTime();
    }

    updatePlayerPoints() {
        if (this.pointsElement) {
            this.pointsElement.textContent = this.playerPoints;
        }
    }

    loadPlayerPoints() {
        const points = localStorage.getItem('snakePlayerPoints');
        return points ? parseInt(points) : CONFIG.INITIAL_POINTS;
    }

    savePlayerPoints() {
        localStorage.setItem('snakePlayerPoints', this.playerPoints.toString());
    }

    loadLastOnlineTime() {
        const time = localStorage.getItem('snakeLastOnlineTime');
        return time ? parseInt(time) : Date.now();
    }

    saveLastOnlineTime() {
        localStorage.setItem('snakeLastOnlineTime', Date.now().toString());
    }

    updateHighScore() {
        this.highScoreElement.textContent = this.highScore;
    }

    updateButtons() {
        if (this.gameState === GAME_STATE.READY || this.gameState === GAME_STATE.GAME_OVER) {
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.pauseBtn.textContent = '暂停';
        } else if (this.gameState === GAME_STATE.PLAYING || this.gameState === GAME_STATE.PAUSED) {
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
        }
    }

    loadHighScore() {
        return parseInt(localStorage.getItem('snakeHighScore') || '0');
    }

    saveHighScore() {
        localStorage.setItem('snakeHighScore', this.highScore.toString());
    }

    // 排行榜系统
    loadWinRecords() {
        const records = localStorage.getItem('snakeWinRecords');
        if (records) {
            return JSON.parse(records);
        }
        // 初始化所有蛇的获胜次数为0
        const initRecords = {};
        SNAKE_CONFIG.forEach(config => {
            initRecords[config.name] = 0;
        });
        return initRecords;
    }

    saveWinRecords() {
        localStorage.setItem('snakeWinRecords', JSON.stringify(this.winRecords));
    }

    loadTotalGames() {
        return parseInt(localStorage.getItem('snakeTotalGames') || '0');
    }

    saveTotalGames() {
        localStorage.setItem('snakeTotalGames', this.totalGames.toString());
    }

    updateLeaderboard() {
        // 计算每条蛇的胜率
        const leaderboardData = SNAKE_CONFIG.map(config => {
            const wins = this.winRecords[config.name] || 0;
            const winRate = this.totalGames > 0 ? (wins / this.totalGames * 100).toFixed(1) : 0;
            return {
                name: config.name,
                wins: wins,
                winRate: winRate,
                color: config.color
            };
        });

        // 按获胜次数排序
        leaderboardData.sort((a, b) => b.wins - a.wins);

        // 更新排行榜UI
        const leaderboardElement = document.getElementById('leaderboard');
        if (leaderboardElement) {
            leaderboardElement.innerHTML = leaderboardData.map((data, index) => {
                const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊';
                return `
                    <div class="leaderboard-item">
                        <span class="rank">${rankEmoji}</span>
                        <span class="snake-name" style="color: ${data.color}">${data.name}</span>
                        <span class="wins">${data.wins}胜</span>
                        <span class="win-rate">${data.winRate}%</span>
                    </div>
                `;
            }).join('');
        }

        // 更新总场数显示
        const totalGamesElement = document.getElementById('totalGames');
        if (totalGamesElement) {
            totalGamesElement.textContent = this.totalGames;
        }
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
