import { useEffect, useState, useRef, useCallback } from 'react';
import { GameState, Player } from './types';
import { INITIAL_PRIZES, rollRandomDice } from './utils/bobingRules';
import { Bowl } from './components/Bowl';
import { RulesTable } from './components/RulesTable';
import { QueuePanel } from './components/QueuePanel';
import { HistoryBoard } from './components/HistoryBoard';
import { playRollingSound, playWinJingle } from './utils/audio';
import { Volume2, VolumeX, Sparkles, Dices, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'bobing_my_player_id';
const LOCAL_STORAGE_NAME = 'bobing_my_player_name';

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

  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY);
  });

  const [localDice, setLocalDice] = useState<number[]>([4, 4, 1, 2, 3, 5]);
  const [isLocalRolling, setIsLocalRolling] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showTestBar, setShowTestBar] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetKeepPlayers, setResetKeepPlayers] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoRollForAi, setAutoRollForAi] = useState(false); // 默认不自动代摇，由用户手动点击开始
  const [activeTab, setActiveTab] = useState<'game' | 'rules' | 'queue' | 'history'>('game');

  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // 1. 获取后端游戏状态
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/state');
      if (res.ok) {
        const data: GameState = await res.json();
        setGameState(data);
        if (data.lastRoll && !isLocalRolling) {
          setLocalDice(data.lastRoll.dice);
        }
      }
    } catch {
      // 离线备用，不报错中断
    }
  }, [isLocalRolling]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1800);
    return () => clearInterval(interval);
  }, [fetchState]);

  // 如果本地有保存的名字但还没在当前房间中，自动尝试同步加入
  useEffect(() => {
    const savedName = localStorage.getItem(LOCAL_STORAGE_NAME);
    if (savedName && !myPlayerId) {
      handleJoin(savedName);
    }
  }, [myPlayerId]);

  // 2. 玩家登录并加入排队
  const handleJoin = async (name: string) => {
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success && data.player) {
        setMyPlayerId(data.player.id);
        localStorage.setItem(LOCAL_STORAGE_KEY, data.player.id);
        localStorage.setItem(LOCAL_STORAGE_NAME, name);
        setGameState(data.gameState);
      }
    } catch (err) {
      console.error('加入排队失败', err);
    }
  };

  // 3. 玩家退出排队
  const handleLeave = async () => {
    if (!myPlayerId) return;
    try {
      await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId }),
      });
      setMyPlayerId(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      fetchState();
    } catch (err) {
      console.error('退出排队失败', err);
    }
  };

  // 4. 添加模拟好友/电脑玩家
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
    try {
      await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: randomName, isAi: true }),
      });
      fetchState();
    } catch (err) {
      console.error('添加玩家失败', err);
    }
  };

  // 5. 掷骰子动作
  const handleRoll = async (manualDice?: number[]) => {
    const currentTurn = gameState.players[gameState.currentTurnIndex % gameState.players.length];
    if (!currentTurn) {
      showToast('当前暂无玩家排队，请先在左侧输入姓名加入！');
      return;
    }

    // 确定掷骰主体：如果是模拟人或手动指定点数或未登录状态，使用 currentTurn.id
    const isAi = Boolean(currentTurn.isAi);
    const effectivePlayerId = isAi || manualDice || !myPlayerId ? currentTurn.id : myPlayerId;

    setIsLocalRolling(true);
    if (soundEnabled) {
      playRollingSound(1000);
    }

    // 前端产生翻滚随机预览
    const rollInterval = setInterval(() => {
      setLocalDice(rollRandomDice());
    }, 80);

    setTimeout(async () => {
      clearInterval(rollInterval);
      try {
        const res = await fetch('/api/game/roll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: effectivePlayerId,
            manualDice,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setLocalDice(data.dice);
          setGameState(data.gameState);
          setIsLocalRolling(false);
          if (soundEnabled && data.result) {
            playWinJingle(data.result.category === 'zhuangyuan');
          }
          if (data.result) {
            const prefix = isAi ? `【${currentTurn.name}】` : '恭喜您！';
            showToast(`${prefix}摇出 ${data.result.title} · ${data.result.subTitle}${data.awarded && data.result.bonus > 0 ? ` (+¥${data.result.bonus})` : ''}`);
          }
        } else {
          setIsLocalRolling(false);
          showToast(data.error || '掷骰失败');
        }
      } catch {
        setIsLocalRolling(false);
        showToast('网络通信异常，请重试');
      }
    }, 1100);
  };

  // 6. 重置游戏
  const handleResetGame = async (keepPlayers = resetKeepPlayers) => {
    try {
      const res = await fetch('/api/game/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepPlayers }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
        setLocalDice([4, 4, 1, 2, 3, 5]);
        setShowResetModal(false);
        showToast('🎉 博饼大局已重开！奖池与分数已全部恢复初始');
      }
    } catch (err) {
      console.error('重置失败', err);
      showToast('重置失败，请重试');
    }
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
        // 如果焦点在输入框中则不触发
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
                <span className="bg-amber-400/20 text-amber-200 text-[11px] px-2 py-0.5 rounded-full border border-amber-300/40 hidden sm:inline">
                  闽南传统民俗 · 现金大奖
                </span>
              </div>
              <p className="text-[11px] text-amber-200/70 hidden sm:block">
                固定6个骰子 · 登录姓名排队摇骰 · 状元插金花/六杯红/对堂/三红/四进
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              <span>当前回合掷骰玩家</span>
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
              <span>{currentPlayer ? currentPlayer.name : '暂无玩家排队'}</span>
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
