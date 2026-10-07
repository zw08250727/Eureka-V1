(function () {
  'use strict';
  const panel = document.createElement('dialog');
  panel.id = 'reference-panel';
  panel.setAttribute('aria-labelledby', 'reference-title');
  panel.innerHTML = '<header><div><small>规则与界面对照</small><h2 id="reference-title"></h2></div><button type="button" data-reference="close" aria-label="关闭界面对照">×</button></header><div class="reference-controls"><button data-reference="previous" aria-label="上一张界面">←</button><span id="reference-count" role="status"></span><button data-reference="next" aria-label="下一张界面">→</button><button data-reference="zoom" aria-pressed="false">放大</button><a id="reference-original" target="_blank" rel="noopener">打开原图 ↗</a></div><div class="reference-canvas" tabindex="0" aria-label="界面截图，可滚动查看"><img id="reference-image" alt=""><p id="reference-error" role="alert" hidden>图片暂时无法加载，请重试或打开原图。</p></div><footer><p id="reference-caption"></p><button data-reference="locate">定位对应规则</button></footer>';
  document.body.append(panel);
  const narrow = matchMedia('(max-width: 1199px)');
  let source, pictures = [], index = 0, trigger;
  const image = panel.querySelector('#reference-image');
  function display() {
    const picture = pictures[index];
    panel.querySelector('#reference-title').textContent = source.querySelector('h3')?.textContent || source.closest('.chapter').querySelector('h2').textContent;
    panel.querySelector('#reference-caption').textContent = picture.alt;
    panel.querySelector('#reference-count').textContent = `${index + 1} / ${pictures.length}`;
    panel.querySelector('#reference-original').href = picture.src;
    panel.querySelector('#reference-error').hidden = true;
    image.hidden = false; image.alt = picture.alt; image.src = picture.src;
    panel.querySelector('[data-reference=previous]').disabled = index === 0;
    panel.querySelector('[data-reference=next]').disabled = index === pictures.length - 1;
    panel.querySelector('[data-reference=zoom]').setAttribute('aria-pressed', 'false');
    panel.classList.remove('zoomed');
    panel.querySelector('[data-reference=zoom]').textContent = '放大';
    panel.querySelector('.reference-canvas').scrollTo(0, 0);
  }
  function close() {
    const wasOpen = panel.open, anchorTop = trigger?.isConnected ? trigger.getBoundingClientRect().top : null;
    if (panel.open) panel.close();
    document.body.classList.remove('reference-open');
    source?.classList.remove('rule-selected');
    if(wasOpen && anchorTop !== null && trigger?.isConnected) window.scrollBy(0, trigger.getBoundingClientRect().top - anchorTop);
    if (trigger?.isConnected) trigger.focus({preventScroll:true});
  }
  function open(rule, figure, button) {
    close(); source = rule; trigger = button;
    pictures = [...rule.querySelectorAll('.rule-illustration img')];
    index = pictures.indexOf(figure.querySelector('img'));
    source.classList.add('rule-selected'); display();
    if (narrow.matches) panel.showModal();
    else { panel.show(); document.body.classList.add('reference-open'); source.scrollIntoView({block:'start'}); }
    panel.querySelector('[data-reference=close]').focus({preventScroll:true});
  }
  image.addEventListener('error', () => {image.hidden = true; panel.querySelector('#reference-error').hidden = false;});
  panel.addEventListener('cancel', event => {event.preventDefault(); close();});
  document.addEventListener('keydown', event => {if(event.key === 'Escape' && panel.open){event.preventDefault(); close();}});
  panel.addEventListener('click', event => {
    const action = event.target.closest('[data-reference]')?.dataset.reference;
    if (action === 'close') close();
    if (action === 'previous' && index > 0) {index--; display();}
    if (action === 'next' && index < pictures.length - 1) {index++; display();}
    if (action === 'zoom') {const zoomed = panel.classList.toggle('zoomed'); event.target.setAttribute('aria-pressed', String(zoomed)); event.target.textContent = zoomed ? '适应宽度' : '放大';}
    if (action === 'locate') {const target = source; if(narrow.matches) close(); target.scrollIntoView({block:'start'});}
  });
  narrow.addEventListener('change', close);
  window.PRDReader = {
    close,
    enhance(root) {
      close();
      for (const prose of root.querySelectorAll('.chapter > .prose')) {
        let rule, ordinal = 0;
        for (const node of [...prose.children]) {
          if (!rule || node.tagName === 'H3') {
            rule = document.createElement('section'); rule.className = 'rule-block';
            rule.id = `${prose.closest('.chapter').id}-rule-${++ordinal}`; prose.append(rule);
          }
          rule.append(node);
        }
        for (const figure of prose.querySelectorAll('figure:not(.flow-figure)')) {
          const img = figure.querySelector('img'); if(!img) continue;
          figure.classList.add('rule-illustration');
          const button = document.createElement('button'); button.type = 'button'; button.className = 'rule-image-button';
          button.setAttribute('aria-label', `查看界面：${img.alt}`); button.setAttribute('aria-haspopup', 'dialog');
          const text = document.createElement('span'); text.textContent = `查看界面 · ${img.alt}`;
          button.append(img, text); figure.querySelector('a').replaceWith(button);
          button.addEventListener('click', () => open(figure.closest('.rule-block'), figure, button));
        }
      }
    }
  };
})();
