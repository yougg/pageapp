/**
 * 简繁中文转换核心引擎
 * 支持：
 * 1. 简转繁 (s2t) 与 繁转简 (t2s)
 * 2. 基于最长正向匹配 (FMM) 的上下文消歧，不依赖任何外部接口或 AI
 * 3. 结构化 Token 输出，支持一对多歧义字的可视化标记与手动切换
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChineseConverter = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class ChineseConverter {
    /**
     * @param {Object} dictData 包含 st1, st2, ts1, ts2, stPhrases, tsPhrases 的字典数据
     */
    constructor(dictData) {
      if (!dictData) {
        throw new Error('未提供有效的字典数据 DICT_DATA');
      }
      this.dict = dictData;
      this.maxPhraseLen = 4; // 最大词长，用于最长正向匹配
    }

    /**
     * 纯文本极速转换
     * @param {string} text 输入文本
     * @param {Object} [options] 转换选项
     * @param {'s2t'|'t2s'} [options.direction='s2t'] 转换方向
     * @param {boolean} [options.enableDisambiguation=true] 是否启用上下文消歧
     * @returns {string} 转换结果
     */
    convert(text, options = {}) {
      const tokens = this.convertStructured(text, options);
      return tokens.map(t => t.converted).join('');
    }

    /**
     * 结构化转换，输出 Token 数组，便于前端高亮和交互
     * @param {string} text 输入文本
     * @param {Object} [options] 转换选项
     * @param {'s2t'|'t2s'} [options.direction='s2t'] 转换方向
     * @param {boolean} [options.enableDisambiguation=true] 是否启用上下文消歧
     * @returns {Array<Object>} Token 列表
     */
    convertStructured(text, options = {}) {
      if (!text) return [];

      const direction = options.direction || 's2t';
      const enableDisambig = options.enableDisambiguation !== false;

      const isS2T = direction === 's2t';
      const dict1 = isS2T ? this.dict.st1 : this.dict.ts1;
      const dict2 = isS2T ? this.dict.st2 : this.dict.ts2;
      const phrases = isS2T ? this.dict.stPhrases : this.dict.tsPhrases;

      const tokens = [];
      const len = text.length;
      let i = 0;

      while (i < len) {
        let matched = false;

        // 1. 尝试上下文词组最长匹配 (FMM: 4, 3, 2 字)
        if (enableDisambig && phrases) {
          const maxCheck = Math.min(this.maxPhraseLen, len - i);
          for (let l = maxCheck; l >= 2; l--) {
            const sub = text.substr(i, l);
            if (phrases[sub]) {
              const convertedPhrase = phrases[sub];
              
              // 将词组细拆为字符级 Token，以便精确标注内部可能存在的一对多字
              for (let k = 0; k < l; k++) {
                const origChar = sub[k];
                const convChar = convertedPhrase[k] || origChar;
                const hasAmbiguity = Boolean(dict2[origChar]);
                const cands = hasAmbiguity ? dict2[origChar] : null;

                tokens.push({
                  original: origChar,
                  converted: convChar,
                  isAmbiguous: hasAmbiguity,
                  candidates: cands,
                  selectedIndex: cands ? Math.max(0, cands.indexOf(convChar)) : 0,
                  fromPhrase: true,
                  phraseMatch: sub,
                  startIndex: i + k,
                  endIndex: i + k + 1
                });
              }

              i += l;
              matched = true;
              break;
            }
          }
        }

        if (matched) {
          continue;
        }

        // 2. 单字匹配
        const ch = text[i];

        // 2.1 检查一对一确定性映射表
        if (dict1[ch]) {
          tokens.push({
            original: ch,
            converted: dict1[ch],
            isAmbiguous: false,
            candidates: null,
            selectedIndex: 0,
            fromPhrase: false,
            startIndex: i,
            endIndex: i + 1
          });
        }
        // 2.2 检查一对多歧义字映射表
        else if (dict2[ch]) {
          const cands = dict2[ch];
          const defaultChar = cands[0]; // 默认取第 1 位最高频字
          tokens.push({
            original: ch,
            converted: defaultChar,
            isAmbiguous: true,
            candidates: cands,
            selectedIndex: 0,
            fromPhrase: false,
            startIndex: i,
            endIndex: i + 1
          });
        }
        // 2.3 其它无需转换的字符（标点、英文、无繁简差异汉字等）
        else {
          tokens.push({
            original: ch,
            converted: ch,
            isAmbiguous: false,
            candidates: null,
            selectedIndex: 0,
            fromPhrase: false,
            startIndex: i,
            endIndex: i + 1
          });
        }

        i++;
      }

      return tokens;
    }
  }

  return ChineseConverter;
});
