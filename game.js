(function () {
  'use strict';

  const CELL_GAP = 12;
  const TILE_VALUES = [2, 2, 2, 2, 4]; // 4/5 概率为 2，1/5 为 4

  let gridSize = 4;
  let grid = [];
  let score = 0;
  let bestScore = 0;
  let won = false;
  let gameOver = false;
  // 4、5、6 棋盘各自独立进度，切换尺寸时保存/恢复
  let gameStateBySize = { 4: null, 5: null, 6: null };

  const tileContainer = document.getElementById('tile-container');
  const gridBackground = document.getElementById('grid-background');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const gameOverEl = document.getElementById('game-over');
  const gameWinEl = document.getElementById('game-win');

  function getBestKey() {
    return '2048-best-' + gridSize;
  }

  function loadBestScore() {
    bestScore = parseInt(localStorage.getItem(getBestKey()) || '0', 10);
    bestEl.textContent = bestScore;
  }

  function buildGridBackground(size) {
    gridBackground.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
    gridBackground.style.gridTemplateRows = 'repeat(' + size + ', 1fr)';
    gridBackground.innerHTML = '';
    for (let i = 0; i < size * size; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      gridBackground.appendChild(cell);
    }
  }

  function getEmptyCells() {
    const cells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  function addRandomTile() {
    const empty = getEmptyCells();
    if (empty.length === 0) return null;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    const value = TILE_VALUES[Math.floor(Math.random() * TILE_VALUES.length)];
    grid[r][c] = value;
    return { r, c, value };
  }

  function initGrid() {
    grid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(0));
    addRandomTile();
    addRandomTile();
  }

  function getTileClass(value) {
    if (value >= 2048) return 'tile-super';
    return 'tile-' + value;
  }

  function getCellSize() {
    const wrapper = document.querySelector('.grid-container');
    const size = wrapper ? wrapper.offsetWidth : 400;
    // 4 格之间有 3 条缝，与 CSS grid gap 一致
    return (size - (gridSize - 1) * CELL_GAP) / gridSize;
  }

  function posToPx(row, col) {
    const cellSize = getCellSize();
    const gap = CELL_GAP;
    return {
      left: col * (cellSize + gap),
      top: row * (cellSize + gap),
      size: cellSize
    };
  }

  function render(animFrom, animMerged, newTile) {
    tileContainer.innerHTML = '';
    const tilesToAnimate = [];

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        const tile = document.createElement('div');
        tile.className = 'tile ' + getTileClass(val);
        if (animMerged && animMerged[r] && animMerged[r][c]) {
          tile.classList.add('merged');
        }
        // 本格是本次移动后新出现的方块：等既有方块移动结束后再播放出现动画
        if (newTile && newTile.r === r && newTile.c === c) {
          tile.classList.add('tile-new');
        }
        tile.textContent = val;
        tile.dataset.row = r;
        tile.dataset.col = c;

        const target = posToPx(r, c);
        tile.style.width = target.size + 'px';
        tile.style.height = target.size + 'px';

        const from = animFrom && animFrom[r] && animFrom[r][c];
        if (from) {
          const start = posToPx(from.r, from.c);
          tile.style.left = start.left + 'px';
          tile.style.top = start.top + 'px';
          tile.style.transition = 'none';
          tilesToAnimate.push({ tile, target });
        } else {
          tile.style.left = target.left + 'px';
          tile.style.top = target.top + 'px';
        }
        tileContainer.appendChild(tile);
      }
    }

    if (tilesToAnimate.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tilesToAnimate.forEach(({ tile, target }) => {
            tile.style.transition = '';
            tile.style.left = target.left + 'px';
            tile.style.top = target.top + 'px';
          });
        });
      });
    }
  }

  function updateScore(value) {
    score = value;
    scoreEl.textContent = score;
    if (score > bestScore) {
      bestScore = score;
      bestEl.textContent = bestScore;
      localStorage.setItem(getBestKey(), bestScore);
    }
  }

  function copyGrid(g) {
    return g.map(row => [...row]);
  }

  function createEmptyGrid() {
    return Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(null));
  }

  function moveLeft() {
    let moved = false;
    let addScore = 0;
    const newGrid = copyGrid(grid);
    const fromGrid = createEmptyGrid();
    const mergedGrid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(false));

    for (let r = 0; r < gridSize; r++) {
      const rowWithCols = [];
      for (let c = 0; c < gridSize; c++) {
        if (newGrid[r][c] > 0) rowWithCols.push({ value: newGrid[r][c], col: c });
      }
      const merged = [];
      const mergedFlags = [];
      let i = 0;
      while (i < rowWithCols.length) {
        if (i + 1 < rowWithCols.length && rowWithCols[i].value === rowWithCols[i + 1].value) {
          merged.push({ value: rowWithCols[i].value * 2, fromCol: rowWithCols[i + 1].col });
          mergedFlags.push(true);
          addScore += rowWithCols[i].value * 2;
          i += 2;
        } else {
          merged.push({ value: rowWithCols[i].value, fromCol: rowWithCols[i].col });
          mergedFlags.push(false);
          i++;
        }
      }
      for (let c = 0; c < gridSize; c++) {
        if (c < merged.length) {
          if (newGrid[r][c] !== merged[c].value) moved = true;
          newGrid[r][c] = merged[c].value;
          fromGrid[r][c] = { r, c: merged[c].fromCol };
          mergedGrid[r][c] = mergedFlags[c];
        } else {
          newGrid[r][c] = 0;
          fromGrid[r][c] = null;
        }
      }
    }
    if (moved) {
      grid = newGrid;
      updateScore(score + addScore);
      const newTile = addRandomTile();
      return { fromGrid, mergedGrid, newTile };
    }
    return null;
  }

  function moveRight() {
    let moved = false;
    let addScore = 0;
    const newGrid = copyGrid(grid);
    const fromGrid = createEmptyGrid();
    const mergedGrid = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(false));

    for (let r = 0; r < gridSize; r++) {
      const rowWithCols = [];
      for (let c = 0; c < gridSize; c++) {
        if (newGrid[r][c] > 0) rowWithCols.push({ value: newGrid[r][c], col: c });
      }
      const merged = [];
      const mergedFlags = [];
      let i = rowWithCols.length - 1;
      while (i >= 0) {
        if (i - 1 >= 0 && rowWithCols[i].value === rowWithCols[i - 1].value) {
          merged.unshift({ value: rowWithCols[i].value * 2, fromCol: rowWithCols[i - 1].col });
          mergedFlags.unshift(true);
          addScore += rowWithCols[i].value * 2;
          i -= 2;
        } else {
          merged.unshift({ value: rowWithCols[i].value, fromCol: rowWithCols[i].col });
          mergedFlags.unshift(false);
          i--;
        }
      }
      const pad = gridSize - merged.length;
      for (let c = 0; c < gridSize; c++) {
        if (c >= pad) {
          const j = c - pad;
          if (newGrid[r][c] !== merged[j].value) moved = true;
          newGrid[r][c] = merged[j].value;
          fromGrid[r][c] = { r, c: merged[j].fromCol };
          mergedGrid[r][c] = mergedFlags[j];
        } else {
          newGrid[r][c] = 0;
          fromGrid[r][c] = null;
        }
      }
    }
    if (moved) {
      grid = newGrid;
      updateScore(score + addScore);
      const newTile = addRandomTile();
      return { fromGrid, mergedGrid, newTile };
    }
    return null;
  }

  function transposeGrid(g) {
    const t = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(0));
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) t[c][r] = g[r][c];
    }
    return t;
  }

  // 将「转置空间」的 fromGrid 转回原始坐标：转置 (row,col) = 原始 (col,row)，from 在转置空间为 (row, fromCol) = 原始 (fromCol, row)，故原始 from = (fg[c][r].c, c)
  function transposeFromGrid(fg) {
    const t = createEmptyGrid();
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (fg[c][r]) t[r][c] = { r: fg[c][r].c, c: c };
        else t[r][c] = null;
      }
    }
    return t;
  }

  function transposeBoolGrid(bg) {
    return bg[0].map((_, c) => bg.map((_, r) => bg[r][c]));
  }

  function moveUp() {
    grid = transposeGrid(grid);
    const result = moveLeft();
    grid = transposeGrid(grid);
    if (result) {
      result.fromGrid = transposeFromGrid(result.fromGrid);
      result.mergedGrid = transposeBoolGrid(result.mergedGrid);
      if (result.newTile) {
        result.newTile = { r: result.newTile.c, c: result.newTile.r, value: result.newTile.value };
      }
    }
    return result;
  }

  function moveDown() {
    grid = transposeGrid(grid);
    const result = moveRight();
    grid = transposeGrid(grid);
    if (result) {
      result.fromGrid = transposeFromGrid(result.fromGrid);
      result.mergedGrid = transposeBoolGrid(result.mergedGrid);
      if (result.newTile) {
        result.newTile = { r: result.newTile.c, c: result.newTile.r, value: result.newTile.value };
      }
    }
    return result;
  }

  function hasReached2048() {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === 2048) return true;
      }
    }
    return false;
  }

  function canMove() {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === 0) return true;
        const v = grid[r][c];
        if (c + 1 < gridSize && grid[r][c + 1] === v) return true;
        if (r + 1 < gridSize && grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function checkGameState() {
    if (!canMove()) {
      gameOver = true;
      gameOverEl.classList.remove('hidden');
    }
    if (!won && hasReached2048()) {
      won = true;
      gameWinEl.classList.remove('hidden');
    }
  }

  function handleMove(direction) {
    if (gameOver) return;
    let result = null;
    switch (direction) {
      case 'left':
        result = moveLeft();
        break;
      case 'right':
        result = moveRight();
        break;
      case 'up':
        result = moveUp();
        break;
      case 'down':
        result = moveDown();
        break;
    }
    if (result) {
      render(result.fromGrid, result.mergedGrid, result.newTile);
      checkGameState();
    }
  }

  function setupInput() {
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('keydown', (e) => {
      if (gameOver && e.key !== 'Enter') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleMove('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleMove('down');
          break;
      }
    });

    const gameWrapper = document.querySelector('.game-wrapper');
    gameWrapper.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    gameWrapper.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const minSwipe = 30;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > minSwipe) handleMove('right');
        else if (dx < -minSwipe) handleMove('left');
      } else {
        if (dy > minSwipe) handleMove('down');
        else if (dy < -minSwipe) handleMove('up');
      }
    }, { passive: true });
  }

  function newGame() {
    score = 0;
    scoreEl.textContent = '0';
    bestEl.textContent = bestScore;
    won = false;
    gameOver = false;
    gameOverEl.classList.add('hidden');
    gameWinEl.classList.add('hidden');
    initGrid();
    render();
  }

  function setGridSize(size) {
    if (size === gridSize) return;
    const oldSize = gridSize;
    // 保存当前尺寸的进度
    gameStateBySize[oldSize] = {
      grid: copyGrid(grid),
      score: score,
      won: won,
      gameOver: gameOver
    };
    gridSize = size;
    buildGridBackground(gridSize);
    loadBestScore();
    const container = document.querySelector('.container');
    container.classList.remove('grid-size-4', 'grid-size-5', 'grid-size-6');
    container.classList.add('grid-size-' + gridSize);
    document.querySelectorAll('.size-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === gridSize);
    });
    const saved = gameStateBySize[gridSize];
    if (saved) {
      grid = copyGrid(saved.grid);
      score = saved.score;
      won = saved.won;
      gameOver = saved.gameOver;
      scoreEl.textContent = score;
      if (gameOver) gameOverEl.classList.remove('hidden');
      else gameOverEl.classList.add('hidden');
      if (won) gameWinEl.classList.remove('hidden');
      else gameWinEl.classList.add('hidden');
    } else {
      initGrid();
      score = 0;
      won = false;
      gameOver = false;
      scoreEl.textContent = '0';
      gameOverEl.classList.add('hidden');
      gameWinEl.classList.add('hidden');
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => render());
    });
  }

  document.getElementById('new-game-btn').addEventListener('click', newGame);
  document.getElementById('retry-btn').addEventListener('click', newGame);
  document.getElementById('keep-playing').addEventListener('click', () => {
    gameWinEl.classList.add('hidden');
    render();
  });

  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => setGridSize(parseInt(btn.dataset.size, 10)));
  });

  setupInput();
  buildGridBackground(gridSize);
  document.querySelector('.container').classList.add('grid-size-' + gridSize);
  loadBestScore();
  initGrid();
  updateScore(0);
  // 首次渲染推迟到布局完成，避免 getCellSize() 在容器尚未有正确尺寸时计算错误
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      render();
    });
  });
})();
