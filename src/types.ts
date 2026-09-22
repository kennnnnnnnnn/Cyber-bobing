export type RankCategory = 
  | 'zhuangyuan' // 状元
  | 'bangyan'    // 榜眼
  | 'tanhua'     // 探花
  | 'jinshi'     // 进士
  | 'juren'      // 举人
  | 'xiucai'     // 秀才
  | 'none';      // 未中

export type ZhuangyuanSubtype =
  | 'chajinhua'        // 状元插金花 (4个四 + 2个一)
  | 'liubeihong'       // 六杯红 (6个四)
  | 'liubeihei'        // 六杯黑 (6个相同非四点)
  | 'wuwang'           // 五王 (5个四 + 1个任意)
  | 'wuzi_daiyixiu'    // 五子带一秀 (5个非四同点 + 1个四)
  | 'wuzi_dengke'      // 五子登科 (5个非四同点 + 1个非四)
  | 'putong';          // 普通状元 (4个四 + 2个非一)

export interface PrizePool {
  zhuangyuan: number; // 默认 1 份
  bangyan: number;    // 默认 3 份
  tanhua: number;     // 默认 8 份
  jinshi: number;     // 默认 15 份
  juren: number;      // 默认 20 份
  xiucai: number;     // 默认 40 份
}

export interface BobingResult {
  category: RankCategory;
  title: string;          // 例如 "状元", "榜眼", "进士", "未中奖"
  subTitle: string;       // 例如 "状元插金花", "对堂", "四进", "落空"
  bonus: number;          // 奖金
  description: string;    // 描述
  zhuangyuanSubtype?: ZhuangyuanSubtype;
  isUnlocked: boolean;    // 是否处于当前已开放状态
  lockReason?: string;    // 若未开放的原因说明
  originalCategory?: RankCategory; // 如果未解锁退化的基础奖或提示
}

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
  totalBonus: number;
  winsCount: number;
  isAi?: boolean;
}

export interface RollRecord {
  id: string;
  playerId: string;
  playerName: string;
  dice: number[];
  category: RankCategory;
  title: string;
  subTitle: string;
  bonus: number;
  timestamp: number;
  note?: string;
  awarded: boolean; // 是否实际发奖（若奖池已被领完则为false）
}

export interface GameState {
  players: Player[];
  currentTurnIndex: number;
  prizes: PrizePool;
  initialPrizes: PrizePool;
  lastRoll: {
    playerId: string;
    playerName: string;
    dice: number[];
    result: BobingResult;
    awarded: boolean;
    timestamp: number;
  } | null;
  history: RollRecord[];
  isRolling: boolean;
  version: number;
}
