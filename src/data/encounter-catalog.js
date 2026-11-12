import {GARDEN35_PLAN} from './garden35-plan.js';
/** Researched assets in an opt-in trial release. Layout review remains explicitly pending. */
export const ENCOUNTER_CANDIDATES=Object.freeze([
  {
    "id": "gouldian-finch",
    "kind": "species",
    "parentId": null,
    "name": "コキンチョウ",
    "english": "Gouldian Finch",
    "scientific": "Chloebia gouldiae",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草の穂を眺めたら、葉の向こうに色の気配。",
    "searchClue": "葉の向こうに色あざやかな小さな姿",
    "eventTitle": "草の穂の色あそび",
    "steps": [
      {
        "text": "草の穂がゆれている。だれかが、向こうで待っている。",
        "action": "watch",
        "label": "そっと見る"
      },
      {
        "text": "葉っぱのすきまに、色がちらり。静かな枝から見守ろう。",
        "action": "greet",
        "label": "こんにちは"
      },
      {
        "text": "草の向こうから、小さなお客さまが顔を出した。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "草の穂のそばで、また会えたね。",
    "summary": "北オーストラリアにすむ、色鮮やかな小鳥。背は緑、胸は紫、お腹は黄色。頭の色には違いがあります。",
    "appearance": "赤い頭の成鳥オスを描いたイラスト。資料写真の性別は未確認です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://australian.museum/learn/animals/birds/gouldian-finch/"
      }
    ],
    "art": {
      "src": "game-art/finches/gouldian-red-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "コキンチョウの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/gouldian-sardaka.jpg",
      "width": 3619,
      "height": 2988,
      "alt": "コキンチョウの資料写真",
      "creator": "Sardaka",
      "source": "https://commons.wikimedia.org/wiki/File:(1)Gouldian_finch.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草の穂を眺めたら、葉の向こうに色の気配。",
      "fictional": true,
      "gardenIds": [
        "komugi"
      ]
    }
  },
  {
    "id": "double-barred-finch",
    "kind": "species",
    "parentId": null,
    "name": "カノコスズメ",
    "english": "Double-barred Finch",
    "scientific": "Stizoptera bichenovii",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "木陰でひと息つくと、白い顔と二本の輪。",
    "searchClue": "白い顔をかこむ二本の黒い輪",
    "eventTitle": "点々の小さな地図",
    "steps": [
      {
        "text": "木陰で、小さな影がひと休み。羽の点々が見えるかな。",
        "action": "watch",
        "label": "木陰を見る"
      },
      {
        "text": "白い顔と黒い輪が、葉っぱの間からのぞいた。",
        "action": "greet",
        "label": "そっとあいさつ"
      },
      {
        "text": "模様をひとつずつ見つけたら、出会いのページを開こう。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "木陰の模様、もう覚えたかな。また会えたね。",
    "summary": "白い顔を囲む黒い模様と、胸のもう一本の黒い帯が目印。翼には細かな白い模様があります。",
    "appearance": "成鳥の特徴をもとに描いた創作です。資料写真の性別は未確認です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.sopa.nsw.gov.au/news/double-barred-finch-returned"
      }
    ],
    "art": {
      "src": "game-art/finches/doublebarred-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "カノコスズメの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/doublebarred-brett.jpg",
      "width": 483,
      "height": 483,
      "alt": "カノコスズメの資料写真",
      "creator": "Brett Donald",
      "source": "https://commons.wikimedia.org/wiki/File:Doublebarredfinch.jpg",
      "license": "CC BY-SA 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "quiet",
      "invitation": "木陰でひと息つくと、白い顔と二本の輪。",
      "fictional": true,
      "gardenIds": [
        "komorebi",
        "onsen"
      ]
    }
  },
  {
    "id": "diamond-firetail",
    "kind": "species",
    "parentId": null,
    "name": "ダイヤモンドフィンチ",
    "english": "Diamond Firetail",
    "scientific": "Stagonopleura guttata",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "庭の草の絵飾りのそばに、一本の草を持つ影。",
    "searchClue": "一本の草をくわえた小さな姿",
    "eventTitle": "一本の草のおくりもの",
    "steps": [
      {
        "text": "風にゆれる一本の草。その下に、小さな足あと。",
        "action": "watch",
        "label": "枝を見てみる"
      },
      {
        "text": "草をくわえたお客さまが、枝の上にやってきた。",
        "action": "greet",
        "label": "静かに見守る"
      },
      {
        "text": "草のおくりものをそばに置いて、ひと休み。姿を覚えておこう。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "あの草の枝で、また会えたね。",
    "summary": "オーストラリア南東部の草地や林にすむ小鳥。赤い腰と、黒い脇に並ぶ白い点が目印です。",
    "appearance": "成鳥の特徴を描いたイラストです。資料写真の性別は未確認です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://australian.museum/learn/animals/birds/diamond-firetail/"
      }
    ],
    "art": {
      "src": "game-art/finches/diamond-firetail-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "ダイヤモンドフィンチの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/diamond-ric.jpg",
      "width": 800,
      "height": 729,
      "alt": "ダイヤモンドフィンチの資料写真",
      "creator": "Ric Raftis (bushie)",
      "source": "https://commons.wikimedia.org/wiki/File:Stagonopleura_guttata.jpg",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "庭の草の絵飾りのそばに、一本の草を持つ影。",
      "fictional": true,
      "gardenIds": [
        "kazaguruma"
      ]
    }
  },
  {
    "id": "star-finch",
    "kind": "species",
    "parentId": null,
    "name": "コモンチョウ",
    "english": "Star Finch",
    "scientific": "Emblema ruficauda",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "水辺の絵飾りを眺めたら、白い星の模様。",
    "searchClue": "羽に散らばる白い星のような模様",
    "eventTitle": "池のふちの星",
    "steps": [
      {
        "text": "池のふちの草が、そっとゆれた。",
        "action": "watch",
        "label": "草むらを見る"
      },
      {
        "text": "赤い顔のまわりに、小さな白い点が見えた。",
        "action": "greet",
        "label": "星の模様を探す"
      },
      {
        "text": "星のような模様のお客さま。池のふちで、はじめまして。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "今日も水辺で、星の模様が見つかった。",
    "summary": "北オーストラリアの、水辺に近い草むらで暮らす小鳥。赤い顔と白い点模様が目を引きます。",
    "appearance": "赤い顔をもつ成鳥の姿を描いた創作です。資料写真の性別は未確認です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.nfss.org/species/finches/australian/star/"
      },
      {
        "title": "Cornell Clements Checklist：2024年の属名変更（Bathilda → Emblema）",
        "url": "https://www.birds.cornell.edu/clementschecklist/updates-and-corrections-october-2024/"
      }
    ],
    "art": {
      "src": "game-art/finches/star-finch-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "コモンチョウの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/star-jj.jpg",
      "width": 1457,
      "height": 1596,
      "alt": "コモンチョウの資料写真",
      "creator": "JJ Harrison",
      "source": "https://commons.wikimedia.org/wiki/File:Neochmia_ruficauda.jpg",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "water",
      "invitation": "水辺の絵飾りを眺めたら、白い星の模様。",
      "fictional": true,
      "gardenIds": [
        "mizukagami",
        "bali-terrace"
      ]
    }
  },
  {
    "id": "white-headed-munia",
    "kind": "species",
    "parentId": null,
    "name": "ヘキチョウ",
    "english": "White-headed Munia",
    "scientific": "Lonchura maja",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草の小道に、白い頭のお客さま。",
    "searchClue": "草の小道に白い頭の小鳥",
    "eventTitle": "白いぼうしの散歩道",
    "steps": [
      {
        "text": "草の道の向こうで、白い丸が動いている。",
        "action": "watch",
        "label": "足あとを眺める"
      },
      {
        "text": "白い頭に、茶色の羽。お客さまが草の間をのぞいた。",
        "action": "greet",
        "label": "こんにちは"
      },
      {
        "text": "草の道で一緒にひと休み。白い頭の姿を覚えておこう。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "白いぼうしの散歩道で、また会えたね。",
    "summary": "白い頭と茶色の体が目印。東南アジアの草地などにすみ、種子を食べ、群れで過ごすこともあります。",
    "appearance": "白い頭と茶色の体をもつ成鳥を描いた創作です。資料写真の性別は未確認です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.nies.go.jp/biodiversity/invasive/DB/detail/20240.html"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.nparks.gov.sg/publications-resources/articles/grassland-fliers"
      },
      {
        "title": "鳥についての資料",
        "url": "https://besgroup.org/2018/05/12/white-headed-munia-adult-immature-juvenile-plumage-and-6-calls/"
      }
    ],
    "art": {
      "src": "game-art/finches/white-headed-munia-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "ヘキチョウの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/whitehead-fishhead.jpg",
      "width": 1570,
      "height": 1047,
      "alt": "ヘキチョウの資料写真",
      "creator": "fishhead",
      "source": "https://commons.wikimedia.org/wiki/File:Lonchura_maja_350602573.jpg",
      "license": "CC0 1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草の小道に、白い頭のお客さま。",
      "fictional": true,
      "gardenIds": [
        "komorebi"
      ]
    }
  },
  {
    "id": "zebra-finch",
    "kind": "species",
    "parentId": null,
    "name": "キンカチョウ",
    "english": "Australian Zebra Finch",
    "scientific": "Taeniopygia castanotis",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草の穂の小道で、しま模様を見つける。",
    "searchClue": "草の穂の間に小さなしま模様",
    "eventTitle": "草の道を、とことこ",
    "steps": [
      {
        "text": "草の上に、小さな足あとが続いている。",
        "action": "watch",
        "label": "そっと見てみる"
      },
      {
        "text": "オレンジの頬がちらり。小さなお客さまが振り向いた。",
        "action": "greet",
        "label": "遠くからあいさつ"
      },
      {
        "text": "しましまののども見えてきた。今日の出会いを一枚のページに。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "草の道で、しましまのお客さまに再会。",
    "summary": "オーストラリアの乾いた草地などで、群れをつくる小鳥。オスにはオレンジ色の頬と、のどの細かな縞があります。",
    "appearance": "オーストラリアのキンカチョウの成鳥オスを描いています。ティモールの近縁種とは区別しています。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://australiazoo.com.au/wildlife/our-animals/zebra-finch/"
      }
    ],
    "art": {
      "src": "game-art/finches/zebra-finch-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "キンカチョウの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/zebra-matteo.jpg",
      "width": 5036,
      "height": 3357,
      "alt": "キンカチョウの資料写真",
      "creator": "MatteoBroc",
      "source": "https://commons.wikimedia.org/wiki/File:Zebra_finch_on_a_branch.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草の穂の小道で、しま模様を見つける。",
      "fictional": true,
      "gardenIds": [
        "komugi"
      ]
    }
  },
  {
    "id": "red-avadavat",
    "kind": "species",
    "parentId": null,
    "name": "ベニスズメ",
    "english": "Red Avadavat",
    "scientific": "Amandava amandava",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "葦を描いた水辺のそばに、茶色い羽と白い点。",
    "searchClue": "茶色い羽にちいさな白い点",
    "eventTitle": "葦のあいだの小さな手紙",
    "steps": [
      {
        "text": "葦のあいだに、羽のような小さな影。",
        "action": "watch",
        "label": "葉のすきまを見る"
      },
      {
        "text": "茶色い羽に白い点。落ち着いた色のお客さまがやってきた。",
        "action": "greet",
        "label": "そっと声をかける"
      },
      {
        "text": "葦の間から出てきた、小さなお客さま。名前を覚えておこう。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "葦のそばで、白い点の羽をまた見つけた。",
    "summary": "草原やヨシ原で暮らす小鳥。メスは落ち着いた茶色が中心で、翼に白い点模様があります。",
    "appearance": "ここでは成鳥メスの落ち着いた羽色を描いています。繁殖期の赤いオスとは異なります。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.nies.go.jp/biodiversity/invasive/DB/detail/20260.html"
      }
    ],
    "art": {
      "src": "game-art/finches/red-avadavat-female.png",
      "width": 1254,
      "height": 1254,
      "alt": "ベニスズメの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/redavadavat-female-madhukar.jpg",
      "width": 744,
      "height": 564,
      "alt": "ベニスズメの資料写真",
      "creator": "Madhukar B V",
      "source": "https://commons.wikimedia.org/wiki/File:Red_Avadavat,_female.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "water",
      "invitation": "葦を描いた水辺のそばに、茶色い羽と白い点。",
      "fictional": true,
      "gardenIds": [
        "mizukagami",
        "onsen",
        "bali-terrace"
      ]
    }
  },
  {
    "id": "atlantic-canary",
    "kind": "species",
    "parentId": null,
    "name": "カナリア（野生型）",
    "english": "Atlantic Canary",
    "scientific": "Serinus canaria",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "枝の絵飾りに、緑がかった小さな影。",
    "searchClue": "葉っぱにまぎれる緑がかった小さな姿",
    "eventTitle": "島から届いた枝の便り",
    "steps": [
      {
        "text": "庭の枝先で、小さな影がひと休み。",
        "action": "watch",
        "label": "枝先を見る"
      },
      {
        "text": "緑がかった羽と、細い縞が見えてきた。",
        "action": "greet",
        "label": "こんにちは"
      },
      {
        "text": "島にすむ鳥を思い浮かべた、架空の出会い。新しいページを開こう。",
        "action": "reveal",
        "label": "出会いを記録する"
      }
    ],
    "revisit": "枝先の小さなお客さまに、また会えた。",
    "summary": "カナリア諸島、アゾレス諸島、マデイラ諸島が原産。野生のカナリアには、緑がかった羽と細い縞模様があります。",
    "appearance": "野生型の羽色を描いています。一様に黄色い飼育品種とは区別しています。資料写真の性別は未確認です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://seo.org/ave/serin-canario/"
      }
    ],
    "art": {
      "src": "game-art/finches/atlantic-canary-wild.png",
      "width": 1254,
      "height": 1254,
      "alt": "カナリア（野生型）の創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/canary-wild-eduardo.jpg",
      "width": 1024,
      "height": 768,
      "alt": "カナリア（野生型）の資料写真",
      "creator": "Eduardo Martínez",
      "source": "https://commons.wikimedia.org/wiki/File:Serinus_canaria_-_Canary_-_Wild.jpg",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "枝の絵飾りに、緑がかった小さな影。",
      "fictional": true,
      "gardenIds": [
        "hanadokei"
      ]
    }
  },
  {
    "id": "red-crossbill",
    "kind": "species",
    "parentId": null,
    "name": "イスカ",
    "english": "",
    "scientific": "Loxia curvirostra",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "球果の絵を見たあと、交差するくちばしに出会う。",
    "searchClue": "先が交差するふしぎなくちばし",
    "eventTitle": "球果の小さな鍵",
    "steps": [
      {
        "action": "cone",
        "label": "球果を眺める",
        "text": "枝に残った球果を、少し離れて眺めよう。"
      },
      {
        "action": "bill",
        "label": "くちばしを見つける",
        "text": "先が交差するくちばしが見えた。球果の種を取り出す鳥の道具だ。"
      },
      {
        "action": "seed",
        "label": "種のゆくえを見守る",
        "text": "球果とくちばしの組み合わせを、出会いのページに残そう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "交差したくちばしの先で、針葉樹の球果を開いて中の種を取り出します。実りのよい森を探し、群れで移動する鳥です。",
    "appearance": "成鳥オスの姿です。亜種や鳴き声の型は特定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/Red_Crossbill/id"
      }
    ],
    "art": {
      "src": "game-art/finches/red-crossbill-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "イスカの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/red-crossbill-dave-menke.jpg",
      "width": 4020,
      "height": 2698,
      "alt": "イスカの資料写真",
      "creator": "Dave Menke/USFWS",
      "source": "https://www.fws.gov/media/red-crossbill-0",
      "license": "Public Domain",
      "licenseUrl": "https://www.fws.gov/media/red-crossbill-0",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "球果の絵を見たあと、交差するくちばしに出会う。",
      "fictional": true,
      "gardenIds": [
        "yuyake"
      ]
    }
  },
  {
    "id": "evening-grosbeak",
    "kind": "species",
    "parentId": null,
    "name": "キビタイシメ",
    "english": "",
    "scientific": "Hesperiphona vespertina",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "木の芽のページを開くと、太いくちばしのお客さま。",
    "searchClue": "木の葉の向こうに太いくちばし",
    "eventTitle": "季節の枝のたより",
    "steps": [
      {
        "action": "bud",
        "label": "芽の枝を見る",
        "text": "庭の絵本に、芽の枝のページが開いている。"
      },
      {
        "action": "season",
        "label": "季節のページをめくる",
        "text": "この鳥は春の芽、夏の昆虫、冬の種や果実など、季節で食べるものが変わる。"
      },
      {
        "action": "beak",
        "label": "太いくちばしを覚える",
        "text": "夕方だけの鳥ではないよ。太く力強いくちばしのお客さまを記録しよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "太く力強いくちばしを持つ、北アメリカの鳥。仲間と群れで過ごし、春は木の芽、夏は昆虫、冬は種や果実などを食べます。",
    "appearance": "成鳥オスの姿です。夕方だけに活動する鳥という意味ではありません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/Evening_Grosbeak/id"
      }
    ],
    "art": {
      "src": "game-art/finches/evening-grosbeak-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "キビタイシメの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/evening-grosbeak-dave-menke.jpg",
      "width": 1200,
      "height": 787,
      "alt": "キビタイシメの資料写真",
      "creator": "Dave Menke/USFWS",
      "source": "https://www.fws.gov/media/evening-grosbeak-1",
      "license": "Public Domain",
      "licenseUrl": "https://www.fws.gov/media/evening-grosbeak-1",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "木の芽のページを開くと、太いくちばしのお客さま。",
      "fictional": true,
      "gardenIds": [
        "yuyake"
      ]
    }
  },
  {
    "id": "eurasian-siskin",
    "kind": "species",
    "parentId": null,
    "name": "マヒワ",
    "english": "",
    "scientific": "Spinus spinus",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "ハンノキの絵飾りのそばで、細い縦じまを探す。",
    "searchClue": "小さな体に細い縦じま",
    "eventTitle": "ハンノキの種だより",
    "steps": [
      {
        "action": "alder",
        "label": "ハンノキの枝を見る",
        "text": "絵本のハンノキの枝に、小さな種を見つけた。"
      },
      {
        "action": "stripe",
        "label": "縦じまを探す",
        "text": "黄色みのある羽に細い縦じま。種を食べる小さなお客さまだ。"
      },
      {
        "action": "tree",
        "label": "木と鳥を覚える",
        "text": "マツやカバノキの種も食べる鳥。木の名前と一緒に、出会いを記録しよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "黄色みのある羽に細い縦じまをもつ小さな鳥。マツやハンノキ、カバノキなどの種を食べます。",
    "appearance": "メスの羽色を描いたイラストです。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.bto.org/learn/about-birds/birdfacts/siskin"
      }
    ],
    "art": {
      "src": "game-art/finches/eurasian-siskin-female.png",
      "width": 1254,
      "height": 1254,
      "alt": "マヒワの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/siskin-female-hedera.jpg",
      "width": 1000,
      "height": 925,
      "alt": "マヒワの資料写真",
      "creator": "hedera.baltica",
      "source": "https://www.flickr.com/photos/hedera_baltica/25678098040/",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "ハンノキの絵飾りのそばで、細い縦じまを探す。",
      "fictional": true,
      "gardenIds": [
        "komorebi"
      ]
    }
  },
  {
    "id": "pine-grosbeak",
    "kind": "species",
    "parentId": null,
    "name": "ギンザンマシコ",
    "english": "",
    "scientific": "Pinicola enucleator",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "種や芽の絵を眺めると、ふっくらした姿。",
    "searchClue": "枝の上にふっくらした小鳥の姿",
    "eventTitle": "ふっくら枝の客",
    "steps": [
      {
        "action": "shape",
        "label": "丸い姿を眺める",
        "text": "枝の先に、ふっくらしたお客さまがひと休み。"
      },
      {
        "action": "shortbill",
        "label": "短いくちばしを見る",
        "text": "太く短いくちばしが見えた。種や芽などを食べる鳥だ。"
      },
      {
        "action": "red",
        "label": "赤みのある羽を覚える",
        "text": "今回出会ったのは赤みのある羽のオスを描いた姿。写真でも確かめてみよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "太く短いくちばしをもつ、ふっくらした鳥。種や芽などを食べ、オスは赤みのある羽が目立ちます。",
    "appearance": "赤みのある成鳥オスを描いたイラストです。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/Pine_Grosbeak"
      }
    ],
    "art": {
      "src": "game-art/finches/pine-grosbeak-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "ギンザンマシコの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/pine-grosbeak-stolz.jpg",
      "width": 3612,
      "height": 2381,
      "alt": "ギンザンマシコの資料写真",
      "creator": "Gary Stolz/USFWS",
      "source": "https://www.fws.gov/media/pine-grosbeak-0",
      "license": "Public Domain",
      "licenseUrl": "https://www.fws.gov/media/pine-grosbeak-0",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "種や芽の絵を眺めると、ふっくらした姿。",
      "fictional": true,
      "gardenIds": [
        "yuyake"
      ]
    }
  },
  {
    "id": "common-redpoll",
    "kind": "species",
    "parentId": null,
    "name": "ベニヒワ",
    "english": "",
    "scientific": "Acanthis flammea",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "静かな庭を見渡すと、額の赤いしるし。",
    "searchClue": "ひたいにちいさな赤いしるし",
    "eventTitle": "額の小さなしるし",
    "steps": [
      {
        "action": "forehead",
        "label": "額を見つめる",
        "text": "縞模様のお客さま。額に、小さな赤い斑が見える。"
      },
      {
        "action": "yellowbill",
        "label": "黄色いくちばしを見る",
        "text": "小さな黄色いくちばしで種を食べる鳥。姿の違いをゆっくり覚えよう。"
      },
      {
        "action": "flock",
        "label": "仲間の気配を眺める",
        "text": "群れで動き回る鳥を思い浮かべた、架空の庭の出会いを記録しよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "額の小さな赤い斑が目印。小さな黄色いくちばしで種を食べ、群れで動き回ります。",
    "appearance": "メスに似た落ち着いた羽色の姿です。資料写真の性別は未確認です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/Redpoll/id"
      }
    ],
    "art": {
      "src": "game-art/finches/common-redpoll-female.png",
      "width": 1254,
      "height": 1254,
      "alt": "ベニヒワの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/redpoll-ellis.jpg",
      "width": 1360,
      "height": 1149,
      "alt": "ベニヒワの資料写真",
      "creator": "David Ellis/USFWS",
      "source": "https://www.fws.gov/media/common-redpoll",
      "license": "Public Domain",
      "licenseUrl": "https://www.fws.gov/media/common-redpoll",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "quiet",
      "invitation": "静かな庭を見渡すと、額の赤いしるし。",
      "fictional": true,
      "gardenIds": [
        "tsukiakari"
      ]
    }
  },
  {
    "id": "gloster-canary",
    "kind": "domestic-variety",
    "parentId": "atlantic-canary",
    "name": "グロスターカナリア",
    "english": "",
    "scientific": "Serinus canaria domestic breed",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "歌の絵本を開いた庭へ、丸い冠羽のお客さま。",
    "searchClue": "丸いぼうしのような頭の羽",
    "eventTitle": "まるい冠の訪問者",
    "steps": [
      {
        "action": "crest",
        "label": "冠羽を眺める",
        "text": "頭を包むような、まあるい冠羽のお客さまが遊びに来た。"
      },
      {
        "action": "variety",
        "label": "ふたつの姿を知る",
        "text": "冠羽のあるコロナと、ないコンソート。冠羽の有無はオス・メスの違いではない。"
      },
      {
        "action": "canary",
        "label": "カナリアのページに記録",
        "text": "新しい野生種ではなく、カナリアの品種。仲間のページにつなげて覚えよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "カナリアの品種のひとつ。丸い冠羽のあるコロナと、冠羽のないコンソートがいます。冠羽の有無はオス・メスの違いではありません。",
    "appearance": "冠羽のあるコロナの姿を描いています。冠羽は性別を示すものではありません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://vandusengarden.org/wp-content/uploads/2017/02/Gloster-Canary-Notes-With-References.pdf"
      }
    ],
    "art": {
      "src": "game-art/finches/gloster-canary-corona.png",
      "width": 1254,
      "height": 1254,
      "alt": "グロスターカナリアの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/gloster-zeetz.jpg",
      "width": 1024,
      "height": 731,
      "alt": "グロスターカナリアの資料写真",
      "creator": "Zeetz Jones",
      "source": "https://www.flickr.com/photos/zeetzjones/316811965/",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "song",
      "invitation": "歌の絵本を開いた庭へ、丸い冠羽のお客さま。",
      "fictional": true,
      "gardenIds": [
        "hanadokei"
      ]
    }
  },
  {
    "id": "oriental-greenfinch",
    "kind": "species",
    "parentId": null,
    "name": "カワラヒワ",
    "english": "",
    "scientific": "Chloris sinica",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草の種の絵を眺めたら、翼に黄色の便り。",
    "searchClue": "羽ばたく翼にちらりと黄色",
    "eventTitle": "翼の黄色い便り",
    "steps": [
      {
        "action": "wing",
        "label": "翼の黄色を探す",
        "text": "枝に止まったお客さまの翼に、鮮やかな黄色が見える。"
      },
      {
        "action": "grassseed",
        "label": "草の種を眺める",
        "text": "草の種をよく食べる鳥。庭の草の絵と見比べよう。"
      },
      {
        "action": "autumn",
        "label": "群れの季節を知る",
        "text": "秋から冬には群れで過ごす。翼の黄色を、出会いの目印にしよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "黄褐色の体に、翼の鮮やかな黄色が目立つ鳥。草の種をよく食べ、秋から冬には群れで過ごします。",
    "appearance": "資料で確かめた成鳥の特徴から描いた創作です。性別や亜種を推定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.ffpri.go.jp/skk/kenkyushokai/sikokudoshokubutu/kwarahiwa.html"
      }
    ],
    "art": {
      "src": "game-art/finches/oriental-greenfinch-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "カワラヒワの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/greenfinch-harum.jpg",
      "width": 1024,
      "height": 683,
      "alt": "カワラヒワの資料写真",
      "creator": "harum.koh",
      "source": "https://www.flickr.com/photos/harumkoh/8473874202/",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草の種の絵を眺めたら、翼に黄色の便り。",
      "fictional": true,
      "gardenIds": [
        "kazaguruma"
      ]
    }
  },
  {
    "id": "society-finch",
    "kind": "domestic-variety",
    "parentId": null,
    "name": "ジュウシマツ",
    "english": "",
    "scientific": "Lonchura striata domestic form",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "歌のノートを開くと、お友達から訪問の便り。",
    "searchClue": "歌声のするほうになかよしの小鳥たち",
    "eventTitle": "歌の記憶のページ",
    "steps": [
      {
        "action": "visitor",
        "label": "お客さまを迎える",
        "text": "人のもとで生まれた飼育品種のお客さま。野生の鳥を捕まえた物語ではないよ。"
      },
      {
        "action": "songbook",
        "label": "歌のノートを見る",
        "text": "歌の学習を調べる研究でも知られる鳥。今日は静かな歌のノートを眺めよう。"
      },
      {
        "action": "pied",
        "label": "羽色を覚える",
        "text": "さまざまな羽色がある仲間。今回の姿を、独立したイラストと原版写真で見てみよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "野生の鳥ではなく、人のもとで生まれた飼育品種。さまざまな羽色があり、歌の学習を調べる研究でも知られています。",
    "appearance": "まだらの羽色の飼育品種を独立して描いた創作です。原版写真の加工ではありません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://wwp.shizuoka.ac.jp/biological-science/organisms/ジュウシマツ/"
      }
    ],
    "art": {
      "src": "game-art/finches/society-finch-pied.png",
      "width": 1254,
      "height": 1254,
      "alt": "ジュウシマツの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/society-higgins-ND.jpg",
      "width": 1024,
      "height": 683,
      "alt": "ジュウシマツの資料写真",
      "creator": "Steve Higgins",
      "source": "https://www.flickr.com/photos/127876925@N02/27307076312/",
      "license": "CC BY-ND 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-nd/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": true,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "song",
      "invitation": "歌のノートを開くと、お友達から訪問の便り。",
      "fictional": true,
      "gardenIds": [
        "hanadokei",
        "onsen"
      ]
    }
  },
  {
    "id": "eurasian-bullfinch",
    "kind": "species",
    "parentId": null,
    "name": "ウソ",
    "english": "",
    "scientific": "Pyrrhula pyrrhula",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "口笛のしおりを読むと、丸い頭のお客さま。",
    "searchClue": "口笛のような声の先に丸い頭",
    "eventTitle": "口笛のしおり",
    "steps": [
      {
        "action": "roundhead",
        "label": "丸い頭を見る",
        "text": "丸い頭と太いくちばしのお客さまが、枝でひと休み。"
      },
      {
        "action": "buds",
        "label": "木の芽を眺める",
        "text": "木の芽などを食べる鳥。芽を摘まず、そのまま眺めよう。"
      },
      {
        "action": "whistle",
        "label": "声のしおりを読む",
        "text": "柔らかな口笛のような声で鳴く鳥。今回はヨーロッパのオスの姿を記録するよ。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "丸い頭と太いくちばしが特徴。木の芽などを食べ、柔らかな口笛のような声で鳴きます。写真はヨーロッパのオスで、日本の仲間とは羽色に違いがあります。",
    "appearance": "ヨーロッパの成鳥オスの姿です。日本の亜種の姿として扱っていません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.bto.org/learn/about-birds/birdfacts/bullfinch"
      }
    ],
    "art": {
      "src": "game-art/finches/eurasian-bullfinch-european-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "ウソの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/bullfinch-morffew.jpg",
      "width": 1024,
      "height": 819,
      "alt": "ウソの資料写真",
      "creator": "Andy Morffew",
      "source": "https://www.flickr.com/photos/andymorffew/54282490872",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "song",
      "invitation": "口笛のしおりを読むと、丸い頭のお客さま。",
      "fictional": true,
      "gardenIds": [
        "shrine-grove"
      ]
    }
  },
  {
    "id": "chestnut-munia",
    "kind": "species",
    "parentId": null,
    "name": "キンパラ",
    "english": "",
    "scientific": "Lonchura atricapilla",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草の小道でひと休み、黒い頭と赤茶の羽。",
    "searchClue": "黒い頭と赤茶色の羽",
    "eventTitle": "黒い頭と栗色の羽",
    "steps": [
      {
        "action": "blackhead",
        "label": "頭の色を見る",
        "text": "開けた草地を思わせる庭で、黒い頭がちらり。"
      },
      {
        "action": "chestnut",
        "label": "赤茶色の羽を見る",
        "text": "赤茶色の体と黒い頭。色の境目をゆっくり眺めよう。"
      },
      {
        "action": "company",
        "label": "仲間のページを開く",
        "text": "つがいや小さな群れで見られる鳥。ほかのムニアとは別のページに記録するよ。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "黒い頭と赤茶色の体が目印。草地などの開けた場所で、つがいや小さな群れで見られます。",
    "appearance": "資料で確かめた成鳥の特徴から描いた創作です。性別や亜種を推定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.nparks.gov.sg/publications-resources/articles/grassland-fliers"
      },
      {
        "title": "鳥についての資料",
        "url": "https://singaporebirds.com/species/chestnut-munia"
      }
    ],
    "art": {
      "src": "game-art/finches/chestnut-munia-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "キンパラの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/chestnut-ray.jpg",
      "width": 1024,
      "height": 1020,
      "alt": "キンパラの資料写真",
      "creator": ". Ray in Manila",
      "source": "https://www.flickr.com/photos/rayinmanila/51444908516/",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草の小道でひと休み、黒い頭と赤茶の羽。",
      "fictional": true,
      "gardenIds": [
        "komugi",
        "java-rice"
      ]
    }
  },
  {
    "id": "tricolored-munia",
    "kind": "species",
    "parentId": null,
    "name": "ギンパラ",
    "english": "",
    "scientific": "Lonchura malacca",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "穀物の絵のページを開いた、小さな庭の午後。",
    "searchClue": "黒と茶色の羽に白いお腹",
    "eventTitle": "草の穂の食卓",
    "steps": [
      {
        "action": "seedhead",
        "label": "草の穂を見る",
        "text": "草地や農地で暮らす鳥を思い浮かべた、草の穂の小道。"
      },
      {
        "action": "mixedflock",
        "label": "隣の仲間を眺める",
        "text": "ほかのムニアやハタオリドリと、種を食べる姿が研究で記録されている。"
      },
      {
        "action": "grain",
        "label": "穀物の絵を見比べる",
        "text": "草や穀物の種を食べる仲間。現実に餌をまかず、絵本の中で出会いを記録しよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "草地や農地で暮らす小鳥。調査では、ほかのムニアやハタオリドリと一緒に、草や穀物の種を食べる姿が記録されています。",
    "appearance": "資料で確かめた成鳥の特徴から描いた創作です。性別や亜種を推定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://indianbirds.in/pdfs/IB_18_5_Final_Highres.pdf"
      },
      {
        "title": "鳥についての資料",
        "url": "https://stateofindiasbirds.in/species/2023/cpl-trimun/"
      }
    ],
    "art": {
      "src": "game-art/finches/tricolored-munia-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "ギンパラの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/tricolor-hari.jpg",
      "width": 1024,
      "height": 683,
      "alt": "ギンパラの資料写真",
      "creator": "Hari K Patibanda",
      "source": "https://www.flickr.com/photos/krishnacolor/51293627506",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "穀物の絵のページを開いた、小さな庭の午後。",
      "fictional": true,
      "gardenIds": [
        "komugi"
      ]
    }
  },
  {
    "id": "scaly-breasted-munia",
    "kind": "species",
    "parentId": null,
    "name": "シマキンパラ",
    "english": "",
    "scientific": "Lonchura punctulata",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草の穂の絵飾りのそばに、うろこ模様のお腹。",
    "searchClue": "お腹に並ぶうろこのような模様",
    "eventTitle": "うろこ模様の小道",
    "steps": [
      {
        "action": "climb",
        "label": "草の穂を眺める",
        "text": "草の穂によじ登って種を食べる鳥。少し離れて、その姿を思い浮かべよう。"
      },
      {
        "action": "scales",
        "label": "お腹の模様を探す",
        "text": "白いお腹にうろこのような模様。今回のイラストは成鳥の姿だ。"
      },
      {
        "action": "young",
        "label": "成鳥のしるしを覚える",
        "text": "若鳥には目立つうろこ模様がまだない。今日見えた模様を記録しよう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "白いお腹のうろこ模様が目印。草の穂によじ登って種を食べ、仲間と群れで過ごします。若鳥には、まだ目立つうろこ模様がありません。",
    "appearance": "資料で確かめた成鳥の特徴から描いた創作です。性別や亜種を推定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/Scaly-breasted_Munia"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/Scaly-breasted_Munia/id"
      }
    ],
    "art": {
      "src": "game-art/finches/scaly-breasted-munia-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "シマキンパラの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/scaly-kuhn.jpg",
      "width": 1024,
      "height": 683,
      "alt": "シマキンパラの資料写真",
      "creator": "Michael Kuhn",
      "source": "https://www.flickr.com/photos/31176607@N05/54233627285/",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草の穂の絵飾りのそばに、うろこ模様のお腹。",
      "fictional": true,
      "gardenIds": [
        "komugi",
        "java-rice"
      ]
    }
  },
  {
    "id": "black-rumped-waxbill",
    "kind": "species",
    "parentId": null,
    "name": "カエデチョウ",
    "english": "",
    "scientific": "Estrilda troglodytes",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "水辺の草模様を眺めたら、細かな横じま。",
    "searchClue": "羽に並ぶ細かな横じま",
    "eventTitle": "横しまの水辺だより",
    "steps": [
      {
        "action": "reeds",
        "label": "水辺の草を見る",
        "text": "水辺の草むらを思わせる、小さな庭の一角。"
      },
      {
        "action": "bars",
        "label": "細かな横模様を見る",
        "text": "灰褐色の羽に細かな横模様。よく似た鳥と混ぜずに覚えよう。"
      },
      {
        "action": "diet",
        "label": "暮らしのページを読む",
        "text": "種や昆虫を食べ、つがいや小さな群れで過ごす鳥。出会いのページを開こう。"
      }
    ],
    "revisit": "前に出会った姿を、もう一度ゆっくり眺めよう。",
    "summary": "灰褐色の羽に細かな横模様を持つ小鳥。草地や水辺の草むらで、つがいや小さな群れになり、種や昆虫を食べます。",
    "appearance": "資料で確かめた成鳥の特徴から描いた創作です。性別や亜種を推定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.nies.go.jp/biodiversity/invasive/DB/detail/20190.html"
      }
    ],
    "art": {
      "src": "game-art/finches/black-rumped-waxbill-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "カエデチョウの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/blackrump-veronesi.jpg",
      "width": 1023,
      "height": 682,
      "alt": "カエデチョウの資料写真",
      "creator": "Francesco Veronesi",
      "source": "https://www.flickr.com/photos/francesco_veronesi/31806634704/",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": true,
      "canColorFilter": true,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "water",
      "invitation": "水辺の草模様を眺めたら、細かな横じま。",
      "fictional": true,
      "gardenIds": [
        "mizukagami"
      ]
    }
  },
  {
    "id": "pin-tailed-whydah",
    "kind": "species",
    "parentId": null,
    "name": "テンニンチョウ",
    "english": "",
    "scientific": "Vidua macroura",
    "family": "テンニンチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草原の絵のそばへ、長い尾の訪問者。",
    "searchClue": "草の向こうにすらりと長い尾",
    "eventTitle": "草原の長い尾",
    "steps": [
      {
        "action": "tail",
        "label": "尾の長さを見る",
        "text": "白黒の羽に、ひときわ長い黒い尾。今回の姿は繁殖期のオスだ。"
      },
      {
        "action": "grassland",
        "label": "草原のページを読む",
        "text": "アフリカの草原などで暮らし、種子や昆虫を食べる鳥。"
      },
      {
        "action": "seasonal",
        "label": "季節の姿を記録",
        "text": "長い尾を、一年中すべての仲間が持つわけではない。季節の姿として覚えよう。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "アフリカの草原などで暮らし、種子や昆虫を食べます。繁殖期のオスは白黒の羽と、ひときわ長い黒い尾が目印です。",
    "appearance": "繁殖期のオスを描いた創作です。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.nies.go.jp/biodiversity/invasive/DB/detail/20280.html"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.biodiversityexplorer.info/birds/viduidae/vidua_macroura.htm"
      }
    ],
    "art": {
      "src": "game-art/finches/pin-tailed-whydah-breeding-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "テンニンチョウの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/whydah-dupont.jpg",
      "width": 1024,
      "height": 739,
      "alt": "テンニンチョウの資料写真",
      "creator": "Bernard DUPONT",
      "source": "https://www.flickr.com/photos/berniedup/50180106893/",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草原の絵のそばへ、長い尾の訪問者。",
      "fictional": true,
      "gardenIds": [
        "kazaguruma"
      ]
    }
  },
  {
    "id": "hawfinch",
    "kind": "species",
    "parentId": null,
    "name": "シメ",
    "english": "",
    "scientific": "Coccothraustes coccothraustes",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "硬い種の絵を眺めると、力強いくちばし。",
    "searchClue": "枝の上にがっしりしたくちばし",
    "eventTitle": "硬い種の小さな鍵",
    "steps": [
      {
        "action": "hardseed",
        "label": "種の絵を眺める",
        "text": "絵本のページには硬い種。林に暮らすお客さまの得意な食べ物だ。"
      },
      {
        "action": "powerbill",
        "label": "くちばしを見比べる",
        "text": "大きく力強いくちばしで、硬い種を割る鳥。形をよく見てみよう。"
      },
      {
        "action": "wintergroup",
        "label": "冬の仲間を知る",
        "text": "冬には仲間と集まることもある。大きなくちばしを目印に記録しよう。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "大きく力強いくちばしを持つ鳥。硬い種を割るのが得意で、林で暮らし、冬には仲間と集まることもあります。",
    "appearance": "成鳥の姿です。性別は特定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.bto.org/learn/about-birds/birdfacts/hawfinch"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.rspb.org.uk/birds-and-wildlife/hawfinch"
      }
    ],
    "art": {
      "src": "game-art/finches/hawfinch-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "シメの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/hawfinch-morffew.jpg",
      "width": 1023,
      "height": 819,
      "alt": "シメの資料写真",
      "creator": "Andy Morffew",
      "source": "https://www.flickr.com/photos/andymorffew/52721646287/",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "硬い種の絵を眺めると、力強いくちばし。",
      "fictional": true,
      "gardenIds": [
        "komorebi"
      ]
    }
  },
  {
    "id": "japanese-grosbeak",
    "kind": "species",
    "parentId": null,
    "name": "イカル",
    "english": "",
    "scientific": "Eophona personata",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "歌のしおりを読んだ庭で、黄色いくちばし。",
    "searchClue": "歌声のするほうに黄色いくちばし",
    "eventTitle": "林の歌のしおり",
    "steps": [
      {
        "action": "broadleaf",
        "label": "広葉樹の枝を見る",
        "text": "低山や山地の広葉樹林にすむ鳥を思い浮かべた、架空の庭の枝。"
      },
      {
        "action": "songphrase",
        "label": "歌のしおりを読む",
        "text": "「キーコキコキー」と聞こえるさえずり。今日は声のことばを絵本で知ろう。"
      },
      {
        "action": "yellowbeak",
        "label": "黄色いくちばしを覚える",
        "text": "大きな黄色いくちばしと、ふっくらした姿を記録しよう。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "低山や山地の広葉樹林で見られる、ふっくらした鳥。「キーコキコキー」と聞こえる声でさえずります。",
    "appearance": "成鳥を描いています。性別は特定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.pref.nara.lg.jp/documents/696/04_2syou.pdf"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.qsr.mlit.go.jp/yamakuni/birds/bird/ikaru.html"
      }
    ],
    "art": {
      "src": "game-art/finches/japanese-grosbeak-adult.png",
      "width": 1254,
      "height": 1254,
      "alt": "イカルの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/japanese-grosbeak-harum.jpg",
      "width": 1024,
      "height": 576,
      "alt": "イカルの資料写真",
      "creator": "harum.koh",
      "source": "https://www.flickr.com/photos/harumkoh/16183775305/",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "song",
      "invitation": "歌のしおりを読んだ庭で、黄色いくちばし。",
      "fictional": true,
      "gardenIds": [
        "shrine-grove"
      ]
    }
  },
  {
    "id": "brambling",
    "kind": "species",
    "parentId": null,
    "name": "アトリ",
    "english": "",
    "scientific": "Fringilla montifringilla",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "落ち葉の小道を静かに眺めたら、橙色の羽。",
    "searchClue": "落ち葉の色にまじるあたたかな橙色の羽",
    "eventTitle": "橙色の冬だより",
    "steps": [
      {
        "action": "ground",
        "label": "地面の小道を見る",
        "text": "地面で食べ物を探す姿を思い浮かべて、小道を少し離れて眺めよう。"
      },
      {
        "action": "orange",
        "label": "橙色の羽を探す",
        "text": "橙色が印象的なお客さま。頭の見え方は季節によって変わる。"
      },
      {
        "action": "winterflock",
        "label": "冬の群れを思う",
        "text": "冬には大きな群れになることもある。今の季節の姿を、一枚のページに。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "冬には大きな群れになることもある、橙色が印象的な鳥。地面で食べ物を探す姿が見られます。季節によって頭の見え方が変わります。",
    "appearance": "冬から春へ移る時期のオスの羽を描いています。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.bto.org/learn/about-birds/birdfacts/brambling"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.rspb.org.uk/birds-and-wildlife/brambling"
      }
    ],
    "art": {
      "src": "game-art/finches/brambling-male-winter-spring.png",
      "width": 1254,
      "height": 1254,
      "alt": "アトリの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/brambling-hedera.jpg",
      "width": 1024,
      "height": 1024,
      "alt": "アトリの資料写真",
      "creator": "hedera.baltica",
      "source": "https://www.flickr.com/photos/hedera_baltica/54297399797",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "quiet",
      "invitation": "落ち葉の小道を静かに眺めたら、橙色の羽。",
      "fictional": true,
      "gardenIds": [
        "shrine-grove",
        "paris-unrest"
      ]
    }
  },
  {
    "id": "red-siskin",
    "kind": "species",
    "parentId": null,
    "name": "ショウジョウヒワ",
    "english": "",
    "scientific": "Spinus cucullatus",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "鳥を守る絵本を読むと、赤と黒の小さな影。",
    "searchClue": "木かげに赤と黒の小さな姿",
    "eventTitle": "赤い羽を守る便り",
    "steps": [
      {
        "action": "redblack",
        "label": "赤と黒の羽を見る",
        "text": "南アメリカの小さなお客さま。今回の姿は赤と黒が鮮やかなオス。"
      },
      {
        "action": "budsfruit",
        "label": "食べ物の絵を見る",
        "text": "種子や果実、芽などを食べる鳥。庭の絵本で暮らしをたどろう。"
      },
      {
        "action": "protect",
        "label": "守る便りを読む",
        "text": "野生の鳥の捕獲や生息地の減少から守る取り組みが続く。捕まえずに、出会いを記録しよう。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "赤と黒が鮮やかな、南アメリカの小さな鳥。種子や果実、芽などを食べます。野生の鳥の捕獲や生息地の減少から守る取り組みが続いています。",
    "appearance": "成鳥オスを描いています。資料写真は飼育下で撮影された鳥で、野生での出会いの記録ではありません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.env.go.jp/content/900524668.pdf"
      },
      {
        "title": "鳥についての資料",
        "url": "https://profiles.si.edu/display/n19158"
      },
      {
        "title": "鳥についての資料",
        "url": "https://nationalzoo.si.edu/animals/red-siskin"
      }
    ],
    "art": {
      "src": "game-art/finches/red-siskin-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "ショウジョウヒワの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/redsiskin-wolf.jpg",
      "width": 1024,
      "height": 1024,
      "alt": "ショウジョウヒワの資料写真",
      "creator": "Laura Wolf",
      "source": "https://www.flickr.com/photos/laurawolfartist/51889116777",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "quiet",
      "invitation": "鳥を守る絵本を読むと、赤と黒の小さな影。",
      "fictional": true,
      "gardenIds": [
        "tsukiakari"
      ]
    }
  },
  {
    "id": "chinese-grosbeak",
    "kind": "species",
    "parentId": null,
    "name": "コイカル",
    "english": "",
    "scientific": "Eophona migratoria",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "木の実の絵を眺めると、淡い頭のお客さま。",
    "searchClue": "枝先に淡い色の頭の小鳥",
    "eventTitle": "明るい林の木の実",
    "steps": [
      {
        "action": "lightwood",
        "label": "明るい林を眺める",
        "text": "明るい広葉樹の林にすむ鳥を思い浮かべた、静かな枝。"
      },
      {
        "action": "nutbill",
        "label": "木の実とくちばしを見る",
        "text": "木の実を大きなくちばしで割って食べる鳥。イカルとは別の種類だ。"
      },
      {
        "action": "femalehead",
        "label": "今回の羽色を覚える",
        "text": "今回はメスの姿。オスと頭の色が違うので、この姿を丁寧に覚えよう。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "明るい広葉樹の林で見られ、木の実を大きなくちばしで割って食べます。イカルとは別の種類の鳥です。",
    "appearance": "成鳥メスを描いています。資料写真も撮影者がメスと記しています。写真原版のクレジット帯を残しています。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.biodic.go.jp/reports2/6th/6_bird_species/pdf/koikaru.pdf"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.pref.kyoto.jp/kankyo/rdb2002/bio/db/bird0100.html"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.city.nagoya.jp/_res/projects/default_project/_page_/001/033/467/rdb2025_doubutsu_n.pdf"
      }
    ],
    "art": {
      "src": "game-art/finches/chinese-grosbeak-female.png",
      "width": 1254,
      "height": 1254,
      "alt": "コイカルの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/chinese-grosbeak-lin.jpg",
      "width": 1024,
      "height": 576,
      "alt": "コイカルの資料写真",
      "creator": "林孫鋒 (Lin Sun-Fong)",
      "source": "https://www.flickr.com/photos/outdoor_birding/53075105060/",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "木の実の絵を眺めると、淡い頭のお客さま。",
      "fictional": true,
      "gardenIds": [
        "yuyake"
      ]
    }
  },
  {
    "id": "long-tailed-paradise-whydah",
    "kind": "species",
    "parentId": null,
    "name": "ホウオウジャク",
    "english": "",
    "scientific": "Vidua paradisaea",
    "family": "テンニンチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "季節の羽の絵本を開くと、とても長い尾。",
    "searchClue": "静かな庭にとても長い尾の影",
    "eventTitle": "季節で変わる長い尾",
    "steps": [
      {
        "action": "longtail",
        "label": "尾のシルエットを見る",
        "text": "今回の姿は繁殖期のオス。とても長い尾が印象的だ。"
      },
      {
        "action": "brownseason",
        "label": "季節のページをめくる",
        "text": "それ以外の季節には、メスに似た褐色の姿になる。今の姿だけがすべてではない。"
      },
      {
        "action": "wildlife",
        "label": "生態のページを読む",
        "text": "ほかの鳥の巣に卵を産む「托卵」をする鳥。ゲームの文鳥の家族とは別の、野生の生態として記録しよう。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "繁殖期のオスは、とても長い尾を持ちます。それ以外の季節には、メスに似た褐色の姿になります。ほかの鳥の巣に卵を産む「托卵」をする鳥です。",
    "appearance": "繁殖期のオスを描いています。資料写真は原版の撮影構図で尾の一部が画面外にあり、画像を切り抜いてはいません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://avise-birds.bio.uci.edu/passeriformes/viduidae/vidua_pradisaea/index.html"
      }
    ],
    "art": {
      "src": "game-art/finches/paradise-whydah-breeding-male.png",
      "width": 1261,
      "height": 1247,
      "alt": "ホウオウジャクの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/paradise-dupont.jpg",
      "width": 1024,
      "height": 662,
      "alt": "ホウオウジャクの資料写真",
      "creator": "Bernard DUPONT",
      "source": "https://www.flickr.com/photos/berniedup/16274663040/",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "quiet",
      "invitation": "季節の羽の絵本を開くと、とても長い尾。",
      "fictional": true,
      "gardenIds": [
        "tsukiakari"
      ]
    }
  },
  {
    "id": "white-winged-crossbill",
    "kind": "species",
    "parentId": null,
    "name": "ナキイスカ",
    "english": "",
    "scientific": "Loxia leucoptera",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "針葉樹の絵飾りのそばに、翼の白い帯。",
    "searchClue": "翼にくっきり白い帯の模様",
    "eventTitle": "交差するくちばしと白い帯",
    "steps": [
      {
        "action": "whitebars",
        "label": "翼の白い帯を探す",
        "text": "翼にある白い帯を見つけた。イスカとは別の鳥のページを開こう。"
      },
      {
        "action": "crossedtip",
        "label": "くちばしの先を見る",
        "text": "先が交差するくちばし。針葉樹の球果から種を取り出す道具だ。"
      },
      {
        "action": "conifer",
        "label": "針葉樹の便りを読む",
        "text": "球果とくちばしの形を一緒に覚えよう。資料写真の性別は決めつけずに記録するよ。"
      }
    ],
    "revisit": "前に見つけた特徴を、もう一度ゆっくり眺めよう。",
    "summary": "翼の白い帯と、先が交差するくちばしが目印。針葉樹の球果から種を取り出して食べます。",
    "appearance": "イラストはメスを描いています。資料写真は黄色い羽の姿ですが、年齢・性別が明示されていないため特定していません。",
    "sources": [
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/White-winged_Crossbill/id/"
      },
      {
        "title": "鳥についての資料",
        "url": "https://www.allaboutbirds.org/guide/White-winged_Crossbill/id"
      }
    ],
    "art": {
      "src": "game-art/finches/white-winged-crossbill-female.png",
      "width": 1254,
      "height": 1254,
      "alt": "ナキイスカの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/whitewing-silver.jpg",
      "width": 1024,
      "height": 457,
      "alt": "ナキイスカの資料写真",
      "creator": "Silverleapers",
      "source": "https://www.flickr.com/photos/68069539@N07/24670144580/",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "針葉樹の絵飾りのそばに、翼の白い帯。",
      "fictional": true,
      "gardenIds": [
        "shrine-grove"
      ]
    }
  },
  {
    "id": "eurasian-tree-sparrow",
    "kind": "species",
    "parentId": null,
    "name": "スズメ",
    "english": "Eurasian Tree Sparrow",
    "scientific": "Passer montanus",
    "family": "スズメ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "庭の小道に、栗色の頭と黒いほっぺ。",
    "searchClue": "栗色の頭に黒いほっぺ",
    "eventTitle": "いつもの、ちゅん",
    "steps": [
      {
        "action": "watch",
        "label": "そっと見守る",
        "text": "庭の小道に、小さな影。離れたところから、そっと見てみよう。"
      },
      {
        "action": "hop",
        "label": "跳ねる姿を見る",
        "text": "両足をそろえて、ぴょん。栗色の頭と、白いほおの黒い点が見えた。"
      },
      {
        "action": "greet",
        "label": "こんにちは",
        "text": "つかまえず、そっとごあいさつ。小さなお客さまとの出会いを図鑑に残そう。"
      }
    ],
    "revisit": "いつもの小道で、また会えたね。跳ねる姿をそっと眺めよう。",
    "summary": "人の暮らす場所の近くで見られる、スズメ科の小鳥。栗色の頭と、白いほおにある黒い斑点が目印です。地面では両足をそろえてぴょんぴょん跳ねます。種子などを食べ、繁殖期には昆虫も食べます。",
    "appearance": "成鳥の姿を描いた独立したイラストです。雌雄の羽色はよく似ています。イエスズメとは別種です。スズメ科の庭のお客さまで、フィンチ類の種として数えていません。",
    "sources": [
      {
        "title": "日本野鳥の会：スズメ",
        "url": "https://www.birdfan.net/passer_montanus/"
      },
      {
        "title": "環境省鳥類標識調査：スズメ",
        "url": "https://www.biodic.go.jp/birdRinging/atlas/Passer_montanus/Passer_montanus_pref.html?code=07"
      }
    ],
    "art": {
      "src": "game-art/finches/eurasian-tree-sparrow-original.png",
      "width": 1254,
      "height": 1254,
      "alt": "スズメ（Passer montanus）の創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/tree-sparrow-walter-baxter.jpg",
      "width": 640,
      "height": 427,
      "alt": "栗色の頭と白いほおの黒い斑点が見えるスズメの資料写真",
      "caption": "2023年1月31日、スコットランドのBemersyde Moss自然保護区で撮影された資料写真です。日本の庭やゲームの当日の記録ではありません。",
      "creator": "© Walter Baxter / Geograph",
      "source": "https://www.geograph.org.uk/photo/7394412",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "quiet",
      "invitation": "庭を静かに眺めると、小道にいつもの小さなお客さま。",
      "fictional": true,
      "gardenIds": [
        "komorebi",
        "mizukagami",
        "komugi",
        "hanadokei",
        "kazaguruma",
        "yuyake",
        "tsukiakari",
        "shrine-grove",
        "onsen",
        "paris-unrest"
      ]
    },
    "encounterRole": "familiar-visitor",
    "familyEligible": false,
    "breedingEligible": false,
    "homeResident": false
  },
  {
    "id": "long-tailed-rosefinch",
    "kind": "species",
    "parentId": null,
    "name": "ベニマシコ",
    "english": "Long-tailed Rosefinch",
    "scientific": "Carpodacus sibiricus",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "草の穂のかげに、長い尾とふたすじの白。",
    "searchClue": "草のかげに長い尾とふたすじの白",
    "eventTitle": "草の穂と、ふたすじの白",
    "steps": [
      {
        "action": "follow-stem",
        "label": "穂のゆれを見る",
        "text": "こむぎの庭の草の穂が、そっとゆれた。葉のかげの小さな影を眺めよう。"
      },
      {
        "action": "notice-tail",
        "label": "長い尾を見つける",
        "text": "長い尾と、翼に並ぶふたすじの白。近づきすぎず、その姿を見守ろう。"
      },
      {
        "action": "greet-rosefinch",
        "label": "そっとごあいさつ",
        "text": "小道の向こうに、赤みを帯びたお客さま。今日の出会いを図鑑に残そう。"
      }
    ],
    "revisit": "草の小道で、長い尾のお客さまにまた会えたね。",
    "summary": "長い尾と、翼にある2本の白い帯が目印の小鳥です。北海道や青森県で繁殖し、秋冬には本州以南の草地や林縁のやぶで草の種子などを食べます。オスは赤みを帯び、夏にはいっそう鮮やかに。メスは褐色です。",
    "appearance": "冬のオスを描いたイラストと資料写真です。夏のオスはさらに赤みが強く、メスは褐色で、すべての個体がこの羽色ではありません。以前は Uragus sibiricus の学名で扱われました。",
    "sources": [
      {
        "title": "ベニマシコ – BIRD FAN（日本野鳥の会）",
        "url": "https://www.birdfan.net/uragus_sibiricus/"
      },
      {
        "title": "ベニマシコ – 日本野鳥の会京都支部",
        "url": "https://wbsj-kyoto.net/yachoulist/ベニマシコ/"
      },
      {
        "title": "ベニマシコ – 我孫子野鳥を守る会",
        "url": "https://abikoyacho.org/tori/benimashiko.html"
      }
    ],
    "art": {
      "src": "game-art/finches/long-tailed-rosefinch-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "ベニマシコのオスの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/long-tailed-rosefinch-alpsdake.jpg",
      "width": 1500,
      "height": 1024,
      "alt": "草の種子を食べる冬のベニマシコのオス。",
      "caption": "草の種子を食べる冬のベニマシコのオス。 2013-01-19、愛知県、日本で撮影。ゲームの庭や当日の記録ではありません。",
      "creator": "Alpsdake",
      "source": "https://commons.wikimedia.org/wiki/File:Carpodacus_sibiricus_sanguinolentus.JPG",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "草の穂のかげに、長い尾とふたすじの白。",
      "fictional": true,
      "gardenIds": [
        "komugi"
      ]
    }
  },
  {
    "id": "pallass-rosefinch",
    "kind": "species",
    "parentId": null,
    "name": "オオマシコ",
    "english": "Pallas’s Rosefinch",
    "scientific": "Carpodacus roseus",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "林の枝先に、紅い羽と銀白色のきらめき。",
    "searchClue": "枝先に紅い羽と銀白色のきらめき",
    "eventTitle": "林にひとつ、銀のきらめき",
    "steps": [
      {
        "action": "look-branch",
        "label": "枝先を見上げる",
        "text": "こもりの杜の枝先で、ふっくらした影がひと休み。落ち葉のそばから眺めよう。"
      },
      {
        "action": "notice-silver",
        "label": "銀白色を見つける",
        "text": "紅い羽のあいだに、額とのどの銀白色がきらり。静かにその模様を見てみよう。"
      },
      {
        "action": "remember-rosefinch",
        "label": "出会いを覚える",
        "text": "林の小さなお客さまと、ごあいさつ。見つけた特徴を図鑑に残そう。"
      }
    ],
    "revisit": "枝先の紅いお客さま。銀白色の額がまた見えたね。",
    "summary": "冬に日本へ渡ってくる、ベニマシコよりひと回り大きく、ふっくらした体つきの鳥です。オスの紅色の体には、額とのどの銀白色がよく映えます。山地の明るい林や林縁で小さな群れになり、ハギなどの種子を食べます。",
    "appearance": "オスを描いたイラストと冬の資料写真です。額とのどの銀白色、紅い体、ふっくらした姿に注目。メスは主に褐色で、すべての個体がこの羽色ではありません。ベニマシコとは別種で、尾の両側は白くありません。",
    "sources": [
      {
        "title": "オオマシコ – BIRD FAN（日本野鳥の会）",
        "url": "https://www.birdfan.net/carpodacus_roseus/"
      },
      {
        "title": "山梨県レッドデータブック・鳥類",
        "url": "https://www.pref.yamanashi.jp/documents/84781/8cyourui.pdf"
      },
      {
        "title": "Pallas’s Rosefinch – Cornell BirdNET+ Taxonomy",
        "url": "https://birdnet.cornell.edu/taxonomy/species/Carpodacus%20roseus"
      }
    ],
    "art": {
      "src": "game-art/finches/pallass-rosefinch-male.png",
      "width": 1254,
      "height": 1254,
      "alt": "オオマシコのオスの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/pallass-rosefinch-nishimura.jpg",
      "width": 1200,
      "height": 900,
      "alt": "銀白色の額とのどが目立つ、冬のオオマシコのオス。",
      "caption": "銀白色の額とのどが目立つ、冬のオオマシコのオス。 2008-02-09、神戸市、日本で撮影。ゲームの庭や当日の記録ではありません。",
      "creator": "M.Nishimura",
      "source": "https://commons.wikimedia.org/wiki/File:Carpodacus_roseus.jpg",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "林の枝先に、紅い羽と銀白色のきらめき。",
      "fictional": true,
      "gardenIds": [
        "shrine-grove"
      ]
    }
  },
  {
    "id": "red-throated-parrotfinch",
    "kind": "species",
    "parentId": null,
    "name": "ヒノマルチョウ",
    "english": "Red-throated Parrotfinch",
    "scientific": "Erythrura psittacea",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "hint": "葉のかげに、緑の羽と赤い顔。",
    "searchClue": "緑の羽と赤い顔",
    "eventTitle": "緑の葉に、赤いごあいさつ",
    "steps": [
      {
        "action": "follow-leaf-gap",
        "label": "葉のすきまを見る",
        "text": "赤と緑の島庭の低い枝で、葉の色にとけこむ小さな影。そっと離れて眺めよう。"
      },
      {
        "action": "notice-red-face",
        "label": "赤い顔を見つける",
        "text": "葉のすきまから、赤い顔と深い緑の羽が見えた。小さなお客さまの色を覚えよう。"
      },
      {
        "action": "remember-green-guest",
        "label": "出会いを残す",
        "text": "静かな枝先で、ごあいさつ。今日見つけた姿を、図鑑の新しいページへ。"
      }
    ],
    "revisit": "葉のかげから、赤い顔のお客さまがまた見えたね。",
    "summary": "ニューカレドニアに自然分布する小さなカエデチョウ科の鳥。緑色の体に赤い顔とのど、赤い尾が映えます。林の縁や草のある開けた場所で、主に草の種子を食べます。雌雄はよく似ていますが、メスの赤色は控えめです。",
    "appearance": "緑の体に赤い顔とのど、赤い尾をもつ成鳥の創作イラストです。資料写真の性別は原典に記載がなく特定していません。雌雄はよく似ています。青い顔の別種 Blue-faced Parrotfinch（Erythrura trichroa）とは区別します。",
    "sources": [
      {
        "title": "AviList Core Team. 2026. The Global Avian Checklist v2026",
        "url": "https://www.avilist.org/checklist/v2026/"
      },
      {
        "title": "Cornell Lab eBird: Red-throated Parrotfinch",
        "url": "https://ebird.org/species/retpar3"
      },
      {
        "title": "Province Sud: Faune calédonienne, Les principaux oiseaux terrestres de Nouvelle Calédonie",
        "url": "https://www.province-sud.nc/wp-content/publications/Environnement/Biodiversite/FauneCaledonienne/"
      }
    ],
    "art": {
      "src": "game-art/finches/red-throated-parrotfinch-adult.webp",
      "width": 1254,
      "height": 1254,
      "alt": "ヒノマルチョウの成鳥の創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/red-throated-parrotfinch-harrison.jpg",
      "width": 2234,
      "height": 1489,
      "alt": "ヒノマルチョウ（写真の性別は原典に記載なし）",
      "caption": "写真「Red-throated Parrotfinch 0A2A5145」。ヒノマルチョウ（写真の性別は原典に記載なし）。2022-09-28撮影。原典のカメラ位置はニューカレドニアです。ゲームの庭や当日の記録ではありません。",
      "creator": "JJ Harrison",
      "source": "https://commons.wikimedia.org/wiki/File:Red-throated_Parrotfinch_0A2A5145.jpg",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "葉のかげに、緑の羽と赤い顔。",
      "fictional": true,
      "gardenIds": [
        "komorebi"
      ]
    }
  },
  {
    "id": "masked-finch",
    "kind": "species",
    "parentId": null,
    "name": "マスクフィンチ",
    "english": "Masked Finch",
    "scientific": "Poephila personata",
    "family": "カエデチョウ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "searchClue": "黄色いくちばしと黒い顔",
    "hint": "丘の草かげに、黄色いくちばしと黒いマスク。",
    "eventTitle": "草かげの、黄色いくちばし",
    "steps": [
      {
        "action": "watch-hill-grass",
        "label": "草のゆれを見る",
        "text": "かざぐるまの丘の草が、風に合わせてゆれている。ふもとの小さな影を探そう。"
      },
      {
        "action": "notice-yellow-bill",
        "label": "黄色いくちばしを見る",
        "text": "茶色い羽のあいだに、黄色いくちばしと黒い顔の模様。近づきすぎず、見つめてみよう。"
      },
      {
        "action": "greet-masked-finch",
        "label": "静かにごあいさつ",
        "text": "風がひと息つくと、お客さまもひと休み。この出会いを図鑑に残そう。"
      }
    ],
    "revisit": "丘の草かげで、黄色いくちばしがまた見えたね。",
    "summary": "オーストラリア北部の草原や開けた林にすむカエデチョウ科の鳥。淡い褐色の体に黒い仮面と黄色いくちばしが特徴で、主にイネ科の種子を食べます。雌雄はよく似ており、見た目だけでの判別は難しい鳥です。",
    "appearance": "黄色いくちばし、顔の前側の黒い仮面、褐色の頭と体をもつ成鳥の創作イラストです。資料写真の性別は原典に記載がなく特定していません。雌雄はよく似ており、頭全体が黒い鳥ではありません。",
    "sources": [
      {
        "title": "AviList Core Team. 2026. The Global Avian Checklist v2026",
        "url": "https://www.avilist.org/checklist/v2026/"
      },
      {
        "title": "Australian Bird Study Association: Masked Finch, Bird in the Hand 2nd ed., revised February 2020",
        "url": "https://absa.asn.au/wp-content/uploads/2015/06/Masked-Finch-1.pdf"
      },
      {
        "title": "Dostine & Franklin (2002): A comparison of the diet of three finch species in the Yinberrie Hills area, Northern Territory",
        "url": "https://doi.org/10.1071/MU01034"
      }
    ],
    "art": {
      "src": "game-art/finches/masked-finch-adult.webp",
      "width": 1254,
      "height": 1254,
      "alt": "マスクフィンチの成鳥の創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/masked-finch-summerdrought.jpg",
      "width": 1959,
      "height": 1575,
      "alt": "マスクフィンチ（写真の性別は原典に記載なし）",
      "caption": "写真「Masked Finch 7355-2」。マスクフィンチ（写真の性別は原典に記載なし）。2018-06-11、オーストラリア北部クイーンズランド州のグレゴリー川で撮影。ゲームの庭や当日の記録ではありません。",
      "creator": "Summerdrought",
      "source": "https://commons.wikimedia.org/wiki/File:Masked_Finch_7355-2.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "grass",
      "invitation": "丘の草かげに、黄色いくちばしと黒いマスク。",
      "fictional": true,
      "gardenIds": [
        "kazaguruma"
      ]
    }
  },
  {
    "id": "hooded-siskin",
    "kind": "species",
    "parentId": null,
    "name": "ズグロヒワ",
    "english": "Hooded Siskin",
    "scientific": "Spinus magellanicus",
    "family": "アトリ科",
    "aliases": [],
    "releaseReady": false,
    "scriptVersion": 1,
    "searchClue": "黒い頭と黄色い翼",
    "hint": "果樹の枝に、黒い頭と翼の黄色。",
    "eventTitle": "枝先で見つけた、黄色い帯",
    "steps": [
      {
        "action": "follow-orchard-branch",
        "label": "果樹の枝を見る",
        "text": "金いろの高原窓の枝先に、小さなお客さま。木々のそばから、静かに見上げよう。"
      },
      {
        "action": "notice-yellow-wing",
        "label": "翼の黄色を見つける",
        "text": "黒い頭と、翼にのぞく黄色。少し向きが変わるたび、羽の模様が見えてくる。"
      },
      {
        "action": "greet-hooded-siskin",
        "label": "出会いを覚える",
        "text": "枝先のお客さまと、そっとごあいさつ。見つけた特徴を、図鑑で確かめよう。"
      }
    ],
    "revisit": "果樹の枝で、黒い頭と黄色い翼のお客さまにまた会えたね。",
    "summary": "南アメリカに広く分布するアトリ科の鳥。オスは黒い頭と黄色いおなか、翼の黄色い斑が目印です。メスは黒い頭巾がなく、全体に落ち着いた色。木が点在する草地や林で群れをつくり、種子などを食べます。",
    "appearance": "黒い頭からのど、黄色いおなかと翼の斑をもつオスの創作イラストと実写真です。メスは黒い頭巾がなく、羽色も控えめです。写真の原典には亜種名 tucumanus がありますが、このページではズグロヒワという種を紹介します。",
    "sources": [
      {
        "title": "AviList Core Team. 2026. The Global Avian Checklist v2026",
        "url": "https://www.avilist.org/checklist/v2026/"
      },
      {
        "title": "Cornell Lab eBird: Hooded Siskin",
        "url": "https://ebird.org/species/hoosis1"
      },
      {
        "title": "Universidad de Buenos Aires, Facultades de Agronomía y Ciencias Veterinarias: Cabecita Negra",
        "url": "https://aves.agro.uba.ar/ave/cabecita-negra"
      }
    ],
    "art": {
      "src": "game-art/finches/hooded-siskin-male.webp",
      "width": 1254,
      "height": 1254,
      "alt": "ズグロヒワのオスの創作イラスト"
    },
    "photo": {
      "src": "game-art/finches/photos/hooded-siskin-hulsberg.jpg",
      "width": 1451,
      "height": 1577,
      "alt": "ズグロヒワのオス",
      "caption": "写真「Spinus magellanicus tucumanus, La Rioja」。ズグロヒワのオス。2018-11-15、アルゼンチン・ラリオハ州パガンシージョで撮影。ゲームの庭や当日の記録ではありません。",
      "creator": "Hugo Hulsberg",
      "source": "https://commons.wikimedia.org/wiki/File:Spinus_magellanicus_tucumanus,_La_Rioja.jpg",
      "license": "CC0 1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
      "modifications": "原版を変更せず収録",
      "noDerivatives": false,
      "canCrop": false,
      "canColorFilter": false,
      "display": "contain"
    },
    "gates": {
      "identity": true,
      "facts": true,
      "photoLicense": true,
      "photoVisual": true,
      "illustration": true,
      "layout": false
    },
    "gardenEvent": {
      "scene": "branch",
      "invitation": "果樹の枝に、黒い頭と翼の黄色。",
      "fictional": true,
      "gardenIds": [
        "yuyake"
      ]
    }
  }
].map(entry=>{
  // Keep species/individual IDs and scripts stable for saved discoveries and conversations.
  const home=GARDEN35_PLAN.find(g=>g.birdId===entry.id);
  return Object.freeze(home?{...entry,gardenEvent:{...entry.gardenEvent,gardenIds:[home.id]}}:entry);
}));
export const INITIAL_EIGHT=Object.freeze(ENCOUNTER_CANDIDATES.slice(0,8));
export const NEXT_THIRTEEN=Object.freeze(ENCOUNTER_CANDIDATES.slice(8,21));
export const FINAL_EIGHT=Object.freeze(ENCOUNTER_CANDIDATES.slice(21,29));
export const ROSEFINCH_ADDITIONS=Object.freeze(ENCOUNTER_CANDIDATES.filter(entry=>['long-tailed-rosefinch','pallass-rosefinch'].includes(entry.id)));
export const THREE_FINCH_ADDITIONS=Object.freeze(ENCOUNTER_CANDIDATES.filter(entry=>['red-throated-parrotfinch','masked-finch','hooded-siskin'].includes(entry.id)));
export const TREE_SPARROW_CANDIDATE=ENCOUNTER_CANDIDATES.find(entry=>entry.id==='eurasian-tree-sparrow');
export const JAVA_BASELINE=Object.freeze({
  "id": "java-sparrow",
  "kind": "baseline-species",
  "name": "ブンチョウ",
  "english": "Java Sparrow",
  "scientific": "Padda oryzivora",
  "family": "カエデチョウ科",
  "releaseReady": false,
  "summary": "太いくちばしで草の種や穀物を食べる、仲間と過ごす鳥。野生のふるさとはインドネシアのジャワ島とバリ島です。",
  "appearance": "資料写真は自然の羽色の成鳥です。ゲームでは既存の文鳥イラストを使い、新しい別種として数えていません。",
  "sources": [
    {
      "title": "鳥についての資料",
      "url": "https://www.allaboutbirds.org/guide/Java_Sparrow/id/"
    }
  ],
  "art": {
    "src": "game-art/sakura.webp",
    "width": 1157,
    "height": 1359,
    "alt": "ゲームでおなじみの文鳥のイラスト"
  },
  "photo": {
    "src": "game-art/finches/photos/java-ray.jpg",
    "width": 1024,
    "height": 1024,
    "alt": "上の小さな鳥が文鳥。下の大きな鳥はレンジャクバトです。",
    "caption": "上の小さな鳥が文鳥。下の大きな鳥はレンジャクバトです。",
    "creator": ". Ray in Manila",
    "source": "https://www.flickr.com/photos/rayinmanila/54203226351/",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
    "modifications": "原版を変更せず収録",
    "noDerivatives": false,
    "canCrop": false,
    "canColorFilter": false,
    "display": "contain"
  },
  "gates": {
    "identity": true,
    "facts": true,
    "photoLicense": true,
    "photoVisual": true,
    "illustration": false,
    "layout": false
  }
});
const REQUIRED_GATES=['identity','facts','photoLicense','photoVisual','illustration','layout'];
export function isPublishedEncounter(entry){return (!entry.photo?.noDerivatives||(entry.photo.canCrop===false&&entry.photo.canColorFilter===false&&entry.photo.display==='contain'))&&entry.releaseReady===true&&REQUIRED_GATES.every(key=>entry.gates?.[key]===true)&&entry.art?.width>0&&entry.art?.height>0&&entry.photo?.width>0&&entry.photo?.height>0;}
// Trial permits owner-led visual feedback, never unchecked identity/facts/photo rights.
export function isTrialEncounter(entry){return ['identity','facts','photoLicense','photoVisual'].every(k=>entry.gates?.[k]===true)&&(entry.gates.illustration===true||entry===JAVA_BASELINE)&&(!entry.photo?.noDerivatives||(entry.photo.canCrop===false&&entry.photo.canColorFilter===false&&entry.photo.display==='contain'))&&entry.art?.width>0&&entry.photo?.width>0;}
export const ENCOUNTER_CATALOG=Object.freeze(ENCOUNTER_CANDIDATES.filter(e=>isPublishedEncounter(e)||isTrialEncounter(e)));
export const PUBLISHED_JAVA_BASELINE=(isPublishedEncounter(JAVA_BASELINE)||isTrialEncounter(JAVA_BASELINE))?JAVA_BASELINE:null;
