// 游戏配置
const CONFIG = {
    CANVAS_SIZE: 400,
    GRID_SIZE: 20,
    INITIAL_SPEED: 214,  // 初始速度（150 / 0.7 ≈ 214毫秒，速度降低为原来的0.7倍）
    SPEED_INCREMENT: 5,
    MIN_SPEED: 50,
    AI_ENABLED: true,
    AI_REACTION_DELAY: 300  // AI反应延迟（毫秒）
};

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
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // 游戏变量
        this.snake = [];
        this.direction = DIRECTION.RIGHT;
        this.nextDirection = DIRECTION.RIGHT;
        this.food = {};
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.gameState = GAME_STATE.READY;
        this.gameLoop = null;
        this.speed = CONFIG.INITIAL_SPEED;

        // AI蛇变量
        this.aiSnake = [];
        this.aiDirection = DIRECTION.LEFT;
        this.aiScore = 0;
        this.aiScoreElement = document.getElementById('aiScore');
        this.aiLastMoveTime = 0;  // AI上次移动的时间

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
        this.updateAIScore();
        this.drawWelcomeScreen();
    }

    setupEventListeners() {
        // 按钮事件
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resetBtn.addEventListener('click', () => this.resetGame());

        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    handleKeyPress(e) {
        if (this.gameState !== GAME_STATE.PLAYING && this.gameState !== GAME_STATE.PAUSED) {
            return;
        }

        switch(e.key) {
            case 'ArrowUp':
                if (this.direction !== DIRECTION.DOWN) {
                    this.nextDirection = DIRECTION.UP;
                }
                e.preventDefault();
                break;
            case 'ArrowDown':
                if (this.direction !== DIRECTION.UP) {
                    this.nextDirection = DIRECTION.DOWN;
                }
                e.preventDefault();
                break;
            case 'ArrowLeft':
                if (this.direction !== DIRECTION.RIGHT) {
                    this.nextDirection = DIRECTION.LEFT;
                }
                e.preventDefault();
                break;
            case 'ArrowRight':
                if (this.direction !== DIRECTION.LEFT) {
                    this.nextDirection = DIRECTION.RIGHT;
                }
                e.preventDefault();
                break;
            case ' ':
                this.togglePause();
                e.preventDefault();
                break;
        }
    }

    startGame() {
        this.gameState = GAME_STATE.PLAYING;
        this.score = 0;
        this.aiScore = 0;
        this.speed = CONFIG.INITIAL_SPEED;
        this.direction = DIRECTION.RIGHT;
        this.nextDirection = DIRECTION.RIGHT;
        this.aiDirection = DIRECTION.LEFT;
        this.aiLastMoveTime = Date.now();  // 重置AI移动时间

        // 初始化玩家蛇（左侧）
        const leftX = Math.floor(this.gridCount / 4);
        const centerY = Math.floor(this.gridCount / 2);
        this.snake = [
            { x: leftX, y: centerY, emoji: this.getRandomFood() },
            { x: leftX - 1, y: centerY, emoji: this.getRandomFood() },
            { x: leftX - 2, y: centerY, emoji: this.getRandomFood() }
        ];

        // 初始化AI蛇（右侧）
        const rightX = Math.floor(this.gridCount * 3 / 4);
        this.aiSnake = [
            { x: rightX, y: centerY, emoji: this.getRandomFood() },
            { x: rightX + 1, y: centerY, emoji: this.getRandomFood() },
            { x: rightX + 2, y: centerY, emoji: this.getRandomFood() }
        ];

        this.generateFood();
        this.updateScore();
        this.updateAIScore();
        this.updateButtons();
        this.startGameLoop();
    }

    startGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        this.gameLoop = setInterval(() => this.update(), this.speed);
    }

    update() {
        if (this.gameState !== GAME_STATE.PLAYING) {
            return;
        }

        // 更新玩家蛇方向
        this.direction = this.nextDirection;

        // 计算玩家蛇新头部位置
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y,
            emoji: this.currentFoodEmoji
        };

        // 检查玩家蛇碰撞
        if (this.checkCollision(newHead, this.snake) || this.checkCollisionWithSnake(newHead, this.aiSnake)) {
            this.gameOver('童谣获胜！');
            return;
        }

        // 添加玩家蛇新头部
        this.snake.unshift(newHead);

        // 检查玩家是否吃到食物
        let playerAte = false;
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            playerAte = true;
            this.currentFoodEmoji = this.getRandomFood();
            this.generateFood();

            // 加速
            if (this.speed > CONFIG.MIN_SPEED) {
                this.speed = Math.max(CONFIG.MIN_SPEED, this.speed - CONFIG.SPEED_INCREMENT);
                this.startGameLoop();
            }
        }

        if (!playerAte) {
            this.snake.pop();
        }

        // 更新AI蛇
        this.updateAI();

        this.draw();
    }

    checkCollision(position, snake) {
        // 检查墙壁碰撞
        if (position.x < 0 || position.x >= this.gridCount ||
            position.y < 0 || position.y >= this.gridCount) {
            return true;
        }

        // 检查自身碰撞
        return snake.some(segment =>
            segment.x === position.x && segment.y === position.y
        );
    }

    checkCollisionWithSnake(position, otherSnake) {
        // 检查与另一条蛇的碰撞
        return otherSnake.some(segment =>
            segment.x === position.x && segment.y === position.y
        );
    }

    updateAI() {
        // 检查AI是否可以移动（反应延迟）
        const currentTime = Date.now();
        const canMove = (currentTime - this.aiLastMoveTime) >= CONFIG.AI_REACTION_DELAY;

        if (!canMove) {
            // AI反应延迟中，不更新方向
            return;
        }

        // 更新AI上次移动时间
        this.aiLastMoveTime = currentTime;

        // AI决策：使用A*寻路算法找到食物
        const aiHead = this.aiSnake[0];
        const nextDirection = this.getAINextDirection(aiHead);

        if (nextDirection) {
            this.aiDirection = nextDirection;
        }

        // 计算AI蛇新头部位置
        const newAIHead = {
            x: aiHead.x + this.aiDirection.x,
            y: aiHead.y + this.aiDirection.y,
            emoji: this.currentFoodEmoji
        };

        // 检查AI蛇碰撞
        if (this.checkCollision(newAIHead, this.aiSnake) || this.checkCollisionWithSnake(newAIHead, this.snake)) {
            this.gameOver('沫同获胜！');
            return;
        }

        // 添加AI蛇新头部
        this.aiSnake.unshift(newAIHead);

        // 检查AI是否吃到食物
        if (newAIHead.x === this.food.x && newAIHead.y === this.food.y) {
            this.aiScore += 10;
            this.updateAIScore();
            this.currentFoodEmoji = this.getRandomFood();
            this.generateFood();
        } else {
            this.aiSnake.pop();
        }
    }

    getAINextDirection(aiHead) {
        // 简化的AI：计算到食物的方向并避免即死
        const possibleDirections = [
            DIRECTION.UP,
            DIRECTION.DOWN,
            DIRECTION.LEFT,
            DIRECTION.RIGHT
        ];

        // 过滤掉反方向
        const validDirections = possibleDirections.filter(dir => {
            return !(dir.x === -this.aiDirection.x && dir.y === -this.aiDirection.y);
        });

        // 评分每个方向
        const scoredDirections = validDirections.map(dir => {
            const nextPos = {
                x: aiHead.x + dir.x,
                y: aiHead.y + dir.y
            };

            // 检查是否会立即碰撞
            if (this.checkCollision(nextPos, this.aiSnake) ||
                this.checkCollisionWithSnake(nextPos, this.snake)) {
                return { dir, score: -1000 };
            }

            // 计算到食物的曼哈顿距离
            const distanceToFood = Math.abs(nextPos.x - this.food.x) +
                                   Math.abs(nextPos.y - this.food.y);

            return { dir, score: -distanceToFood };
        });

        // 选择得分最高的方向
        scoredDirections.sort((a, b) => b.score - a.score);

        return scoredDirections[0]?.score > -1000 ? scoredDirections[0].dir : null;
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.gridCount),
                y: Math.floor(Math.random() * this.gridCount)
            };
        } while (this.snake.some(segment =>
            segment.x === newFood.x && segment.y === newFood.y
        ) || this.aiSnake.some(segment =>
            segment.x === newFood.x && segment.y === newFood.y
        ));

        this.food = newFood;
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

        // 绘制网格
        this.drawGrid();

        // 绘制玩家蛇（使用食物emoji）
        this.snake.forEach((segment, index) => {
            // 绘制背景（绿色边框）
            this.ctx.fillStyle = index === 0 ? '#2ecc71' : '#4cd137';
            this.ctx.strokeStyle = '#27ae60';
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

            // 绘制食物emoji
            this.ctx.font = `${CONFIG.GRID_SIZE - 6}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                segment.emoji,
                segment.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
                segment.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2
            );
        });

        // 绘制AI蛇（使用食物emoji）
        this.aiSnake.forEach((segment, index) => {
            // 绘制背景（蓝色边框）
            this.ctx.fillStyle = index === 0 ? '#3498db' : '#5dade2';
            this.ctx.strokeStyle = '#2980b9';
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

            // 绘制食物emoji
            this.ctx.font = `${CONFIG.GRID_SIZE - 6}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                segment.emoji,
                segment.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
                segment.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2
            );
        });

        // 绘制食物（大号emoji）
        this.ctx.font = `${CONFIG.GRID_SIZE - 2}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            this.currentFoodEmoji,
            this.food.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
            this.food.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2
        );
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
        this.ctx.fillText('贪吃蛇对战游戏', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 40);

        this.ctx.font = '18px Arial';
        this.ctx.fillText('🟢 沫同 vs 🔵 童谣', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 10);

        this.ctx.font = '16px Arial';
        this.ctx.fillText('点击"开始游戏"按钮开始', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 + 20);
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

    gameOver(message) {
        this.gameState = GAME_STATE.GAME_OVER;
        clearInterval(this.gameLoop);

        // 更新最高分
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
            this.updateHighScore();
        }

        // 显示游戏结束
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束!', CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 50);

        this.ctx.font = '28px Arial';
        this.ctx.fillText(message, CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 - 10);

        this.ctx.font = '24px Arial';
        this.ctx.fillText(`你的得分: ${this.score}`, CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 + 25);
        this.ctx.fillText(`AI得分: ${this.aiScore}`, CONFIG.CANVAS_SIZE / 2, CONFIG.CANVAS_SIZE / 2 + 55);

        this.updateButtons();
    }

    resetGame() {
        this.gameState = GAME_STATE.READY;
        clearInterval(this.gameLoop);
        this.score = 0;
        this.aiScore = 0;
        this.updateScore();
        this.updateAIScore();
        this.updateButtons();
        this.drawWelcomeScreen();
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
    }

    updateAIScore() {
        this.aiScoreElement.textContent = this.aiScore;
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
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
