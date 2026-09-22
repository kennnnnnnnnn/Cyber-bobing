import React from 'react';
import { Dice } from './Dice';
import { motion, AnimatePresence } from 'motion/react';
import { BobingResult } from '../types';

interface BowlProps {
  dice: number[];
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  lastResult?: BobingResult | null;
  awarded?: boolean;
  currentTurnPlayerName?: string;
  isMyTurn?: boolean;
  isAiTurn?: boolean;
}

export const Bowl: React.FC<BowlProps> = ({
  dice,
  isRolling,
  canRoll,
  onRoll,
  lastResult,
  awarded,
  currentTurnPlayerName,
  isMyTurn = false,
  isAiTurn = false,
}) => {
  // 6个骰子的相对散落坐标（百分比及旋转度）
  const dicePositions = [
    { top: '30%', left: '32%', rotate: -12 },
    { top: '28%', left: '55%', rotate: 18 },
    { top: '48%', left: '26%', rotate: 8 },
    { top: '50%', left: '48%', rotate: -5 },
    { top: '46%', left: '68%', rotate: 22 },
    { top: '65%', left: '42%', rotate: -15 },
  ];

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-[460px] mx-auto">
      {/* 顶部中奖揭晓横幅 */}
      <div className="h-16 flex items-center justify-center w-full mb-2">
        <AnimatePresence mode="wait">
          {lastResult && !isRolling && (
            <motion.div
              key={`${lastResult.title}-${lastResult.subTitle}`}
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`
                px-5 py-2 rounded-full font-bold shadow-lg border flex items-center gap-2
                ${
                  lastResult.category === 'zhuangyuan'
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-red-950 border-amber-200 ring-4 ring-amber-400/40 text-lg'
                    : lastResult.category !== 'none'
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 text-amber-100 border-amber-300/40 text-base'
                    : 'bg-red-950/70 text-amber-200/70 border-red-800 text-sm'
                }
              `}
            >
              <span className="tracking-wide">
                {lastResult.title} · {lastResult.subTitle}
              </span>
              {lastResult.bonus > 0 && awarded && (
                <span className="bg-red-800 text-amber-200 px-2.5 py-0.5 rounded-full text-xs border border-amber-300/40 font-mono">
                  +¥{lastResult.bonus}
                </span>
              )}
              {lastResult.bonus > 0 && !awarded && (
                <span className="bg-black/30 text-white/80 px-2 py-0.5 rounded-full text-xs font-normal">
                  (已抽完未获奖)
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 大青花瓷红碗 */}
      <motion.div
        animate={
          isRolling
            ? {
                rotate: [0, -3, 3, -2, 2, 0],
                x: [0, -6, 6, -4, 4, 0],
                y: [0, -4, 2, -2, 0],
                transition: { repeat: Infinity, duration: 0.25 },
              }
            : { rotate: 0, x: 0, y: 0 }
        }
        className="relative w-[340px] h-[340px] sm:w-[410px] sm:h-[410px] rounded-full p-6 shadow-2xl flex items-center justify-center cursor-pointer group"
        onClick={() => {
          if (canRoll && !isRolling) {
            onRoll();
          }
        }}
        style={{
          background: 'radial-gradient(circle, #FCFBF7 35%, #EDE3D1 75%, #D4C3A3 100%)',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 6px 16px rgba(255, 255, 255, 0.8), inset 0 -10px 24px rgba(78, 42, 10, 0.35)',
          border: '12px solid #C41C1C',
        }}
      >
        {/* 青花/回纹装饰内圈 */}
        <div
          className="absolute inset-2 rounded-full border-2 border-dashed border-red-700/30 pointer-events-none"
        />
        <div
          className="absolute inset-5 rounded-full border border-amber-600/20 pointer-events-none"
        />

        {/* 碗底中心博饼传统吉祥“博”或祥云水波暗纹 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-700/10 font-black text-8xl pointer-events-none select-none font-serif">
          博
        </div>

        {/* 6个固定骰子容器 */}
        <div className="relative w-full h-full">
          {dice.map((val, idx) => {
            const pos = dicePositions[idx] || { top: '50%', left: '50%', rotate: 0 };
            return (
              <motion.div
                key={idx}
                className="absolute"
                style={{
                  top: pos.top,
                  left: pos.left,
                }}
                animate={
                  isRolling
                    ? {
                        x: [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 80, 0],
                        y: [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 80, 0],
                        rotate: [pos.rotate, pos.rotate + 360 * (Math.random() > 0.5 ? 1 : -1)],
                        scale: [1, 1.15, 0.9, 1],
                        transition: { repeat: Infinity, duration: 0.3 + idx * 0.05 },
                      }
                    : {
                        x: 0,
                        y: 0,
                        rotate: pos.rotate,
                        scale: 1,
                        transition: { type: 'spring', damping: 12 },
                      }
                }
              >
                <Dice
                  value={val}
                  size="xl"
                  isRolling={isRolling}
                  className="shadow-2xl"
                />
              </motion.div>
            );
          })}
        </div>

        {/* 碗悬停操作遮罩提示（轮到当前玩家或模拟玩家且未在摇时） */}
        {canRoll && !isRolling && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-red-600 text-amber-100 font-bold px-4 py-2 rounded-full shadow-lg border border-amber-300 transform scale-105">
              {isAiTurn ? `点击帮【${currentTurnPlayerName}】摇骰 🎲` : '点击大碗摇骰 🎲'}
            </span>
          </div>
        )}
      </motion.div>

      {/* 底部按钮及快捷状态 */}
      <div className="mt-5 flex flex-col items-center gap-2">
        <button
          id="btn-roll-dice"
          disabled={!canRoll || isRolling}
          onClick={onRoll}
          className={`
            px-8 py-3.5 rounded-full font-bold text-lg shadow-xl tracking-wider transition-all duration-200
            flex items-center gap-2 border-2
            ${
              canRoll && !isRolling
                ? isAiTurn
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-red-950 border-amber-200 hover:brightness-110 active:scale-95 shadow-amber-500/30 cursor-pointer'
                  : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-red-950 border-amber-100 hover:brightness-110 active:scale-95 shadow-amber-500/30 cursor-pointer animate-pulse'
                : 'bg-red-950/80 text-amber-200/40 border-red-900/60 cursor-not-allowed'
            }
          `}
        >
          <span>
            {isRolling
              ? '🎲 骰子翻滚中...'
              : isMyTurn
              ? '🎲 掷骰博饼 (轮到你了)'
              : isAiTurn
              ? `🎲 帮【${currentTurnPlayerName}】摇骰 (点击开始)`
              : canRoll
              ? '🎲 掷骰博饼 (点击开始)'
              : '等待排队轮候...'}
          </span>
        </button>
        <span className="text-xs text-amber-200/70">
          {canRoll
            ? isAiTurn
              ? `当前是【${currentTurnPlayerName}】的回合，您可以点击直接替他摇骰`
              : '轮到你了！可直接点击大碗或按空格键掷骰'
            : `当前非你的回合，请耐心等候【${currentTurnPlayerName || '前一位玩家'}】`}
        </span>
      </div>
    </div>
  );
};
