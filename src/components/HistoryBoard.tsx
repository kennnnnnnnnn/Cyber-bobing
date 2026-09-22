import React, { useState } from 'react';
import { Player, RollRecord } from '../types';
import { Trophy, History, RefreshCw, Sparkles } from 'lucide-react';
import { Dice } from './Dice';

interface HistoryBoardProps {
  history: RollRecord[];
  players: Player[];
  onResetGame: () => void;
}

export const HistoryBoard: React.FC<HistoryBoardProps> = ({
  history,
  players,
  onResetGame,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'rank'>('history');

  // 按中奖总额排序的排行榜
  const rankedPlayers = [...players].sort((a, b) => b.totalBonus - a.totalBonus);

  // 状元获得者记录
  const zhuangyuanWinners = history.filter((h) => h.category === 'zhuangyuan' && h.awarded);

  return (
    <div className="bg-[#B71C1C]/90 backdrop-blur-md rounded-2xl border-2 border-amber-300/60 p-4 sm:p-5 shadow-xl text-amber-50">
      {/* 头部切换 */}
      <div className="flex items-center justify-between pb-3 border-b border-red-700/60 mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer
              ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-red-950 shadow-md'
                  : 'bg-red-950/60 text-amber-200 hover:bg-red-900'
              }
            `}
          >
            <History className="w-3.5 h-3.5" />
            <span>实时掷骰流水 ({history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rank')}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer
              ${
                activeTab === 'rank'
                  ? 'bg-amber-400 text-red-950 shadow-md'
                  : 'bg-red-950/60 text-amber-200 hover:bg-red-900'
              }
            `}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>中奖英雄榜</span>
          </button>
        </div>

        <button
          id="btn-board-reset-game"
          onClick={onResetGame}
          className="text-xs bg-red-950/80 hover:bg-red-900 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-300/40 flex items-center gap-1 transition-colors cursor-pointer"
          title="重置整局博饼奖池与记录"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
          <span>重新开局</span>
        </button>
      </div>

      {/* 状元榜高亮提醒 */}
      {zhuangyuanWinners.length > 0 && (
        <div className="mb-3 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 p-2.5 rounded-xl border border-amber-300 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>当前状元头衔：</span>
            <strong className="text-white text-sm">
              {zhuangyuanWinners[zhuangyuanWinners.length - 1].playerName}
            </strong>
            <span className="text-amber-300 font-semibold">
              ({zhuangyuanWinners[zhuangyuanWinners.length - 1].subTitle})
            </span>
          </div>
          <span className="bg-red-900/80 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-300/40">
            ¥198
          </span>
        </div>
      )}

      {/* 标签页 1：掷骰历史流水 */}
      {activeTab === 'history' && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-xs text-amber-200/60">
              博饼大碗已备好，快摇出第一把好彩头！
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="bg-red-950/40 border border-red-800/60 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-amber-400/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{record.playerName}</span>
                    <span
                      className={`
                        px-1.5 py-0.2 rounded text-[11px] font-medium
                        ${
                          record.category === 'zhuangyuan'
                            ? 'bg-amber-400 text-red-950 font-bold'
                            : record.category !== 'none'
                            ? 'bg-red-800 text-amber-200'
                            : 'bg-black/30 text-amber-200/50'
                        }
                      `}
                    >
                      {record.title} · {record.subTitle}
                    </span>
                    {record.bonus > 0 && record.awarded && (
                      <span className="text-amber-300 font-mono font-bold">
                        +¥{record.bonus}
                      </span>
                    )}
                    {record.bonus > 0 && !record.awarded && (
                      <span className="text-[10px] text-amber-100/40">
                        (该奖已领完)
                      </span>
                    )}
                  </div>
                  {/* 点数小图标 */}
                  <div className="flex items-center gap-1">
                    {record.dice.map((d, i) => (
                      <Dice key={i} value={d} size="sm" />
                    ))}
                  </div>
                </div>

                <div className="text-right text-[10px] text-amber-200/40">
                  {new Date(record.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 标签页 2：英雄金榜 */}
      {activeTab === 'rank' && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {rankedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-2.5 rounded-xl border text-xs
                ${
                  idx === 0 && player.totalBonus > 0
                    ? 'bg-amber-400/20 border-amber-300 text-amber-100'
                    : 'bg-red-950/40 border-red-800/60'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono
                    ${
                      idx === 0
                        ? 'bg-amber-400 text-red-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-900'
                        : idx === 2
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-red-900 text-amber-200/60'
                    }
                  `}
                >
                  {idx + 1}
                </span>
                <span className="font-semibold text-white">{player.name}</span>
                {player.winsCount > 0 && (
                  <span className="text-[10px] text-amber-200/60">
                    中奖 {player.winsCount} 次
                  </span>
                )}
              </div>

              <div className="font-mono font-bold text-sm text-amber-300">
                ¥{player.totalBonus.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
