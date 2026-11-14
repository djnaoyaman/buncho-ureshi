// Site-only copy: keep the game dependency graph byte-identical.
import {articles as original} from '../src/data/articles.js';
export const articles=original.map(article=>article.id==='omochi' ? {...article, body:'おもちは、<a href="https://djnaoyaman.github.io/">作者</a>の娘と暮らす、<ruby>白文鳥<rt>はくぶんちょう</rt></ruby>の女の子です。'} : article);
