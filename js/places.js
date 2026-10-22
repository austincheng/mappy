/* =============================================================
 * places.js  —  the places on Mappy.
 * -------------------------------------------------------------
 * Generated from places.txt with real coordinates. Each entry:
 *   name    : display name
 *   nameZh  : optional Chinese label
 *   coords  : [latitude, longitude]
 *   date    : free text (optional)
 *   note    : one-line memory (proofread)
 *   kind    : "memory" | "home" | "badminton" | "dream"
 *   folder  : source photo folder under photos/ (for the card; optional)
 *
 * Coordinates are hand-set; Bay Area ones are placed on their real
 * cities so they land correctly once the detailed CA coastline shows.
 * ============================================================= */

const PLACES = {
  // The chronological journey (hearts). kind defaults to "memory".
  visited: [
    { kind:"memory", name:"Milpitas, CA", coords:[37.4284,-121.9066], date:"June 22, 2023", note:"We met at Bintang Milpitas.", noteZh:"我們在 Bintang Milpitas 相遇。", folder:"photos/240824_Bintang" },
    { kind:"memory", name:"Santa Clara, CA", coords:[37.3541,-121.9552], date:"August 6, 2023", note:"Our first date, just the two of us, at Beque and then Cream, and then I finally got to charge the car with you.", noteZh:"我們的第一次約會，只有我們兩個，先去 Beque，再去 Cream，然後我終於和你一起去充電。", folder:"photos/230806_First_Date_Beque" },
    { kind:"memory", name:"Sunnyvale, CA", coords:[37.3688,-122.0363], date:"August 15, 2023", note:"Our official first day together.", noteZh:"我們正式在一起的第一天。", folder:"photos/230815_First_Day_Rokko_PhoSaigon" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.7749,-122.4194], date:"September 24, 2023", note:"A last-minute planned date day to San Francisco.", noteZh:"臨時決定的舊金山約會日。", folder:"photos/230924_SF_TonysPizzaNapoletana_MountTamalpais_Shooting_Star" },
    { kind:"memory", name:"Maui, HI", coords:[20.7984,-156.3319], zoom:14, date:"September 28, 2023", note:"Our first vacation together.", noteZh:"我們的第一次一起旅行。", folder:"photos/230928_Maui_Day_1" },
    { kind:"memory", name:"Birmingham, AL", coords:[33.5186,-86.8104], date:"October 11, 2023", note:"Early on, you often traveled for work, and we missed each other a lot, but we stayed sweet on our video calls.", noteZh:"我們剛在一起的時候你常常出差，我們很想念彼此，但還是在視訊裡甜甜蜜蜜。", folder:"photos/231011_Video_Call" },
    { kind:"memory", name:"Seoul, South Korea", nameZh:"首爾", coords:[37.5665,126.9780], date:"November 14, 2023", note:"Our first time being apart for an extended period of time. Somehow we both visit Seoul separately within a few weeks of each other, so we still video called.", noteZh:"我們第一次長時間遠距離。我們竟然前後差幾週各自去了首爾，還是有視訊聊天。", folder:"photos/231114_Seoul" },
    { kind:"memory", name:"Taichung, Taiwan", nameZh:"台中", coords:[24.1477,120.6736], zoom:22, date:"November 24, 2023", note:"My first time in Taiwan with you, meeting your parents.", noteZh:"我第一次和你一起回台灣，也是我第一次見你爸媽。", folder:"photos/231124_TPEToTaichung_TaoBanWu" },
    { kind:"memory", name:"Tainan, Taiwan", nameZh:"台南", coords:[22.9999,120.2270], zoom:22, date:"December 3, 2023", note:"Our first getaway, just the two of us.", noteZh:"我們第一次單獨兩個人的小旅行。", folder:"photos/231203_Tainan_Day_1" },
    { kind:"memory", name:"Taoyuan, Taiwan", nameZh:"桃園", coords:[24.9936,121.3010], zoom:22, date:"December 7, 2023", note:"Badminton and more Taiwan together, meeting my parents.", noteZh:"一起在台灣打羽球，繼續我們的台灣好玩時光，也見了我的爸媽。", folder:"photos/231207_Badminton_Taoyuan" },
    { kind:"memory", name:"Istanbul, Turkey", coords:[41.0082,28.9784], date:"December 27, 2023", note:"Your first birthday present, from the Grand Bazaar in Istanbul.", noteZh:"我給你的第一個生日禮物，來自伊斯坦堡的大巴扎。", folder:"photos/231227_Habit_Birthday_Present" },
    { kind:"memory", name:"Los Angeles, CA", coords:[34.0522,-118.2437], date:"December 30, 2023", note:"A last-minute trip to celebrate the holidays together.", noteZh:"臨時安排的一趟旅行，一起過節日。", folder:"photos/231230_Los_Angeles_Day_1" },
    { kind:"memory", name:"Fremont, CA", coords:[37.5485,-121.9886], date:"January 20, 2024", note:"We love having friends over to watch sports games, play mahjong and board games, karaoke and celebrate together.", noteZh:"我們很喜歡邀朋友來家裡看球賽、打麻將和桌遊、唱歌，一起玩。", folder:"photos/240120_49ers_Birthday_Party" },
    { kind:"memory", name:"Fremont, CA", coords:[37.5410,-121.9680], date:"February 17, 2024", note:"Our first badminton competition together.", noteZh:"我們第一次一起參加羽球比賽。", folder:"photos/240217_BadmintonCompetition_TaiwanCafe" },
    { kind:"memory", name:"Mount Hamilton, CA", coords:[37.3414,-121.6429], date:"February 25, 2024", note:"A late Valentine's Day celebration together.", noteZh:"遲到的情人節晚餐。", folder:"photos/240225_Grandview_Restaurant" },
    { kind:"memory", name:"Sierra Vista Trail, CA", coords:[37.4030,-121.8290], date:"April 6, 2024", note:"We started hiking together to train for our first big road trip.", noteZh:"為了準備我們長途美西公園旅行，我們開始一起hiking。", folder:"photos/240406_Sierra_Vista_Hike" },
    { kind:"memory", name:"Yosemite, CA", coords:[37.8651,-119.5383], date:"May 4, 2024", note:"Visiting Yosemite National Park with friends.", noteZh:"和朋友一起去優勝美地國家公園。", folder:"photos/240504_Yosemite" },
    { kind:"memory", name:"San Jose, CA", coords:[37.3300,-121.8900], date:"June 9, 2024", note:"We win a badminton tournament together!", noteZh:"我們一起贏了羽球比賽！", folder:"photos/240609_TCAAT_Tournament_Haircut" },
    { kind:"memory", name:"Seattle, WA", coords:[47.6062,-122.3321], date:"June 15, 2024", note:"We travel to Seattle for Victor & Rhea's wedding.", noteZh:"我們去西雅圖參加 Victor & Rhea 的婚禮。", folder:"photos/240615_Victor_Rhea_Wedding" },
    { kind:"memory", name:"Las Vegas, NV", coords:[36.1699,-115.1398], date:"June 20, 2024", note:"The start of our Western National Parks road trip at Vegas, Hoover Dam & the Grand Canyon.", noteZh:"我們的美西國家公園旅行的起點：拉斯維加斯、胡佛水壩和大峽谷。", folder:"photos/240620_LasVegas_HooverDam_GrandCanyon" },
    { kind:"memory", name:"Grand Canyon, AZ", coords:[36.1069,-112.1129], date:"June 21, 2024", note:"A whole day exploring the Grand Canyon.", noteZh:"一整天都在大峽谷探索。", folder:"photos/240621_Grand_Canyon" },
    { kind:"memory", name:"Page, AZ", coords:[36.9147,-111.4558], date:"June 22, 2024", note:"Antelope Canyon, Horseshoe Bend & Lake Powell.", noteZh:"羚羊峽谷、馬蹄灣和鮑威爾湖。", folder:"photos/240622_AntelopeCanyon_HorseshoeBend_LakePowell_Page" },
    { kind:"memory", name:"Coyote Buttes, AZ", coords:[36.9960,-112.0063], date:"June 24, 2024", note:"Lucky enough to win the lottery to hike The Wave at Vermillion Cliffs.", noteZh:"很幸運抽中了波浪谷的名額。", folder:"photos/240624_The_Wave" },
    { kind:"memory", name:"Iguazu Falls, Brazil", coords:[-25.6953,-54.4367], date:"June 27, 2024", note:"We video-called while we each traveled with our families.", noteZh:"我們各自和家人旅行時的視訊。", folder:"photos/240627_Video_Call" },
    { kind:"memory", name:"Paris, France", coords:[48.8566,2.3522], date:"August 3, 2024", note:"Watching our first Olympics together (at home), cheering as Taiwan badminton won gold in Paris.", noteZh:"我們第一次一起看奧運（在家），看台灣羽球在巴黎贏金牌、幫他們加油。", folder:"photos/240803_Olympics" },
    { kind:"memory", name:"Henry Cowell State Park, CA", coords:[37.0413,-122.0680], date:"September 7, 2024", note:"Our first time camping together.", noteZh:"我們第一次一起露營。", folder:"photos/240907_Henry_Cowell_State_Park_Camping" },
    { kind:"memory", name:"Oakland, CA", coords:[37.8044,-122.2712], date:"September 8, 2024", note:"Our first concert together.", noteZh:"我們的第一場演唱會。", folder:"photos/240908_Camping_GIDLE_Concert" },
    { kind:"memory", name:"San Jose, CA", coords:[37.3200,-121.9500], date:"August 15, 2024", note:"Our first anniversary dinner at Le Papillon.", noteZh:"我們的第一個 anniversary 約會在 Le Papillon。", folder:"photos/240815_Anniversary_LePapillon" },
    { kind:"memory", name:"Tibet, China", nameZh:"西藏", coords:[29.6520,91.1721], date:"October 24, 2024", note:"Sometimes I travel with my parents, but we still text everyday and you share all your everyday moments with me.", noteZh:"我偶爾會和爸媽去旅行，但我們每天都還是會傳訊息，你也會和我分享你每天發生的小事情。", folder:"photos/241024_SFO" },
    { kind:"memory", name:"Los Angeles, CA", coords:[34.0522,-118.2437], date:"November 28, 2024", note:"Our second year in a row in Los Angeles for the holidays.", noteZh:"連續第二年到洛杉磯過節。", folder:"photos/241128_Los_Angeles" },
    { kind:"memory", name:"Valley of Fire, NV", coords:[36.4817,-114.5250], date:"December 1, 2024", note:"Exploring Valley of Fire State Park on our own.", noteZh:"我們自己跑去 Valley of Fire State Park。", folder:"photos/241201_Valley_of_Fire_State_Park" },
    { kind:"memory", name:"Iseltwald, Switzerland", coords:[46.6910,7.9560], date:"December 7, 2024", note:"We definitely need to visit Switzerland someday, inspired by Crash Landing on You (while eating taro balls).", noteZh:"我們一定要找一天去瑞士，我們一邊吃芋圓看《愛的迫降》的地方。", folder:"photos/241207_Home_Taro_Balls" },
    { kind:"memory", name:"Lake Tahoe, CA", coords:[39.0968,-120.0324], date:"December 14, 2024", note:"Our first time snowboarding together!", noteZh:"我們第一次一起滑雪！", folder:"photos/241214_Northstar" },
    { kind:"memory", name:"San Diego, CA", coords:[32.7157,-117.1611], date:"December 21, 2024", note:"Another trip down to SoCal for Christmas.", noteZh:"又一次往南加州過聖誕節。", folder:"photos/241221_SanDiego_PrimosMexicanFood" },
    { kind:"memory", name:"San Diego, CA", coords:[32.7310,-117.1490], date:"December 23, 2024", note:"Exploring San Diego & Balboa Park with Victor & Rhea.", noteZh:"和 Victor & Rhea 去 San Diego & Balboa Park。", folder:"photos/241223_BalboaPark_NewportBeach_Irvine" },
    { kind:"memory", name:"Laguna Beach, CA", coords:[33.5427,-117.7854], date:"December 25, 2024", note:"Christmas by the beach.", noteZh:"在海邊過聖誕節。", folder:"photos/241225_LagunaBeach_TastyNoodleHouse" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.8080,-122.4177], date:"December 31, 2024", note:"Celebrating the New Years in San Francisco (in the car).", noteZh:"在舊金山看新年的煙火（在車上）。", folder:"photos/241231_SF_AMano_NayaDessert_NYEFireworks" },
    { kind:"memory", name:"Berkeley, CA", coords:[37.8715,-122.2730], date:"January 28, 2025", note:"Exploring Berkeley together as I take you to spots I explored when I was in college.", noteZh:"一起去柏克萊走走，我帶你去我大學時去過的地方。", folder:"photos/250128_Wakamatsu_Berkeley" },
    { kind:"memory", name:"Santa Cruz, CA", coords:[36.9741,-122.0308], date:"February 22, 2025", note:"A clam chowder tasting in Santa Cruz.", noteZh:"在 Santa Cruz 品嚐蛤蜊濃湯。", folder:"photos/250222_Santa_Cruz_Clam_Chowder_Tasting" },
    { kind:"memory", name:"Kirkwood, CA", coords:[38.6847,-120.0656], date:"April 19, 2025", note:"Our first time snowboarding on our own, because we had to use up our passes on the season's last day.", noteZh:"我們第一次自己去滑雪，因為要在雪季最後一天把季票用完。", folder:"photos/250419_Kirkwood_SouthLakeTahoe" },
    { kind:"memory", name:"Reykjavik, Iceland", coords:[64.1466,-21.9426], date:"June 18, 2025", note:"Our big Iceland ring-road adventure with so many waterfalls, glaciers & volcanoes.", noteZh:"我們的冰島環島旅遊，好多瀑布、冰川和火山。", folder:"photos/250618_Golden_Circle" },
    { kind:"memory", name:"Húsavík, Iceland", coords:[66.0449,-17.3389], date:"June 23, 2025", note:"Finally wearing our wedding clothes in Iceland!", noteZh:"終於在冰島穿上我們的婚紗禮服！", folder:"photos/250623_Husavik_ArcticHenge_Godafoss" },
    { kind:"memory", name:"Vágar, Faroe Islands", coords:[62.0742,-7.3083], zoom:80, date:"June 27, 2025", note:"Exploring the Faroe Islands, inspired by the Windows screensaver.", noteZh:"看到 Windows 的桌布就想去法羅群島旅行。", folder:"photos/250627_Gasadalur_SlaveCliff" },
    { kind:"memory", name:"Eysturoy, Faroe Islands", coords:[62.2270,-6.8880], zoom:80, date:"June 29, 2025", note:"Wearing our wedding clothes on the Faroe Islands.", noteZh:"在法羅群島穿上我們的婚紗禮服。", folder:"photos/250629_Slaettaratindur_Gjogv_Eidi_Fossa_Saksun" },
    { kind:"memory", name:"Tórshavn, Faroe Islands", coords:[62.0079,-6.7900], zoom:80, date:"June 30, 2025", note:"How do you pronounce the capital of the Faroe Islands? It's on your mug everyday.", noteZh:"你念一遍法羅群島的首都吧，每天都在你的馬克杯上。", folder:"photos/250630_Torshavn_WitchesFinger_Kirkjubour" },
    { kind:"memory", name:"Banff, Canada", coords:[51.4968,-115.9281], date:"July 3, 2025", note:"Our own trip through Banff & Jasper at Lake Louise, Moraine & Lake Fi-tsui.", noteZh:"我們自己走班夫和賈斯珀小鎮：露易絲湖、夢蓮湖和 Lake Fi-tsui。", folder:"photos/250703_Banff" },
    { kind:"memory", name:"Coloma, CA", coords:[38.8002,-120.8902], date:"August 30, 2025", note:"Our first time whitewater rafting.", noteZh:"我們第一次泛舟。", folder:"photos/250830_American_Whitewater_Expedition" },
    { kind:"memory", name:"Sacramento, CA", coords:[38.5816,-121.4944], date:"August 31, 2025", note:"An anime convention in Sacramento.", noteZh:"在 Sacramento 的動漫展。", folder:"photos/250831_Sacramento" },
    { kind:"memory", name:"Lake Berryessa, CA", coords:[38.6085,-122.2272], date:"September 28, 2025", note:"Our first time wakeboarding.", noteZh:"我們第一次 wakeboarding。", folder:"photos/250928_Lake_Berryesa" },
    { kind:"memory", name:"Alameda, CA", coords:[37.7652,-122.2416], date:"October 11, 2025", note:"At Merryle's wedding.", noteZh:"在 Merryle 的婚禮。", folder:"photos/251011_MerryleWedding_Home" },
    { kind:"memory", name:"Sacramento, CA", coords:[38.5900,-121.5050], date:"October 12, 2025", note:"Wakeboarding at a water park in Sacramento.", noteZh:"在 Sacramento 的水上樂園 wakeboarding。", folder:"photos/251012_Wakeboarding_Sacramento" },
    { kind:"memory", name:"Mendocino, CA", coords:[39.3076,-123.7995], date:"October 18, 2025", note:"Camping up north, the calm before a storm we didn't see coming.", noteZh:"在北加州露營，沒想到回到家就出事了。", folder:"photos/251018_Mendocino_VanDammeStatePark" },
    { kind:"memory", name:"Taoyuan, Taiwan", nameZh:"桃園", coords:[24.9936,121.3010], zoom:22, date:"December 25, 2025", note:"Back in Taiwan for the holidays.", noteZh:"又回台灣過節日。", folder:"photos/251225_TPE" },
    { kind:"memory", name:"Taichung, Taiwan", nameZh:"台中", coords:[24.1477,120.6736], zoom:22, date:"December 30, 2025", note:"Fun in Taichung.", noteZh:"在台中玩。", folder:"photos/251230_Taichung" },
    { kind:"memory", name:"Tokyo, Japan", nameZh:"東京", coords:[35.6762,139.6503], date:"January 7, 2026", note:"Our trip to Japan at Asakusa, Shibuya, Tokyo Tower & Ginza.", noteZh:"我們去日本的淺草、澀谷、東京鐵塔和銀座。", folder:"photos/260107_TPE_Asakusa_Senso-ji" },
    { kind:"memory", name:"Karuizawa, Japan", nameZh:"軽井沢", coords:[36.3487,138.5969], date:"January 10, 2026", note:"Snowboarding together in Karuizawa.", noteZh:"一起在輕井澤滑雪。", folder:"photos/260110_Karuizawa" },
    { kind:"memory", name:"Tokyo, Japan", nameZh:"東京", coords:[35.6329,139.8804], date:"January 13, 2026", note:"Tokyo Disneyland together.", noteZh:"一起去東京迪士尼。", folder:"photos/260113_Disneyland" },
    { kind:"memory", name:"Narita, Japan", nameZh:"成田", coords:[35.7767,140.3188], date:"January 14, 2026", note:"One last stop in Narita before flying home.", noteZh:"回家前的最後一站在成田。", folder:"photos/260114_Narita" },
    { kind:"memory", name:"Oakland, CA", coords:[37.7500,-122.2000], date:"January 18, 2026", note:"At the Twice concert for my birthday.", noteZh:"我生日的 Twice 演唱會。", folder:"photos/260118_Twice_Concert" },
    { kind:"memory", name:"Modesto, CA", coords:[37.6391,-120.9969], date:"March 1, 2026", note:"Picking tulips in Modesto.", noteZh:"在 Modesto 採鬱金香。", folder:"photos/260301_Modesto" },
    { kind:"memory", name:"Heavenly, CA", coords:[38.9353,-119.9400], date:"March 14, 2026", note:"More snowboarding by ourselves, but we still went to visit our friends at night.", noteZh:"我們又自己跑去滑雪了，不過晚上有去找朋友玩。", folder:"photos/260315_Heavenly" },
    { kind:"memory", name:"Santa Clara, CA", coords:[37.3541,-121.9552], date:"March 24, 2026", note:"Our \u201cofficial\u201d marriage at the Santa Clara County Clerk's Office.", noteZh:"我們在 Santa Clara \u201c正式\u201d 結婚。", folder:"photos/260324_SantaClaraCountyClerksOffice_Home" },
    { kind:"memory", name:"Fremont, CA", coords:[37.5520,-121.9800], date:"April 11, 2026", note:"After playing Pokémon GO at Lake Elizabeth.", noteZh:"在 Lake Elizabeth 玩寶可夢。", folder:"photos/260411_LakeElizabeth_A+" },
    { kind:"memory", name:"Brentwood, CA", coords:[37.9319,-121.6958], date:"May 9, 2026", note:"Picking mulberries at Very Mulberry.", noteZh:"在 Very Mulberry 採桑葚。", folder:"photos/260509_VeryMulberry_Teazentea" },
    { kind:"memory", name:"Stevens Creek Reservoir, CA", coords:[37.3005,-122.0760], date:"May 31, 2026", note:"Our first time paddleboarding together.", noteZh:"我們第一次一起玩 SUP。", folder:"photos/260531_StevensCreekReservoirSUP_CurryHyuga" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.7786,-122.3893], date:"June 8, 2026", note:"The first of many Giants games was a last-minute decided trip.", noteZh:"很臨時決定去看我們的第一次巨人球賽。", folder:"photos/260608_GiantsGame" },
    { kind:"memory", name:"Big Island, HI", coords:[19.5429,-155.6659], zoom:14, date:"July 1, 2026", note:"Our first time on the Big Island of Hawaii.", noteZh:"我們第一次去夏威夷大島。", folder:"photos/260701_Hawaii" },
    { kind:"memory", name:"Oahu, HI", coords:[21.4389,-158.0001], zoom:16, date:"July 6, 2026", note:"We visited Oahu and Honolulu too.", noteZh:"我們也去了歐胡島和火奴魯魯。", folder:"photos/260701_Hawaii" },
    { kind:"memory", name:"Yosemite, CA", coords:[37.8651,-119.5383], date:"July 10, 2026", note:"Visiting California's national parks after our Hawaii trip.", noteZh:"夏威夷旅行之後，再去加州的國家公園。", folder:"photos/260710_Yosemite" },
    { kind:"memory", name:"Sequoia and Kings National Park, CA", coords:[36.6594,-118.6873], date:"July 11, 2026", note:"Sequoia & Kings Canyon National Parks, hopefully we have enough charge on the car.", noteZh:"Sequoia & Kings Canyon National Parks，希望我們車子還有電。", folder:"photos/260711_SequoiaAndKingsNationalPark" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.8199,-122.4783], date:"July 12, 2026", note:"A quick visit to the Golden Gate Bridge before your parents flew home.", noteZh:"在你爸媽回家前，很快的經過金門大橋。", folder:"photos/260712_SanFrancisco" },
    { kind:"memory", name:"Lake Tahoe, CA", coords:[39.0968,-120.0324], date:"August 15, 2026", note:"A summer visit to Lake Tahoe, late night driving up directly after a Giants game.", noteZh:"夏天時候去看看 Lake Tahoe，而且是剛看完巨人球賽直接三經半夜開上去。", folder:"photos/260815_Tahoe" },
    { kind:"memory", name:"San Jose, CA", coords:[37.3290,-121.8880], date:"August 27, 2026", note:"Mamamoo concert.", noteZh:"Mamamoo 演唱會。", folder:"photos/260827_Mamamoo_Concert" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.7786,-122.3893], date:"September 26, 2026", note:"Our final Giants game together after an eventful season.", noteZh:"精彩球季一起看的最後一場巨人球賽。", folder:"photos/260926_GiantsGame" },
    { kind:"memory", name:"Saratoga, CA", coords:[37.2638,-122.0230], date:"October 4, 2026", note:"At Ben & Erin's wedding.", noteZh:"在 Ben & Erin 的婚禮。", folder:"photos/261004_BenErinWedding" },

    // ----- Always-present special pins (home / badminton) -----
    { kind:"home", name:"Fremont, CA", coords:[37.5430,-121.9700], note:"Our home sweet home. We spend so much time here, being able to enjoy each other's presence and be as sweet as we want with each other at home.", noteZh:"我們美好的家。我們好多時間都在這裡，享受彼此的陪伴，可以放鬆的過我們甜甜蜜蜜的日子。" },
    { kind:"badminton", name:"Santa Clara, CA", coords:[37.3600,-121.9700], note:"Badminton is meaningful to us because it's how we first met. Although Bintang Milpitas is closed now, we still enjoy playing badminton at Bintang Santa Clara.", noteZh:"羽球對我們很 special，因為我們就是打羽球認識的。雖然 Bintang Milpitas 已經關了，我們還是很喜歡去 Bintang Santa Clara 打球。" },
    { kind:"tesla", name:"Sunnyvale, CA", coords:[37.3860,-122.0290], note:"Unfortunately so much of our time is spent at work, but we still get to hang out and eat lunch together in the car.", noteZh:"雖然我們好多時間都在上班，但還是能常常一起在車上吃午餐跟 hang out。" },

    // ----- Dream / someday pins (stars) -----
    { kind:"dream", name:"Bolivia", coords:[-16.2902,-63.5887], note:"Every night you do Duolingo to prepare for our next trip to South America.", noteZh:"你每天晚上都在做 Duolingo，為我們下一次的南美洲旅遊做準備。" },
    { kind:"dream", name:"Aruba", coords:[12.5211,-69.9683], zoom:28, note:"Our honeymoon? At least that's what we said in all those sales presentations.", noteZh:"我們的蜜月？我們反正在那些 sales presentation 裡都是這樣說的。" },
    { kind:"dream", name:"Tanzania", coords:[-6.3690,34.8888], note:"A safari is also at the top of our list of next travel destinations.", noteZh:"非洲 safari 也是我們想去的其中一個景點。" },
    { kind:"dream", name:"New Zealand", coords:[-44.0,170.5], note:"Exploring the grasslands of New Zealand, someday.", noteZh:"有一天可以一起去探索紐西蘭的草原。" },
    { kind:"dream", name:"Alaska", coords:[64.2008,-149.4937], note:"We wish to see the Northern Lights together.", noteZh:"希望有一天可以一起看極光。" }
  ],

  future: [],

  // Final pin: the proposal location (set to the real spot later).
  here: { name:"Here", coords:[37.3382,-121.8863], note:"" }
};
