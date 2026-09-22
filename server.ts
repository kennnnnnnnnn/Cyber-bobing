import express, { Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { BobingResult, GameState, Player, PrizePool, RollRecord } from './src/types';
import { evaluateDice, INITIAL_PRIZES, rollRandomDice } from './src/utils/bobingRules';

const PORT = 3000;

// 全局内存中的博饼游戏房间状态（同桌所有人共享）
let gameState: GameState = {
  players: [],
  currentTurnIndex: 0,
  prizes: { ...INITIAL_PRIZES },
  initialPrizes: { ...INITIAL_PRIZES },
  lastRoll: null,
  history: [],
  isRolling: false,
  version: 1,
};

// 实时推送所有连接的客户端
let sseClients: Response[] = [];

function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      // 客户端断开连接由 req.on('close') 处理
    }
  });
}

function broadcastState() {
  broadcast('state', {
    gameState,
    onlineCount: sseClients.length,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // === SSE 实时长连接端点 ===
  app.get('/api/game/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.push(res);

    // 立即向新连入的客户端发送当前最新房间状态
    res.write(`event: state\ndata: ${JSON.stringify({ gameState, onlineCount: sseClients.length })}\n\n`);
    // 广播最新的在线人数给所有人
    broadcast('online_count', { onlineCount: sseClients.length });

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
      broadcast('online_count', { onlineCount: sseClients.length });
    });
  });

  // === 博饼 API 路由 ===

  // 1. 获取全局游戏状态
  app.get('/api/game/state', (req, res) => {
    res.json({
      gameState,
      onlineCount: sseClients.length,
    });
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

    broadcastState();
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
      broadcastState();
    }
    res.json({ success: true, gameState });
  });

  // 4. 摇骰子动作（支持全桌广播“开始摇骰动画”与“结果揭晓”）
  app.post('/api/game/roll', (req, res) => {
    const { playerId, manualDice } = req.body;

    if (gameState.players.length === 0) {
      res.status(400).json({ error: '当前暂无玩家排队，请先加入' });
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurnIndex % gameState.players.length];
    if (!currentPlayer) {
      res.status(400).json({ error: '当前暂无玩家排队' });
      return;
    }

    // 允许规则：
    // 1. 轮到该玩家自己 (currentPlayer.id === playerId)
    // 2. 轮到模拟人/电脑玩家 (currentPlayer.isAi === true)，允许桌上任何人替他开摇
    // 3. 单人/同屏测试模式未传特定 playerId
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

    if (gameState.isRolling) {
      res.status(400).json({ error: '骰子正在大碗中激荡翻滚，请稍候' });
      return;
    }

    // 标记全房间正在摇骰，广播给全桌所有在线玩家！
    gameState.isRolling = true;
    broadcast('roll_start', {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
    });

    // 1.1 秒后服务端统一结算点数并广播最终结果给全桌
    setTimeout(() => {
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
      gameState.isRolling = false;
      gameState.version++;

      // 广播结算事件和最新完整状态给所有在线玩家
      broadcast('roll_end', {
        dice,
        result,
        awarded,
        record,
        lastRoll: gameState.lastRoll,
        gameState,
      });
    }, 1100);

    res.json({
      success: true,
      message: '摇骰已在全桌启动',
      rollingPlayer: currentPlayer.name,
    });
  });

  // 5. 重置奖池与记录（全桌广播重置）
  app.post('/api/game/reset', (req, res) => {
    const keepPlayers = req.body?.keepPlayers !== false;
    gameState.prizes = { ...INITIAL_PRIZES };
    gameState.history = [];
    gameState.lastRoll = null;
    gameState.currentTurnIndex = 0;
    gameState.isRolling = false;
    if (keepPlayers) {
      gameState.players.forEach((p) => {
        p.totalBonus = 0;
        p.winsCount = 0;
      });
    } else {
      gameState.players = [];
    }
    gameState.version++;
    broadcastState();
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
    console.log(`博饼游戏服务端已在端口 ${PORT} 启动 (支持多人同台联机与实时广播)`);
  });
}

startServer();
