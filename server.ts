import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { BobingResult, GameState, Player, PrizePool, RollRecord } from './src/types';
import { evaluateDice, INITIAL_PRIZES, rollRandomDice } from './src/utils/bobingRules';

const PORT = 3000;

// 全局内存中的博饼游戏房间状态
let gameState: GameState = {
  players: [
    {
      id: 'demo-1',
      name: '福星高照',
      joinedAt: Date.now() - 60000,
      totalBonus: 0,
      winsCount: 0,
      isAi: true,
    },
    {
      id: 'demo-2',
      name: '闽南阿强',
      joinedAt: Date.now() - 30000,
      totalBonus: 0,
      winsCount: 0,
      isAi: true,
    },
  ],
  currentTurnIndex: 0,
  prizes: { ...INITIAL_PRIZES },
  initialPrizes: { ...INITIAL_PRIZES },
  lastRoll: null,
  history: [],
  isRolling: false,
  version: 1,
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // === 博饼 API 路由 ===

  // 1. 获取全局游戏状态
  app.get('/api/game/state', (req, res) => {
    res.json(gameState);
  });

  // 2. 加入排队
  app.post('/api/game/join', (req, res) => {
    const { name, isAi } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: '请输入有效的姓名' });
      return;
    }

    const trimmedName = name.trim().slice(0, 12);
    const newPlayer: Player = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: trimmedName,
      joinedAt: Date.now(),
      totalBonus: 0,
      winsCount: 0,
      isAi: Boolean(isAi),
    };

    gameState.players.push(newPlayer);
    gameState.version++;

    res.json({ success: true, player: newPlayer, gameState });
  });

  // 3. 退出排队
  app.post('/api/game/leave', (req, res) => {
    const { playerId } = req.body;
    const pIndex = gameState.players.findIndex((p) => p.id === playerId);
    if (pIndex !== -1) {
      gameState.players.splice(pIndex, 1);
      if (gameState.currentTurnIndex >= gameState.players.length) {
        gameState.currentTurnIndex = 0;
      }
      gameState.version++;
    }
    res.json({ success: true, gameState });
  });

  // 4. 摇骰子
  app.post('/api/game/roll', (req, res) => {
    const { playerId, manualDice } = req.body;

    if (gameState.players.length === 0) {
      res.status(400).json({ error: '当前暂无玩家排队' });
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurnIndex % gameState.players.length];

    if (!currentPlayer) {
      res.status(400).json({ error: '当前暂无玩家排队' });
      return;
    }

    // 允许规则：
    // 1. 轮到该玩家自己 (currentPlayer.id === playerId)
    // 2. 轮到模拟人/电脑玩家 (currentPlayer.isAi === true)，允许用户主动点击开始摇骰
    // 3. 用户在单人/线下同屏模式未传 playerId 或强制摇骰
    const isAllowed = Boolean(
      currentPlayer.isAi ||
      currentPlayer.id === playerId ||
      !playerId
    );

    if (!isAllowed) {
      res.status(400).json({
        error: `还没轮到你掷骰，当前正在轮候【${currentPlayer.name}】`,
        currentTurnPlayer: currentPlayer.name,
      });
      return;
    }

    // 生成固定6个骰子
    const dice = Array.isArray(manualDice) && manualDice.length === 6
      ? manualDice.map((n) => Math.min(6, Math.max(1, Math.floor(n))))
      : rollRandomDice();

    // 判定博饼结果
    const result: BobingResult = evaluateDice(dice, gameState.prizes);

    // 检查奖池扣除与发放
    let awarded = false;
    if (result.category !== 'none' && result.isUnlocked) {
      const prizeKey = result.category as keyof PrizePool;
      if (gameState.prizes[prizeKey] > 0) {
        gameState.prizes[prizeKey]--;
        currentPlayer.totalBonus += result.bonus;
        currentPlayer.winsCount += 1;
        awarded = true;
      }
    }

    const record: RollRecord = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      dice,
      category: result.category,
      title: result.title,
      subTitle: result.subTitle,
      bonus: result.bonus,
      timestamp: Date.now(),
      awarded,
      note: result.lockReason,
    };

    gameState.history.unshift(record);
    if (gameState.history.length > 60) {
      gameState.history.pop();
    }

    gameState.lastRoll = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      dice,
      result,
      awarded,
      timestamp: Date.now(),
    };

    // 轮流到下一位玩家
    if (gameState.players.length > 0) {
      gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
    }
    gameState.version++;

    res.json({
      success: true,
      dice,
      result,
      awarded,
      record,
      gameState,
    });
  });

  // 5. 重置奖池与记录
  app.post('/api/game/reset', (req, res) => {
    const keepPlayers = req.body?.keepPlayers !== false;
    gameState.prizes = { ...INITIAL_PRIZES };
    gameState.history = [];
    gameState.lastRoll = null;
    gameState.currentTurnIndex = 0;
    if (keepPlayers) {
      gameState.players.forEach((p) => {
        p.totalBonus = 0;
        p.winsCount = 0;
      });
    } else {
      gameState.players = [];
    }
    gameState.version++;
    res.json({ success: true, gameState });
  });

  // === Vite 中间件（用于前端热更与托管） ===
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`博饼游戏服务端已在端口 ${PORT} 启动`);
  });
}

startServer();
