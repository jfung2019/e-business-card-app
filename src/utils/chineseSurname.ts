/**
 * Hong Kong (Cantonese) romanization of common Chinese surnames — the
 * spelling a HK card or ID would use: 陳 Chan, 黃 Wong, 張 Cheung.
 *
 * Deliberately a lookup table, not a transliterator. A surname's English
 * spelling is a convention, not a sound rule: 王 and 黃 are both "Wong", 李 is
 * usually "Lee" though "Li" also appears. A surname missing from the table
 * yields nothing rather than an invented spelling.
 *
 * Traditional and simplified forms are both listed.
 */
const COMPOUND_SURNAMES: Record<string, string> = {
  歐陽: 'Au Yeung',
  欧阳: 'Au Yeung',
  司徒: 'Szeto',
  上官: 'Sheung Kwun',
  諸葛: 'Chu Kot',
  诸葛: 'Chu Kot',
  司馬: 'Sze Ma',
  司马: 'Sze Ma',
  端木: 'Tuen Muk',
  慕容: 'Mo Yung',
  皇甫: 'Wong Po',
  公孫: 'Kung Suen',
  公孙: 'Kung Suen',
  夏侯: 'Ha Hau',
};

const SURNAMES: Record<string, string> = {
  陳: 'Chan', 陈: 'Chan',
  李: 'Lee',
  張: 'Cheung', 张: 'Cheung',
  黃: 'Wong', 黄: 'Wong',
  王: 'Wong',
  何: 'Ho',
  林: 'Lam',
  劉: 'Lau', 刘: 'Lau',
  梁: 'Leung',
  吳: 'Ng', 吴: 'Ng',
  伍: 'Ng',
  鄭: 'Cheng', 郑: 'Cheng',
  楊: 'Yeung', 杨: 'Yeung',
  周: 'Chow',
  朱: 'Chu',
  徐: 'Tsui',
  崔: 'Tsui',
  許: 'Hui', 许: 'Hui',
  謝: 'Tse', 谢: 'Tse',
  馬: 'Ma', 马: 'Ma',
  蔡: 'Choi',
  胡: 'Wu',
  鄔: 'Wu', 邬: 'Wu',
  郭: 'Kwok',
  麥: 'Mak', 麦: 'Mak',
  羅: 'Law', 罗: 'Law',
  葉: 'Yip', 叶: 'Yip',
  盧: 'Lo', 卢: 'Lo',
  曾: 'Tsang',
  鄧: 'Tang', 邓: 'Tang',
  滕: 'Tang',
  馮: 'Fung', 冯: 'Fung',
  蕭: 'Siu', 萧: 'Siu',
  譚: 'Tam', 谭: 'Tam',
  談: 'Tam', 谈: 'Tam',
  鍾: 'Chung', 钟: 'Chung',
  關: 'Kwan', 关: 'Kwan',
  區: 'Au', 区: 'Au',
  歐: 'Au', 欧: 'Au',
  高: 'Ko',
  江: 'Kong',
  彭: 'Pang',
  潘: 'Poon',
  袁: 'Yuen',
  阮: 'Yuen',
  余: 'Yu',
  于: 'Yu',
  孫: 'Suen', 孙: 'Suen',
  錢: 'Chin', 钱: 'Chin',
  趙: 'Chiu', 赵: 'Chiu',
  招: 'Chiu',
  蔣: 'Cheung', 蒋: 'Cheung',
  章: 'Cheung',
  韓: 'Hon', 韩: 'Hon',
  鄒: 'Chau', 邹: 'Chau',
  陸: 'Luk', 陆: 'Luk',
  賴: 'Lai', 赖: 'Lai',
  黎: 'Lai',
  戴: 'Tai',
  薛: 'Sit',
  莫: 'Mok',
  甘: 'Kam',
  金: 'Kam',
  石: 'Shek',
  姚: 'Yiu',
  程: 'Ching',
  方: 'Fong',
  杜: 'To',
  陶: 'To',
  聶: 'Nip', 聂: 'Nip',
  湯: 'Tong', 汤: 'Tong',
  唐: 'Tong',
  岑: 'Shum',
  沈: 'Sham',
  簡: 'Kan', 简: 'Kan',
  翁: 'Yung',
  容: 'Yung',
  雷: 'Lui',
  呂: 'Lui', 吕: 'Lui',
  宋: 'Sung',
  范: 'Fan',
  樊: 'Fan',
  車: 'Che', 车: 'Che',
  游: 'Yau',
  邱: 'Yau',
  丘: 'Yau',
  溫: 'Wan', 温: 'Wan',
  尹: 'Wan',
  霍: 'Fok',
  紀: 'Kei', 纪: 'Kei',
  祁: 'Kei',
  冼: 'Sin',
  單: 'Sin', 单: 'Sin',
  施: 'Sze',
  邵: 'Shiu',
  孔: 'Hung',
  洪: 'Hung',
  熊: 'Hung',
  白: 'Pak',
  文: 'Man',
  萬: 'Man', 万: 'Man',
  殷: 'Yan',
  嚴: 'Yim', 严: 'Yim',
  夏: 'Ha',
  侯: 'Hau',
  姜: 'Keung',
  秦: 'Chun',
  魏: 'Ngai',
  倪: 'Ngai',
  艾: 'Ngai',
  畢: 'Pat', 毕: 'Pat',
  鮑: 'Pau', 鲍: 'Pau',
  包: 'Pau',
  賀: 'Ho', 贺: 'Ho',
  喬: 'Kiu', 乔: 'Kiu',
  童: 'Tung',
  柯: 'Or',
  凌: 'Ling',
  柳: 'Lau',
  易: 'Yik',
  武: 'Mo',
  巫: 'Mo',
  蒙: 'Mung',
  韋: 'Wai', 韦: 'Wai',
  衛: 'Wai', 卫: 'Wai',
  藍: 'Lam', 蓝: 'Lam',
  符: 'Fu',
  傅: 'Fu',
  邢: 'Ying',
  左: 'Tso',
  田: 'Tin',
  龍: 'Lung', 龙: 'Lung',
  鄺: 'Kwong', 邝: 'Kwong',
  顏: 'Ngan', 颜: 'Ngan',
  蘇: 'So', 苏: 'So',
  利: 'Lee',
  植: 'Chik',
  戚: 'Chik',
  古: 'Koo',
  練: 'Lin', 练: 'Lin',
  盛: 'Shing',
  孟: 'Mang',
  葛: 'Kot',
  龐: 'Pong', 庞: 'Pong',
  梅: 'Mui',
  湛: 'Cham',
  卓: 'Cheuk',
  屈: 'Wat',
  麻: 'Ma',
};

const HAN = /\p{Script=Han}/u;

/**
 * The HK romanization of the surname a Chinese name starts with, or null.
 * `chineseName` may be the full name ("陳大文") or just the surname ("陳");
 * anything before the first Chinese character is ignored.
 */
export function romanizeChineseSurname(chineseName: string | null | undefined): string | null {
  if (!chineseName) {
    return null;
  }
  const chars = Array.from(chineseName).filter((char) => HAN.test(char));
  if (chars.length === 0) {
    return null;
  }
  if (chars.length >= 2) {
    const compound = COMPOUND_SURNAMES[chars[0] + chars[1]];
    if (compound) {
      return compound;
    }
  }
  return SURNAMES[chars[0]] ?? null;
}
