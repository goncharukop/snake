class Game {
    constructor() {
        this.app = new PIXI.Application({
            width: 400,
            height: 400,
            backgroundColor: 0x575757,
        });
        document.getElementById('game-area').appendChild(this.app.view);

        this.snake = new Snake(this.app, this);
        this.score = 0;
        this.bestScore = this.loadBestScore();
        this.gameRunning = false;
        this.app.ticker.maxFPS = 10;

        this.setupUI();
        this.updateUI();

        this.walls = [];
        this.portals = null;

        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById('playBtn').addEventListener('click', () => { this.startGame(); this.toggleButtons(false); });
        document.getElementById('exitBtn').addEventListener('click', this.closeWindow.bind(this));
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleButtons(true));
        document.querySelectorAll('input[name="mode"]').forEach((radio) => {
            radio.addEventListener('change', (event) => {
                this.gameMode = event.target.value;
            });
        });
    }

    setupUI() {
        this.bestScoreLabel = document.getElementById('bestScore');
        this.currentScoreLabel = document.getElementById('currentScore');
        this.menuButton = document.getElementById('menuBtn');
        this.playButton = document.getElementById('playBtn');
        this.exitButton = document.getElementById('exitBtn');
        this.modesBlock = document.getElementById('modes');
    }

    startGame() {
        this.clearScene();
        this.resetGame();
        this.snake.move();

        this.gameRunning = true;
        this.app.ticker.add(this.gameLoop.bind(this));
    }

    clearScene() {
        this.snake.segmentGraphics.forEach(graphic => this.app.stage.removeChild(graphic));
        this.snake.segmentGraphics = [];
        if (this.food && this.food.graphic) this.app.stage.removeChild(this.food.graphic);
    }

    resetGame() {
        this.snake = new Snake(this.app, this);
        this.food = this.generateFood();
        this.score = 0;
        this.updateUI();
    }

    endGame() {
        this.gameRunning = false;
        this.updateBestScore();
        this.toggleButtons(true);
        if (confirm("Гру завершено. Зіграєте ще?")) {
            window.location.reload();
        } else {
            alert("Дякуємо за гру!");
            window.close();
        }
    }

    closeWindow() {
        if (confirm("Ви бажаєте покинути гру?")) {
            window.close();
        }
    }

    toggleButtons(showMenu) {
        if (this.gameMode === 'noDie') {
            this.updateBestScore();
        }
        this.playButton.style.display = showMenu ? 'block' : 'none';
        this.exitButton.style.display = showMenu ? 'block' : 'none';
        this.menuButton.style.display = showMenu ? 'none' : 'block';
        this.modesBlock.style.opacity = showMenu ? 1 : 0;
        this.gameRunning = !showMenu;
    }

    generateFood() {
        if (this.gameMode === 'portal') {
            return this.generatePortals();
        }

        let foodX, foodY;
        do {
            foodX = Math.floor(Math.random() * 20);
            foodY = Math.floor(Math.random() * 20);
        } while (this.isPositionOccupied(foodX, foodY));

        return this.createFoodGraphic(foodX, foodY);
    }

    generatePortals() {
        let portal1, portal2;
        do {
            portal1 = this.randomPosition();
            portal2 = this.randomPosition();
        } while (this.isPortalInvalid(portal1, portal2));

        this.portal1 = this.createFoodGraphic(portal1.x, portal1.y, 0x27865d);
        this.portal2 = this.createFoodGraphic(portal2.x, portal2.y, 0x27865d);

        return { portal1, portal2 };
    }

    randomPosition() {
        return {
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20)
        };
    }

    isPortalInvalid(portal1, portal2) {
        return this.isPositionOccupied(portal1.x, portal1.y) ||
            this.isPositionOccupied(portal2.x, portal2.y) ||
            (portal1.x === portal2.x && portal1.y === portal2.y);
    }

    isPositionOccupied(x, y) {
        return this.snake.segments.some(segment => segment.x === x && segment.y === y) ||
            (this.food && this.food.x === x && this.food.y === y);
    }

    createFoodGraphic(x, y, color = 0x27865d) {
        let food = new PIXI.Graphics();
        food.beginFill(color);
        food.drawRect(x * 20, y * 20, 20, 20);
        food.endFill();
        this.app.stage.addChild(food);

        return { x, y, graphic: food };
    }

    gameLoop() {
        if (!this.gameRunning) return;

        this.snake.move();

        if (this.isFoodEaten()) {
            this.handleFoodEaten();
        }

        if (this.isPortalMode() && this.isPortalEaten()) {
            this.handlePortalEaten();
        }

        if (this.snake.checkCollision()) {
            this.endGame();
        }
    }

    isFoodEaten() {
        return this.snake.segments[0].x === this.food.x && this.snake.segments[0].y === this.food.y;
    }

    handleFoodEaten() {
        this.snake.grow();
        this.app.stage.removeChild(this.food.graphic);
        this.food = this.generateFood();
        this.score += 1;
        this.updateUI();

        if (this.gameMode === 'speed') {
            this.snake.increaseSpeed();
        }

        if (this.gameMode === 'walls') {
            this.generateWall();
        }
    }

    isPortalMode() {
        return this.gameMode === 'portal';
    }

    isPortalEaten() {
        return (this.snake.segments[0].x === this.portal1.x && this.snake.segments[0].y === this.portal1.y) ||
            (this.snake.segments[0].x === this.portal2.x && this.snake.segments[0].y === this.portal2.y);
    }

    handlePortalEaten() {
        const portalDestination = this.snake.segments[0].x === this.portal1.x && this.snake.segments[0].y === this.portal1.y ? this.portal2 : this.portal1;
        this.snake.segments[0].x = portalDestination.x;
        this.snake.segments[0].y = portalDestination.y;

        this.snake.grow();

        this.app.stage.removeChild(this.portal1.graphic);
        this.app.stage.removeChild(this.portal2.graphic);
        this.portal1 = null;
        this.portal2 = null;
        this.food = this.generateFood();
        this.score += 1;
        this.updateUI();
    }

    generateWall() {
        let wallX, wallY;
        do {
            wallX = Math.floor(Math.random() * 20);
            wallY = Math.floor(Math.random() * 20);
        } while (this.isPositionOccupied(wallX, wallY));

        let wall = new PIXI.Graphics();
        wall.beginFill(0x000000);
        wall.drawRect(wallX * 20, wallY * 20, 20, 20);
        wall.endFill();
        this.app.stage.addChild(wall);

        this.walls.push({ x: wallX, y: wallY });
    }

    updateUI() {
        this.currentScoreLabel.innerText = `${this.score}`;
        this.bestScoreLabel.innerText = `${this.bestScore}`;
    }

    updateBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }
    }

    saveBestScore() {
        localStorage.setItem('bestScore', this.bestScore);
    }

    loadBestScore() {
        return parseInt(localStorage.getItem('bestScore')) || 0;
    }
}

class Snake {
    constructor(app, game) {
        this.app = app;
        this.game = game;
        this.segments = [{ x: 1, y: 10 }, { x: 0, y: 10 }];
        this.direction = 'right';
        this.growthQueue = 0;
        this.segmentGraphics = [];
        this.setupControls();
        this.drawSnake();
        this.speed = 10;
    }

    setupControls() {
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'ArrowUp':
                    if (this.direction !== 'down') this.direction = 'up';
                    break;
                case 'ArrowDown':
                    if (this.direction !== 'up') this.direction = 'down';
                    break;
                case 'ArrowLeft':
                    if (this.direction !== 'right') this.direction = 'left';
                    break;
                case 'ArrowRight':
                    if (this.direction !== 'left') this.direction = 'right';
                    break;
            }
        });
    }

    move() {
        const head = { ...this.segments[0] };

        switch (this.direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }

        if (this.game.gameMode === 'noDie') {
            head.x = (head.x + this.app.renderer.width / 20) % 20;
            head.y = (head.y + this.app.renderer.height / 20) % 20;
        } else {
            if (this.checkCollision()) {
                this.game.endGame();
                return;
            }
        }

        this.segments.unshift(head);

        if (this.growthQueue > 0) {
            this.growthQueue -= 1;
        } else {
            this.segments.pop();
        }

        this.drawSnake();
    }

    grow() {
        this.growthQueue += 1;
    }

    checkCollision() {
        const head = this.segments[0];

        if (this.game.gameMode === 'noDie') {
            return false;
        }

        // Перевірка на зіткнення зі стінами поля
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
            return true;
        }

        // Перевірка на зіткнення з собою
        for (let i = 1; i < this.segments.length; i++) {
            if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
                return true;
            }
        }

        // Перевірка на зіткнення зі створеними стінами
        if (this.game.gameMode === 'walls') {
            if (this.game.walls.some(wall => wall.x === head.x && wall.y === head.y)) {
                return true;
            }
        }

        return false;
    }

    increaseSpeed() {
        this.speed *= 1.1; // збільшення швидкості на 10%
        this.app.ticker.maxFPS = this.speed;
    }

    drawSnake() {
        this.segmentGraphics.forEach(graphic => this.app.stage.removeChild(graphic));
        this.segmentGraphics = [];

        this.segments.forEach((segment, index) => {
            let segmentGraphic = new PIXI.Graphics();

            if (index === 0) {
                segmentGraphic.beginFill(0xFFFF00);
                segmentGraphic.zIndex = 2;
            } else {
                segmentGraphic.beginFill(0xFFFFFF);
                segmentGraphic.zIndex = 1;
            }

            segmentGraphic.drawRect(segment.x * 20, segment.y * 20, 20, 20);
            this.app.stage.addChild(segmentGraphic);
            this.segmentGraphics.push(segmentGraphic);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
