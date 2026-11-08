// Match Playwright's string toHaveText normalization on both sides.
export function normalizeDiaryText(text){
  return text.replace(/[\u200b\u00ad]/g,'').trim().replace(/\s+/g,' ');
}

// evaluateAll callbacks are self-contained: no module closure crosses the RPC.
export function diaryIntroSnapshot(elements){
  return {
    intro:elements.filter(element=>element.matches('body')).map(body=>body.getAttribute('data-game-intro')),
    overlays:elements.filter(element=>element.matches('.game-logo-intro')).length
  };
}

export function diaryRowSnapshot(rows){
  // CSS locators pierce open shadow roots; retain those matches and duplicates.
  function all(root,selector){
    const found=[...root.querySelectorAll(selector)];
    for(const element of root.querySelectorAll('*'))if(element.shadowRoot)found.push(...all(element.shadowRoot,selector));
    if(root.shadowRoot)found.push(...all(root.shadowRoot,selector));
    return found;
  }
  // Preserve toHaveText's full text semantics, including open shadow roots.
  function text(root){
    if(['SCRIPT','NOSCRIPT','STYLE'].includes(root.nodeName)||root.ownerDocument.head?.contains(root))return '';
    const Input=globalThis.HTMLInputElement||root.ownerDocument.defaultView.HTMLInputElement;
    if(root instanceof Input&&['submit','button','reset'].includes(root.type))return root.value;
    let value='';
    for(const child of root.childNodes){
      if(child.nodeType===3)value+=child.nodeValue||'';
      else if(child.nodeType===1)value+=text(child);
    }
    if(root.shadowRoot)value+=text(root.shadowRoot);
    return value;
  }
  return rows.map(row=>({
    names:all(row,'figcaption').map(text),
    sprites:all(row,'.game-sprite').map(sprite=>({stage:sprite.getAttribute('data-stage'),color:sprite.getAttribute('data-color')}))
  }));
}

export function normalizedDiaryRows(rows){
  return rows.map(row=>({...row,names:row.names.map(normalizeDiaryText)}));
}
