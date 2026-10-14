/* Views: class, student, learning progression, evidence. Each view builds its
   DOM once in mount() and refreshes from CRG.state in update(). */
(function () {
  'use strict';
  const C = window.CRG;
  const { D, h, s, levels, levelOf, levelName, levelInfo, occasions, prob, pct, signed } = C;

  const dname = st => (C.state.anon ? `Student ${st.num}` : st.name);
  const dfirst = st => (C.state.anon ? `Student ${st.num}` : st.first);
  C.dname = dname;
  const nameOf = k => (k === 0 ? 'Not yet Part-Whole' : levelName(k));
  const DIFF_MOE = C.DIFF_MOE;

  // ---- small controls ---------------------------------------------------------
  function selectCtl(label, onChange, attrs) {
    const sel = h('select', Object.assign({ 'aria-label': label, onchange: e => onChange(e.target.value) }, attrs || {}));
    return { el: h('label', { class: 'control' }, h('span', { class: 'lbl' }, label), sel), sel };
  }
  function fillSelect(sel, opts, value) {
    C.clear(sel);
    const groups = {};
    opts.forEach(o => {
      const opt = h('option', { value: o.value }, o.label);
      if (o.group) {
        if (!groups[o.group]) { groups[o.group] = h('optgroup', { label: o.group }); sel.appendChild(groups[o.group]); }
        groups[o.group].appendChild(opt);
      } else sel.appendChild(opt);
    });
    sel.value = value;
  }
  function segCtl(label, opts, onChange) {
    const btns = opts.map(o => h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => onChange(o.value) }, o.label));
    btns.forEach((b, i) => { b.dataset.value = opts[i].value; });
    const el = h('div', { class: 'control' }, h('span', { class: 'lbl' }, label), h('div', { class: 'seg', role: 'group', 'aria-label': label }, btns));
    return { el, set: v => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === v))) };
  }
  function toggleCtl(label, onChange, tour) {
    const inp = h('input', { type: 'checkbox', role: 'switch', onchange: e => onChange(e.target.checked) });
    return { el: h('label', { class: 'toggle', 'data-tour': tour || null }, inp, label), inp };
  }
  function legendKey(kind, label) {
    const svg = s('svg', { viewBox: '0 0 22 14', 'aria-hidden': 'true' });
    if (kind === 'dot') svg.appendChild(s('circle', { class: 'dot', cx: 11, cy: 7, r: 5 }));
    if (kind === 'open') svg.appendChild(s('circle', { class: 'dot-open', cx: 11, cy: 7, r: 4.3 }));
    if (kind === 'ring') svg.appendChild(s('circle', { class: 'focus-ring', cx: 11, cy: 7, r: 5.5 }));
    if (kind === 'zone') { svg.appendChild(s('rect', { class: 'sem-zone key', x: 0, y: 2, width: 22, height: 10 })); svg.appendChild(s('line', { class: 'threshold stroke-lv3', x1: 0, x2: 22, y1: 7, y2: 7 })); }
    if (kind === 'stem' || kind === 'stem-dash') {
      // A small open-to-filled dumbbell, matching the marks in the class chart.
      svg.setAttribute('viewBox', '0 0 32 14');
      svg.style.width = '32px';
      svg.appendChild(s('line', { class: kind === 'stem' ? 'stem' : 'stem within', x1: 8, x2: 24, y1: 7, y2: 7 }));
      svg.appendChild(s('circle', { class: 'dot-open', cx: 4.5, cy: 7, r: 3.5 }));
      svg.appendChild(s('circle', { class: 'dot', cx: 27.5, cy: 7, r: 4 }));
    }
    if (kind === 'onlevel') { svg.appendChild(s('rect', { class: 'onlevel-fill', x: 0, y: 2, width: 22, height: 10 })); svg.appendChild(s('line', { class: 'onlevel-line', x1: 0, x2: 22, y1: 2, y2: 2 })); svg.appendChild(s('line', { class: 'onlevel-line', x1: 0, x2: 22, y1: 12, y2: 12 })); }
    if (kind === 'line') { svg.appendChild(s('line', { class: 'traj', x1: 1, x2: 21, y1: 7, y2: 7 })); }
    return h('span', { class: 'key' }, svg, label);
  }
  const chartWidth = box => Math.max(300, Math.round(box.clientWidth || 800));

  // ---- narrative (student) ----------------------------------------------------
  /** Plain-language, content-referenced description of growth between two occasions. */
  function narrative(st, fi, ti, bandsOff) {
    const s0 = st.scores[fi], s1 = st.scores[ti], L0 = levelOf(s0), L1 = levelOf(s1), d = s1 - s0;
    const nm = dfirst(st);
    const between = `Between ${C.spanPhrase(fi, ti)}`;
    if (bandsOff) {
      return {
        head: d >= 0 ? `${nm}'s score rose ${d} points.` : `${nm}'s score fell ${-d} points.`,
        support: `From ${s0} in ${C.occPhrase(fi)} to ${s1} in ${C.occPhrase(ti)}.`,
        cautions: []
      };
    }
    let head;
    if (fi === ti) {
      head = L1 === 0 ? `${nm} is working toward Part-Whole understanding.` : `${nm} is at the ${levelName(L1)} level.`;
    } else if (L1 > L0) {
      head = `${nm} moved from ${L0 === 0 ? 'below Part-Whole' : levelName(L0)} to ${levelName(L1)} understanding.`;
    } else if (L1 === L0) {
      head = L1 === 0 ? `${nm} is still working toward Part-Whole understanding.` : `${nm} is still at the ${levelName(L1)} level.`;
    } else {
      head = `${nm}'s score is now in the ${nameOf(L1)} range, down from ${nameOf(L0)}.`;
    }
    const parts = [];
    if (fi !== ti) parts.push(`${between}, ${nm}'s score went from ${s0} to ${s1} (${signed(d)} points).`);
    const cur = L1 > 0 ? levelInfo(L1) : null;
    const nxt = L1 < levels.length ? levels[L1] : null;
    if (cur && nxt) parts.push(`At ${s1}, ${nm} has about a ${pct(prob(s1, cur.threshold))} chance of answering a typical ${cur.label} item correctly and a ${pct(prob(s1, nxt.threshold))} chance on a typical ${nxt.label} item.`);
    else if (cur) parts.push(`At ${s1}, ${nm} has about a ${pct(prob(s1, cur.threshold))} chance of answering a typical ${cur.label} item correctly, the top level of this progression.`);
    else parts.push(`At ${s1}, ${nm} has about a ${pct(prob(s1, nxt.threshold))} chance of answering a typical Part-Whole item correctly.`);

    const cautions = [];
    if (fi !== ti && Math.abs(d) <= DIFF_MOE) {
      cautions.push(`A change of ${Math.abs(d)} points is within one standard error of the difference between two scores (about ±${DIFF_MOE} points), so it may reflect measurement error alone.`);
    }
    let nearT = null;
    C.thresholds.forEach((t, i) => { if (Math.abs(s1 - t) < D.scale.sem && (!nearT || Math.abs(s1 - t) < Math.abs(s1 - nearT.t))) nearT = { t, k: i + 1 }; });
    if (nearT) cautions.push(`${nm}'s score of ${s1} is within one standard error of the ${levelName(nearT.k)} threshold (${nearT.t}), so ${nm} could plausibly be at either adjacent level.`);
    return { head, support: parts.join(' '), cautions };
  }
  C.narrative = narrative;

  function cautionEl(text) {
    const icon = s('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
      s('circle', { cx: 8, cy: 8, r: 7, style: { fill: 'none', stroke: 'var(--gold-dark)', strokeWidth: 1.5 } }),
      s('rect', { x: 7.2, y: 3.8, width: 1.6, height: 5.2, rx: .8, style: { fill: 'var(--gold-dark)' } }),
      s('circle', { cx: 8, cy: 11.6, r: 1, style: { fill: 'var(--gold-dark)' } }));
    return h('p', { class: 'caution' }, icon, h('span', null, text));
  }

  // ============================================================================
  // Class view
  // ============================================================================
  const ClassView = {
    mount(root) {
      this.chart = null;
      this.root = root;
      const set = C.set;
      this.cClass = selectCtl('Class', v => set({ classId: v, highlight: null }));
      fillSelect(this.cClass.sel, C.classes.map(c => ({ value: c.id, label: `${c.name} · Grade ${c.grade}` })), C.state.classId);
      this.cCmp = selectCtl('Compare with', v => set({ compare: v, highlight: null }));
      fillSelect(this.cCmp.sel, [{ value: 'none', label: 'Nothing (spring only)' }]
        .concat(['W4', 'F4', 'S3', 'F3'].map(id => ({ value: id, label: occasions[C.occIndex[id]].label }))), C.state.compare);
      this.cSort = segCtl('Order', [{ value: 'score', label: 'Score' }, { value: 'growth', label: 'Growth' }, { value: 'name', label: 'Name' }], v => set({ sort: v }));
      this.cSEM = toggleCtl('Uncertainty', v => set({ showSEM: v }), 'sem-toggle');
      this.cOL = toggleCtl('Grade 4 on-level range', v => set({ showOnLevel: v }));
      this.cAnon = toggleCtl('Hide names', v => set({ anon: v }));

      this.lede = h('div', { class: 'lede' });
      this.hlBar = h('div', { class: 'no-print', style: { minHeight: '0' } });
      this.legend = h('div', { class: 'legend', style: { marginTop: '.9rem' } });
      this.chartBox = h('div', { class: 'chart', 'data-tour': 'class-chart' });
      this.flowBox = h('div', { class: 'chart', 'data-tour': 'flow' });
      this.flowSub = h('p', { class: 'section-sub' });
      this.groupsBox = h('div', { class: 'groups' });
      this.tableBox = h('div', { class: 'tbl-wrap' });

      root.appendChild(h('div', { class: 'controls' },
        this.cClass.el, this.cCmp.el, this.cSort.el, this.cSEM.el, this.cOL.el, this.cAnon.el));
      root.appendChild(this.lede);
      root.appendChild(this.legend);
      root.appendChild(this.hlBar);
      root.appendChild(this.chartBox);
      root.appendChild(h('p', { class: 'note' }, 'Select a student to see their growth over time. Hover over a level on the right to shade its range, or select it to see what students at that level understand.'));
      root.appendChild(h('div', { class: 'grid-2 block' },
        h('section', null, h('h2', { class: 'section-title' }, 'How the class moved'), this.flowSub, this.flowBox),
        h('section', { 'data-tour': 'groups' }, h('h2', { class: 'section-title' }, 'Where students are now'),
          h('p', { class: 'section-sub' }, 'Grouped by level in spring of Grade 4, with the next step on the progression.'), this.groupsBox)));
      root.appendChild(h('details', { class: 'table-twin' }, h('summary', null, 'Show scores as a table'), this.tableBox));
    },

    update() {
      const st8 = C.state;
      const cls = C.classById[st8.classId];
      const studs = cls.students;
      const cur = C.occIndex.S4;
      const cmp = st8.compare === 'none' ? null : C.occIndex[st8.compare];
      const flowFrom = cmp == null ? C.occIndex.F4 : cmp;

      this.cClass.sel.value = st8.classId;
      this.cCmp.sel.value = st8.compare;
      this.cSort.set(st8.sort);
      this.cSEM.inp.checked = st8.showSEM;
      this.cOL.inp.checked = st8.showOnLevel;
      this.cAnon.inp.checked = st8.anon;

      // headline
      const N = studs.length;
      const lvNow = studs.map(x => levelOf(x.scores[cur]));
      const lvThen = studs.map(x => levelOf(x.scores[flowFrom]));
      const up = lvNow.filter((k, i) => k > lvThen[i]).length;
      const down = lvNow.filter((k, i) => k < lvThen[i]).length;
      const same = N - up - down;
      const atNL = lvNow.filter(k => k >= 3).length;
      C.clear(this.lede);
      this.lede.appendChild(h('p', null, cmp == null
        ? `In spring of Grade 4, ${atNL} of ${N} students in ${cls.name} are at Number Line understanding or above. Each dot is one student’s test score, placed against the four levels of the fractions learning progression.`
        : `${up} of ${N} students in ${cls.name} moved up at least one level between ${C.spanPhrase(cmp, cur)}. ${same} stayed at the same level${down ? ` and ${down} moved down` : ''}. ${atNL} of ${N} are now at Number Line understanding or above.`));

      // legend
      C.clear(this.legend);
      this.legend.appendChild(legendKey('dot', 'Spring G4 score'));
      if (cmp != null) this.legend.appendChild(legendKey('open', `${occasions[cmp].label} score`));
      if (st8.showSEM) {
        this.legend.appendChild(legendKey('zone', `Within one standard error (±${Math.round(D.scale.sem)}) of a threshold`));
        if (cmp != null) {
          this.legend.appendChild(legendKey('stem', 'Change larger than measurement error'));
          this.legend.appendChild(legendKey('stem-dash', `Change within measurement error (±${DIFF_MOE})`));
        }
      }
      if (st8.showOnLevel) this.legend.appendChild(legendKey('onlevel', 'Grade 4 on-grade-level range'));

      // highlight bar
      C.clear(this.hlBar);
      if (st8.highlight) {
        this.hlBar.appendChild(h('div', { class: 'legend', style: { marginTop: '.5rem' } },
          h('span', null, 'Highlighting: ', h('b', null, st8.highlight.label)),
          h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onclick: () => C.set({ highlight: null }) }, 'Clear')));
      }

      // chart
      const W = chartWidth(this.chartBox);
      if (!this.chart || this.chart.key !== `${cls.id}:${W}`) {
        this.chart = C.ClassChart(this.chartBox, {
          cls,
          onOpen: id => C.set({ view: 'student', studentId: id, classId: C.studentById[id].classId, highlight: null }),
          onLevel: k => C.set({ level: k }),
          onHover: (node, e) => this.tip(node, e)
        });
      }
      this.chart.update(st8);

      // flow
      this.flowSub.textContent = cmp == null
        ? 'From fall to spring of Grade 4. Choose a comparison occasion above to change the starting point. Select a flow to highlight those students.'
        : `From ${C.occPhrase(cmp)} to spring of Grade 4. Select a flow to highlight those students.`;
      C.FlowChart(this.flowBox, {
        students: studs, fromIdx: flowFrom, toIdx: cur,
        fromLabel: occasions[flowFrom].label, toLabel: occasions[cur].label,
        anon: st8.anon, selectedKey: st8.highlight && st8.highlight.key,
        onSelect: sel => C.set({ highlight: sel })
      });

      this.renderGroups(studs, cur);
      this.renderTable(studs, cur, flowFrom);
    },

    tip(node, e) {
      const st8 = C.state, x = node.st, cur = C.occIndex.S4;
      const cmp = st8.compare === 'none' ? null : C.occIndex[st8.compare];
      const row = i => C.ttRow(occasions[i].label, `${x.scores[i]} · ${nameOf(levelOf(x.scores[i]))}`, C.levelColor(levelOf(x.scores[i])));
      const rows = [h('div', { class: 'tt-title' }, dname(x)), row(cur)];
      if (cmp != null) { rows.push(row(cmp)); rows.push(C.ttRow('Change', signed(x.scores[cur] - x.scores[cmp]))); }
      if (st8.showSEM) {
        const near = C.thresholds.findIndex(t => Math.abs(x.scores[cur] - t) < D.scale.sem);
        if (near >= 0) rows.push(h('div', { class: 'tt-foot' }, `Within one standard error of the ${levelName(near + 1)} threshold (${C.thresholds[near]}).`));
        if (cmp != null && Math.abs(x.scores[cur] - x.scores[cmp]) <= DIFF_MOE) rows.push(h('div', { class: 'tt-foot' }, `Change is within measurement error (±${DIFF_MOE}).`));
      }
      rows.push(h('div', { class: 'tt-foot' }, 'Select for the full trajectory'));
      if (e) C.showTip(rows, e.clientX, e.clientY); else C.showTipAt(rows, node.dCur);
    },

    renderGroups(studs, cur) {
      C.clear(this.groupsBox);
      for (let k = levels.length; k >= 0; k--) {
        const members = studs.filter(x => levelOf(x.scores[cur]) === k);
        if (!members.length) continue;
        const info = levelInfo(k);
        const key = `now:${k}`;
        const label = `${members.length} now at ${nameOf(k)}`;
        const on = C.state.highlight && C.state.highlight.key === key;
        let next;
        if (k === 0) next = [h('b', null, 'Next: Part-Whole. '), levels[0].understands[0]];
        else if (k === levels.length) next = [h('b', null, 'Top level of this progression. '), 'Ratios and rates are addressed by a separate proportional-reasoning progression.'];
        else next = [h('b', null, `Next: ${levels[k].label}. `), info.not_yet.length ? `Often still developing: ${info.not_yet[0].charAt(0).toLowerCase()}${info.not_yet[0].slice(1)}` : ''];
        this.groupsBox.appendChild(h('div', { class: 'group' },
          h('div', { class: 'group-head' }, C.swatch(k),
            h('span', { class: 'name' }, k === 0 ? 'Not yet Part-Whole' : `${k} · ${info.label}`),
            h('span', { class: 'count' }, `${members.length} student${members.length > 1 ? 's' : ''}`),
            h('button', { class: 'btn btn-sm btn-quiet', type: 'button', 'aria-pressed': String(!!on),
              onclick: () => C.set({ highlight: on ? null : { key, ids: members.map(x => x.id), label } }) }, on ? 'Clear' : 'Highlight')),
          h('div', { class: 'chips' }, members.slice().sort((a, b) => b.scores[cur] - a.scores[cur]).map(x =>
            h('a', { class: 'chip', href: `#/student/${x.id}`, title: `${x.scores[cur]}` }, dname(x)))),
          h('div', { class: 'next' }, next)));
      }
    },

    renderTable(studs, cur, from) {
      const rows = studs.slice().sort((a, b) => b.scores[cur] - a.scores[cur]);
      const tbl = h('table', { class: 'data' },
        h('thead', null, h('tr', null, h('th', null, 'Student'), occasions.map(o => h('th', { class: 'num' }, o.label)),
          h('th', null, `Level, ${occasions[from].label}`), h('th', null, 'Level, Spring G4'), h('th', { class: 'num' }, 'Change'))),
        h('tbody', null, rows.map(x => h('tr', null,
          h('td', null, h('a', { href: `#/student/${x.id}` }, dname(x))),
          x.scores.map(v => h('td', { class: 'num' }, v)),
          h('td', null, C.levelTag(levelOf(x.scores[from]))),
          h('td', null, C.levelTag(levelOf(x.scores[cur]))),
          h('td', { class: 'num' }, signed(x.scores[cur] - x.scores[from]))))));
      C.clear(this.tableBox).appendChild(tbl);
    },

    resize() { this.chart = null; this.update(); }
  };

  // ============================================================================
  // Student view
  // ============================================================================
  const StudentView = {
    mount(root) {
      this.chart = null;
      const set = C.set;
      this.cStu = selectCtl('Student', v => set({ studentId: v, classId: C.studentById[v].classId }));
      this.prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous student', onclick: () => this.step(-1) }, '‹');
      this.next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next student', onclick: () => this.step(1) }, '›');
      this.cFrom = selectCtl('From', v => set({ from: +v }));
      this.cTo = selectCtl('To', v => set({ to: +v }));
      const occOpts = occasions.map((o, i) => ({ value: String(i), label: o.label }));
      fillSelect(this.cFrom.sel, occOpts, String(C.state.from));
      fillSelect(this.cTo.sel, occOpts, String(C.state.to));
      this.cSEM = toggleCtl('Uncertainty', v => set({ showSEM: v }), 'sem-toggle-stu');
      this.cOL = toggleCtl('On-level range', v => set({ showOnLevel: v }));

      this.lede = h('div', { class: 'lede', 'data-tour': 'statement' });
      this.legend = h('div', { class: 'legend', style: { marginTop: '.9rem' } });
      this.chartBox = h('div', { class: 'chart', 'data-tour': 'stu-chart' });
      this.cautionBox = h('div', { class: 'cautions' });
      this.probTitle = h('h2', { class: 'section-title' });
      this.probSub = h('p', { class: 'section-sub' });
      this.probBox = h('div', { class: 'prob' });
      this.nowBox = h('div');
      this.tableBox = h('div', { class: 'tbl-wrap' });

      root.appendChild(h('div', { class: 'controls' },
        h('div', { class: 'control' }, this.cStu.el, this.prev, this.next),
        this.cFrom.el, this.cTo.el, this.cSEM.el, this.cOL.el, h('span', { class: 'spacer' }),
        C.canPrint ? h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => window.print() }, 'Print report') : null));
      root.appendChild(h('div', { class: 'print-only kicker', style: { marginTop: '.4rem' } }, 'Student growth report · Understanding Fractions'));
      root.appendChild(this.lede);
      root.appendChild(this.legend);
      root.appendChild(this.chartBox);
      root.appendChild(this.cautionBox);
      root.appendChild(h('section', { class: 'block', 'data-tour': 'prob' }, this.probTitle, this.probSub, this.probBox));
      root.appendChild(this.nowBox);
      root.appendChild(h('details', { class: 'table-twin' }, h('summary', null, 'Show scores as a table'), this.tableBox));
    },

    step(dir) {
      const x = C.studentById[C.state.studentId];
      const list = C.classById[x.classId].students;
      const i = list.indexOf(x);
      const nx = list[(i + dir + list.length) % list.length];
      C.set({ studentId: nx.id });
    },

    update() {
      const st8 = C.state;
      const x = C.studentById[st8.studentId];
      const fi = Math.min(st8.from, st8.to), ti = Math.max(st8.from, st8.to);

      fillSelect(this.cStu.sel, C.students.map(v => ({ value: v.id, label: dname(v), group: v.className })), x.id);
      this.cFrom.sel.value = String(st8.from);
      this.cTo.sel.value = String(st8.to);
      this.cSEM.inp.checked = st8.showSEM;
      this.cOL.inp.checked = st8.showOnLevel;

      // statement
      const nar = narrative(x, fi, ti, st8.bandsOff);
      C.clear(this.lede);
      this.lede.appendChild(h('div', { class: 'meta' }, h('b', { class: 'stu-name' }, dname(x)), ` · ${x.className} · Grade 4 mathematics`));
      this.lede.appendChild(h('p', null, `${nar.head} ${nar.support}`));
      C.clear(this.cautionBox);
      nar.cautions.forEach(t => this.cautionBox.appendChild(cautionEl(t)));

      C.clear(this.legend);
      this.legend.appendChild(legendKey('line', 'Scale score'));
      this.legend.appendChild(legendKey('ring', fi === ti ? 'Selected occasion' : 'Occasions being compared'));
      if (st8.showSEM) this.legend.appendChild(legendKey('zone', `Within one standard error (±${Math.round(D.scale.sem)}) of a threshold`));
      if (st8.showOnLevel) this.legend.appendChild(legendKey('onlevel', 'On-grade-level range'));

      const W = chartWidth(this.chartBox);
      if (!this.chart || this.chart.key !== `stu:${W}`) {
        this.chart = C.StudentChart(this.chartBox, { onLevel: k => C.set({ level: k }) });
      }
      this.chart.update({ student: x, from: fi, to: ti, showSEM: st8.showSEM, showOnLevel: st8.showOnLevel, bandsOff: st8.bandsOff, level: st8.level });

      this.renderProb(x, fi, ti);
      this.renderNow(x, ti);
      this.renderTable(x);
    },

    renderProb(x, fi, ti) {
      const s0 = x.scores[fi], s1 = x.scores[ti];
      const nm = dfirst(x);
      const two = fi !== ti;
      this.probTitle.textContent = `What ${nm} is likely to answer correctly`;
      C.clear(this.probSub).appendChild(document.createTextNode(two
        ? `Chance of a correct answer on each exemplar item, ${occasions[fi].label} (open circle) and ${occasions[ti].label} (filled). `
        : `Chance of a correct answer on each exemplar item in ${occasions[ti].label}. `));
      this.probSub.appendChild(h('span', { class: 'screen-only' }, 'Easy, average and challenge items sit at the 25th, 50th and 75th percentiles of item difficulty for their level.'));
      this.probSub.appendChild(h('span', { class: 'print-inline' }, 'A typical item sits at the median difficulty of the items at its level.'));
      C.clear(this.probBox);
      this.probBox.appendChild(h('div', { class: 'prob-head' },
        h('span', { class: 'desc-h' }, 'Exemplar item'), C.probAxis(), h('span', { class: 'desc-h', style: { textAlign: 'right' } }, two ? 'Change' : 'Chance')));
      for (let k = levels.length; k >= 1; k--) {
        const L = levelInfo(k);
        const grp = h('div', { class: 'prob-group', 'data-tour': `prob-${k}` },
          h('div', { class: 'prob-group-title' }, C.swatch(k), `${k} · ${L.label}`,
            h('button', { type: 'button', class: 'no-print', onclick: () => C.set({ level: k }) }, 'Open level')));
        L.exemplars.forEach(ex => {
          const p0 = prob(s0, ex.location), p1 = prob(s1, ex.location);
          grp.appendChild(h('div', { class: 'prob-row' + (ex.tier === 'Average' ? ' avg' : '') },
            h('div', { class: 'desc' },
              h('span', { class: 'tier screen-only' }, ex.tier),
              ex.tier === 'Average' ? h('span', { class: 'tier print-inline' }, 'Typical item') : null, h('span', { class: 'code' }, ex.ccss), ex.claim, ' ',
              h('button', { type: 'button', class: 'no-print', onclick: () => C.lightbox(`assets/img/${ex.img}`, `${L.label}, ${ex.tier.toLowerCase()} exemplar (${ex.ccss}). ${ex.claim} The highlighted option is the correct answer.`) }, 'View item')),
            C.probTrack(p0, p1, two),
            h('div', { class: 'pvals', style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '14px' } },
              two ? [h('span', { style: { color: 'var(--ink-3)' } }, pct(p0)), ' → ', h('b', null, pct(p1))] : h('b', null, pct(p1)))));
        });
        this.probBox.appendChild(grp);
      }
      this.probBox.appendChild(h('p', { class: 'note' },
        `Probabilities come from the Rasch model used to scale the test: P = 1 / (1 + exp(−(score − item location) / ${D.scale.slope.toFixed(1)})). They describe what a student at this score typically does, not a guarantee for any single item.`));
    },

    renderNow(x, ti) {
      const k = levelOf(x.scores[ti]);
      const L = levelInfo(k);
      const nm = dfirst(x);
      C.clear(this.nowBox);
      const box = h('section', { class: 'block' },
        h('h2', { class: 'section-title' }, k === 0 ? `${nm} is working toward Part-Whole` : `Where ${nm} is now: Level ${k}, ${L.label}`),
        h('p', { class: 'section-sub' }, L.summary));
      if (k > 0) {
        box.appendChild(h('button', { class: 'btn btn-quiet no-print', type: 'button', onclick: () => C.set({ level: k }) }, `Open the ${L.label} level`));
        box.appendChild(h('div', { class: 'print-only' },
          h('p', null, h('b', null, 'Students at this level understand that: '), L.understands.join(' ')),
          L.not_yet.length ? h('p', null, h('b', null, 'They may not yet understand that: '), L.not_yet.join(' ')) : null));
      }
      box.appendChild(h('p', { class: 'print-only note' }, `${D.text.data_note} ${D.scale.sem_source}`));
      this.nowBox.appendChild(box);
    },

    renderTable(x) {
      const sem = D.scale.sem;
      const tbl = h('table', { class: 'data' },
        h('thead', null, h('tr', null, ['Occasion', 'Score', '±1 SEM', 'Level', 'Change'].map((t, i) => h('th', { class: i === 1 || i === 4 ? 'num' : null }, t)))),
        h('tbody', null, occasions.map((o, i) => h('tr', null,
          h('td', null, `${o.season}, Grade ${o.grade}`),
          h('td', { class: 'num' }, x.scores[i]),
          h('td', null, `${Math.round(x.scores[i] - sem)}–${Math.round(x.scores[i] + sem)}`),
          h('td', null, C.levelTag(levelOf(x.scores[i]))),
          h('td', { class: 'num' }, i ? signed(x.scores[i] - x.scores[i - 1]) : '')))));
      C.clear(this.tableBox).appendChild(tbl);
    },

    resize() { this.chart = null; this.update(); }
  };

  // ============================================================================
  // Learning progression view
  // ============================================================================
  const ProgressionView = {
    mount(root) {
      root.appendChild(h('div', { class: 'controls' },
        h('span', { class: 'control' }, h('span', { class: 'lbl' }, D.text.lp_name)), h('span', { class: 'spacer' }),
        C.canPrint ? h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => window.print() }, 'Print the progression') : null));
      root.appendChild(h('div', { class: 'lede' },
        h('h2', null, 'Four increasingly sophisticated ways of understanding a fraction'),
        h('p', null, `${D.text.lp_def} Each level below is anchored to the test’s score scale at the median difficulty of the items coded to it.`)));

      const cards = h('div', { class: 'lp-cards' });
      for (let k = levels.length; k >= 1; k--) {
        const L = levelInfo(k);
        const hi = k < levels.length ? levels[k].threshold - 1 : null;
        cards.appendChild(h('article', { class: 'lp-card' },
          h('div', { class: 'bar', style: { background: C.levelColor(k) } }),
          h('div', null,
            h('div', { class: 'kicker', style: { color: 'var(--ink-3)' } }, `Level ${k} · ${L.formal}`),
            h('h3', null, L.label),
            h('p', null, L.summary),
            h('div', { class: 'range' }, `Scale scores ${L.threshold}${hi ? `–${hi}` : ' and above'} · ${L.n_items} items coded to this level`),
            h('button', { class: 'btn btn-sm btn-quiet no-print', type: 'button', style: { marginTop: '.55rem' }, onclick: () => C.set({ level: k }) }, 'Explore this level'))));
      }
      cards.appendChild(h('p', { class: 'note', style: { borderTop: '1px solid var(--rule)', paddingTop: '.8rem' } },
        `Scores below ${levels[0].threshold} fall under “Not yet Part-Whole”: a student there would be expected to answer fewer than half of typical Part-Whole items correctly.`));

      this.scaleBox = h('div', { class: 'chart lp-scale' });
      root.appendChild(h('div', { class: 'lp-layout' }, cards, this.scaleBox));

      const cell = arr => (arr && arr.length ? h('ul', null, arr.map(t => h('li', null, t))) : h('span', { class: 'note' }, '—'));
      root.appendChild(h('section', { class: 'block lp-table' },
        h('h2', { class: 'section-title' }, 'The full progression'),
        h('p', { class: 'section-sub' }, 'Adapted from Table A1 of Briggs et al. (2025).'),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'data' },
          h('thead', null, h('tr', null, ['Level', 'Understands that', 'Is able to', 'May not yet understand that', 'Common errors'].map(t => h('th', null, t)))),
          h('tbody', null, levels.slice().reverse().map(L => h('tr', null,
            h('td', { style: { minWidth: '9rem' } }, h('b', null, `${L.id} · ${L.label}`), h('div', { class: 'note' }, L.formal)),
            h('td', null, cell(L.understands)), h('td', null, cell(L.able_to)),
            h('td', null, cell(L.not_yet)), h('td', null, cell(L.errors)))))))));
    },
    update() {
      const W = 300, H = 520;
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'The four levels located on the score scale.' });
      C.frame(svg, { W, H, m: { t: 30, r: 150, b: 10, l: 44 }, yMin: C.Y_DOMAIN[0], yMax: C.Y_DOMAIN[1], ladderW: 140, narrow: false, onLevel: k => C.set({ level: k }) });
      C.clear(this.scaleBox).appendChild(svg);
    },
    resize() {}
  };

  // ============================================================================
  // Evidence view
  // ============================================================================
  const EvidenceView = {
    mount(root) {
      this.chart = null;
      const ev = D.evidence;
      this.range = h('input', { type: 'range', class: 'range-input', min: 360, max: 580, step: 1, 'aria-label': 'Student score',
        oninput: e => C.set({ evScore: +e.target.value }) });
      this.rangeVal = h('b', { style: { fontVariantNumeric: 'tabular-nums', minWidth: '2.5rem' } });
      root.appendChild(h('div', { class: 'controls' },
        h('label', { class: 'control' }, h('span', { class: 'lbl' }, 'Student score'), this.range, this.rangeVal),
        h('span', { class: 'note' }, 'Or drag the gold line on the chart.')));
      root.appendChild(h('div', { class: 'lede' },
        h('h2', null, 'Items written for higher levels are harder to answer correctly'),
        h('p', null, `Each dot is one of the ${ev.n} test items coded to a level of the fractions progression, placed at its difficulty on the scale. The black bar marks each level’s median difficulty, which becomes that level’s threshold.`)));
      root.appendChild(h('div', { class: 'tiles' },
        h('div', { class: 'tile' }, h('div', { class: 't-label' }, 'Rank correlation, level and difficulty'), h('div', { class: 't-value' }, ev.rho.toFixed(2))),
        h('div', { class: 'tile' }, h('div', { class: 't-label' }, 'Variance in difficulty explained by level'), h('div', { class: 't-value' }, `${Math.round(ev.r2 * 100)}%`)),
        h('div', { class: 'tile' }, h('div', { class: 't-label' }, 'Typical item distance from its level’s mean'), h('div', { class: 't-value' }, Math.round(ev.rmse), h('small', null, ' points')))));
      this.chartBox = h('div', { class: 'chart', 'data-tour': 'evidence-chart' });
      root.appendChild(this.chartBox);
      root.appendChild(h('p', { class: 'note' }, 'Filled dots are items a student at the gold line would be more likely than not to answer correctly. Percentages above each column are the expected share of that level’s items answered correctly.'));

      const L = levels;
      root.appendChild(h('div', { class: 'prose block' },
        h('h3', null, 'Why the median'),
        h('p', null, 'Under the Rasch model, a student whose score equals an item’s location has a 50% chance of answering it correctly. Placing a level’s threshold at the median difficulty of its items means a student at the threshold would be expected to answer about half of that level’s items correctly, more of them as their score rises above it.'),
        h('h3', null, 'Why the overlap matters'),
        h('p', null, `The distributions overlap: some items coded to Part-Whole are harder than some coded to Multiply & Divide. Level explains about ${Math.round(D.evidence.r2 * 100)}% of the variance in item difficulty, and the typical item sits about ${Math.round(D.evidence.rmse)} points from its level’s mean. Only the distance between the Part-Whole and Fair Shares thresholds (${L[1].threshold - L[0].threshold} points) exceeds that figure, so interpretations about any single item should be made with care.`),
        h('h3', null, 'A starting point for inquiry'),
        h('p', null, `Each student score also carries about ±${Math.round(D.scale.sem)} points of measurement error. A level assignment is a hypothesis about how a student is thinking, best checked against classroom evidence such as the follow-up activity that accompanies each level.`)));

      this.tableBox = h('div', { class: 'tbl-wrap' });
      this.tableBox.appendChild(h('table', { class: 'data' },
        h('thead', null, h('tr', null, ['Level', 'Items', 'Min', '25th pct', 'Median (threshold)', '75th pct', 'Max'].map((t, i) => h('th', { class: i ? 'num' : null }, t)))),
        h('tbody', null, levels.map(Lv => h('tr', null, h('td', null, C.levelTag(Lv.id)),
          [Lv.n_items, Lv.min, Math.round(Lv.q25), Lv.threshold, Math.round(Lv.q75), Lv.max].map(v => h('td', { class: 'num' }, v)))))));
      root.appendChild(h('details', { class: 'table-twin' }, h('summary', null, 'Show item difficulty summary as a table'), this.tableBox));
    },
    update() {
      const v = C.state.evScore;
      this.range.value = v;
      this.rangeVal.textContent = v;
      const W = chartWidth(this.chartBox);
      if (!this.chart || this.chart.W !== W) {
        this.chart = C.Beeswarm(this.chartBox, { score: v, onScore: sc => C.set({ evScore: sc }), onLevel: k => C.set({ level: k }) });
        this.chart.W = W;
      }
      this.chart.update(v);
    },
    resize() { this.chart = null; this.update(); }
  };

  C.views = { class: ClassView, student: StudentView, progression: ProgressionView, evidence: EvidenceView };
})();
