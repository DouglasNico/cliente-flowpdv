/* FlowPDV interface icons. Authored SVG paths; no network, DOM observer or stored-data mutation. */
(function(root){
  const paths={
    back:'<path d="m15 5-7 7 7 7"/>',next:'<path d="m9 5 7 7-7 7"/>',
    box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l9 4"/>',
    user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    users:'<circle cx="9" cy="7" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M16 4a3 3 0 0 1 0 6M18 14a6 6 0 0 1 4 6"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3M7 18h3"/>',
    save:'<path d="M4 3h13l4 4v14H3V3h1ZM7 3v6h9V3M7 21v-8h10v8"/>',
    edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    check:'<path d="m5 12 4 4L20 5"/>',
    warning:'<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17v.1"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M16 12h5v5h-5v-5Z"/>',
    card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h3"/>',
    money:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.1M18 12h.1"/>',
    chart:'<path d="M3 3v18h18M7 16v-4M12 16V8M17 16V5"/>',
    trend:'<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
    tag:'<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r=".7"/>',
    cart:'<path d="M2 3h3l3 13h11l3-10H6M9 20h.1M18 20h.1"/>',
    store:'<path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M9 21v-7h6v7"/>',
    document:'<path d="M5 3h10l4 4v14H5V3ZM14 3v5h5M8 12h8M8 16h8"/>',
    clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 11h6M9 15h6"/>',
    search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    phone:'<path d="m5 3 4 1 1 5-3 2a14 14 0 0 0 6 6l2-3 5 1 1 4c-6 6-24-12-16-16Z"/>',
    chat:'<path d="M21 11a9 9 0 0 1-9 9H4l-2 2 1-8a9 9 0 1 1 18-3Z"/><path d="M7 10h10M7 14h6"/>',
    truck:'<path d="M2 5h12v12H2V5ZM14 9h4l4 4v4h-8M5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    pin:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    key:'<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9M17 17l3-3M14 14l3-3"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    screen:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    table:'<path d="M3 8h18v4H3V8ZM5 12v9M19 12v9M7 3v5M17 3v5"/>',
    utensils:'<path d="M4 3v6c0 3 6 3 6 0V3M7 3v18M20 21V3c-5 0-5 10 0 10"/>',
    glass:'<path d="M6 3h12v5a6 6 0 0 1-12 0V3ZM12 14v7M8 21h8"/>',
    cup:'<path d="M3 5h14v10a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V5ZM17 7h3a3 3 0 0 1 0 6h-3"/>',
    leaf:'<path d="M20 3C9 2 2 8 5 15s16 5 15-12ZM4 21l11-12"/>',
    burger:'<path d="M3 10a9 7 0 0 1 18 0H3ZM2 14h20M3 18h18l-2 3H5l-2-3Z"/>',
    star:'<path d="m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-7Z"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14-2l1 2M4 17l1 2a8 8 0 0 0 14-2"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5M3 17v4h18v-4"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
  };
  const glyphGroups={box:'📦🧊🍱🎁',user:'👤🧍🧑',users:'👥',shield:'👑🛡🕵',calendar:'📅📆🗓',save:'💾',edit:'✏📝',close:'✕✖❌',check:'✅✔🟢',warning:'⚠🚨🔴',info:'ℹ',clock:'⏳⏰🕐🕒🕓🕘🕙🕚🕛🕑🕔🕕🕖🕗⏱🕰',wallet:'👛',card:'💳',money:'💰💵💸',chart:'📊',trend:'📈📉',tag:'🏷',cart:'🛒',store:'🏪🏢🏠',document:'🧾📄📋📑📃📜📖📚📒',clipboard:'🗒',search:'🔍🔎',phone:'📞📱📲',chat:'💬',truck:'🛵🚚🚀',pin:'📍',lock:'🔒🔐🔓',key:'🔑',settings:'⚙🔧🛠',plus:'➕',trash:'🗑',screen:'🖥💻',table:'🪑',utensils:'🍽🍴🥩🧀🍕🍟🍰🥓🥜🍬🍞🥖',glass:'🍷🥃🥤🧃',cup:'☕🍺',leaf:'🌾🍎🥬🌿🥗',burger:'🍔🌭',star:'✨🌟⭐🏆🎯🎉🔥',refresh:'🔄🔃',upload:'📤',download:'📥',menu:'☰',bolt:'⚡',eye:'👁'};
  const glyphs={};for(const [name,group] of Object.entries(glyphGroups))for(const glyph of group)glyphs[glyph]=name;
  function svg(name){return `<svg class="flow-glyph" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="vertical-align:-.15em;flex-shrink:0;pointer-events:none">${paths[name]||paths.box}</svg>`;}
  const rendered=new Set(Object.keys(paths).map(svg));
  function from(value){if(rendered.has(value))return value;const key=String(value||'').replace(/[\uFE0F\u200D]/g,'');return svg(glyphs[key]||key);}
  root.FlowIcons={svg,from,glyphs};
})(typeof window==='undefined'?globalThis:window);
