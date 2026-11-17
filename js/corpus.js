// ============================================================
// Pinyin Coach — corpus d'exercices
// Chaque exercise: { hanzi, pinyin, focus: [{pinyin, initial, tone}] }
// ============================================================

const CONSONANT_SETS = [
  {
    id: "s-sh", title: "S / SH — 四 sì vs 是 shì",
    tip: "s : langue à plat, souffle aigu. SH : langue relevée vers l'arrière, souffle plus sombre, lèvres légèrement arrondies.",
    exercises: [
      { hanzi: "四是四，十是十。", pinyin: "sì shì sì, shí shì shí.",
        focus: [{pinyin:"sì",initial:"s",tone:4},{pinyin:"shì",initial:"sh",tone:4},{pinyin:"shí",initial:"sh",tone:2}] },
      { hanzi: "十四是十四，四十是四十。", pinyin: "shísì shì shísì, sìshí shì sìshí.",
        focus: [{pinyin:"shísì",initial:"sh",tone:2},{pinyin:"sìshí",initial:"s",tone:4}] },
      { hanzi: "老师在学校。", pinyin: "lǎoshī zài xuéxiào.",
        focus: [{pinyin:"shī",initial:"sh",tone:1},{pinyin:"zài",initial:"z",tone:4}] },
      { hanzi: "他四十岁。", pinyin: "Tā sìshí suì.",
        focus: [{pinyin:"sìshí",initial:"s",tone:4}] },
    ],
  },
  {
    id: "x-sh", title: "X / SH — 想 xiǎng vs 上 shàng",
    tip: "X : langue large contre les incisives inférieures, sourire léger. SH : pointe de langue relevée en arrière, lèvres arrondies.",
    exercises: [
      { hanzi: "我想学习。", pinyin: "Wǒ xiǎng xuéxí.",
        focus: [{pinyin:"xiǎng",initial:"x",tone:3},{pinyin:"xuéxí",initial:"x",tone:2}] },
      { hanzi: "先生想休息。", pinyin: "Xiānsheng xiǎng xiūxi.",
        focus: [{pinyin:"xiān",initial:"x",tone:1},{pinyin:"sheng",initial:"sh",tone:0},{pinyin:"xiūxi",initial:"x",tone:1}] },
      { hanzi: "她上午去学校。", pinyin: "Tā shàngwǔ qù xuéxiào.",
        focus: [{pinyin:"shàng",initial:"sh",tone:4},{pinyin:"xiào",initial:"x",tone:4}] },
      { hanzi: "小蛇上山。", pinyin: "Xiǎo shé shàng shān.",
        focus: [{pinyin:"xiǎo",initial:"x",tone:3},{pinyin:"shé",initial:"sh",tone:2},{pinyin:"shān",initial:"sh",tone:1}] },
    ],
  },
  {
    id: "j-zh", title: "J / ZH — 就 jiù vs 周 zhōu",
    tip: "J : comme X mais avec contact doux. ZH : comme SH mais avec contact, langue plus en arrière.",
    exercises: [
      { hanzi: "我姐姐就住在这里。", pinyin: "Wǒ jiějie jiù zhù zài zhèlǐ.",
        focus: [{pinyin:"jiějie",initial:"j",tone:3},{pinyin:"jiù",initial:"j",tone:4},{pinyin:"zhù",initial:"zh",tone:4}] },
      { hanzi: "这周见。", pinyin: "Zhè zhōu jiàn.",
        focus: [{pinyin:"zhè",initial:"zh",tone:4},{pinyin:"zhōu",initial:"zh",tone:1},{pinyin:"jiàn",initial:"j",tone:4}] },
      { hanzi: "他今天九点回家。", pinyin: "Tā jīntiān jiǔ diǎn huí jiā.",
        focus: [{pinyin:"jīntiān",initial:"j",tone:1},{pinyin:"jiǔ",initial:"j",tone:3},{pinyin:"jiā",initial:"j",tone:1}] },
      { hanzi: "猪正在吃。", pinyin: "Zhū zhèngzài chī.",
        focus: [{pinyin:"zhū",initial:"zh",tone:1},{pinyin:"zhèngzài",initial:"zh",tone:4}] },
    ],
  },
  {
    id: "q-ch", title: "Q / CH — 七 qī vs 吃 chī",
    tip: "Q : aspiration forte, langue en avant comme X. CH : aspiration forte, langue en arrière comme SH.",
    exercises: [
      { hanzi: "七点吃早饭。", pinyin: "Qī diǎn chī zǎofàn.",
        focus: [{pinyin:"qī",initial:"q",tone:1},{pinyin:"chī",initial:"ch",tone:1}] },
      { hanzi: "我骑车去城里。", pinyin: "Wǒ qí chē qù chénglǐ.",
        focus: [{pinyin:"qí",initial:"q",tone:2},{pinyin:"chē",initial:"ch",tone:1},{pinyin:"qù",initial:"q",tone:4},{pinyin:"chénglǐ",initial:"ch",tone:2}] },
      { hanzi: "请坐在前面。", pinyin: "Qǐng zuò zài qiánmiàn.",
        focus: [{pinyin:"qǐng",initial:"q",tone:3},{pinyin:"qiánmiàn",initial:"q",tone:2}] },
      { hanzi: "茶很便宜。", pinyin: "Chá hěn piányi.",
        focus: [{pinyin:"chá",initial:"ch",tone:2}] },
    ],
  },
  {
    id: "x-s", title: "X / S — 小 xiǎo vs 扫 sǎo",
    tip: "X : filet d'air large et doux, bouche étirée. S : sifflement fin et aigu, pointe de langue près des dents.",
    exercises: [
      { hanzi: "我想写作业。", pinyin: "Wǒ xiǎng xiě zuòyè.",
        focus: [{pinyin:"xiě",initial:"x",tone:3},{pinyin:"zuò",initial:"z",tone:4}] },
      { hanzi: "他喜欢写四行字。", pinyin: "Tā xǐhuan xiě sì háng zí.",
        focus: [{pinyin:"xǐhuan",initial:"x",tone:3},{pinyin:"sì",initial:"s",tone:4},{pinyin:"zì",initial:"z",tone:4}] },
      { hanzi: "小姐想送西瓜。", pinyin: "Xiǎojiě xiǎng sòng xīguā.",
        focus: [{pinyin:"xiǎojiě",initial:"x",tone:3},{pinyin:"sòng",initial:"s",tone:4}] },
    ],
  },
  {
    id: "z-zh", title: "Z / ZH — 早 zǎo vs 找 zhǎo",
    tip: "Z : d + s sifflant à l'avant. ZH : d + SH plus sombre à l'arrière.",
    exercises: [
      { hanzi: "我早上找书。", pinyin: "Wǒ zǎoshang zhǎo shū.",
        focus: [{pinyin:"zǎo",initial:"z",tone:3},{pinyin:"zhǎo",initial:"zh",tone:3},{pinyin:"shū",initial:"sh",tone:1}] },
      { hanzi: "他在这儿站着。", pinyin: "Tā zài zhèr zhàn zhe.",
        focus: [{pinyin:"zài",initial:"z",tone:4},{pinyin:"zhèr",initial:"zh",tone:4}] },
      { hanzi: "我自己做早饭。", pinyin: "Wǒ zìjǐ zuò zǎofàn.",
        focus: [{pinyin:"zìjǐ",initial:"z",tone:4},{pinyin:"zuò",initial:"z",tone:4}] },
    ],
  },
  {
    id: "c-ch", title: "C / CH — 错 cuò vs 处 chù",
    tip: "C : t + s à l'avant, crissement aigu. CH : t + SH à l'arrière, souffle plus grave.",
    exercises: [
      { hanzi: "他从来没错过。", pinyin: "Tā cónglái méi cuòguo.",
        focus: [{pinyin:"cónglái",initial:"c",tone:2},{pinyin:"cuòguo",initial:"c",tone:4}] },
      { hanzi: "我擦车去出差。", pinyin: "Wǒ cā chē qù chūchāi.",
        focus: [{pinyin:"cā",initial:"c",tone:1},{pinyin:"chē",initial:"ch",tone:1},{pinyin:"chūchāi",initial:"ch",tone:1}] },
    ],
  },
  {
    id: "n-l", title: "N / L — 你 nǐ vs 里 lǐ",
    tip: "N : le son passe par le nez (pincez le nez : ça s'arrête). L : l'air passe sur les côtés de la langue (pincez le nez : ça continue).",
    exercises: [
      { hanzi: "你来自哪里？", pinyin: "Nǐ láizì nǎlǐ?",
        focus: [{pinyin:"nǐ",initial:"n",tone:3},{pinyin:"nǎlǐ",initial:"n",tone:3}] },
      { hanzi: "牛奶和榴莲。", pinyin: "Niúnǎi hé liúlián.",
        focus: [{pinyin:"niúnǎi",initial:"n",tone:2},{pinyin:"liúlián",initial:"l",tone:2}] },
      { hanzi: "老人拉牛。", pinyin: "Lǎorén lā niú.",
        focus: [{pinyin:"lā",initial:"l",tone:1},{pinyin:"niú",initial:"n",tone:2}] },
    ],
  },
  {
    id: "r-l", title: "R / L — 热 rè vs 乐 lè",
    tip: "R : comme le \"j\" français de \"jour\", langue en arrière. L : langue contre les dents, air latéral.",
    exercises: [
      { hanzi: "今天很热。", pinyin: "Jīntiān hěn rè.",
        focus: [{pinyin:"rè",initial:"r",tone:4}] },
      { hanzi: "日本人吃肉。", pinyin: "Rìběnrén chī ròu.",
        focus: [{pinyin:"rì",initial:"r",tone:4},{pinyin:"ròu",initial:"r",tone:4}] },
      { hanzi: "他仍然认识路。", pinyin: "Tā réngrán rènshi lù.",
        focus: [{pinyin:"rèngrán",initial:"r",tone:2},{pinyin:"rènshi",initial:"r",tone:4}] },
    ],
  },
  {
    id: "f-h", title: "F / H — 分 fēn vs 很 hěn",
    tip: "F : lèvres contre les dents (labio-dentale). H : souffle profond dans la gorge, comme la jota espagnole.",
    exercises: [
      { hanzi: "他很喜欢飞机。", pinyin: "Tā hěn xǐhuan fēijī.",
        focus: [{pinyin:"hěn",initial:"h",tone:3},{pinyin:"fēijī",initial:"f",tone:1}] },
      { hanzi: "会飞的狐狸。", pinyin: "Huì fēi de húli.",
        focus: [{pinyin:"huì",initial:"h",tone:4},{pinyin:"fēi",initial:"f",tone:1},{pinyin:"húli",initial:"h",tone:2}] },
    ],
  },
];

const TONE_SETS = [
  {
    id: "tone-1234", title: "Les quatre tons — mā má mǎ mà",
    tip: "1 haut et plat · 2 montant · 3 descend puis remonte · 4 tombe fort.",
    exercises: [
      { hanzi: "妈妈骑马，马慢。", pinyin: "Māma qī mǎ, mǎ màn.",
        focus: [{pinyin:"mā",tone:1},{pinyin:"qī",tone:1},{pinyin:"mǎ",tone:3},{pinyin:"màn",tone:4}] },
      { hanzi: "妈麻马骂。", pinyin: "Mā má mǎ mà.",
        focus: [{pinyin:"mā",tone:1},{pinyin:"má",tone:2},{pinyin:"mǎ",tone:3},{pinyin:"mà",tone:4}] },
      { hanzi: "汤糖躺烫。", pinyin: "Tāng táng tǎng tàng.",
        focus: [{pinyin:"tāng",tone:1},{pinyin:"táng",tone:2},{pinyin:"tǎng",tone:3},{pinyin:"tàng",tone:4}] },
    ],
  },
  {
    id: "tone-23", title: "Tons 2 / 3 — la paire piège",
    tip: "Le ton 2 monte franchement (question surprise \"ah ?\"). Le ton 3 descend d'abord puis remonte (ton grave, bouche molle).",
    exercises: [
      { hanzi: "我想买牛奶。", pinyin: "Wǒ xiǎng mǎi niúnǎi.",
        focus: [{pinyin:"xiǎng",tone:3},{pinyin:"mǎi",tone:3},{pinyin:"niúnǎi",tone:2}] },
      { hanzi: "谁买了水果？", pinyin: "Shéi mǎi le shuǐguǒ?",
        focus: [{pinyin:"shéi",tone:2},{pinyin:"mǎi",tone:3},{pinyin:"shuǐguǒ",tone:3}] },
      { hanzi: "他很好也很忙。", pinyin: "Tā hěn hǎo yě hěn máng.",
        focus: [{pinyin:"hǎo",tone:3},{pinyin:"yě",tone:3},{pinyin:"máng",tone:2}] },
    ],
  },
  {
    id: "tone-14", title: "Tons 1 / 4 — plat vs tombant",
    tip: "Le ton 1 reste stable et haut, comme une note tenue. Le ton 4 part du haut et tombe net, affirmatif.",
    exercises: [
      { hanzi: "他不看电视。", pinyin: "Tā bú kàn diànshì.",
        focus: [{pinyin:"kàn",tone:4},{pinyin:"diànshì",tone:4}] },
      { hanzi: "星期天他散步。", pinyin: "Xīngqītiān tā sànbù.",
        focus: [{pinyin:"tiān",tone:1},{pinyin:"sànbù",tone:4}] },
      { hanzi: "先生今天上班。", pinyin: "Xiānsheng jīntiān shàngbān.",
        focus: [{pinyin:"tiān",tone:1},{pinyin:"shàngbān",tone:4}] },
    ],
  },
  {
    id: "tone-sandhi", title: "Doubles tons & changement 3-3",
    tip: "Deux tons 3 à la suite : le premier devient un ton 2 (montant). Ex. 你好 se dit ní hǎo.",
    exercises: [
      { hanzi: "你好！", pinyin: "Nǐ hǎo!",
        focus: [{pinyin:"nǐhǎo",tone:3}] },
      { hanzi: "我也想买水果。", pinyin: "Wǒ yě xiǎng mǎi shuǐguǒ.",
        focus: [{pinyin:"wǒyě",tone:3},{pinyin:"xiǎngmǎi",tone:3},{pinyin:"shuǐguǒ",tone:3}] },
      { hanzi: "很好很好。", pinyin: "Hěn hǎo, hěn hǎo.",
        focus: [{pinyin:"hěnhǎo",tone:3}] },
    ],
  },
];

if (typeof window !== "undefined") {
  window.PINYIN_CORPUS = { CONSONANT_SETS, TONE_SETS };
}
