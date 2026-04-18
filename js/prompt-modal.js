/* prompt-modal.js — Owner-flow prompt response capture
 *
 * Opens a modal when the owner clicks "Answer this →" on any prompt card
 * or the prompt banner.  Captures a draft answer and an optional date,
 * then stores the payload in sessionStorage and opens admin.html in a
 * new tab so the Totem Builder can receive the pre-filled entry.
 *
 * sessionStorage key: totem_prompt_response
 * Payload shape:
 *   { promptId, title, question, body, dateIso, category }
 *
 * Public API (window.PromptModal):
 *   .open(item)  — item is a prompt event object from events.json
 */
(function (window, $) {
    'use strict';

    var MODAL_ID = 'promptCaptureModal';
    var SESSION_KEY = 'totem_prompt_response';

    var _prefersReducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var CAT_COLOURS = {
        life:    { bg: '#2ec27e', text: '#fff' },
        work:    { bg: '#2563eb', text: '#fff' },
        passion: { bg: '#f59e0b', text: '#1a1a1a' },
        pivotal: { bg: '#ef4444', text: '#fff' },
        basic:   { bg: '#2d5bff', text: '#fff' }
    };

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /* ── Build DOM ──────────────────────────────────────────────────────── */
    function buildModal() {
        if ($('#' + MODAL_ID).length) return;

        var html = [
            '<div id="' + MODAL_ID + '" class="pm-overlay" role="dialog" aria-modal="true"',
            '     aria-labelledby="pmTitle" tabindex="-1" style="display:none">',
            '  <div class="pm-box" role="document">',
            '    <button class="pm-close" aria-label="Close">&times;</button>',
            '    <!-- Question header -->',
            '    <div class="pm-question-header">',
            '      <span class="pm-cat" id="pmCat"></span>',
            '      <p class="pm-question-text" id="pmTitle"></p>',
            '    </div>',
            '    <!-- Answer form -->',
            '    <div class="pm-form">',
            '      <label class="pm-label" for="pmAnswer">Your answer</label>',
            '      <textarea id="pmAnswer" class="pm-textarea"',
            '                placeholder="Write your answer here…" rows="6"></textarea>',
            '      <label class="pm-label pm-label--date" for="pmDate">Approximate date <span class="pm-label-hint">(optional)</span></label>',
            '      <input id="pmDate" class="pm-date-input" type="date"/>',
            '    </div>',
            '    <div class="pm-actions">',
            '      <button class="pm-btn pm-btn--primary" id="pmOpenBuilder">',
            '        Open in Totem Builder <span aria-hidden="true">\u2192</span>',
            '      </button>',
            '      <button class="pm-btn pm-btn--ghost" id="pmCancel">Cancel</button>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');

        $('body').append(html);
    }

    /* ── Show / hide ────────────────────────────────────────────────────── */
    var _lastFocused = null;
    var _currentItem = null;

    function openModal(item) {
        buildModal();
        _lastFocused = document.activeElement;
        _currentItem = item;

        var col     = CAT_COLOURS[item.category] || CAT_COLOURS.basic;
        var catText = item.category
            ? (item.category.charAt(0).toUpperCase() + item.category.slice(1))
            : '';

        $('#pmCat').text(catText).css({ background: col.bg, color: col.text });
        $('#pmTitle').text(item.question || item.title || '');
        $('#pmAnswer').val('');
        $('#pmDate').val(item.dateIso || '');

        $('body').addClass('pm-overlay-open');

        var dur = _prefersReducedMotion ? 0 : 200;
        $('#' + MODAL_ID).fadeIn(dur, function () {
            $(this).focus();
            $('#pmAnswer').focus();
        });

        /* Wire actions — unbind first to prevent duplicate handlers */
        $('#pmOpenBuilder').off('click.pm').on('click.pm', handleOpenBuilder);
        $('#pmCancel').off('click.pm').on('click.pm', closeModal);
        $('#' + MODAL_ID).off('click.pm').on('click.pm', function (e) {
            if ($(e.target).is('#' + MODAL_ID)) closeModal();
        });
        $(document).off('keydown.pm').on('keydown.pm', function (e) {
            if (e.key === 'Escape') closeModal();
        });
        $('.pm-close').off('click.pm').on('click.pm', closeModal);
    }

    function closeModal() {
        var dur = _prefersReducedMotion ? 0 : 160;
        $('#' + MODAL_ID).fadeOut(dur, function () {
            $('body').removeClass('pm-overlay-open');
            $(document).off('keydown.pm');
            if (_lastFocused) { _lastFocused.focus(); _lastFocused = null; }
        });
    }

    /* ── Save + open admin ──────────────────────────────────────────────── */
    function handleOpenBuilder() {
        if (!_currentItem) return;

        var answer  = $('#pmAnswer').val() || '';
        var dateVal = $('#pmDate').val() || _currentItem.dateIso || '';

        var payload = {
            promptId: _currentItem.id,
            title:    _currentItem.title || '',
            question: _currentItem.question || '',
            body:     answer,
            dateIso:  dateVal,
            category: _currentItem.category || 'basic'
        };

        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        } catch (e) {
            /* sessionStorage unavailable — proceed anyway, admin will show empty form */
        }

        window.open('admin.html', '_blank', 'noopener');
        closeModal();
    }

    /* ── Public API ─────────────────────────────────────────────────────── */
    window.PromptModal = {
        open: function (item) {
            openModal(item);
        }
    };

})(window, jQuery);
