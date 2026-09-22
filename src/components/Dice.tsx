import React from 'react';

interface DiceProps {
  value?: number;          // 1-6，或者 undefined 表示空占位（规则图上的白框）
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isRolling?: boolean;
  className?: string;
}

export const Dice: React.FC<DiceProps> = ({
  value,
  size = 'md',
  isRolling = false,
  className = '',
}) => {
  // 尺寸设定
  const sizeMap = {
    sm: 'w-6 h-6 rounded-[5px] text-[8px]',
    md: 'w-10 h-10 rounded-lg text-xs shadow-md',
    lg: 'w-14 h-14 rounded-xl text-sm shadow-lg',
    xl: 'w-18 h-18 sm:w-20 sm:h-20 rounded-2xl text-base shadow-xl',
  };

  // 空白骰子（规则说明图中的白框骰子）
  if (!value || value < 1 || value > 6) {
    return (
      <div
        className={`${sizeMap[size]} bg-white/95 border-2 border-dashed border-red-300 flex items-center justify-center select-none ${className}`}
      >
        <span className="text-red-300 text-xs font-semibold">?</span>
      </div>
    );
  }

  // 传统闽南博饼骰子规则：1点和4点为大朱砂红，2、3、5、6点为深靛蓝/黑色
  const isRed = value === 1 || value === 4;
  const pipColor = isRed ? '#D32F2F' : '#1A237E';

  // 点阵布局渲染
  const renderPips = () => {
    switch (value) {
      case 1:
        // 1点为居中的大红圆
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="rounded-full shadow-inner"
              style={{
                backgroundColor: pipColor,
                width: size === 'xl' ? '36%' : size === 'lg' ? '38%' : '42%',
                height: size === 'xl' ? '36%' : size === 'lg' ? '38%' : '42%',
              }}
            />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full p-[18%] flex flex-col justify-between">
            <div className="w-1/3 aspect-square rounded-full self-start" style={{ backgroundColor: pipColor }} />
            <div className="w-1/3 aspect-square rounded-full self-end" style={{ backgroundColor: pipColor }} />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full p-[16%] flex flex-col justify-between">
            <div className="w-[30%] aspect-square rounded-full self-start" style={{ backgroundColor: pipColor }} />
            <div className="w-[30%] aspect-square rounded-full self-center" style={{ backgroundColor: pipColor }} />
            <div className="w-[30%] aspect-square rounded-full self-end" style={{ backgroundColor: pipColor }} />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full p-[16%] grid grid-cols-2 gap-2 place-items-center">
            <div className="w-[60%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[60%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[60%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[60%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full p-[14%] relative">
            <div className="w-full h-full grid grid-cols-2 place-items-center">
              <div className="w-[52%] aspect-square rounded-full self-start justify-self-start" style={{ backgroundColor: pipColor }} />
              <div className="w-[52%] aspect-square rounded-full self-start justify-self-end" style={{ backgroundColor: pipColor }} />
              <div className="w-[52%] aspect-square rounded-full self-end justify-self-start" style={{ backgroundColor: pipColor }} />
              <div className="w-[52%] aspect-square rounded-full self-end justify-self-end" style={{ backgroundColor: pipColor }} />
            </div>
            {/* 中间一点 */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26%] aspect-square rounded-full"
              style={{ backgroundColor: pipColor }}
            />
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full p-[14%] grid grid-cols-2 grid-rows-3 place-items-center gap-y-1">
            <div className="w-[55%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[55%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[55%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[55%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[55%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
            <div className="w-[55%] aspect-square rounded-full" style={{ backgroundColor: pipColor }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        ${sizeMap[size]}
        relative bg-gradient-to-b from-[#FFFFFC] to-[#F3EDE2]
        border border-[#DCD3C1]
        ring-1 ring-black/5
        flex items-center justify-center
        transform transition-all duration-300
        ${isRolling ? 'animate-spin' : 'hover:scale-105'}
        ${className}
      `}
      style={{
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25), inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 3px rgba(0, 0, 0, 0.08)',
      }}
    >
      {renderPips()}
    </div>
  );
};
