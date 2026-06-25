/**
 * Right-side mini table of contents for portfolio-themed codelabs.
 * Lists h2 and h3 headings in the active step (excluding the step title).
 */
(function () {
  'use strict';

  var TOC_ID = 'codelab-toc';
  var RETURN_URL = '/portfolio/docs/codelabs/setup-docusaurus';

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function getActiveStep(codelab) {
    var idx = parseInt(codelab.getAttribute('selected') || '0', 10);
    var steps = codelab.steps || codelab.querySelectorAll('google-codelab-step');
    return steps[idx] || null;
  }

  function getHeadingTree(step) {
    var root = step.querySelector('.instructions') || step;
    var nodes = root.querySelectorAll('h2:not(.step-title), h3');
    var tree = [];
    var current = null;

    Array.prototype.forEach.call(nodes, function (node) {
      if (!node.textContent.trim()) {
        return;
      }
      if (node.tagName === 'H2') {
        current = { heading: node, children: [] };
        tree.push(current);
      } else if (node.tagName === 'H3') {
        if (!current) {
          current = { heading: null, children: [] };
          tree.push(current);
        }
        current.children.push(node);
      }
    });

    return tree;
  }

  function flattenHeadings(tree) {
    var flat = [];
    tree.forEach(function (item) {
      if (item.heading) {
        flat.push(item.heading);
      }
      item.children.forEach(function (child) {
        flat.push(child);
      });
    });
    return flat;
  }

  function ensureHeadingIds(headings) {
    var used = {};
    headings.forEach(function (h) {
      if (h.id) {
        used[h.id] = true;
        return;
      }
      var base = slugify(h.textContent) || 'section';
      var id = base;
      var n = 2;
      while (used[id]) {
        id = base + '-' + n++;
      }
      h.id = id;
      used[id] = true;
    });
  }

  function createLink(heading, toc) {
    var a = document.createElement('a');
    a.className = 'codelab-toc__link';
    a.href = '#' + heading.id;
    a.textContent = heading.textContent.trim();
    a.addEventListener('click', function (e) {
      e.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveLink(toc, a);
    });
    return a;
  }

  function buildTOC(toc, tree) {
    toc.innerHTML = '';
    if (!tree.length) {
      return;
    }

    var title = document.createElement('p');
    title.className = 'codelab-toc__title';
    title.textContent = 'On this page';
    toc.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'codelab-toc__list';

    tree.forEach(function (item) {
      if (item.heading) {
        var li = document.createElement('li');
        li.className = 'codelab-toc__item';
        li.appendChild(createLink(item.heading, toc));

        if (item.children.length) {
          var sub = document.createElement('ul');
          sub.className = 'codelab-toc__sublist';
          item.children.forEach(function (child) {
            var subLi = document.createElement('li');
            subLi.className = 'codelab-toc__item codelab-toc__item--child';
            subLi.appendChild(createLink(child, toc));
            sub.appendChild(subLi);
          });
          li.appendChild(sub);
        }

        list.appendChild(li);
      } else {
        item.children.forEach(function (child) {
          var li = document.createElement('li');
          li.className = 'codelab-toc__item';
          li.appendChild(createLink(child, toc));
          list.appendChild(li);
        });
      }
    });

    toc.appendChild(list);
  }

  function setActiveLink(toc, active) {
    toc.querySelectorAll('.codelab-toc__link').forEach(function (a) {
      a.classList.toggle('codelab-toc__link--active', a === active);
    });
  }

  function updateScrollSpy(toc, step, headings) {
    if (toc._scrollHandler) {
      step.removeEventListener('scroll', toc._scrollHandler);
    }
    if (!headings.length) {
      return;
    }

    toc._scrollHandler = function () {
      var containerTop = step.getBoundingClientRect().top;
      var active = null;
      headings.forEach(function (h) {
        if (h.getBoundingClientRect().top - containerTop <= 80) {
          active = h;
        }
      });
      if (active) {
        var link = toc.querySelector('a[href="#' + CSS.escape(active.id) + '"]');
        if (link) {
          setActiveLink(toc, link);
        }
      }
    };

    step.addEventListener('scroll', toc._scrollHandler, { passive: true });
    toc._scrollHandler();
  }

  function positionTOC(toc, step) {
    if (step.hasAttribute('animating')) {
      return false;
    }
    var card = step.querySelector('.instructions');
    if (!card) {
      return false;
    }
    var rect = card.getBoundingClientRect();
    if (rect.width < 200) {
      return false;
    }
    var gap = 40;
    var tocWidth = toc.offsetWidth || 224;
    var margin = 24;
    var left = rect.right + gap;
    if (left + tocWidth > window.innerWidth - margin) {
      left = window.innerWidth - tocWidth - margin;
    }
    if (left < rect.right + 12) {
      toc.hidden = true;
      return true;
    }
    toc.style.left = Math.round(left) + 'px';
    toc.style.top = Math.max(80, Math.round(rect.top)) + 'px';
    return true;
  }

  function refresh(codelab, toc) {
    var step = getActiveStep(codelab);
    if (!step) {
      toc.hidden = true;
      return;
    }
    var tree = getHeadingTree(step);
    var headings = flattenHeadings(tree);
    if (!headings.length) {
      toc.hidden = true;
      return;
    }
    ensureHeadingIds(headings);
    buildTOC(toc, tree);
    if (!positionTOC(toc, step)) {
      toc.hidden = true;
      return;
    }
    toc.hidden = false;
    updateScrollSpy(toc, step, headings);
  }

  function scheduleRefresh(codelab, toc) {
    if (toc._refreshTimers) {
      toc._refreshTimers.forEach(clearTimeout);
    }
    toc._refreshTimers = [0, 100, 300, 550, 800].map(function (ms) {
      return setTimeout(function () {
        refresh(codelab, toc);
      }, ms);
    });
  }

  function init(codelab) {
    if (document.getElementById(TOC_ID)) {
      return;
    }

    var toc = document.createElement('nav');
    toc.id = TOC_ID;
    toc.className = 'codelab-toc';
    toc.setAttribute('aria-label', 'Table of contents');
    toc.hidden = true;
    document.body.appendChild(toc);

    var refreshSoon = function () {
      scheduleRefresh(codelab, toc);
    };

    codelab.addEventListener('google-codelab-ready', refreshSoon);

    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === 'selected') {
          refreshSoon();
        }
      });
    }).observe(codelab, { attributes: true, attributeFilter: ['selected'] });

    codelab.querySelectorAll('google-codelab-step').forEach(function (step) {
      new MutationObserver(function () {
        refreshSoon();
      }).observe(step, { attributes: true, attributeFilter: ['selected', 'animating'] });
    });

    window.addEventListener('resize', refreshSoon);

    refreshSoon();
  }

  function hideCloseButton() {
    var back = document.querySelector('#arrow-back');
    if (back) {
      back.remove();
    }
  }

  function setReturnUrl() {
    var done = document.querySelector('#done');
    if (done) {
      done.href = RETURN_URL;
    }
  }

  function boot() {
    var codelab = document.querySelector('google-codelab');
    if (!codelab) {
      return;
    }
    var onReady = function () {
      hideCloseButton();
      setReturnUrl();
      init(codelab);
    };
    if (codelab.hasAttribute('google-codelab-ready')) {
      onReady();
    } else {
      codelab.addEventListener('google-codelab-ready', onReady);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
