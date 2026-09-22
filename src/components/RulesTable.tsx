import React from 'react';
import { PrizePool } from '../types';
import { Dice } from './Dice';
import { checkSpecialZhuangyuanUnlocked, checkNormalZhuangyuanUnlocked } from '../utils/bobingRules';

interface RulesTableProps {
  prizes: PrizePool;
}

export const RulesTable: React.FC<RulesTableProps> = ({ prizes }) => {
  const isSpecialUnlocked = checkSpecialZhuangyuanUnlocked(prizes);
  const isNormalUnlocked = checkNormalZhuangyuanUnlocked(prizes);

  return (
    <div className="bg-[#D32F2F] text-white rounded-2xl border-4 border-amber-300 shadow-2xl overflow-hidden max-w-2xl mx-auto">
      {/* 规则表头部 */}
      <div className="bg-[#B71C1C] px-4 py-3 border-b-2 border-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <h3 className="font-bold text-lg text-amber-200 tracking-wider">
            中秋博饼奖项规则与奖池明细
          </h3>
        </div>
        <span className="text-xs bg-amber-400 text-red-950 font-bold px-2.5 py-1 rounded-full">
          固定6个骰子
        </span>
      </div>

      {/* 规则表格主体 */}
      <div className="overflow-x-auto text-sm">
        <table className="w-full border-collapse border border-red-700">
          <tbody>
            {/* 1. 状元 (占多行) */}
            <tr className="border-b border-red-700/60">
              <td
                rowSpan={7}
                className="w-20 sm:w-24 text-center font-bold bg-[#C62828] border-r-2 border-amber-300 p-2"
              >
                <div className="text-lg text-amber-300 font-extrabold">状元</div>
                <div className="text-xs text-amber-100/90 mt-0.5 font-mono">
                  (剩 {prizes.zhuangyuan}/1 份)
                </div>
              </td>
              <td className="w-24 sm:w-28 text-center font-medium py-2 px-1 border-r border-red-700/60 bg-red-700/40">
                状元插金花
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={1} size="sm" />
                  <Dice value={1} size="sm" />
                </div>
              </td>
              <td
                rowSpan={7}
                className="w-36 sm:w-48 p-2.5 text-xs bg-red-900/40 border-l border-red-700/60 align-middle"
              >
                <div className="text-center font-extrabold text-amber-300 text-base mb-1.5 font-mono">
                  198元现金
                </div>
                <div className="space-y-1.5 text-[11px] leading-relaxed text-amber-50/90">
                  <div className="p-1 rounded bg-red-950/40 border border-red-800">
                    <span className="font-semibold text-amber-300">① 初始开放：</span>
                    <span>插金花、六杯红、六杯黑</span>
                  </div>
                  <div
                    className={`p-1 rounded border transition-colors ${
                      isSpecialUnlocked
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                        : 'bg-red-950/40 border-red-800 text-amber-100/70'
                    }`}
                  >
                    <span className="font-semibold">
                      {isSpecialUnlocked ? '✅ 已解锁：' : '🔒 解锁需：'}
                    </span>
                    <span>举人/秀才抽完后开放所有特殊状元 (五王/五子)</span>
                  </div>
                  <div
                    className={`p-1 rounded border transition-colors ${
                      isNormalUnlocked
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                        : 'bg-red-950/40 border-red-800 text-amber-100/70'
                    }`}
                  >
                    <span className="font-semibold">
                      {isNormalUnlocked ? '✅ 已解锁：' : '🔒 解锁需：'}
                    </span>
                    <span>其余所有奖项抽完后才开放普通状元</span>
                  </div>
                </div>
              </td>
            </tr>

            {/* 六杯红 */}
            <tr className="border-b border-red-700/60 bg-red-600/20">
              <td className="text-center font-medium py-2 px-1 border-r border-red-700/60">
                六杯红
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                </div>
              </td>
            </tr>

            {/* 六杯黑 */}
            <tr className="border-b border-red-700/60">
              <td className="text-center font-medium py-2 px-1 border-r border-red-700/60">
                六杯黑
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={6} size="sm" />
                  <Dice value={6} size="sm" />
                  <Dice value={6} size="sm" />
                  <Dice value={6} size="sm" />
                  <Dice value={6} size="sm" />
                  <Dice value={6} size="sm" />
                </div>
              </td>
            </tr>

            {/* 五王 */}
            <tr className="border-b border-red-700/60 bg-red-600/20">
              <td className="text-center font-medium py-2 px-1 border-r border-red-700/60 flex items-center justify-center gap-1">
                <span>五王</span>
                {!isSpecialUnlocked && (
                  <span className="text-[10px] bg-red-950 px-1 py-0.2 rounded text-amber-300">
                    锁
                  </span>
                )}
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice size="sm" />
                </div>
              </td>
            </tr>

            {/* 五子带一秀 */}
            <tr className="border-b border-red-700/60">
              <td className="text-center font-medium py-2 px-1 border-r border-red-700/60">
                五子带一秀
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={4} size="sm" />
                </div>
              </td>
            </tr>

            {/* 五子登科 */}
            <tr className="border-b border-red-700/60 bg-red-600/20">
              <td className="text-center font-medium py-2 px-1 border-r border-red-700/60">
                五子登科
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice size="sm" />
                </div>
              </td>
            </tr>

            {/* 普通状元 */}
            <tr className="border-b-2 border-amber-300">
              <td className="text-center font-medium py-2 px-1 border-r border-red-700/60 flex items-center justify-center gap-1">
                <span>状元</span>
                {!isNormalUnlocked && (
                  <span className="text-[10px] bg-red-950 px-1 py-0.2 rounded text-amber-300">
                    锁
                  </span>
                )}
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                </div>
              </td>
            </tr>

            {/* 2. 榜眼 (3份) */}
            <tr className="border-b border-red-700/60 bg-red-800/30">
              <td className="text-center font-bold bg-[#C62828] border-r-2 border-amber-300 p-2">
                <div className="text-base text-amber-200">榜眼</div>
                <div className="text-[11px] text-amber-100/90 font-mono">
                  (剩 {prizes.bangyan}/3 份)
                </div>
              </td>
              <td className="text-center font-medium py-2.5 px-1 border-r border-red-700/60">
                对堂
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={1} size="sm" />
                  <Dice value={2} size="sm" />
                  <Dice value={3} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={5} size="sm" />
                  <Dice value={6} size="sm" />
                </div>
              </td>
              <td className="p-2 text-center font-bold text-amber-300 font-mono">
                88.8元现金
              </td>
            </tr>

            {/* 3. 探花 (8份) */}
            <tr className="border-b border-red-700/60">
              <td className="text-center font-bold bg-[#C62828] border-r-2 border-amber-300 p-2">
                <div className="text-base text-amber-200">探花</div>
                <div className="text-[11px] text-amber-100/90 font-mono">
                  (剩 {prizes.tanhua}/8 份)
                </div>
              </td>
              <td className="text-center font-medium py-2.5 px-1 border-r border-red-700/60">
                三红
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                </div>
              </td>
              <td className="p-2 text-center font-bold text-amber-300 font-mono">
                58.8元现金
              </td>
            </tr>

            {/* 4. 进士 (15份) */}
            <tr className="border-b border-red-700/60 bg-red-800/30">
              <td className="text-center font-bold bg-[#C62828] border-r-2 border-amber-300 p-2">
                <div className="text-base text-amber-200">进士</div>
                <div className="text-[11px] text-amber-100/90 font-mono">
                  (剩 {prizes.jinshi}/15 份)
                </div>
              </td>
              <td className="text-center font-medium py-2.5 px-1 border-r border-red-700/60">
                四进
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={2} size="sm" />
                  <Dice value={2} size="sm" />
                  <Dice value={2} size="sm" />
                  <Dice value={2} size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                </div>
              </td>
              <td className="p-2 text-center font-bold text-amber-300 font-mono">
                38.8元现金
              </td>
            </tr>

            {/* 5. 举人 (20份) */}
            <tr className="border-b border-red-700/60">
              <td className="text-center font-bold bg-[#C62828] border-r-2 border-amber-300 p-2">
                <div className="text-base text-amber-200">举人</div>
                <div className="text-[11px] text-amber-100/90 font-mono">
                  (剩 {prizes.juren}/20 份)
                </div>
              </td>
              <td className="text-center font-medium py-2.5 px-1 border-r border-red-700/60">
                二举
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={4} size="sm" />
                  <Dice value={4} size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                </div>
              </td>
              <td className="p-2 text-center font-bold text-amber-300 font-mono">
                18.8元现金
              </td>
            </tr>

            {/* 6. 秀才 (40份) */}
            <tr>
              <td className="text-center font-bold bg-[#C62828] border-r-2 border-amber-300 p-2">
                <div className="text-base text-amber-200">秀才</div>
                <div className="text-[11px] text-amber-100/90 font-mono">
                  (剩 {prizes.xiucai}/40 份)
                </div>
              </td>
              <td className="text-center font-medium py-2.5 px-1 border-r border-red-700/60">
                一秀
              </td>
              <td className="py-2 px-2 border-r border-red-700/60">
                <div className="flex items-center gap-1 justify-center">
                  <Dice value={4} size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                  <Dice size="sm" />
                </div>
              </td>
              <td className="p-2 text-center font-bold text-amber-300 font-mono">
                8.8元现金
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
