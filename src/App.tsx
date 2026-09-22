import { useEffect, useState, useRef, useCallback } from 'react';
import { GameState, Player, BobingResult, PrizePool, RollRecord } from './types';
import { INITIAL_PRIZES, rollRandomDice, evaluateDice } from './utils/bobingRules';
import { Bowl } from './components/Bowl';
import { RulesTable } from './components/RulesTable';
import { QueuePanel } from './components/QueuePanel';
import { HistoryBoard } from './components/HistoryBoard';
import { playRollingSound, playWinJingle } from './utils/audio';
import { Volume2, VolumeX, Sparkles, Dices, ChevronDown, ChevronUp, RotateCcw, Copy, ExternalLink, HelpCircle, Server, CheckCircle2 } from 'lucide-react';

const SESSION_STORAGE_KEY = 'bobing_session_player_id';
const SESSION_STORAGE_NAME = 'bobing_session_player_name';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentTurnIndex: 0,
    prizes: { ...INITIAL_PRIZES },
    initialPrizes: { ...INITIAL_PRIZES },
    lastRoll: null,
    history: [],
    isRolling: false,
    version: 0,
  });

  // 使用 sessionStorage 区分同一浏览器不同 Tab 标签页，支持本地多开多玩家同桌博饼
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
  });

  // 连接模式：'online' (Node.js服务端实时全服同步) 或 'local' (离线/纯静态部署兜底，不中断游玩)
  const [connectionMode, setConnectionMode] = useState<'online' | 'local'>('online');
  const [onlineCount, setOnlineCount] = useState(1);
  const [rollingPlayerName, setRollingPlayerName] = useState<string | undefined>(undefined);
  const [localDice, setLocalDice] = useState<number[]>([4, 4, 1, 2, 3, 5]);
  const [isLocalRolling, setIsLocalRolling] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const [showTestBar, setShowTestBar] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [resetKeepPlayers, setResetKeepPlayers] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoRollForAi, setAutoRollForAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'game' | 'rules' | 'queue' | 'history'>('game');

  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  // 1. 获取后端游戏状态（兜底备用）
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/state');
      if (res.ok) {
        const data = await res.json();
        setConnectionMode('online');
        if (data.gameState) {
          setGameState(data.gameState);
          if (data.gameState.lastRoll && !isLocalRolling) {
            setLocalDice(data.gameState.lastRoll.dice);
          }
        }
        if (typeof data.onlineCount === 'number') {
          setOnlineCount(data.onlineCount);
        }
      } else {
        // 后端非200（例如404静态服务器）
        setConnectionMode('local');
      }
    } catch {
      // 离线备用，自动降级为本地独立模式
      setConnectionMode('local');
    }
  }, [isLocalRolling]);

  // 2. 建立 SSE (Server-Sent Events) 全局广播连接，多端多人同屏毫秒级同步！
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource('/api/game/events');

        es.addEventListener('state', (e) => {
          try {
            const payload = JSON.parse(e.data);
            setConnectionMode('online');
            if (payload.gameState) {
              setGameState(payload.gameState);
              if (!payload.gameState.isRolling && payload.gameState.lastRoll) {
                setLocalDice(payload.gameState.lastRoll.dice);
              }
            }
            if (typeof payload.onlineCount === 'number') {
              setOnlineCount(payload.onlineCount);
            }
          } catch (err) {
            console.error('SSE state error', err);
          }
        });

        es.addEventListener('online_count', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (typeof payload.onlineCount === 'number') {
              setOnlineCount(payload.onlineCount);
            }
          } catch {}
        });

        // 监听到全桌有人开始摇骰
        es.addEventListener('roll_start', (e) => {
          try {
            const payload = JSON.parse(e.data);
            setRollingPlayerName(payload.playerName);
            setIsLocalRolling(true);

            if (soundEnabledRef.current) {
              playRollingSound(1100);
            }

            // 全桌所有人的碗里骰子同时高速翻滚预览
            if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
            rollIntervalRef.current = setInterval(() => {
              setLocalDice(rollRandomDice());
            }, 80);
          } catch (err) {
            console.error('SSE roll_start error', err);
          }
        });

        // 监听到全桌摇骰结算落地
        es.addEventListener('roll_end', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (rollIntervalRef.current) {
              clearInterval(rollIntervalRef.current);
              rollIntervalRef.current = null;
            }

            setIsLocalRolling(false);
            setRollingPlayerName(undefined);

            if (payload.dice) {
              setLocalDice(payload.dice);
            }
            if (payload.gameState) {
              setGameState(payload.gameState);
            }

            if (soundEnabledRef.current && payload.result) {
              playWinJingle(payload.result.category === 'zhuangyuan');
            }

            if (payload.lastRoll && payload.result) {
              const bonusText = payload.awarded && payload.result.bonus > 0 ? ` (+¥${payload.result.bonus})` : '';
              showToast(`🎉【${payload.lastRoll.playerName}】掷出 ${payload.result.title} · ${payload.result.subTitle}${bonusText}`);
            }
          } catch (err) {
            console.error('SSE roll_end error', err);
          }
        });

        es.onerror = () => {
          es?.close();
          // 如果连接失败，标记为本地模式并延迟重试
          setConnectionMode('local');
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch {
        setConnectionMode('local');
      }
    };

    connectSSE();

    // 周期性兜底轮询
    const interval = setInterval(fetchState, 3500);

    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(interval);
      es?.close();
    };
  }, [fetchState]);

  // 3. 玩家登录并加入排队（支持服务端同步与无缝本地兜底）
  const handleJoin = async (name: string, isAi = false) => {
    const trimmedName = name.trim().slice(0, 12);
    if (!trimmedName) return;

    // 先尝试连接后端 Node 服务
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, isAi }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.player) {
          setConnectionMode('online');
          if (!isAi) {
            setMyPlayerId(data.player.id);
            sessionStorage.setItem(SESSION_STORAGE_KEY, data.player.id);
            sessionStorage.setItem(SESSION_STORAGE_NAME, trimmedName);
            showToast(`欢迎【${trimmedName}】入席大桌！已进入博饼排队`);
          } else {
            showToast(`已邀请好友【${trimmedName}】入席`);
          }
          setGameState(data.gameState);
          return;
        }
      }
    } catch {
      // 网络请求或服务不可用，进入本地独立模式
    }

    // === 本地单机/离线优雅降级处理 ===
    setConnectionMode('local');
    const localPlayer: Player = {
      id: 'p_loc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: trimmedName,
      joinedAt: Date.now(),
      totalBonus: 0,
      winsCount: 0,
      isAi,
    };

    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, localPlayer],
      version: prev.version + 1,
    }));

    if (!isAi) {
      setMyPlayerId(localPlayer.id);
      sessionStorage.setItem(SESSION_STORAGE_KEY, localPlayer.id);
      sessionStorage.setItem(SESSION_STORAGE_NAME, trimmedName);
      showToast(`🎉 欢迎【${trimmedName}】！已成功加入博饼排队`);
    } else {
      showToast(`已邀请模拟好友【${trimmedName}】入席`);
    }
  };

  // 4. 玩家退出排队
  const handleLeave = async () => {
    if (!myPlayerId) return;
    try {
      await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId }),
      });
    } catch {
      // 忽略服务端通信失败
    }

    setGameState((prev) => {
      const idx = prev.players.findIndex((p) => p.id === myPlayerId);
      if (idx !== -1) {
        const newPlayers = [...prev.players];
        newPlayers.splice(idx, 1);
        const nextTurn = prev.currentTurnIndex >= newPlayers.length ? 0 : prev.currentTurnIndex;
        return {
          ...prev,
          players: newPlayers,
          currentTurnIndex: nextTurn,
          version: prev.version + 1,
        };
      }
      return prev;
    });

    setMyPlayerId(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_NAME);
    showToast('您已退出当前排队，可换个名字重新加入');
  };

  // 5. 添加模拟好友/电脑玩家
  const handleAddBot = async () => {
    const botNames = [
      '福星小明',
      '状元阿福',
      '金榜小美',
      '鹭岛阿财',
      '闽南小弟',
      '好运锦鲤',
      '探花阿祥',
    ];
    const randomName = botNames[Math.floor(Math.random() * botNames.length)];
    handleJoin(randomName, true);
  };

  // 6. 掷骰子动作（支持全桌广播与本地引擎双模驱动）
  const handleRoll = async (manualDice?: number[]) => {
    if (gameState.players.length === 0) {
      showToast('当前暂无玩家排队，请先在左侧输入姓名入席！');
      return;
    }

    const currentTurn = gameState.players[gameState.currentTurnIndex % gameState.players.length];
    if (!currentTurn) {
      showToast('当前暂无玩家排队，请先入席！');
      return;
    }

    const isAi = Boolean(currentTurn.isAi);
    const effectivePlayerId = isAi || manualDice || !myPlayerId ? currentTurn.id : myPlayerId;

    // 优先尝试服务端 API
    if (connectionMode === 'online') {
      try {
        const res = await fetch('/api/game/roll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: effectivePlayerId,
            manualDice,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return; // 服务端已接管并通过 SSE 广播给全桌
          }
        }
      } catch {
        // 服务端失败则无缝回退到本地摇骰引擎
      }
    }

    // === 本地单机摇骰执行引擎 ===
    setIsLocalRolling(true);
    setRollingPlayerName(currentTurn.name);
    if (soundEnabled) {
      playRollingSound(1100);
    }

    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = setInterval(() => {
      setLocalDice(rollRandomDice());
    }, 80);

    setTimeout(() => {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setIsLocalRolling(false);
      setRollingPlayerName(undefined);

      // 计算点数
      const finalDice = Array.isArray(manualDice) && manualDice.length === 6
        ? manualDice.map((n) => Math.min(6, Math.max(1, Math.floor(n))))
        : rollRandomDice();

      setLocalDice(finalDice);

      setGameState((prev) => {
        const currentP = prev.players[prev.currentTurnIndex % prev.players.length];
        if (!currentP) return prev;

        const nextPrizes = { ...prev.prizes };
        const result: BobingResult = evaluateDice(finalDice, nextPrizes);

        let awarded = false;
        if (result.category !== 'none' && result.isUnlocked) {
          const prizeKey = result.category as keyof PrizePool;
          if (nextPrizes[prizeKey] > 0) {
            nextPrizes[prizeKey]--;
            currentP.totalBonus += result.bonus;
            currentP.winsCount += 1;
            awarded = true;
          }
        }

        const record: RollRecord = {
          id: 'r_loc_' + Date.now(),
          playerId: currentP.id,
          playerName: currentP.name,
          dice: finalDice,
          category: result.category,
          title: result.title,
          subTitle: result.subTitle,
          bonus: result.bonus,
          timestamp: Date.now(),
          awarded,
          note: result.lockReason,
        };

        const newHistory = [record, ...prev.history].slice(0, 60);
        const nextTurn = (prev.currentTurnIndex + 1) % prev.players.length;

        if (soundEnabledRef.current && result) {
          playWinJingle(result.category === 'zhuangyuan');
        }

        const bonusText = awarded && result.bonus > 0 ? ` (+¥${result.bonus})` : '';
        showToast(`🎉【${currentP.name}】掷出 ${result.title} · ${result.subTitle}${bonusText}`);

        return {
          ...prev,
          prizes: nextPrizes,
          history: newHistory,
          lastRoll: {
            playerId: currentP.id,
            playerName: currentP.name,
            dice: finalDice,
            result,
            awarded,
            timestamp: Date.now(),
          },
          currentTurnIndex: nextTurn,
          version: prev.version + 1,
        };
      });
    }, 1100);
  };

  // 7. 重置游戏
  const handleResetGame = async (keepPlayers = resetKeepPlayers) => {
    try {
      await fetch('/api/game/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepPlayers }),
      });
    } catch {
      // 忽略服务端错误
    }

    setGameState((prev) => {
      const updatedPlayers = keepPlayers
        ? prev.players.map((p) => ({ ...p, totalBonus: 0, winsCount: 0 }))
        : [];
      return {
        ...prev,
        players: updatedPlayers,
        prizes: { ...INITIAL_PRIZES },
        history: [],
        lastRoll: null,
        currentTurnIndex: 0,
        isRolling: false,
        version: prev.version + 1,
      };
    });

    setLocalDice([4, 4, 1, 2, 3, 5]);
    setShowResetModal(false);
    showToast('🎉 博饼大局已重开！奖池与分数已全部恢复初始');
  };

  // 复制房间邀请链接
  const handleCopyInvite = () => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('📋 邀请链接已复制！发给好友或在手机打开即可同桌博饼');
      }).catch(() => {
        showToast(`请复制浏览器地址栏链接发给好友即可：${url}`);
      });
    } else {
      showToast(`请复制浏览器地址栏链接发给好友即可：${url}`);
    }
  };

  // 在新标签页打开（方便本地多开多玩家同屏测试）
  const handleOpenNewWindow = () => {
    window.open(window.location.href, '_blank');
  };

  // 当前轮到的玩家判定
  const currentPlayer: Player | undefined =
    gameState.players.length > 0
      ? gameState.players[gameState.currentTurnIndex % gameState.players.length]
      : undefined;

  const isMyTurn = Boolean(currentPlayer && myPlayerId && currentPlayer.id === myPlayerId);
  const isAiTurn = Boolean(currentPlayer && currentPlayer.isAi);
  const canRoll = Boolean(currentPlayer && (isMyTurn || isAiTurn || !myPlayerId));

  // 模拟/电脑玩家自动掷骰逻辑（如果开启自动代摇）
  useEffect(() => {
    if (!currentPlayer || !currentPlayer.isAi || isLocalRolling || !autoRollForAi) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    botTimerRef.current = setTimeout(() => {
      handleRoll();
    }, 2600);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [currentPlayer?.id, currentPlayer?.isAi, isLocalRolling, autoRollForAi]);

  // 空格键快捷掷骰
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && canRoll && !isLocalRolling) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        handleRoll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canRoll, isLocalRolling]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8E0505] via-[#A80B0B] to-[#6E0202] text-amber-50 flex flex-col font-sans">
      {/* 顶部中秋博饼古典祥云横梁 */}
      <header className="bg-[#5C0303]/90 border-b-2 border-amber-400/40 shadow-xl backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#8E0505] rounded-[10px] flex items-center justify-center text-amber-300 font-extrabold text-xl font-serif">
                博
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-amber-300 tracking-wider drop-shadow-md">
                  中秋在线博饼
                </h1>
                {connectionMode === 'online' ? (
                  <div className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] px-2 py-0.5 rounded-full font-medium shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>多人联机中 ({onlineCount}人同桌)</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeployModal(true)}
                    className="flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-500/50 hover:bg-amber-900/80 text-[11px] px-2 py-0.5 rounded-full font-medium shadow-sm cursor-pointer transition-colors"
                    title="当前处于本地单机运行模式。点击查看服务器配置指南以开启全服多人同桌联机"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>本地单机畅玩 (部署帮助)</span>
                    <HelpCircle className="w-3 h-3 text-amber-400" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-amber-200/70 hidden sm:block">
                固定6个骰子 · 全员同屏同桌 · 状元插金花/六杯红/对堂/三红/四进
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 复制邀请链接 */}
            <button
              id="btn-copy-invite"
              onClick={handleCopyInvite}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs border border-amber-300/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="复制当前房间链接发给好友，大家打开即可同桌博饼"
            >
              <Copy className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">邀请同桌好友</span>
              <span className="md:hidden">邀请</span>
            </button>

            {/* 本地多开窗口测试 */}
            <button
              id="btn-open-multiwindow"
              onClick={handleOpenNewWindow}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs border border-amber-300/40 hidden sm:flex items-center gap-1.5 transition-colors cursor-pointer"
              title="在新的标签页中打开，作为第2个玩家同桌博饼（用于本地测试）"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span>多开窗口测试</span>
            </button>

            {/* 重新开局按钮 */}
            <button
              id="btn-header-reset-game"
              onClick={() => setShowResetModal(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-red-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="重新开始博饼整局"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新开局</span>
            </button>

            {/* 音效开关 */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full bg-red-950/60 border border-amber-300/30 text-amber-200 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? '关闭音效' : '开启瓷碗与锣鼓音效'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* 测试与调试工具栏开关 */}
            <button
              onClick={() => setShowTestBar(!showTestBar)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs border border-amber-300/40 flex items-center gap-1 transition-colors cursor-pointer"
              title="展开规则点数测试面板"
            >
              <Dices className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">点数测试</span>
              {showTestBar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* 测试快捷工具栏 (方便用户直接验证图片上的各种组合规则) */}
        {showTestBar && (
          <div className="bg-red-950/95 border-t border-amber-300/30 px-4 py-2.5 text-xs text-amber-100">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>点数快速验证测试：</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleRoll([4, 4, 4, 4, 1, 1])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  状元插金花 (444411)
                </button>
                <button
                  onClick={() => handleRoll([4, 4, 4, 4, 4, 4])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  六杯红 (444444)
                </button>
                <button
                  onClick={() => handleRoll([6, 6, 6, 6, 6, 6])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  六杯黑 (666666)
                </button>
                <button
                  onClick={() => handleRoll([4, 4, 4, 4, 4, 2])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  五王 (444442)
                </button>
                <button
                  onClick={() => handleRoll([3, 3, 3, 3, 3, 4])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  五子带一秀 (333334)
                </button>
                <button
                  onClick={() => handleRoll([3, 3, 3, 3, 3, 2])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  五子登科 (333332)
                </button>
                <button
                  onClick={() => handleRoll([4, 4, 4, 4, 2, 3])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  普通状元 (444423)
                </button>
                <button
                  onClick={() => handleRoll([1, 2, 3, 4, 5, 6])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  榜眼对堂 (123456)
                </button>
                <button
                  onClick={() => handleRoll([4, 4, 4, 1, 2, 3])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  探花三红 (444123)
                </button>
                <button
                  onClick={() => handleRoll([2, 2, 2, 2, 1, 5])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  进士四进 (222215)
                </button>
                <button
                  onClick={() => handleRoll([4, 4, 1, 2, 3, 5])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  举人二举 (441235)
                </button>
                <button
                  onClick={() => handleRoll([4, 1, 2, 3, 5, 6])}
                  className="bg-red-800 hover:bg-red-700 px-2 py-1 rounded border border-amber-300/40 text-amber-200"
                >
                  秀才一秀
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 移动端导航 Tab 切换 */}
      <div className="lg:hidden bg-red-950/90 border-b border-red-800 flex justify-around p-1 text-xs">
        <button
          onClick={() => setActiveTab('game')}
          className={`py-2 px-3 rounded-lg font-bold transition-all ${
            activeTab === 'game' ? 'bg-amber-400 text-red-950 shadow' : 'text-amber-200/70'
          }`}
        >
          🎲 摇骰博饼
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`py-2 px-3 rounded-lg font-bold transition-all ${
            activeTab === 'rules' ? 'bg-amber-400 text-red-950 shadow' : 'text-amber-200/70'
          }`}
        >
          📜 规则奖池
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-2 px-3 rounded-lg font-bold transition-all ${
            activeTab === 'queue' ? 'bg-amber-400 text-red-950 shadow' : 'text-amber-200/70'
          }`}
        >
          👥 排队大厅 ({gameState.players.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 px-3 rounded-lg font-bold transition-all ${
            activeTab === 'history' ? 'bg-amber-400 text-red-950 shadow' : 'text-amber-200/70'
          }`}
        >
          🏆 榜单记录
        </button>
      </div>

      {/* 桌面端三栏布局 & 移动端 Tab 内容 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧栏：排队大厅与榜单 (桌面端占3列，移动端看Tab) */}
        <div
          className={`lg:col-span-4 space-y-6 ${
            activeTab === 'queue' || activeTab === 'history'
              ? 'block'
              : 'hidden lg:block'
          }`}
        >
          {(activeTab === 'queue' || window.innerWidth >= 1024) && (
            <QueuePanel
              players={gameState.players}
              currentTurnIndex={gameState.currentTurnIndex}
              myPlayerId={myPlayerId}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onAddBot={handleAddBot}
            />
          )}

          {(activeTab === 'history' || window.innerWidth >= 1024) && (
            <HistoryBoard
              history={gameState.history}
              players={gameState.players}
              onResetGame={() => setShowResetModal(true)}
            />
          )}
        </div>

        {/* 中间核心区：大瓷碗与骰子舞台 (桌面端占4列，移动端看Tab) */}
        <div
          className={`lg:col-span-4 flex flex-col items-center justify-center ${
            activeTab === 'game' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* 当前掷骰者提醒卡片 */}
          <div className="w-full bg-red-950/70 border border-amber-300/40 rounded-2xl p-3 mb-4 text-center shadow-lg">
            <div className="text-xs text-amber-200/80 flex items-center justify-between px-1">
              <span>{isLocalRolling ? '🎲 正在大力摇骰中' : '当前回合掷骰玩家'}</span>
              {currentPlayer?.isAi && (
                <label className="text-[11px] flex items-center gap-1 cursor-pointer select-none text-amber-300 hover:text-amber-100">
                  <input
                    type="checkbox"
                    checked={autoRollForAi}
                    onChange={(e) => setAutoRollForAi(e.target.checked)}
                    className="accent-amber-400 cursor-pointer"
                  />
                  <span>开启模拟人自动掷骰</span>
                </label>
              )}
            </div>
            <div className="text-lg font-black text-amber-300 mt-1 flex items-center justify-center gap-2">
              <span>{isLocalRolling ? (rollingPlayerName || currentPlayer?.name || '玩家') : (currentPlayer ? currentPlayer.name : '暂无玩家排队')}</span>
              {isLocalRolling ? (
                <span className="bg-amber-400 text-red-950 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                  翻滚中...
                </span>
              ) : (
                <>
                  {isMyTurn && (
                    <span className="bg-amber-400 text-red-950 text-xs px-2 py-0.5 rounded-full font-bold animate-bounce">
                      轮到你啦
                    </span>
                  )}
                  {isAiTurn && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-300/40 text-xs px-2 py-0.5 rounded-full font-semibold">
                      模拟好友 (您可点击下方直接代摇)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 瓷碗与6个骰子 */}
          <Bowl
            dice={localDice}
            isRolling={isLocalRolling}
            canRoll={canRoll}
            onRoll={() => handleRoll()}
            lastResult={gameState.lastRoll?.result}
            awarded={gameState.lastRoll?.awarded}
            currentTurnPlayerName={currentPlayer?.name}
            rollingPlayerName={rollingPlayerName}
            isMyTurn={isMyTurn}
            isAiTurn={isAiTurn}
          />
        </div>

        {/* 右侧栏：1:1还原图片规则表格 (桌面端占4列，移动端看Tab) */}
        <div
          className={`lg:col-span-4 ${
            activeTab === 'rules' ? 'block' : 'hidden lg:block'
          }`}
        >
          <RulesTable prizes={gameState.prizes} />
        </div>
      </main>

      {/* 底部版权与民俗文化介绍 */}
      <footer className="bg-red-950/80 border-t border-red-900 py-3 text-center text-xs text-amber-200/60">
        <p>闽南传统中秋博饼 · 状元争霸 · 六骰成礼 · 阖家欢聚</p>
      </footer>

      {/* 重新开局自定义弹窗 (不使用原生 confirm，在 iframe 中稳定可靠) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#8E0505] border-2 border-amber-300 text-amber-50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-300">
              <RotateCcw className="w-6 h-6 animate-spin" />
              <h3 className="text-lg font-bold">确定要重新开局吗？</h3>
            </div>
            <div className="text-sm text-amber-100/90 leading-relaxed bg-red-950/60 p-3.5 rounded-xl border border-red-800">
              <p className="font-semibold text-amber-200">重新开局将恢复全部奖池：</p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-xs text-amber-200/80">
                <li>全部 87 份奖品补满（状元1份198元、榜眼3份、探花8份、进士15份、举人20份、秀才40份）</li>
                <li>清空所有掷骰历史记录与中奖流水</li>
                <li>所有玩家累计奖金清零，从第 1 位玩家重新开始排队轮候</li>
              </ul>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetKeepPlayers}
                  onChange={(e) => setResetKeepPlayers(e.target.checked)}
                  className="accent-amber-400 w-4 h-4 cursor-pointer"
                />
                <span>保留当前排队玩家名单（取消勾选则清空排队大厅）</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-amber-300/30 text-amber-200 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                id="btn-confirm-reset"
                onClick={() => handleResetGame(resetKeepPlayers)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-red-950 font-bold text-xs shadow-lg active:scale-95 cursor-pointer"
              >
                确认重开局
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 服务器部署与多人联机配置指南弹窗 */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#8E0505] border-2 border-amber-300 text-amber-50 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-red-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300">
                <Server className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold">服务器多人同桌联机配置指南</h3>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="text-amber-200/70 hover:text-white text-xs px-2 py-1 bg-red-950/60 rounded-lg cursor-pointer"
              >
                ✕ 关闭
              </button>
            </div>

            <div className="space-y-3 text-xs text-amber-100/90 leading-relaxed">
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 text-emerald-200">
                <p className="font-bold flex items-center gap-1.5 text-emerald-300 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  当前状态：本地单机引擎已就绪，可正常畅玩
                </p>
                <p className="text-[11px] text-emerald-200/80">
                  您可以在此输入名字排队、添加电脑模拟人、博取状元插金花/六杯红并记录奖池。
                </p>
              </div>

              <div className="bg-red-950/70 border border-amber-400/30 rounded-xl p-3 space-y-2">
                <p className="font-bold text-amber-300">
                  💡 为什么提示未连接服务端？
                </p>
                <p className="text-[11px] text-amber-200/80">
                  如果您将代码放到自己的 Linux / 宝塔 / 阿里云 / 腾讯云服务器：
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/70">
                  <li><strong>原因 1：仅部署了静态 HTML</strong>。多人实时同桌依赖 Node.js 提供的 SSE 广播后端，需启动 Node 服务。</li>
                  <li><strong>原因 2：Nginx 未反向代理 /api/</strong>。如果前端在 Nginx 80 端口，需把接口转发给 Node 服务的 3000 端口。</li>
                </ul>
              </div>

              <div className="bg-black/40 border border-amber-300/30 rounded-xl p-3 space-y-2 font-mono text-[11px]">
                <p className="text-amber-300 font-sans font-bold text-xs">🚀 极速启动多人联机服务端 (两步)：</p>
                <div className="bg-black/60 p-2.5 rounded-lg text-emerald-300 overflow-x-auto select-all">
                  <p># 1. 编译并启动 Node.js 全双工服务</p>
                  <p>npm run build</p>
                  <p>npm start  # 或者用 pm2: pm2 start dist/server.cjs --name bobing</p>
                </div>
                <div className="bg-black/60 p-2.5 rounded-lg text-amber-200/90 overflow-x-auto select-all">
                  <p className="text-amber-400 font-sans font-bold mb-1"># 2. Nginx 反代配置参考 (支持 SSE 实时长连接)：</p>
                  <pre className="text-[10px] leading-tight text-amber-100">
{`location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    # 关键：关闭缓冲区以保证 SSE 广播毫秒级推送
    proxy_buffering off;
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-red-950 font-bold text-xs shadow-md cursor-pointer"
              >
                我知道了，返回游戏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 优雅轻量 Toast 浮层 */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-red-900 via-red-950 to-red-900 border-2 border-amber-300 text-amber-200 px-5 py-2.5 rounded-full shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
