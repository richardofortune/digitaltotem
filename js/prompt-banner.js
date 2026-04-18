/* prompt-banner.js — Featured prompt banner for Digital Totem
 *
 * Shows one prompt question at a time above the timeline.
 * Users can cycle through questions or dismiss one for DISMISS_DAYS.
 * Dismissed prompts re-surface after the rest period expires.
 * State is persisted in localStorage so it survives page reloads.
 *
 * Public API (window.PromptBanner):
 *   .init(allEvents)  — called after events.json is fetched; filters for
 *                       type:"prompt" entries and shows the first eligible one.
 */
(function (window, $) {
    'use strict';

    var STORAGE_KEY  = 'totem_dismissed_prompts';
    var DISMISS_DAYS = 7;

    var _prompts = [];
    var _prefersReducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var CAT_COLOURS = {
        life:    { bg: '#2ec27e', text: '#fff' },
        work:    { bg: '#2563eb', text: '#fff' },
        passion: { bg: '#f59e0b', text: '#1a1a1a' },
        pivotal: { bg: '#ef4444', text: '#fff' },
        basic:   { bg: '#2d5bff', text: '#fff' }
    };

    /* ── localStorage helpers ───────────────────────────────────────────── */
    function getDismissed() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch (e) { return {}; }
    }

    function saveDismissed(obj) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }
        catch (e) { /* quota exceeded or private browsing — silently ignore */ }
    }

    function isEligible(prompt) {
        var dismissed = getDismissed();
        if (!dismissed[prompt.id]) return true;
        var age = Date.now() - dismissed[prompt.id];
        return age >= DISMISS_DAYS * 24 * 60 * 60 * 1000;
    }

    function dismiss(promptId) {
        var dismissed = getDismissed();
        dismissed[promptId] = Date.now();
        saveDismissed(dismissed);
    }

    /* ── Eligible prompt list ───────────────────────────────────────────── */
    function eligible() {
        return _prompts.filter(isEligible);
    }

    /* ── Rendering ──────────────────────────────────────────────────────── */
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function render(prompt, idx, total) {
        var col      = CAT_COLOURS[prompt.category] || CAT_COLOURS.basic;
        var catLabel = prompt.category
            ? (prompt.category.charAt(0).toUpperCase() + prompt.category.slice(1))
            : '';

        var counterHtml = total > 1
            ? '<span class="pb-counter">' + (idx + 1) + ' of ' + total + ' questions</span>'
            : '';

        var nextBtn = total > 1
            ? '<button class="pb-btn pb-next" aria-label="Show next question">Next <span aria-hidden="true">\u2192</span></button>'
            : '';

        var answerBtn = '<button class="pb-btn pb-btn--primary pb-answer" aria-label="Answer this question">Answer this <span aria-hidden="true">\u2192</span></button>';

        return [
            '<div class="pb-inner">',
            '  <div class="pb-mark" aria-hidden="true">?</div>',
            '  <div class="pb-body">',
            '    <div class="pb-meta">',
            '      <span class="pb-cat" style="background:' + col.bg + ';color:' + col.text + '">' + escapeHtml(catLabel) + '</span>',
            '      ' + counterHtml,
            '    </div>',
            '    <p class="pb-question">' + escapeHtml(prompt.question || '') + '</p>',
            '  </div>',
            '  <div class="pb-actions">',
            '    ' + answerBtn,
            '    ' + nextBtn,
            '    <button class="pb-btn pb-dismiss" aria-label="Dismiss this question for ' + DISMISS_DAYS + ' days">Remind me later</button>',
            '  </div>',
            '</div>'
        ].join('\n');
    }

    function showAt(idx) {
        var pool = eligible();
        if (!pool.length) { hideBanner(); return; }

        idx = ((idx % pool.length) + pool.length) % pool.length; /* wrap */
        var prompt = pool[idx];
        var $banner = $('#promptBanner');
        var dur = _prefersReducedMotion ? 0 : 180;

        $banner.fadeOut(dur, function () {
            $banner.html(render(prompt, idx, pool.length)).fadeIn(dur);
        });

        /* Wire buttons — re-bound on every render */
        $banner.off('.pb');

        $banner.on('click.pb', '.pb-next', function () {
            showAt(idx + 1);
        });

        $banner.on('click.pb', '.pb-answer', function () {
            if (window.PromptModal) window.PromptModal.open(prompt);
        });

        $banner.on('click.pb', '.pb-dismiss', function () {
            dismiss(prompt.id);
            var remaining = eligible(); /* re-evaluate after dismissal */
            if (!remaining.length) { hideBanner(); return; }
            /* Show the same index position, which now points to the next item */
            var newIdx = Math.min(idx, remaining.length - 1);
            showAt(newIdx);
        });

        $banner.attr('aria-label', 'Prompt: ' + (prompt.question || ''));
    }

    function hideBanner() {
        var dur = _prefersReducedMotion ? 0 : 180;
        $('#promptBanner').off('.pb').fadeOut(dur);
    }

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.PromptBanner = {
        init: function (allEvents) {
            _prompts = (allEvents || []).filter(function (e) {
                return e.type === 'prompt';
            });
            if (!_prompts.length) return;
            if (!eligible().length) return;
            showAt(0);
        }
    };

})(window, jQuery);
