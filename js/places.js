/* =============================================================
 * places.js  —  the places on the Map of Us.
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
    { kind:"memory", name:"Milpitas, CA", coords:[37.4284,-121.9066], date:"June 19, 2023", note:"We met at Bintang Milpitas.", folder:"photos/240824_Bintang" },
    { kind:"memory", name:"Santa Clara, CA", coords:[37.3541,-121.9552], date:"August 6, 2023", note:"Our first date at Beque.", folder:"photos/230806_First_Date_Beque" },
    { kind:"memory", name:"Sunnyvale, CA", coords:[37.3688,-122.0363], date:"August 15, 2023", note:"Our first day together.", folder:"photos/230815_First_Day_Rokko_PhoSaigon" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.7749,-122.4194], date:"September 24, 2023", note:"A date night in San Francisco.", folder:"photos/230924_SF_TonysPizzaNapoletana_MountTamalpais_Shooting_Star" },
    { kind:"memory", name:"Maui, HI", coords:[20.7984,-156.3319], zoom:14, date:"September 28, 2023", note:"Our first vacation together.", folder:"photos/230928_Maui_Day_1" },
    { kind:"memory", name:"Birmingham, AL", coords:[33.5186,-86.8104], date:"October 11, 2023", note:"Early on, you often traveled for work — so we fell in love over video calls.", folder:"photos/231011_Video_Call" },
    { kind:"memory", name:"Taichung, Taiwan", nameZh:"台中", coords:[24.1477,120.6736], date:"November 24, 2023", note:"My first time in Taiwan with you, meeting your parents.", folder:"photos/231124_TPEToTaichung_TaoBanWu" },
    { kind:"memory", name:"Tainan, Taiwan", nameZh:"台南", coords:[22.9999,120.2270], date:"December 3, 2023", note:"Our first getaway, just the two of us.", folder:"photos/231203_Tainan_Day_1" },
    { kind:"memory", name:"Taoyuan, Taiwan", nameZh:"桃園", coords:[24.9936,121.3010], date:"December 7, 2023", note:"Badminton and more Taiwan together.", folder:"photos/231207_Badminton_Taoyuan" },
    { kind:"memory", name:"Istanbul, Turkey", coords:[41.0082,28.9784], date:"December 27, 2023", note:"Your (late) first birthday present, from the Grand Bazaar in Istanbul.", folder:"photos/231227_Habit_Birthday_Present" },
    { kind:"memory", name:"Los Angeles, CA", coords:[34.0522,-118.2437], date:"December 30, 2023", note:"A last-minute trip to celebrate the holidays together.", folder:"photos/231230_Los_Angeles_Day_1" },
    { kind:"memory", name:"Fremont, CA", coords:[37.5485,-121.9886], date:"January 20, 2024", note:"We love having friends over to watch the games and celebrate together.", folder:"photos/240120_49ers_Birthday_Party" },
    { kind:"memory", name:"Fremont, CA", coords:[37.5410,-121.9680], date:"February 17, 2024", note:"Our first badminton competition together.", folder:"photos/240217_BadmintonCompetition_TaiwanCafe" },
    { kind:"memory", name:"San Jose, CA", coords:[37.3382,-121.8863], date:"February 25, 2024", note:"A (late) Valentine's Day celebration together.", folder:"photos/240225_Grandview_Restaurant" },
    { kind:"memory", name:"San Jose, CA", coords:[37.2550,-121.7950], date:"April 6, 2024", note:"We started hiking together to train for our first big road trip.", folder:"photos/240406_Sierra_Vista_Hike" },
    { kind:"memory", name:"Yosemite, CA", coords:[37.8651,-119.5383], date:"May 4, 2024", note:"Visiting Yosemite National Park with friends.", folder:"photos/240504_Yosemite" },
    { kind:"memory", name:"San Jose, CA", coords:[37.3300,-121.8900], date:"June 9, 2024", note:"We win a badminton tournament together!", folder:"photos/240609_TCAAT_Tournament_Haircut" },
    { kind:"memory", name:"Seattle, WA", coords:[47.6062,-122.3321], date:"June 15, 2024", note:"A road trip north for Victor & Rhea's wedding.", folder:"photos/240615_Victor_Rhea_Wedding" },
    { kind:"memory", name:"Las Vegas, NV", coords:[36.1699,-115.1398], date:"June 20, 2024", note:"Our Western National Parks road trip — Vegas, Hoover Dam & the Grand Canyon.", folder:"photos/240620_LasVegas_HooverDam_GrandCanyon" },
    { kind:"memory", name:"Grand Canyon, AZ", coords:[36.1069,-112.1129], date:"June 21, 2024", note:"Standing at the edge of the Grand Canyon together.", folder:"photos/240621_Grand_Canyon" },
    { kind:"memory", name:"Page, AZ", coords:[36.9147,-111.4558], date:"June 22, 2024", note:"Antelope Canyon, Horseshoe Bend & Lake Powell.", folder:"photos/240622_AntelopeCanyon_HorseshoeBend_LakePowell_Page" },
    { kind:"memory", name:"Coyote Buttes, AZ", coords:[36.9960,-112.0063], date:"June 24, 2024", note:"Hiking The Wave at Vermillion Cliffs.", folder:"photos/240624_The_Wave" },
    { kind:"memory", name:"Iguazu Falls, Brazil", coords:[-25.6953,-54.4367], date:"June 27, 2024", note:"We video-called while we each traveled with our families.", folder:"photos/240627_Video_Call" },
    { kind:"memory", name:"Paris, France", coords:[48.8566,2.3522], date:"August 3, 2024", note:"We watched our first Olympics together and cheered as Taiwan took gold in Paris.", folder:"photos/240803_Olympics" },
    { kind:"memory", name:"Felton, CA", coords:[37.0513,-122.0738], date:"September 7, 2024", note:"Our first time camping together.", folder:"photos/240907_Henry_Cowell_State_Park_Camping" },
    { kind:"memory", name:"Oakland, CA", coords:[37.8044,-122.2712], date:"September 8, 2024", note:"Our first concert together — (G)I-DLE.", folder:"photos/240908_Camping_GIDLE_Concert" },
    { kind:"memory", name:"San Jose, CA", coords:[37.3200,-121.9500], date:"August 15, 2024", note:"Our first anniversary dinner at Le Papillon.", folder:"photos/240815_Anniversary_LePapillon" },
    { kind:"memory", name:"Tibet, China", nameZh:"西藏", coords:[29.6520,91.1721], date:"October 24, 2024", note:"I sometimes travel with my parents — missing you from afar.", folder:"photos/241024_SFO" },
    { kind:"memory", name:"Los Angeles, CA", coords:[34.0522,-118.2437], date:"November 28, 2024", note:"Our second year in a row in Los Angeles for the holidays.", folder:"photos/241128_Los_Angeles" },
    { kind:"memory", name:"Valley of Fire, NV", coords:[36.4817,-114.5250], date:"December 1, 2024", note:"Exploring Valley of Fire State Park on our own.", folder:"photos/241201_Valley_of_Fire_State_Park" },
    { kind:"memory", name:"Iseltwald, Switzerland", coords:[46.6910,7.9560], date:"December 7, 2024", note:"A someday trip, inspired by Crash Landing on You (while eating taro balls).", folder:"photos/241207_Home_Taro_Balls" },
    { kind:"memory", name:"Lake Tahoe, CA", coords:[39.0968,-120.0324], date:"December 14, 2024", note:"Our first time snowboarding together!", folder:"photos/241214_Northstar" },
    { kind:"memory", name:"San Diego, CA", coords:[32.7157,-117.1611], date:"December 21, 2024", note:"Another trip down to SoCal for Christmas.", folder:"photos/241221_SanDiego_PrimosMexicanFood" },
    { kind:"memory", name:"San Diego, CA", coords:[32.7310,-117.1490], date:"December 23, 2024", note:"Exploring San Diego & Balboa Park.", folder:"photos/241223_BalboaPark_NewportBeach_Irvine" },
    { kind:"memory", name:"Laguna Beach, CA", coords:[33.5427,-117.7854], date:"December 25, 2024", note:"Christmas by the beach.", folder:"photos/241225_LagunaBeach_TastyNoodleHouse" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.8080,-122.4177], date:"December 31, 2024", note:"Ringing in the New Year in San Francisco.", folder:"photos/241231_SF_AMano_NayaDessert_NYEFireworks" },
    { kind:"memory", name:"Berkeley, CA", coords:[37.8715,-122.2730], date:"January 28, 2025", note:"Exploring Berkeley together.", folder:"photos/250128_Wakamatsu_Berkeley" },
    { kind:"memory", name:"Santa Cruz, CA", coords:[36.9741,-122.0308], date:"February 22, 2025", note:"A clam chowder tasting in Santa Cruz.", folder:"photos/250222_Santa_Cruz_Clam_Chowder_Tasting" },
    { kind:"memory", name:"Kirkwood, CA", coords:[38.6847,-120.0656], date:"April 19, 2025", note:"Our first time snowboarding on our own — using up our passes on the season's last day.", folder:"photos/250419_Kirkwood_SouthLakeTahoe" },
    { kind:"memory", name:"Reykjavik, Iceland", coords:[64.1466,-21.9426], date:"June 18, 2025", note:"Our big Iceland ring-road adventure — waterfalls, glaciers & volcanoes.", folder:"photos/250618_Golden_Circle" },
    { kind:"memory", name:"Húsavík, Iceland", coords:[66.0449,-17.3389], date:"June 23, 2025", note:"Finally wearing our wedding clothes in Iceland!", folder:"photos/250623_Husavik_ArcticHenge_Godafoss" },
    { kind:"memory", name:"Vágar, Faroe Islands", coords:[62.0742,-7.3083], date:"June 27, 2025", note:"Island-hopping across the Faroe Islands.", folder:"photos/250627_Gasadalur_SlaveCliff" },
    { kind:"memory", name:"Eysturoy, Faroe Islands", coords:[62.2270,-6.8880], date:"June 29, 2025", note:"Wearing our wedding clothes on the Faroe Islands.", folder:"photos/250629_Slaettaratindur_Gjogv_Eidi_Fossa_Saksun" },
    { kind:"memory", name:"Tórshavn, Faroe Islands", coords:[62.0079,-6.7900], date:"June 30, 2025", note:"The Faroese capital — where you got your mug.", folder:"photos/250630_Torshavn_WitchesFinger_Kirkjubour" },
    { kind:"memory", name:"Banff, Canada", coords:[51.4968,-115.9281], date:"July 3, 2025", note:"Our own trip through Banff & Jasper — Lake Louise, Moraine & Emerald Lake.", folder:"photos/250703_Banff" },
    { kind:"memory", name:"Coloma, CA", coords:[38.8002,-120.8902], date:"August 30, 2025", note:"Our first time whitewater rafting.", folder:"photos/250830_American_Whitewater_Expedition" },
    { kind:"memory", name:"Sacramento, CA", coords:[38.5816,-121.4944], date:"August 31, 2025", note:"An anime convention in Sacramento.", folder:"photos/250831_Sacramento" },
    { kind:"memory", name:"Lake Berryessa, CA", coords:[38.6085,-122.2272], date:"September 28, 2025", note:"Our first time wakeboarding.", folder:"photos/250928_Lake_Berryesa" },
    { kind:"memory", name:"Alameda, CA", coords:[37.7652,-122.2416], date:"October 11, 2025", note:"At Merryle's wedding.", folder:"photos/251011_MerryleWedding_Home" },
    { kind:"memory", name:"Sacramento, CA", coords:[38.5900,-121.5050], date:"October 12, 2025", note:"Wakeboarding at a water park in Sacramento.", folder:"photos/251012_Wakeboarding_Sacramento" },
    { kind:"memory", name:"Mendocino, CA", coords:[39.3076,-123.7995], date:"October 18, 2025", note:"Camping in Northern California — right before our house burglary.", folder:"photos/251018_Mendocino_VanDammeStatePark" },
    { kind:"memory", name:"Taoyuan, Taiwan", nameZh:"桃園", coords:[24.9936,121.3010], date:"December 25, 2025", note:"Back in Taiwan for the holidays.", folder:"photos/251225_TPE" },
    { kind:"memory", name:"Taichung, Taiwan", nameZh:"台中", coords:[24.1477,120.6736], date:"December 30, 2025", note:"Fun in Taichung.", folder:"photos/251230_Taichung" },
    { kind:"memory", name:"Tokyo, Japan", nameZh:"東京", coords:[35.6762,139.6503], date:"January 7, 2026", note:"Our first trip to Japan — Asakusa, Shibuya, Tokyo Tower & Ginza.", folder:"photos/260107_TPE_Asakusa_Senso-ji" },
    { kind:"memory", name:"Karuizawa, Japan", nameZh:"軽井沢", coords:[36.3487,138.5969], date:"January 10, 2026", note:"Snowboarding in Karuizawa.", folder:"photos/260110_Karuizawa" },
    { kind:"memory", name:"Tokyo, Japan", nameZh:"東京", coords:[35.6329,139.8804], date:"January 13, 2026", note:"Tokyo Disneyland together.", folder:"photos/260113_Disneyland" },
    { kind:"memory", name:"Narita, Japan", nameZh:"成田", coords:[35.7767,140.3188], date:"January 14, 2026", note:"One last stop in Narita before flying home.", folder:"photos/260114_Narita" },
    { kind:"memory", name:"Oakland, CA", coords:[37.7500,-122.2000], date:"January 18, 2026", note:"A Twice concert for my birthday.", folder:"photos/260118_Twice_Concert" },
    { kind:"memory", name:"Modesto, CA", coords:[37.6391,-120.9969], date:"March 1, 2026", note:"Picking tulips in Modesto.", folder:"photos/260301_Modesto" },
    { kind:"memory", name:"Heavenly, CA", coords:[38.9353,-119.9400], date:"March 14, 2026", note:"A little more snowboarding, just us.", folder:"photos/260315_Heavenly" },
    { kind:"memory", name:"Santa Clara, CA", coords:[37.3541,-121.9552], date:"March 24, 2026", note:"Our \u201cofficial\u201d marriage at the Santa Clara County Clerk's Office.", folder:"photos/260324_SantaClaraCountyClerksOffice_Home" },
    { kind:"memory", name:"Fremont, CA", coords:[37.5520,-121.9800], date:"April 11, 2026", note:"After playing Pokémon GO at Lake Elizabeth.", folder:"photos/260411_LakeElizabeth_A+" },
    { kind:"memory", name:"Brentwood, CA", coords:[37.9319,-121.6958], date:"May 9, 2026", note:"Picking mulberries in Brentwood.", folder:"photos/260509_VeryMulberry_Teazentea" },
    { kind:"memory", name:"Cupertino, CA", coords:[37.3220,-122.0580], date:"May 31, 2026", note:"Our first time paddleboarding at Stevens Creek Reservoir.", folder:"photos/260531_StevensCreekReservoirSUP_CurryHyuga" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.7786,-122.3893], date:"June 8, 2026", note:"The first of many Giants games!", folder:"photos/260608_GiantsGame" },
    { kind:"memory", name:"Big Island, HI", coords:[19.5429,-155.6659], zoom:14, date:"July 1, 2026", note:"Our first time on the Big Island of Hawaii.", folder:"photos/260701_Hawaii" },
    { kind:"memory", name:"Oahu, HI", coords:[21.4389,-158.0001], zoom:16, date:"July 6, 2026", note:"We visited Oahu, too.", folder:"photos/260701_Hawaii" },
    { kind:"memory", name:"Yosemite, CA", coords:[37.8651,-119.5383], date:"July 10, 2026", note:"Visiting California's national parks after our Hawaii trip.", folder:"photos/260710_Yosemite" },
    { kind:"memory", name:"Sequoia and Kings National Park, CA", coords:[36.6594,-118.6873], date:"July 11, 2026", note:"Among the giants at Sequoia & Kings Canyon National Parks.", folder:"photos/260711_SequoiaAndKingsNationalPark" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.8199,-122.4783], date:"July 12, 2026", note:"A quick visit to the Golden Gate Bridge before your parents flew home.", folder:"photos/260712_SanFrancisco" },
    { kind:"memory", name:"Lake Tahoe, CA", coords:[39.0968,-120.0324], date:"August 15, 2026", note:"A summer visit to Lake Tahoe, right after a Giants game.", folder:"photos/260815_Tahoe" },
    { kind:"memory", name:"San Jose, CA", coords:[37.3290,-121.8880], date:"August 27, 2026", note:"A Mamamoo concert.", folder:"photos/260827_Mamamoo_Concert" },
    { kind:"memory", name:"San Francisco, CA", coords:[37.7786,-122.3893], date:"September 26, 2026", note:"Our final Giants game together after an eventful season.", folder:"photos/260926_GiantsGame" },
    { kind:"memory", name:"Saratoga, CA", coords:[37.2638,-122.0230], date:"October 4, 2026", note:"At Ben & Erin's wedding.", folder:"photos/261004_BenErinWedding" },

    // ----- Always-present special pins (home / badminton) -----
    { kind:"home", name:"Fremont, CA", coords:[37.5430,-121.9700], note:"Our home sweet home — so much of our favorite time is spent right here." },
    { kind:"badminton", name:"Santa Clara, CA", coords:[37.3600,-121.9700], note:"So much of our badminton fun happens at Bintang Santa Clara." },
    { kind:"tesla", name:"Sunnyvale, CA", coords:[37.3860,-122.0290], note:"So much of our time is spent at work — hanging out and eating lunch together in the car." },

    // ----- Dream / someday pins (stars) -----
    { kind:"dream", name:"Bolivia", coords:[-16.2902,-63.5887], note:"Our next adventure — you're learning Spanish for it." },
    { kind:"dream", name:"Aruba", coords:[12.5211,-69.9683], zoom:28, note:"Our honeymoon? At least that's what we said in all those sales presentations." },
    { kind:"dream", name:"Tanzania", coords:[-6.3690,34.8888], note:"A safari we keep dreaming about." },
    { kind:"dream", name:"New Zealand", coords:[-44.0,170.5], note:"Exploring the grasslands of New Zealand, someday." },
    { kind:"dream", name:"Alaska", coords:[64.2008,-149.4937], note:"We wish to see the Northern Lights together." }
  ],

  future: [],

  // Final pin: the proposal location (set to the real spot later).
  here: { name:"Here", coords:[37.3382,-121.8863], note:"" }
};
