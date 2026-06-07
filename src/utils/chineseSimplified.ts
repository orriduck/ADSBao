// Compact traditional → simplified character map focused on the chars that
// actually show up in Chinese place names returned by OSM / Nominatim. This
// is not a full OpenCC replacement — it just covers the common variant pairs
// so the reverse-geocode hero ("臺北市, 臺灣") reads as simplified for
// mainland users without taking on a 500KB+ converter library.
//
// Curated from OpenCC's STCharacters.txt (Apache 2.0). Add entries when a
// place name slips through.
//
// Authored as a flat string of pairs so duplicates resolve via Map semantics
// (the later entry wins) instead of triggering "duplicate object key" lint /
// TS errors. Pairs are two characters each: traditional, simplified.
const T2S_PAIRS =
  // Geography + administrative divisions
  "臺台灣湾縣县區区鄉乡鎮镇鄔邬廣广雲云貴贵寧宁興兴慶庆龍龙鳳凤雞鸡" +
  "雙双陽阳陰阴邊边閣阁關关闊阔門门間间閩闽閆闫開开陳陈陸陆隴陇隊队" +
  "隸隶階阶華华黃黄義义兒儿國国漢汉滿满豐丰萬万嶺岭嶽岳島岛巒峦" +
  // Common in city / town names
  "廈厦廁厕廠厂廢废廬庐應应懸悬慶庆憂忧憶忆戰战戲戏撥拨擊击擔担" +
  "據据擇择擠挤擾扰攏拢數数敵敌斂敛斷断時时書书會会條条楓枫樹树" +
  "橋桥機机樂乐標标櫃柜櫻樱殺杀殼壳毆殴氣气氫氢漲涨潛潜潤润潔洁" +
  "灑洒灘滩為为烏乌無无煩烦熱热營营燈灯燒烧燴烩爺爷爾尔牆墙" +
  "獨独獸兽獻献環环現现甦苏產产畢毕異异當当痺痹瘋疯發发盡尽" +
  "監监盤盘盧卢瞼睑矚瞩礙碍礫砾祿禄禮礼禪禅種种稱称穀谷穩稳" +
  "窩窝窯窑窮穷竊窃筆笔節节範范篩筛簡简簽签籃篮籌筹籠笼" +
  "粵粤糞粪糧粮糰团紀纪紅红紋纹納纳純纯紛纷紙纸紹绍細细" +
  "紳绅終终組组結结絕绝絡络給给絨绒經经綁绑綜综綠绿維维" +
  "緊紧練练緋绯緒绪線线緣缘編编緩缓縉缙縐绉縛缚縱纵縷缕" +
  "總总繃绷績绩繞绕織织繭茧繪绘繼继纖纤纓缨罷罢羅罗翹翘" +
  "聖圣聞闻聯联聰聪聲声聽听肅肃脹胀腸肠腦脑膠胶臉脸臘腊" +
  "舉举舊旧艱艰蓋盖蘇苏蘭兰蘿萝處处號号蝦虾蟲虫蠶蚕衛卫" +
  "衝冲補补裝装製制複复襖袄襯衬覺觉觀观設设訂订計计訊讯" +
  "託托記记訪访許许訴诉評评詠咏試试詩诗該该詳详認认誌志" +
  "語语誤误誘诱說说誕诞課课誰谁調调談谈請请諒谅論论諸诸" +
  "諾诺謀谋謂谓謙谦講讲謝谢謠谣證证識识譯译議议護护變变" +
  "讓让豐丰貝贝負负財财貢贡貪贪貫贯責责貯贮貴贵買买貸贷" +
  "費费貼贴貿贸賀贺賊贼賓宾賜赐賞赏賢贤賣卖賤贱賬账賭赌" +
  "賴赖趙赵趨趋跡迹軌轨軍军軒轩軟软較较載载輝辉輩辈輪轮" +
  "輸输轉转辭辞農农醒醒釁衅釋释鋪铺錐锥錶表鍋锅鍊炼鏈链" +
  "鏟铲鐳镭鑽钻長长閉闭閣阁閥阀閱阅闆板闌阑闕阙院院陪陪" +
  "陶陶陷陷隅隅隆隆隔隔際际障障難难雜杂離离電电霧雾露露" +
  "靈灵韋韦韓韩響响頁页頂顶順顺項项須须預预頓顿領领頭头" +
  "題题顆颗顏颜願愿類类顯显飄飘飛飞飯饭餃饺餘余館馆駕驾" +
  "駛驶駿骏騎骑騙骗騰腾驅驱驕骄驗验驟骤骯肮鬆松鬱郁鬧闹" +
  "魅魅魚鱼鮮鲜鯨鲸鴻鸿鵝鹅鶴鹤麗丽麥麦麵面默默龐庞齋斋" +
  "齡龄龔龚龜龟麼么麽么齒齿髮发體体風风" +
  // Common surnames / numerals seen in administrative names
  "兩两個个種种億亿東东西西南南北北內内外外中中";

const T2S_MAP = buildPairMap(T2S_PAIRS);

function buildPairMap(pairs: string): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    map.set(pairs[i], pairs[i + 1]);
  }
  return map;
}

const T2S_REGEX = new RegExp(
  `[${Array.from(T2S_MAP.keys()).join("")}]`,
  "g",
);

// Pass any potentially-traditional Chinese string through here to get a
// canonicalized Simplified Chinese version. ASCII / Latin text is
// unaffected, and characters not in the map (already simplified, or
// non-Chinese) pass through unchanged.
export function toSimplifiedChinese(input: unknown): string {
  const text = String(input ?? "");
  if (!text) return text;
  return text.replace(T2S_REGEX, (char) => T2S_MAP.get(char) ?? char);
}
