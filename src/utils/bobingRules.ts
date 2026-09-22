import { BobingResult, PrizePool, RankCategory, ZhuangyuanSubtype } from '../types';

export const INITIAL_PRIZES: PrizePool = {
  zhuangyuan: 1,  // 198元
  bangyan: 3,     // 88.8元
  tanhua: 8,      // 58.8元
  jinshi: 15,     // 38.8元
  juren: 20,      // 18.8元
  xiucai: 40,     // 8.8元
};

export const PRIZE_INFO = {
  zhuangyuan: { title: '状元', defaultBonus: 198, count: 1 },
  bangyan: { title: '榜眼', defaultBonus: 88.8, count: 3, form: '对堂' },
  tanhua: { title: '探花', defaultBonus: 58.8, count: 8, form: '三红' },
  jinshi: { title: '进士', defaultBonus: 38.8, count: 15, form: '四进' },
  juren: { title: '举人', defaultBonus: 18.8, count: 20, form: '二举' },
  xiucai: { title: '秀才', defaultBonus: 8.8, count: 40, form: '一秀' },
};

/**
 * 判断特殊形式状元是否解锁 (举人和秀才被抽完后)
 */
export function checkSpecialZhuangyuanUnlocked(prizes: PrizePool): boolean {
  return prizes.juren <= 0 && prizes.xiucai <= 0;
}

/**
 * 判断普通状元是否解锁 (其余奖项都抽完后)
 */
export function checkNormalZhuangyuanUnlocked(prizes: PrizePool): boolean {
  return (
    prizes.bangyan <= 0 &&
    prizes.tanhua <= 0 &&
    prizes.jinshi <= 0 &&
    prizes.juren <= 0 &&
    prizes.xiucai <= 0
  );
}

/**
 * 核心判定算法：根据6个骰子点数计算博饼结果
 */
export function evaluateDice(dice: number[], currentPrizes: PrizePool): BobingResult {
  if (!dice || dice.length !== 6) {
    return {
      category: 'none',
      title: '无效点数',
      subTitle: '错误',
      bonus: 0,
      description: '骰子数量必须为6个',
      isUnlocked: false,
    };
  }

  // 统计每个点数出现的次数
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) {
    if (d >= 1 && d <= 6) {
      counts[d] = (counts[d] || 0) + 1;
    }
  }

  const redCount = counts[4]; // 四点(红)数量
  const isSpecialUnlocked = checkSpecialZhuangyuanUnlocked(currentPrizes);
  const isNormalUnlocked = checkNormalZhuangyuanUnlocked(currentPrizes);

  // 1. 六杯红 (6个四点) - 初始开放
  if (redCount === 6) {
    return {
      category: 'zhuangyuan',
      zhuangyuanSubtype: 'liubeihong',
      title: '状元',
      subTitle: '六杯红',
      bonus: 198,
      description: '六个四点！万中无一的六杯红状元！',
      isUnlocked: true,
    };
  }

  // 2. 六杯黑 (6个相同非四点) - 初始开放
  for (let num = 1; num <= 6; num++) {
    if (num !== 4 && counts[num] === 6) {
      return {
        category: 'zhuangyuan',
        zhuangyuanSubtype: 'liubeihei',
        title: '状元',
        subTitle: '六杯黑',
        bonus: 198,
        description: `六个${num}点！难得一见的六杯黑状元！`,
        isUnlocked: true,
      };
    }
  }

  // 3. 状元插金花 (4个四点 + 2个一点) - 初始开放
  if (redCount === 4 && counts[1] === 2) {
    return {
      category: 'zhuangyuan',
      zhuangyuanSubtype: 'chajinhua',
      title: '状元',
      subTitle: '状元插金花',
      bonus: 198,
      description: '四红带二红一！尊贵顶级的状元插金花！',
      isUnlocked: true,
    };
  }

  // 4. 五王 (5个四点 + 1个任意点) - 阶段2：举人和秀才抽完后开放
  if (redCount === 5) {
    if (isSpecialUnlocked) {
      return {
        category: 'zhuangyuan',
        zhuangyuanSubtype: 'wuwang',
        title: '状元',
        subTitle: '五王',
        bonus: 198,
        description: '五个四点！威震全场的五王状元！',
        isUnlocked: true,
      };
    } else {
      return {
        category: 'none',
        zhuangyuanSubtype: 'wuwang',
        title: '未开放状元 (五王)',
        subTitle: '暂未解锁',
        bonus: 0,
        description: '摇出五王！但规则规定：特殊状元需在举人和秀才被抽完后才开放。',
        isUnlocked: false,
        lockReason: '需举人(二举)与秀才(一秀)抽完后解锁',
      };
    }
  }

  // 5. 五子带一秀 (5个相同非四点 + 1个四点) - 阶段2：举人和秀才抽完后开放
  let fiveOfKindNonRed = 0;
  for (let num = 1; num <= 6; num++) {
    if (num !== 4 && counts[num] === 5) {
      fiveOfKindNonRed = num;
      break;
    }
  }

  if (fiveOfKindNonRed > 0 && redCount === 1) {
    if (isSpecialUnlocked) {
      return {
        category: 'zhuangyuan',
        zhuangyuanSubtype: 'wuzi_daiyixiu',
        title: '状元',
        subTitle: '五子带一秀',
        bonus: 198,
        description: `五个${fiveOfKindNonRed}点带一红秀！五子带一秀状元！`,
        isUnlocked: true,
      };
    } else {
      // 降级可得一秀（若一秀还有剩余）
      const canFallbackToXiucai = currentPrizes.xiucai > 0;
      return {
        category: canFallbackToXiucai ? 'xiucai' : 'none',
        zhuangyuanSubtype: 'wuzi_daiyixiu',
        title: canFallbackToXiucai ? '秀才' : '未开放状元 (五子带一秀)',
        subTitle: canFallbackToXiucai ? '一秀 (五子带秀降级)' : '暂未解锁',
        bonus: canFallbackToXiucai ? 8.8 : 0,
        description: '摇出五子带一秀！特殊状元尚未解锁（需举人和秀才抽完），降级计为一秀。',
        isUnlocked: false,
        lockReason: '需举人与秀才抽完后解锁该状元',
      };
    }
  }

  // 6. 五子登科 (5个相同非四点 + 1个非四点) - 阶段2：举人和秀才抽完后开放
  if (fiveOfKindNonRed > 0 && redCount === 0) {
    if (isSpecialUnlocked) {
      return {
        category: 'zhuangyuan',
        zhuangyuanSubtype: 'wuzi_dengke',
        title: '状元',
        subTitle: '五子登科',
        bonus: 198,
        description: `五个${fiveOfKindNonRed}点！步步高升的五子登科状元！`,
        isUnlocked: true,
      };
    } else {
      // 降级为四进（进士）
      const canFallbackToJinshi = currentPrizes.jinshi > 0;
      return {
        category: canFallbackToJinshi ? 'jinshi' : 'none',
        zhuangyuanSubtype: 'wuzi_dengke',
        title: canFallbackToJinshi ? '进士' : '未开放状元 (五子登科)',
        subTitle: canFallbackToJinshi ? '四进 (五子降级)' : '暂未解锁',
        bonus: canFallbackToJinshi ? 38.8 : 0,
        description: '摇出五子登科！特殊状元尚未解锁（需举人和秀才抽完），暂时计为四进。',
        isUnlocked: false,
        lockReason: '需举人与秀才抽完后解锁该状元',
      };
    }
  }

  // 7. 普通状元 (4个四点 + 2个非一点或点数不同) - 阶段3：其余奖项都抽完后才开放
  if (redCount === 4 && counts[1] !== 2) {
    if (isNormalUnlocked) {
      return {
        category: 'zhuangyuan',
        zhuangyuanSubtype: 'putong',
        title: '状元',
        subTitle: '普通状元',
        bonus: 198,
        description: '四个四点！其余奖项抽毕，普通状元诞生！',
        isUnlocked: true,
      };
    } else {
      return {
        category: 'none',
        zhuangyuanSubtype: 'putong',
        title: '未开放状元 (普通状元)',
        subTitle: '暂未解锁',
        bonus: 0,
        description: '摇出四个四点！规则规定：普通状元在其余所有奖项（榜眼、探花、进士、举人、秀才）都抽完后才开放。',
        isUnlocked: false,
        lockReason: '需榜眼、探花、进士、举人、秀才全部抽完后才开放',
      };
    }
  }

  // 8. 榜眼：对堂 (1, 2, 3, 4, 5, 6 顺子一条龙)
  if (
    counts[1] === 1 &&
    counts[2] === 1 &&
    counts[3] === 1 &&
    counts[4] === 1 &&
    counts[5] === 1 &&
    counts[6] === 1
  ) {
    return {
      category: 'bangyan',
      title: '榜眼',
      subTitle: '对堂',
      bonus: 88.8,
      description: '一二三四五六一条龙！榜眼对堂大顺！',
      isUnlocked: true,
    };
  }

  // 9. 探花：三红 (正好3个四点)
  if (redCount === 3) {
    return {
      category: 'tanhua',
      title: '探花',
      subTitle: '三红',
      bonus: 58.8,
      description: '三个四点红！喜提探花三红！',
      isUnlocked: true,
    };
  }

  // 10. 进士：四进 (4个相同非四点)
  let fourOfKindNonRed = 0;
  for (let num = 1; num <= 6; num++) {
    if (num !== 4 && counts[num] >= 4) {
      fourOfKindNonRed = num;
      break;
    }
  }
  if (fourOfKindNonRed > 0) {
    return {
      category: 'jinshi',
      title: '进士',
      subTitle: '四进',
      bonus: 38.8,
      description: `四个${fourOfKindNonRed}点！恭喜荣登进士四进！`,
      isUnlocked: true,
    };
  }

  // 11. 举人：二举 (正好2个四点)
  if (redCount === 2) {
    return {
      category: 'juren',
      title: '举人',
      subTitle: '二举',
      bonus: 18.8,
      description: '两个四点红！恭喜中二举（举人）！',
      isUnlocked: true,
    };
  }

  // 12. 秀才：一秀 (正好1个四点)
  if (redCount === 1) {
    return {
      category: 'xiucai',
      title: '秀才',
      subTitle: '一秀',
      bonus: 8.8,
      description: '一个四点红！开门有喜，荣登一秀（秀才）！',
      isUnlocked: true,
    };
  }

  // 13. 落空 / 未中奖
  return {
    category: 'none',
    title: '未中奖',
    subTitle: '落空',
    bonus: 0,
    description: '这次差一点运气，洗洗手下把再来！',
    isUnlocked: true,
  };
}

/**
 * 随机生成6个骰子
 */
export function rollRandomDice(): number[] {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
}
