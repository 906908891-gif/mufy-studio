export const BLOG_WIDGET_KINDS = [
  "blogClock",
  "blogCalendar",
  "blogSticky",
  "blogWeather",
  "blogCounter",
  "blogGuestbook",
  "blogVinyl",
  "blogPolaroid",
  "blogMoodLamp",
  "blogMail",
  "blogBookmark",
  "blogPixelPet",
] as const;

export type BlogWidgetKind = typeof BLOG_WIDGET_KINDS[number];

export type BlogWidgetCopy = {
  primary: string;
  secondary: string;
  description: string;
  extra: string;
};

export type BlogWidgetStyle = {
  palette: number;
  radius: number;
  glass: number;
  compact: boolean;
  motion: boolean;
};

export type BlogWidgetPalette = {
  bg: string;
  surface: string;
  accent: string;
  ink: string;
  muted: string;
};

export type BlogWidgetMeta = {
  name: string;
  sub: string;
  icon: string;
  labels: [string, string, string, string];
  collection: "blog";
};

export const blogWidgetMeta: Record<BlogWidgetKind, BlogWidgetMeta> = {
  blogClock: { name: "复古数字时钟", sub: "时间 · 日期 · 今日一句", icon: "◫", labels: ["当前时间", "日期", "星期", "今日一句"], collection: "blog" },
  blogCalendar: { name: "撕页迷你日历", sub: "月份 · 日期 · 提醒", icon: "▤", labels: ["月份", "日期", "星期", "今日提醒"], collection: "blog" },
  blogSticky: { name: "胶带手账便签", sub: "标题 · 正文 · 署名", icon: "▱", labels: ["便签标题", "便签正文", "署名", "胶带标签"], collection: "blog" },
  blogWeather: { name: "窗边天气牌", sub: "城市 · 天气 · 温度", icon: "☂", labels: ["城市", "天气", "温度", "出门提示"], collection: "blog" },
  blogCounter: { name: "像素访客计数器", sub: "站名 · 开站日 · 访问数", icon: "▥", labels: ["小站名称", "开站日期", "访问次数", "欢迎语"], collection: "blog" },
  blogGuestbook: { name: "漂浮访客留言簿", sub: "访客 · 时间 · 留言", icon: "✎", labels: ["访客昵称", "留言时间", "留言内容", "心情印章"], collection: "blog" },
  blogVinyl: { name: "迷你黑胶唱片", sub: "曲名 · 歌手 · 注释", icon: "◎", labels: ["曲名", "歌手", "听歌札记", "播放进度"], collection: "blog" },
  blogPolaroid: { name: "拍立得照片笺", sub: "标题 · 日期 · 图注", icon: "▧", labels: ["照片标题", "拍摄日期", "照片图注", "拍摄地点"], collection: "blog" },
  blogMoodLamp: { name: "今日心情灯", sub: "心情 · 色彩 · 原因", icon: "◉", labels: ["今日心情", "心情色彩", "心情原因", "能量值"], collection: "blog" },
  blogMail: { name: "航空信封小笺", sub: "寄件人 · 主题 · 来信", icon: "✉", labels: ["寄件人", "信件主题", "信件正文", "邮戳"], collection: "blog" },
  blogBookmark: { name: "正在阅读书签", sub: "书名 · 摘抄 · 页码", icon: "▮", labels: ["书名", "摘抄", "当前页码", "阅读进度"], collection: "blog" },
  blogPixelPet: { name: "像素宠物陪伴窗", sub: "名字 · 状态 · 台词", icon: "♟", labels: ["宠物名字", "当前状态", "宠物台词", "活力值"], collection: "blog" },
};

export const blogWidgetDefaults: Record<BlogWidgetKind, BlogWidgetCopy> = {
  blogClock: { primary: "22:18", secondary: "2026.08.14", description: "FRIDAY", extra: "今晚也要记得给自己留一盏灯。" },
  blogCalendar: { primary: "AUG", secondary: "14", description: "FRIDAY", extra: "买一束白色小花，晚一点去河边散步。" },
  blogSticky: { primary: "TO MY FUTURE SELF", secondary: "别急着抵达，沿途的风也值得被记住。", description: "— 林雾", extra: "DO NOT FORGET" },
  blogWeather: { primary: "临港", secondary: "小雨转晴", description: "21°C", extra: "带一把伞，也带上耳机。" },
  blogCounter: { primary: "MOONLIGHT HOME", secondary: "SINCE 2024.03.09", description: "008172", extra: "YOU ARE VISITOR · 欢迎停留片刻" },
  blogGuestbook: { primary: "南岸来客", secondary: "22:17", description: "路过你的小站，喜欢这里雨后的颜色。", extra: "MOOD · ☺" },
  blogVinyl: { primary: "After the Rain", secondary: "Northbound", description: "像是末班车开走以后，站台还留着一点回声。", extra: "01:42 / 03:28" },
  blogPolaroid: { primary: "海风吹来的那天", secondary: "2025.08.17", description: "末班渡轮靠岸前，我们分享了同一副耳机。", extra: "白沙码头" },
  blogMoodLamp: { primary: "柔软的期待", secondary: "LILAC", description: "门锁转动的声音让紧绷了一晚的肩膀慢慢放松。", extra: "78" },
  blogMail: { primary: "FROM · 许知遥", secondary: "写给雨停以后的你", description: "如果回去得晚，就沿着有灯的那条路走。我会在车站等你。", extra: "SOUTHBANK · 08.14" },
  blogBookmark: { primary: "夜航船", secondary: "“答案有时不在终点，而在你愿意停下来的那一页。”", description: "PAGE 127", extra: "63%" },
  blogPixelPet: { primary: "MOMO", secondary: "等你回家", description: "今天也有乖乖守着你的小站！", extra: "86" },
};

const blogXmlNames: Record<BlogWidgetKind, [string, string, string, string, string]> = {
  blogClock: ["BlogClock", "Time", "Date", "Weekday", "Motto"],
  blogCalendar: ["BlogCalendar", "Month", "Day", "Weekday", "Reminder"],
  blogSticky: ["BlogSticky", "Title", "Body", "Signature", "Label"],
  blogWeather: ["BlogWeather", "City", "Weather", "Temperature", "Tip"],
  blogCounter: ["BlogCounter", "SiteName", "Since", "Visits", "Welcome"],
  blogGuestbook: ["BlogGuestbook", "Guest", "Time", "Message", "Mood"],
  blogVinyl: ["BlogVinyl", "Track", "Artist", "Note", "Progress"],
  blogPolaroid: ["BlogPolaroid", "Title", "Date", "Caption", "Location"],
  blogMoodLamp: ["BlogMoodLamp", "Mood", "Color", "Reason", "Energy"],
  blogMail: ["BlogMail", "Sender", "Subject", "Message", "Postmark"],
  blogBookmark: ["BlogBookmark", "Book", "Quote", "Page", "Progress"],
  blogPixelPet: ["BlogPixelPet", "Name", "Status", "Message", "Energy"],
};

export function isBlogWidgetKind(value: string): value is BlogWidgetKind {
  return (BLOG_WIDGET_KINDS as readonly string[]).includes(value);
}

export function blogWidgetXml(kind: BlogWidgetKind, copy: BlogWidgetCopy) {
  const names = blogXmlNames[kind];
  const values = [copy.primary, copy.secondary, copy.description, copy.extra];
  const rows = names.slice(1).map(function (tag, index) {
    return "  <" + tag + ">" + values[index] + "</" + tag + ">";
  });
  return "<" + names[0] + ">\n" + rows.join("\n") + "\n</" + names[0] + ">";
}

function safeColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function blogWidgetMarkup(
  kind: BlogWidgetKind,
  style: BlogWidgetStyle,
  palette: BlogWidgetPalette,
) {
  const bg = safeColor(palette.bg, "#191328");
  const surface = safeColor(palette.surface, "#29203d");
  const accent = safeColor(palette.accent, "#c8ff5a");
  const ink = safeColor(palette.ink, "#faf7ff");
  const muted = safeColor(palette.muted, "#aaa0bc");
  const pad = style.compact ? 13 : 18;
  const blur = Math.round(style.glass * 0.22);
  const cls = "mufy-blog-" + kind.replace("blog", "").toLowerCase() + "-p" + style.palette + "-r" + Math.round(style.radius) + "-g" + Math.round(style.glass);
  const rise = style.motion ? "animation:" + cls + "-rise .48s ease both;" : "";
  const css = "<style>" +
    "." + cls + "{--mbw-bg:" + bg + ";--mbw-surface:" + surface + ";--mbw-accent:" + accent + ";--mbw-ink:" + ink + ";--mbw-muted:" + muted + ";width:100%;max-width:440px;margin:auto;padding:" + pad + "px;box-sizing:border-box;border:1px solid " + ink + "22;border-radius:" + style.radius + "px;color:" + ink + ";background:" + surface + ";background:linear-gradient(145deg," + surface + "f2," + bg + "f2);box-shadow:0 16px 42px " + bg + "55;backdrop-filter:blur(" + blur + "px);font-family:system-ui,'Noto Sans SC',sans-serif;overflow:hidden;overflow-wrap:anywhere;" + rise + "}" +
    "." + cls + " *{box-sizing:border-box}" +
    "." + cls + " h3,." + cls + " p{margin:0}" +
    "." + cls + " small{color:" + muted + "}" +
    "." + cls + " details{border:0}" +
    "." + cls + " summary{list-style:none;cursor:pointer}" +
    "." + cls + " summary::-webkit-details-marker{display:none}" +
    "." + cls + " .mbw-kicker{display:flex;justify-content:space-between;gap:10px;color:" + accent + ";font-size:10px;font-weight:800;letter-spacing:.16em}" +
    "." + cls + " .mbw-rule{height:1px;margin:12px 0;background:" + ink + "20}" +
    "." + cls + " .mbw-paper{padding:14px;border-radius:" + Math.max(8, style.radius - 8) + "px;background:" + ink + "0d;border:1px solid " + ink + "18}" +
    "." + cls + " .mbw-note{margin-top:10px;color:" + muted + ";font-size:13px;line-height:1.7}" +
    "." + cls + " .mbw-time{display:flex;align-items:center;justify-content:center;margin:10px 0 4px;font:800 clamp(42px,14vw,68px)/1 ui-monospace,monospace;letter-spacing:-.06em}" +
    "." + cls + " .mbw-colon{color:" + accent + ";animation:" + cls + "-blink 1s steps(1) infinite}" +
    "." + cls + " .mbw-date{display:flex;justify-content:center;gap:10px;color:" + muted + ";font-size:11px;letter-spacing:.16em}" +
    "." + cls + " .mbw-calendar{display:grid;grid-template-columns:1fr 1.3fr;gap:14px;align-items:stretch}" +
    "." + cls + " .mbw-month{display:grid;place-items:center;border-radius:" + Math.max(8, style.radius - 8) + "px;background:" + accent + ";color:" + bg + ";font-weight:900;letter-spacing:.14em}" +
    "." + cls + " .mbw-day{font:900 64px/1 ui-monospace,monospace}" +
    "." + cls + " .mbw-tape{width:92px;height:20px;margin:-24px auto 10px;transform:rotate(-3deg);background:" + accent + "88;border:1px solid " + ink + "22}" +
    "." + cls + " .mbw-weather{display:grid;grid-template-columns:82px 1fr;gap:14px;align-items:center}" +
    "." + cls + " .mbw-weather-icon{display:grid;place-items:center;height:82px;border-radius:50%;background:radial-gradient(circle at 35% 30%," + ink + "," + accent + " 28%,transparent 30%),linear-gradient(145deg," + accent + "55," + bg + ");font-size:34px}" +
    "." + cls + " .mbw-digits{display:flex;justify-content:center;gap:4px;margin:12px 0}" +
    "." + cls + " .mbw-digits b{padding:6px 7px;border:1px solid " + accent + "66;border-radius:4px;background:#08080b;color:" + accent + ";font:800 22px/1 ui-monospace,monospace;letter-spacing:.08em}" +
    "." + cls + " .mbw-signature{display:inline-flex;margin-top:10px;padding:3px 8px;border:1px solid " + accent + "66;border-radius:999px;color:" + accent + ";font-size:10px}" +
    "." + cls + " .mbw-record-row{display:grid;grid-template-columns:82px 1fr;gap:15px;align-items:center}" +
    "." + cls + " .mbw-record{width:82px;height:82px;border-radius:50%;background:radial-gradient(circle," + accent + " 0 8%," + bg + " 9% 19%," + ink + " 20% 22%,#101014 23% 45%," + ink + "22 46% 48%,#08080b 49%);box-shadow:0 10px 24px #0006}" +
    "." + cls + " details[open] .mbw-record{animation:" + cls + "-spin 3.8s linear infinite}" +
    "." + cls + " .mbw-progress{height:4px;margin-top:11px;border-radius:9px;background:" + ink + "18;overflow:hidden}" +
    "." + cls + " .mbw-progress i{display:block;width:62%;height:100%;background:" + accent + "}" +
    "." + cls + " .mbw-photo{min-height:128px;display:grid;place-items:center;margin-bottom:12px;border:10px solid #f4f0e7;border-bottom-width:34px;background:radial-gradient(circle at 70% 30%," + accent + "77,transparent 26%),linear-gradient(145deg," + surface + "," + bg + ");color:#fff;font-size:36px;transform:rotate(-1.5deg);box-shadow:0 8px 22px #0004}" +
    "." + cls + " .mbw-lamp{width:88px;height:88px;margin:8px auto 13px;border-radius:50% 50% 43% 43%;background:radial-gradient(circle at 36% 28%," + ink + "," + accent + " 35%," + accent + "55 58%," + bg + " 61%);box-shadow:0 0 34px " + accent + "88;animation:" + cls + "-glow 2.4s ease-in-out infinite alternate}" +
    "." + cls + " .mbw-envelope{position:relative;height:108px;margin:12px 0;border:1px solid " + accent + "88;border-radius:10px;background:linear-gradient(145deg," + ink + "14," + surface + ");overflow:hidden}" +
    "." + cls + " .mbw-envelope:before,." + cls + " .mbw-envelope:after{content:'';position:absolute;inset:0;clip-path:polygon(0 0,50% 55%,100% 0);background:" + accent + "33}" +
    "." + cls + " .mbw-envelope:after{clip-path:polygon(0 100%,50% 45%,100% 100%);background:" + ink + "10}" +
    "." + cls + " .mbw-envelope b{position:absolute;z-index:1;left:50%;top:50%;transform:translate(-50%,-50%);width:44px;height:44px;display:grid;place-items:center;border-radius:50%;background:" + accent + ";color:" + bg + "}" +
    "." + cls + " .mbw-bookmark{display:grid;grid-template-columns:18px 1fr;gap:13px}" +
    "." + cls + " .mbw-ribbon{min-height:126px;background:" + accent + ";clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%)}" +
    "." + cls + " .mbw-pet{display:grid;grid-template-columns:96px 1fr;gap:14px;align-items:center}" +
    "." + cls + " .mbw-pet-face{display:grid;place-items:center;width:96px;height:96px;border:3px solid " + accent + ";border-radius:18px;background:repeating-linear-gradient(0deg," + bg + " 0 8px," + surface + " 8px 16px);color:" + accent + ";font:800 24px ui-monospace,monospace;image-rendering:pixelated;animation:" + cls + "-bob 1.8s steps(2) infinite}" +
    "@keyframes " + cls + "-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
    "@keyframes " + cls + "-blink{50%{opacity:.2}}" +
    "@keyframes " + cls + "-spin{to{transform:rotate(360deg)}}" +
    "@keyframes " + cls + "-glow{to{box-shadow:0 0 54px " + accent + "aa;transform:translateY(-2px)}}" +
    "@keyframes " + cls + "-bob{50%{transform:translateY(-4px)}}" +
    "@media(max-width:420px){." + cls + "{padding:" + Math.max(11, pad - 2) + "px}." + cls + " .mbw-calendar,." + cls + " .mbw-weather,." + cls + " .mbw-record-row,." + cls + " .mbw-pet{grid-template-columns:1fr}." + cls + " .mbw-weather-icon,." + cls + " .mbw-record,." + cls + " .mbw-pet-face{margin:auto}}" +
    "@media(prefers-reduced-motion:reduce){." + cls + ",." + cls + " *{animation:none!important;transition:none!important}}" +
    "</style>";

  let body = "";
  if (kind === "blogClock") body = '<section class="' + cls + '"><div class="mbw-kicker"><span>LOCAL TIME</span><span>$3</span></div><div class="mbw-time"><span>$1</span><i class="mbw-colon">:</i><small>00</small></div><div class="mbw-date"><span>$2</span><span>ONLINE</span></div><div class="mbw-rule"></div><p class="mbw-note">✦ $4</p></section>';
  if (kind === "blogCalendar") body = '<section class="' + cls + '"><div class="mbw-calendar"><div class="mbw-month">$1</div><div><div class="mbw-day">$2</div><small>$3</small></div></div><div class="mbw-rule"></div><p class="mbw-note">TODAY · $4</p></section>';
  if (kind === "blogSticky") body = '<details class="' + cls + '" open><summary><div class="mbw-tape"></div><div class="mbw-kicker"><span>STICKY NOTE</span><span>点击折叠</span></div><h3 style="margin-top:10px">$1</h3></summary><div class="mbw-paper" style="margin-top:12px"><p class="mbw-note" style="margin-top:0">$2</p><span class="mbw-signature">$3 · $4</span></div></details>';
  if (kind === "blogWeather") body = '<details class="' + cls + '" open><summary class="mbw-weather"><i class="mbw-weather-icon">☁</i><span><small>WINDOW WEATHER · $1</small><h3 style="margin-top:6px">$2 · $3</h3></span></summary><div class="mbw-rule"></div><p class="mbw-note">☂ $4</p></details>';
  if (kind === "blogCounter") body = '<section class="' + cls + '"><div class="mbw-kicker"><span>$1</span><span>$2</span></div><div class="mbw-digits"><b>$3</b></div><p class="mbw-note" style="text-align:center">✦ $4</p></section>';
  if (kind === "blogGuestbook") body = '<details class="' + cls + '" open><summary><div class="mbw-kicker"><span>GUESTBOOK · $1</span><span>$2 · 展开/收起</span></div></summary><div class="mbw-paper" style="margin-top:12px"><p class="mbw-note" style="margin-top:0">$3</p><span class="mbw-signature">$4</span></div></details>';
  if (kind === "blogVinyl") body = '<details class="' + cls + '" open><summary class="mbw-record-row"><i class="mbw-record"></i><span><small>NOW SPINNING · 点击暂停动画</small><h3 style="margin:5px 0">$1</h3><small>$2</small><div class="mbw-progress"><i></i></div><small>$4</small></span></summary><p class="mbw-note">$3</p></details>';
  if (kind === "blogPolaroid") body = '<details class="' + cls + '" open><summary><div class="mbw-photo">✦</div><div class="mbw-kicker"><span>$1</span><span>$2</span></div></summary><p class="mbw-note">$3</p><span class="mbw-signature">⌖ $4</span></details>';
  if (kind === "blogMoodLamp") body = '<details class="' + cls + '" open><summary><i class="mbw-lamp"></i><div class="mbw-kicker"><span>MOOD · $2</span><span>ENERGY $4</span></div><h3 style="margin-top:8px;text-align:center">$1</h3></summary><p class="mbw-note" style="text-align:center">$3</p></details>';
  if (kind === "blogMail") body = '<details class="' + cls + '"><summary><div class="mbw-kicker"><span>AIR MAIL · $1</span><span>点击拆信</span></div><div class="mbw-envelope"><b>✉</b></div><h3>$2</h3><small>$4</small></summary><div class="mbw-paper" style="margin-top:12px"><p class="mbw-note" style="margin-top:0">$3</p></div></details>';
  if (kind === "blogBookmark") body = '<details class="' + cls + '" open><summary class="mbw-bookmark"><i class="mbw-ribbon"></i><span><div class="mbw-kicker"><span>READING NOW</span><span>$4</span></div><h3 style="margin:8px 0">$1</h3><p class="mbw-note">$2</p><span class="mbw-signature">$3</span></span></summary></details>';
  if (kind === "blogPixelPet") body = '<details class="' + cls + '" open><summary class="mbw-pet"><i class="mbw-pet-face">◕ ᴥ ◕</i><span><div class="mbw-kicker"><span>PIXEL PET</span><span>ENERGY $4</span></div><h3 style="margin:7px 0">$1</h3><small>$2 · 点击休息</small><p class="mbw-note">$3</p></span></summary></details>';
  return css + body;
}
