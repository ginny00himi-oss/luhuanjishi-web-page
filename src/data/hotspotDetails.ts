export interface HotspotSource {
  label: string;
  url: string;
}

export interface HotspotDetail {
  notes: string[];
  sources?: HotspotSource[];
  fieldPhoto?: string;
  fieldPhotoAlt?: string;
}

const sources = {
  coloaneHistory: {
    label: '澳門文化局《離島路環》',
    url: 'https://www.icm.gov.mo/rc/viewer/10035/634',
  },
  coastalSheds: {
    label: '澳門特區政府：船人街沿岸建築與漁村風貌',
    url: 'https://www.gov.mo/zh-hans/news/62957/',
  },
  fishermenStreet: {
    label: '澳門特區政府：船人街傳統漁村街道',
    url: 'https://www.gcs.gov.mo/news/detail/zh-hans/N26IdgeU8x',
  },
  pierHeritage: {
    label: '澳門文化遺產網：路環碼頭',
    url: 'https://www.culturalheritage.mo/detail/102478',
  },
  pierTourism: {
    label: '澳門旅遊局：路環碼頭',
    url: 'https://www.macaotourism.gov.mo/zh-hans/explore-on-your-own-routes/strolling-around-the-coloane-village/coloane-pier',
  },
  iengLeiShop: {
    label: '澳門經濟及科技發展局：英利魚欄',
    url: 'https://www.dsedt.gov.mo/lcp/zh_MO/store_detail.jsp?id=100',
  },
  iengLeiMemory: {
    label: '澳門記憶：英利魚欄',
    url: 'https://www.macaumemory.mo/entries_63f38f887d3c4aeeb3fcc25281a5ec0a?lgType=zh-cn',
  },
  driedFishHistory: {
    label: '澳門雜誌：O peixe seco que faz parte da história',
    url: 'https://www.gcs.gov.mo/news/detail/pt/M22CJUt8cf',
  },
  maritimeEcology: {
    label: '海事及水務局：澳門鹹淡水交界的沿岸生物',
    url: 'https://www.marine.gov.mo/subpage.aspx?a_id=1712112468',
  },
  tides: {
    label: '海事及水務局：澳門潮汐資料',
    url: 'https://www.marine.gov.mo/news_detail.aspx?a_id=1764763171',
  },
  pavement: {
    label: '澳門政府新聞局：歷史城區中的葡式碎石路',
    url: 'https://www.gcs.gov.mo/news/detail/zh-hans/M19LP0eWsC',
  },
  scanArchive: {
    label: '棠記魚舖手勢掃描檔案',
    url: 'https://ginny00himi-oss.github.io/macau-rongji/',
  },
  shipmanBoard: {
    label: '2026年11月「船人街」現場展板（使用者拍攝）',
    url: '/research/shipman-street-board.jpg',
  },
  faithBoard: {
    label: '2026年11月「信仰的港灣」現場展板（使用者拍攝）',
    url: '/research/faith-temples-board.jpg',
  },
} satisfies Record<string, HotspotSource>;

export const hotspotDetails: Record<string, HotspotDetail> = {
  '01-old-building': {
    notes: [
      '路環市區在1864年聖誕前後曾遭大火，隨後用一年多時間重建及擴展；今天看到的街道尺度，是多次重建、維修與用途轉換累積的結果。',
      '本熱點只記錄現場可見的門窗、牆體與臨街關係，不在缺乏門牌及檔案核對時替建築指定年代或原用途。',
    ],
    sources: [sources.coloaneHistory],
  },
  '01-sea': {
    notes: [
      '路環西岸面向十字門水域，歷史上風浪相對平靜，較適合船舶停泊；海面不只是景觀，也是村落交通、卸貨與漁業生產的前方。',
      '觀看時可比較岸線、街道與建築的距離，理解村落如何把日常活動安排在陸地與水面之間。',
    ],
    sources: [sources.pierHeritage],
  },
  '01-tree': {
    notes: [
      '樹冠形成入口的遮蔭層，樹幹則是居民與訪客辨認街口的固定參照。這是田野觀察中的空間作用，不等同於對樹齡或樹種的鑑定。',
      '在漁村路線中，樹木、牆角與店招共同構成低技術但穩定的尋路系統。',
    ],
  },
  '01-faith': {
    notes: [
      '最新現場展板記錄：船人街街口的三聖宮又稱金花廟，建於1865年，供奉金花娘娘、觀音與華光；廟門對聯保留路環舊稱「鹽灣」，指向昔日港灣曬鹽的歷史。',
      '鄰近的譚公廟建於1862年，譚公被視為海上守護神。每年農曆四月初八譚公誕，居民搭建神功戲棚並舉行巡遊，延續漁民出海祈安與社區聚會的傳統。',
    ],
    sources: [sources.faithBoard, sources.coloaneHistory],
    fieldPhoto: '/research/faith-temples-board.jpg',
    fieldPhotoAlt: '最新拍攝的「信仰的港灣——三聖宮與譚公廟」現場展板',
  },
  '02-old-tree': {
    notes: [
      '老樹把原本連續的街面切分成停留、轉向與交談的小空間，也降低陽光直射帶來的熱感。',
      '本展示不推定其確切樹齡；「老」指向居民長期使用與反覆辨認所形成的地方感。',
    ],
  },
  '02-coastal-building': {
    notes: [
      '政府2012年的資料指出，船人街西側沿岸曾有35個屬性複雜的建築物，包括持不同准照及木屋登記的棚屋。',
      '因此，沿岸建築不能被簡化為單一類型；它們同時涉及居住、經營、臨水作業、土地制度與保留漁村風貌等問題。',
    ],
    sources: [sources.coastalSheds],
  },
  '02-ground-shade': {
    notes: [
      '字符樹影是根據現場光影所做的數位詮釋，不是歷史復原。它讓觀眾注意到街道在不同時間、風向與樹冠擺動下的變化。',
      '開啟或關閉效果不會修改原始360影像，可用來比較「記錄」與「詮釋」之間的差別。',
    ],
  },
  '03-forked-tree': {
    notes: [
      '分岔樹幹同時標記道路分流與視線轉折；在沒有大型路牌的舊村街道裡，自然物與建築立面常共同承擔尋路功能。',
      '熱點記錄的是當下可見的形態與使用方式，不宣稱樹木自漁村形成之初便存在。',
    ],
  },
  '03-teal-house': {
    notes: [
      '藍綠色立面是現場最清楚的視覺記號之一。色彩可能隨翻修而改變，因此它既是方向提示，也是建築持續維護的痕跡。',
      '路環市區曾在1864年大火後重建，今日街屋應理解為此後百餘年間持續更新的結果，而非一次完成的「古村原貌」。',
    ],
    sources: [sources.coloaneHistory],
  },
  '03-wrong-turn': {
    notes: [
      '沿海支路提醒觀眾：漁村不是單線景點，而是由住宅、店舖、岸線與小巷組成的生活網絡。',
      '本路線為敘事選擇；「折返」只表示回到本次展覽的主線，並不表示支路沒有歷史價值。',
    ],
  },
  '04-curved-building': {
    notes: [
      '弧形轉角順應道路與地塊邊界，讓建築同時面向兩段街道，也增加店面、窗戶與行人的可見關係。',
      '觀看重點不是判斷單一風格，而是理解舊村如何在有限街幅中處理轉彎、採光與臨街使用。',
    ],
  },
  '04-windows': {
    notes: [
      '門窗把室內生活帶到街面：開啟時形成視線與通風，關閉時又保留住戶的邊界。',
      '這一熱點只描述可觀察的空間關係，不虛構屋內人物、聲音或特定事件。',
    ],
  },
  '04-linked-houses': {
    notes: [
      '連續街屋使門前空間兼具通行、擺放、工作與鄰里交談等功能；同一段街面會隨時段改變用途。',
      '路環船人街被官方資料稱為具代表性的傳統漁村街道，價值不只在單棟建築，也在整體街巷與沿岸棚屋的關係。',
    ],
    sources: [sources.fishermenStreet],
  },
  '05-stilt-house': {
    notes: [
      '最新現場展板記錄，船人街位於路環西北角，全長約96米；中文街名來自昔日以船為家的漁民，葡文「Navegantes」意為「航海者」。',
      '沿岸數十間木造棚屋被展板稱為澳門現存最大、最後一片漁村棚屋區，呈現適應潮汐與「前舖後居」的生活方式。不同棚屋的登記、准照及使用狀況仍不完全相同。',
    ],
    sources: [sources.shipmanBoard, sources.fishermenStreet, sources.coastalSheds],
    fieldPhoto: '/research/shipman-street-board.jpg',
    fieldPhotoAlt: '最新拍攝的「船人街——海上人家的生活印記」現場展板',
  },
  '05-roots': {
    notes: [
      '樹根、鋪地與牆腳互相避讓，顯示街道並非靜止完成品，而是在植物生長與日常修補中持續調整。',
      '此處的價值在於材料相遇的細節；除非有樹牌或專業鑑定，不對樹種及樹齡作推測。',
    ],
  },
  '05-shop-door': {
    notes: [
      '店舖入口是交易與居住之間的可變邊界：開門時貨品、工作與街坊關係延伸到街面，關門後又回到私人空間。',
      '門板、遮棚與固定件上的新舊差異，可作為維修次序與使用強度的觀察線索。',
    ],
  },
  '05-rear-water': {
    notes: [
      '棚屋後方直接面向水面，會持續受到潮位、鹽分、濕度與風向影響；建築維護因此與海岸環境不可分開。',
      '澳門潮汐通常每日出現兩次高潮和兩次低潮，且潮高不完全相同，水位變化會改變棚屋與水面的距離。',
    ],
    sources: [sources.tides],
  },
  '06-sign': {
    notes: [
      '英利魚欄位於船人街33號，是路環仍在營業的少數海產店之一；招牌同時標示店名、行業與街道記憶。',
      '公開資料對開業年份有差異：「澳門記憶」條目列1974年，澳門雜誌的店主訪談則記為1965年。本展示保留兩種記錄，不把其中一個寫成唯一答案。',
    ],
    sources: [sources.iengLeiShop, sources.iengLeiMemory, sources.driedFishHistory],
  },
  '06-dried-fish': {
    notes: [
      '店舖資料列出的鹹魚包括黃花魚、馬友、鮫魚與白鯡等，另售花膠、元貝、蝦醬、蝦乾等海味。',
      '露天曬場用來控制乾濕程度與保存品質；「曬」不只是展示形式，而是由陽光、風、濕度與經驗共同決定的加工步驟。',
    ],
    sources: [sources.iengLeiShop],
  },
  '06-handmade': {
    notes: [
      '澳門雜誌訪談記錄，英利過去會把鮮魚加鹽後曝曬，旺季時陽台與屋頂都用作曬場；今天仍有部分產品在棚屋內加工及日曬。',
      '手工製作包含採購、清理、醃製、翻曬、判斷乾度及儲存，不能只用最後掛出的魚乾代表整個勞動過程。',
    ],
    sources: [sources.driedFishHistory],
  },
  '06-supplier': {
    notes: [
      '今天店內亦有來自不同地區的乾貨與花膠，部分貨品在店內再處理及日曬，反映經營模式由本地漁獲逐步轉向跨地供應。',
      '這種轉變與二十世紀後半葉澳門漁業式微、漁獲減少及成本上升相關；「傳統」並非完全不變，而是在供應條件中調整。',
    ],
    sources: [sources.iengLeiShop, sources.driedFishHistory],
  },
  '06-back-room': {
    notes: [
      '前店後居是本次田野觀察到的使用關係：經營、整理、飲食與休息在有限空間內相互靠近。',
      '這一說明不公開住戶私密內容；互動只呈現能從公共街面與訪談授權範圍確認的空間線索。',
    ],
  },
  '06-bees': {
    notes: [
      '魚乾、鹽分、氣味、溫度與昆蟲活動共同構成店舖環境。若未經物種鑑定，展示只稱「昆蟲活動」，不直接判定為蜜蜂或特定蜂種。',
      '這個熱點把非人類生物納入生活檔案，提醒觀眾日常經營也包含清潔、防蟲與貨品保存。',
    ],
  },
  '06-industry-change': {
    notes: [
      '店主訪談記錄，路環過去有約十五至二十間魚欄，後來多數停業或轉為餐飲；現存魚欄已很少。',
      '行業轉變不等於生活突然消失：海味零售、舊客關係、餐廳供貨與部分加工仍以較小規模延續。',
    ],
    sources: [sources.driedFishHistory, sources.iengLeiMemory],
  },
  '07-tong-ke-scan': {
    notes: [
      '此入口連接棠記魚舖的五視角手勢掃描檔案。張開手掌可上下掃描建築，左右揮手可切換正面、右前、俯視、背面與側面。',
      '攝像頭只在你點擊「啟動手勢掃描」後請求權限；掃描頁說明其用途為讀取手掌座標，不儲存鏡頭畫面。退出後會回到目前的360場景。',
    ],
    sources: [sources.scanArchive],
  },
  '07-anchor': {
    notes: [
      '船錨原本用於固定船舶位置；放在碼頭前地後，它轉為提示港口、漁業與水路交通的公共符號。',
      '目前資料不足以證明畫面中的錨曾服務哪一艘船，因此展示只解釋其功能與象徵，不虛構具體船史。',
    ],
    sources: [sources.pierHeritage],
  },
  '07-gateway': {
    notes: [
      '路環碼頭由棧橋、上蓋廊道與斜埗頭組成；門廊具有拱形開口、對稱中軸、階梯式女兒牆及飄簷，呈現簡潔的裝飾藝術風格。',
      '最新展板補充，位於船人街北端的碼頭在20世紀中期曾是漁民上岸的重要公共設施；立面上的「路環碼頭」與「PONTE DA COLOANE」把中文及葡文地名同時留在建築上。',
    ],
    sources: [sources.pierHeritage, sources.shipmanBoard],
  },
  '07-paving': {
    notes: [
      '前地鋪裝以曲線和放射方向組織行走與停留，但不應因圖案帶有葡式視覺就直接判定為百年原物。',
      '政府資料指出，真正的葡式碎石路在澳門大規模出現主要是回歸前數年及其後；鋪地本身也屬持續更新的城市設計。',
    ],
    sources: [sources.pavement],
  },
  '08-railing': {
    notes: [
      '欄杆是碼頭作為公共通道的安全構件，也長期承受鹽霧、海風、雨水與人手觸碰，需要反覆除鏽、補漆及檢查。',
      '表面的磨損不是單純的「舊」，而是使用頻率、氣候與維護週期共同留下的結果。',
    ],
  },
  '08-lamp': {
    notes: [
      '燈柱把碼頭的使用時間延伸到日落之後，也協助辨認通道邊界。畫面中的黃昏色彩是互動詮釋，不是歷史照明復原。',
      '開關效果可比較同一空間在日光與低照度下的視線重點：欄杆、入口與水面反光會依次變得突出。',
    ],
  },
  '08-stilt-houses': {
    notes: [
      '從碼頭回望，船人街沿岸棚屋形成介於街道與水面的薄層；它們承載居住、售賣海產及其他小型經營。',
      '官方規劃資料強調保留棚屋建築風格及漁村特色，但不同棚屋的使用與登記情況並不一致。',
    ],
    sources: [sources.coastalSheds, sources.fishermenStreet],
  },
  '08-tide': {
    notes: [
      '澳門水域較淺，潮位會直接影響船舶靠岸、碼頭支柱露出程度及棚屋下方的水面高度。',
      '海事及水務局自1925年起收集潮汐資料；澳門通常每日有兩次高潮和兩次低潮，且各次潮高不完全相同。',
    ],
    sources: [sources.tides],
  },
  '08-village': {
    notes: [
      '離岸後，原本逐棟觀看的街屋會收成一條岸線，讓觀眾理解村落、棚屋、碼頭與十字門水域的整體地理關係。',
      '西岸較平靜的水域曾使路環碼頭成為澳、氹、路之間的交通門戶，也承擔漁業副產品與其他貨物運輸。',
    ],
    sources: [sources.pierHeritage],
  },
  '09-sea': {
    notes: [
      '路環碼頭曾有前往澳門、氹仔及內地的航線；1968年路氹連貫公路及1974年嘉樂庇大橋通車後，渡輪角色逐步減弱。',
      '今天的開闊海面同時是歷史交通空間與生態環境。澳門位處鹹淡水交界，沿岸曾孕育魚類、甲殼類與貝類等多樣生物。',
    ],
    sources: [sources.pierHeritage, sources.maritimeEcology],
  },
  '09-hills': {
    notes: [
      '路環西岸面向橫琴與十字門水域，遠山不是單純背景，而是界定航道、風向與村落位置的地理參照。',
      '路環碼頭選址與西岸相對平靜、較適合停泊的水域條件有關。',
    ],
    sources: [sources.pierHeritage],
  },
  '09-look-back': {
    notes: [
      '回望路線把九個場景重新串成「陸地街巷—沿岸棚屋—魚欄—碼頭—海面」的空間序列。',
      '它不是完整的路環史，而是一條以田野拍攝位置和本次作品主題組織的觀看路徑。',
    ],
  },
  '09-open-archive': {
    notes: [
      '跡事檔案只收錄觀眾實際打開過的內容，讓每次探索形成不同組合，而不是一次展示所有資料。',
      '資料分為可由公開文獻核對的歷史脈絡，以及由現場影像讀出的材料與使用痕跡；兩者在介面中會明確區分。',
    ],
  },
};
