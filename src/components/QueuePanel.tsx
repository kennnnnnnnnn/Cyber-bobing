import React, { useState } from 'react';
import { Player } from '../types';
import { Users, UserPlus, LogOut, Award, Clock, Sparkles } from 'lucide-react';

interface QueuePanelProps {
  players: Player[];
  currentTurnIndex: number;
  myPlayerId: string | null;
  onJoin: (name: string) => void;
  onLeave: () => void;
  onAddBot: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  players,
  currentTurnIndex,
  myPlayerId,
  onJoin,
  onLeave,
  onAddBot,
}) => {
  const [inputName, setInputName] = useState('');

  const myPlayer = players.find((p) => p.id === myPlayerId);
  const myIndex = myPlayer ? players.findIndex((p) => p.id === myPlayerId) : -1;
  const isMyTurn = myIndex === currentTurnIndex;

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      onJoin(inputName.trim());
      setInputName('');
    }
  };

  return (
    <div className="bg-[#B71C1C]/90 backdrop-blur-md rounded-2xl border-2 border-amber-300/60 p-4 sm:p-5 shadow-xl text-amber-50">
      {/* 头部 */}
      <div className="flex items-center justify-between pb-3 border-b border-red-700/60 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-300" />
          <h3 className="font-bold text-amber-200 text-base sm:text-lg">
            博饼排队大厅 ({players.length}人)
          </h3>
        </div>
        <button
          onClick={onAddBot}
          className="text-xs bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/40 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
          title="添加一个聚会好友或电脑玩家一起排队"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ 添加模拟好友</span>
        </button>
      </div>

      {/* 玩家自身状态与登录入口 */}
      {!myPlayer ? (
        <form onSubmit={handleJoinSubmit} className="mb-4 bg-red-950/60 p-3.5 rounded-xl border border-amber-300/40">
          <div className="text-xs text-amber-200/90 mb-2 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>输入姓名即可登录并排队摇骰：</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              id="input-player-name"
              placeholder="请输入您的尊姓大名..."
              maxLength={12}
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="flex-1 bg-red-900/60 border border-amber-300/40 rounded-lg px-3 py-2 text-sm text-white placeholder-red-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              id="btn-login-join"
              disabled={!inputName.trim()}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 disabled:opacity-50 text-red-950 font-bold px-4 py-2 rounded-lg text-sm shadow-md transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              登录排队
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-4 bg-gradient-to-r from-red-950/80 to-red-900/80 p-3 rounded-xl border border-amber-300/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
              <span>当前玩家：</span>
              <span className="text-sm text-white font-bold">{myPlayer.name}</span>
              {myPlayer.totalBonus > 0 && (
                <span className="bg-amber-400 text-red-950 text-[11px] px-1.5 py-0.2 rounded font-mono font-bold">
                  ¥{myPlayer.totalBonus.toFixed(1)}
                </span>
              )}
            </div>
            <div className="text-xs text-amber-200/80 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {isMyTurn ? (
                <span className="text-amber-300 font-bold animate-pulse">
                  🎯 轮到你了！请点击大碗或下方按钮掷骰！
                </span>
              ) : (
                <span>
                  当前排在第 <strong className="text-white font-mono">{myIndex + 1}</strong> 位
                  {myIndex > currentTurnIndex
                    ? ` (前还有 ${myIndex - currentTurnIndex} 人)`
                    : ` (稍后轮候)`}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onLeave}
            className="text-xs text-red-200 hover:text-white bg-red-950/60 hover:bg-red-900 px-2.5 py-1.5 rounded-lg border border-red-800 flex items-center gap-1 transition-colors cursor-pointer"
            title="退出排队"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出</span>
          </button>
        </div>
      )}

      {/* 排队人员列表 */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {players.length === 0 ? (
          <div className="text-center py-6 text-xs text-amber-200/60">
            暂无玩家排队，快输入姓名加入吧！
          </div>
        ) : (
          players.map((p, idx) => {
            const isTurn = idx === currentTurnIndex;
            const isMe = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                className={`
                  flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs
                  ${
                    isTurn
                      ? 'bg-gradient-to-r from-amber-400/20 via-red-900/60 to-amber-400/20 border-amber-300 ring-2 ring-amber-400/30'
                      : 'bg-red-950/40 border-red-800/60'
                  }
                  ${isMe ? 'font-semibold' : ''}
                `}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`
                      w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono
                      ${isTurn ? 'bg-amber-400 text-red-950' : 'bg-red-900 text-amber-200'}
                    `}
                  >
                    {idx + 1}
                  </span>
                  <div className="truncate flex items-center gap-1.5">
                    <span className={`truncate ${isTurn ? 'text-amber-200' : 'text-white'}`}>
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] bg-red-800 text-amber-200 px-1.5 py-0.2 rounded border border-amber-300/40">
                        我
                      </span>
                    )}
                    {p.isAi && (
                      <span className="text-[10px] bg-red-950/80 text-amber-200/60 px-1 py-0.2 rounded">
                        客
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.totalBonus > 0 && (
                    <div className="flex items-center gap-0.5 text-amber-300 font-mono">
                      <Award className="w-3 h-3" />
                      <span>¥{p.totalBonus.toFixed(1)}</span>
                    </div>
                  )}

                  {isTurn ? (
                    <span className="bg-amber-400 text-red-950 px-2 py-0.5 rounded-full font-bold text-[10px] animate-pulse">
                      掷骰中
                    </span>
                  ) : (
                    <span className="text-amber-200/50 text-[11px]">等待中</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
