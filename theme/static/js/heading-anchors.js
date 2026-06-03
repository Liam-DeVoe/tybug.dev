// Appear-on-hover "#" indicator beside each section heading. Clicking it copies
// an absolute anchor link to that heading and updates the URL hash.
(function () {
    const article = document.querySelector('article');
    if (!article) return;

    const headings = article.querySelectorAll(
        'h2[id], h3[id], h4[id], h5[id], h6[id]'
    );

    headings.forEach((heading) => {
        const anchor = document.createElement('a');
        anchor.className = 'heading-anchor';
        anchor.href = '#' + heading.id;
        anchor.setAttribute('aria-label', 'Copy link to this section');

        anchor.addEventListener('click', (event) => {
            event.preventDefault();
            const url =
                location.origin + location.pathname + location.search + '#' + heading.id;
            history.replaceState(null, '', '#' + heading.id);
            heading.scrollIntoView();
            copyToClipboard(url, anchor);
        });

        heading.classList.add('has-heading-anchor');
        heading.appendChild(anchor);
    });

    function copyToClipboard(text, anchor) {
        const done = () => {
            anchor.classList.add('is-copied');
            setTimeout(() => anchor.classList.remove('is-copied'), 480);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
        } else {
            fallbackCopy(text, done);
        }
    }

    function fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } catch (e) {
            /* clipboard unavailable; nothing to do */
        }
        document.body.removeChild(ta);
        done();
    }
})();
