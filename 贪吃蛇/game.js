// 在文件开头定义全局变量
let snake = [
    {x: 10, y: 10},
    {x: 9, y: 10},
    {x: 8, y: 10}
];
let dx = 1;
let dy = 0;
let food = null;
let score = 0;
let gameRunning = false;
let isPaused = false;
let moveTimer = null;  // 用于存储移动定时器

class Snake {
    constructor(size) {
        this.size = size;
        this.direction = 'right';
        this.body = [
            { x: 3, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 1 }
        ];
        this.nextDirection = this.direction;
    }

    move(food) {
        this.direction = this.nextDirection;
        const head = { x: this.body[0].x, y: this.body[0].y };

        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        this.body.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            return true;
        }

        this.body.pop();
        return false;
    }

    setDirection(direction) {
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };

        if (opposites[direction] !== this.direction) {
            this.nextDirection = direction;
        }
    }

    checkCollision(gridSize) {
        const head = this.body[0];
        
        // 检查是否撞墙
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            return '撞到墙壁了！';
        }

        // 检查是否撞到自己
        for (let i = 1; i < this.body.length; i++) {
            if (head.x === this.body[i].x && head.y === this.body[i].y) {
                return '撞到自己了！';
            }
        }

        return false;
    }
}

class Game {
    constructor() {
        console.log('Game constructor called');
        
        // 获取必要的DOM元素
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // 基本游戏参数
        this.gridSize = 20;
        this.tileSize = 20;
        this.canvas.width = this.gridSize * this.tileSize;
        this.canvas.height = this.gridSize * this.tileSize;

        // 游戏状态
        this.isGameRunning = false;
        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.gameSpeed = 150;
        this.isPaused = false;
        this.effects = new Map();
        this.scoreAnimations = [];
        this.leaderboard = JSON.parse(localStorage.getItem('snakeLeaderboard')) || [];
        this.setupLeaderboard();

        // 初始化蛇和食物
        this.snake = null;
        this.food = null;

        // 在现有的变量声明后添加
        const eatSound = document.getElementById('eatSound');
        const gameOverSound = document.getElementById('gameOverSound');
        let soundEnabled = true;
        const soundButton = document.getElementById('soundButton');

        // 加载蛇头图片
        const snakeHead = new Image();
        snakeHead.src = 'images/snake-head.png';

        // 添加图片加载完成的检查
        snakeHead.onload = function() {
            console.log('蛇头图片加载完成');
        };

        snakeHead.onerror = function() {
            console.error('蛇头图片加载失败');
        };

        // 确保在绑定按钮之前等待DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindButtons());
        } else {
            this.bindButtons();
        }
        
        console.log('Game initialization complete');

        // 修改画布背景色
        this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    }

    bindButtons() {
        console.log('Binding buttons');
        const startBtn = document.getElementById('start-btn');
        const restartBtn = document.getElementById('restart-btn');
        const menuBtn = document.getElementById('menu-btn');

        if (!startBtn) {
            console.error('Start button not found');
            return;
        }

        startBtn.addEventListener('click', () => {
            console.log('Start button clicked');
            this.startGame();
        });

        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                console.log('Restart button clicked');
                this.startGame();
            });
        }

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                console.log('Menu button clicked');
                this.showMenu();
            });
        }
    }

    setupScreens() {
        this.menuScreen = document.getElementById('menu-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        
        document.getElementById('difficulty-select').addEventListener('change', (e) => {
            switch(e.target.value) {
                case 'easy': this.gameSpeed = 150; break;
                case 'medium': this.gameSpeed = 100; break;
                case 'hard': this.gameSpeed = 70; break;
            }
        });

        // 显示最高分
        document.getElementById('high-score').textContent = this.highScore;
    }

    setupLeaderboard() {
        document.getElementById('leaderboard-btn').addEventListener('click', () => {
            this.showLeaderboard();
        });
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            this.showMenu();
        });
    }

    showScreen(screenId) {
        [this.menuScreen, this.gameScreen, this.gameOverScreen].forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }

    showMenu() {
        this.showScreen('menu-screen');
    }

    startGame() {
        // 清除之前的定时器
        if (moveTimer) {
            clearInterval(moveTimer);
            moveTimer = null;
        }

        // 重置游戏状态
        this.snake = new Snake(this.tileSize);
        this.score = 0;
        this.isPaused = false;
        
        // 重置显示
        document.getElementById('score').textContent = '0';
        document.getElementById('pauseOverlay').style.display = 'none';

        // 生成第一个食物
        this.food = this.generateFood();
        
        // 清空画布并绘制初始状态
        this.clearCanvas();
        this.drawFood();
        this.drawSnake();

        // 启动游戏循环
        moveTimer = setInterval(() => this.moveAndDraw(), this.gameSpeed);
    }

    moveAndDraw() {
        if (!this.isGameRunning || this.isPaused) return;

        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 填充背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 移动蛇并检查碰撞
        const collisionResult = this.snake.checkCollision(this.gridSize);
        if (collisionResult) {
            this.gameOver(collisionResult);
            return;
        }

        // 绘制食物和蛇
        this.drawFood();
        this.drawSnake();
    }

    gameOver(reason) {
        this.isGameRunning = false;
        if (moveTimer) {
            clearInterval(moveTimer);
            moveTimer = null;
        }

        if (soundEnabled) {
            gameOverSound.currentTime = 0;
            gameOverSound.play().catch(e => console.log('音效播放失败'));
        }

        // 更新排行榜
        const playerName = prompt('请输入你的名字：');
        if (playerName) {
            this.leaderboard.push({
                name: playerName,
                score: this.score,
                date: new Date().toISOString()
            });
            this.leaderboard.sort((a, b) => b.score - a.score);
            if (this.leaderboard.length > 10) {
                this.leaderboard.length = 10;
            }
            localStorage.setItem('snakeLeaderboard', JSON.stringify(this.leaderboard));
        }

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-reason').textContent = reason;
        this.showScreen('game-over-screen');

        // 添加游戏结束动画
        let alpha = 0;
        const animationInterval = setInterval(() => {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏结束', this.canvas.width/2, this.canvas.height/2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`得分: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
            
            alpha += 0.02;
            if (alpha >= 1) {
                clearInterval(animationInterval);
            }
        }, 20);

        setTimeout(() => {
            alert(`游戏结束！\n最终得分：${this.score}`);
        }, 100);
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isGameRunning) {
                this.togglePause();
                return;
            }
            
            if (!this.isGameRunning || this.isPaused) return;
            
            switch(e.key) {
                case 'ArrowUp': this.snake.setDirection('up'); break;
                case 'ArrowDown': this.snake.setDirection('down'); break;
                case 'ArrowLeft': this.snake.setDirection('left'); break;
                case 'ArrowRight': this.snake.setDirection('right'); break;
            }
        });
    }

    generateFood() {
        const rand = Math.random();
        let type = 'normal';
        let cumProb = 0;
        
        for (const [foodType, config] of Object.entries(Food.TYPES)) {
            cumProb += config.probability;
            if (rand <= cumProb) {
                type = foodType;
                break;
            }
        }
        
        return new Food(Math.floor(Math.random() * this.gridSize), Math.floor(Math.random() * this.gridSize), type);
    }

    applyFoodEffect(foodType) {
        const config = Food.TYPES[foodType];
        if (config.effect) {
            // 清除现有的相同效果
            if (this.effects.has(config.effect)) {
                clearTimeout(this.effects.get(config.effect));
            }

            // 应用效果
            switch (config.effect) {
                case 'speed':
                    this.gameSpeed = this.baseGameSpeed * 0.5;
                    break;
                case 'slow':
                    this.gameSpeed = this.baseGameSpeed * 1.5;
                    break;
                case 'double':
                    this.scoreMultiplier = 2;
                    break;
            }

            // 设置效果持续时间
            const timeout = setTimeout(() => {
                this.removeEffect(config.effect);
            }, config.duration);

            this.effects.set(config.effect, timeout);
        }
    }

    removeEffect(effect) {
        switch (effect) {
            case 'speed':
            case 'slow':
                this.gameSpeed = this.baseGameSpeed;
                break;
            case 'double':
                this.scoreMultiplier = 1;
                break;
        }
        this.effects.delete(effect);
    }

    updateScore(points) {
        const multiplier = this.scoreMultiplier || 1;
        const finalPoints = points * multiplier;
        this.score += finalPoints;
        
        // 添加分数动画
        const head = this.snake.body[0];
        this.scoreAnimations.push(
            new ScoreAnimation(
                head.x * this.gridSize + this.gridSize/2,
                head.y * this.gridSize + this.gridSize/2,
                `+${finalPoints}`,
                this.ctx
            )
        );

        document.getElementById('current-score').textContent = this.score;
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        this.drawGrid();

        // 绘制食物
        this.food.update();
        this.drawFood();

        // 绘制蛇
        this.drawSnake();

        // 绘制效果状态
        this.drawEffectStatus();

        // 绘制分数动画
        this.updateScoreAnimations();
    }

    drawFood() {
        if (!this.food) return;
        
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#ff0000';
        
        // 创建食物的渐变色
        let gradient = this.ctx.createRadialGradient(
            this.food.x * this.tileSize + this.tileSize/2,
            this.food.y * this.tileSize + this.tileSize/2,
            0,
            this.food.x * this.tileSize + this.tileSize/2,
            this.food.y * this.tileSize + this.tileSize/2,
            this.tileSize/2
        );
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ff0000');
        
        this.ctx.fillStyle = gradient;
        
        // 绘制食物为一个圆形
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.tileSize + this.tileSize/2,
            this.food.y * this.tileSize + this.tileSize/2,
            this.tileSize/2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // 添加一个小光点
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.tileSize + this.tileSize/3,
            this.food.y * this.tileSize + this.tileSize/3,
            this.tileSize/6,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    drawEffectStatus() {
        const statusDiv = document.querySelector('.effect-status') || 
            document.createElement('div');
        statusDiv.className = 'effect-status';
        
        if (this.effects.size > 0) {
            const activeEffects = Array.from(this.effects.keys());
            statusDiv.textContent = `活动效果: ${activeEffects.join(', ')}`;
            if (!statusDiv.parentNode) {
                this.gameScreen.appendChild(statusDiv);
            }
        } else if (statusDiv.parentNode) {
            statusDiv.remove();
        }
    }

    updateScoreAnimations() {
        this.scoreAnimations = this.scoreAnimations.filter(animation => {
            animation.update();
            animation.draw();
            return animation.opacity > 0;
        });
    }

    addPauseButton() {
        const pauseBtn = document.createElement('button');
        pauseBtn.textContent = '暂停';
        pauseBtn.className = 'pause-btn';
        this.gameScreen.appendChild(pauseBtn);

        pauseBtn.addEventListener('click', () => this.togglePause());
    }

    togglePause() {
        if (!this.isGameRunning) return;
        
        this.isPaused = !this.isPaused;
        const pauseOverlay = document.getElementById('pauseOverlay');
        
        if (this.isPaused) {
            // 暂停时清除计时器
            if (moveTimer) {
                clearInterval(moveTimer);
                moveTimer = null;
            }
            pauseOverlay.style.display = 'block';
        } else {
            pauseOverlay.style.display = 'none';
            // 确保只有一个游戏循环在运行
            if (!moveTimer) {
                moveTimer = setInterval(() => this.moveAndDraw(), this.gameSpeed);
            }
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        
        // 绘制垂直线
        for (let x = 0; x <= this.canvas.width; x += this.tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 绘制水平线
        for (let y = 0; y <= this.canvas.height; y += this.tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawSnake() {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#4CAF50';
        
        this.snake.body.forEach((segment, index) => {
            if (index === 0) {
                // 蛇头使用渐变色
                let gradient = this.ctx.createRadialGradient(
                    segment.x * this.tileSize + this.tileSize/2, 
                    segment.y * this.tileSize + this.tileSize/2, 
                    0,
                    segment.x * this.tileSize + this.tileSize/2, 
                    segment.y * this.tileSize + this.tileSize/2, 
                    this.tileSize
                );
                gradient.addColorStop(0, '#7FFF00');
                gradient.addColorStop(1, '#4CAF50');
                this.ctx.fillStyle = gradient;
            } else {
                // 蛇身使用渐变色
                this.ctx.fillStyle = `hsl(120, 100%, ${50 - (index * 2)}%)`;
            }
            
            // 绘制圆角矩形作为蛇的身体
            const x = segment.x * this.tileSize;
            const y = segment.y * this.tileSize;
            const size = this.tileSize - 2;
            const radius = 5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();
            this.ctx.fill();
        });
        
        this.ctx.shadowBlur = 0;
    }

    showLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';
        
        this.leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .forEach((entry, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <span>${index + 1}. ${entry.name}</span>
                    <span>${entry.score}</span>
                `;
                leaderboardList.appendChild(item);
            });

        this.showScreen('leaderboard-screen');
    }
}

// 添加分数动画效果
class ScoreAnimation {
    constructor(x, y, text, ctx) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.ctx = ctx;
        this.opacity = 1;
        this.velocity = -2;
    }

    update() {
        this.y += this.velocity;
        this.opacity -= 0.02;
        return this.opacity > 0;
    }

    draw() {
        this.ctx.save();
        this.ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity})`;
        this.ctx.font = '20px Arial';
        this.ctx.fillText(this.text, this.x, this.y);
        this.ctx.restore();
    }
}

class Food {
    static TYPES = {
        NORMAL: {
            color: '#ff0000',
            points: 10,
            probability: 0.7,
            effect: null
        },
        SPEED: {
            color: '#ffff00',
            points: 20,
            probability: 0.1,
            effect: 'speed',
            duration: 5000
        },
        SLOW: {
            color: '#0000ff',
            points: 15,
            probability: 0.1,
            effect: 'slow',
            duration: 5000
        },
        DOUBLE: {
            color: '#ff00ff',
            points: 30,
            probability: 0.1,
            effect: 'double',
            duration: 5000
        }
    };

    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.scale = 1;
        this.scaleDirection = 0.02;
    }

    update() {
        this.scale += this.scaleDirection;
        if (this.scale > 1.2 || this.scale < 0.8) {
            this.scaleDirection *= -1;
        }
    }
}

// 修改游戏初始化方式
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    window.game = new Game();
});

function toggleSound() {
    soundEnabled = !soundEnabled;
    eatSound.muted = !soundEnabled;
    gameOverSound.muted = !soundEnabled;
    
    // 更新按钮显示
    soundButton.innerHTML = soundEnabled ? 
        '<i>🔊</i> 音效：开' : 
        '<i>🔈</i> 音效：关';
    soundButton.classList.toggle('muted', !soundEnabled);
}

// 修改游戏的主循环函数
function gameLoop() {
    if (!gameRunning || isPaused) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置画布背景色
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    drawGrid();
    
    // 移动蛇
    const collisionResult = moveSnake();
    if (collisionResult) {
        gameOver(collisionResult);
        return;
    }
    
    // 绘制食物和蛇
    drawFood();
    drawSnake();
    
    // 继续游戏循环
    setTimeout(gameLoop, gameSpeed);
}

// 添加网格绘制函数
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    // 绘制垂直线
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 修改蛇的绘制函数
function drawSnake() {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4CAF50';
    
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头使用渐变色
            let gradient = ctx.createRadialGradient(
                segment.x * gridSize + gridSize/2, 
                segment.y * gridSize + gridSize/2, 
                0,
                segment.x * gridSize + gridSize/2, 
                segment.y * gridSize + gridSize/2, 
                gridSize
            );
            gradient.addColorStop(0, '#7FFF00');
            gradient.addColorStop(1, '#4CAF50');
            ctx.fillStyle = gradient;
        } else {
            // 蛇身使用渐变色
            ctx.fillStyle = `hsl(120, 100%, ${50 - (index * 2)}%)`;
        }
        
        // 绘制圆角矩形作为蛇的身体
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        const size = gridSize - 2;
        const radius = 5;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + size - radius, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        ctx.lineTo(x + size, y + size - radius);
        ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        ctx.lineTo(x + radius, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    });
    
    ctx.shadowBlur = 0;
}

// 修改食物的绘制函数
function drawFood() {
    if (!food) return;
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0000';
    
    // 创建食物的渐变色
    let gradient = ctx.createRadialGradient(
        food.x * gridSize + gridSize/2,
        food.y * gridSize + gridSize/2,
        0,
        food.x * gridSize + gridSize/2,
        food.y * gridSize + gridSize/2,
        gridSize/2
    );
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#ff0000');
    
    ctx.fillStyle = gradient;
    
    // 绘制食物为一个圆形
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize/2,
        food.y * gridSize + gridSize/2,
        gridSize/2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 添加一个小光点
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize/3,
        food.y * gridSize + gridSize/3,
        gridSize/6,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

// 修改移动蛇的函数
function moveSnake() {
    // 获取蛇头
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // 检查碰撞
    if (head.x < 0 || head.x >= canvas.width / gridSize || 
        head.y < 0 || head.y >= canvas.height / gridSize) {
        return '撞到墙壁了！';
    }
    
    // 检查是否撞到自己
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return '撞到自己了！';
        }
    }
    
    // 在蛇数组开头添加新的头部
    snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        // 吃到食物，加分并生成新的食物
        score += 10;
        document.getElementById('score').textContent = score;
        generateFood();
        // 播放吃食物的音效
        if (document.getElementById('eatSound')) {
            document.getElementById('eatSound').play();
        }
    } else {
        // 没吃到食物，移除尾部
        snake.pop();
    }
    
    return false;
} 