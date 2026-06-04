import re

from pelican import signals


def transform_footnotes_to_sidenotes(content):
    """Transform Markdown footnotes into sidenotes for margin display.

    Finds footnote references (e.g. <sup id="fnref:1">...) in the article body,
    injects a <span class="sidenote"> with the footnote text right after each
    reference, and removes the footnote section from the bottom of the article.
    """
    if not hasattr(content, "_content") or not content._content:
        return

    html = content._content

    if 'class="footnote"' not in html:
        return

    # Extract footnote definitions from the bottom section.
    # Each <li id="fn:X"> contains the footnote HTML + a backref link.
    footnotes = {}
    for match in re.finditer(
        r'<li id="fn:([^"]+)">\s*(.*?)\s*</li>', html, re.DOTALL
    ):
        fn_id = match.group(1)
        fn_html = match.group(2).strip()
        # Remove the backref link (↩)
        fn_html = re.sub(
            r'\s*<a class="footnote-backref"[^>]*>[^<]*</a>', "", fn_html
        )
        fn_html = fn_html.strip()
        # Unwrap a single <p> tag to keep sidenotes compact
        if fn_html.count("<p>") == 1:
            fn_html = re.sub(r"^<p>(.*)</p>$", r"\1", fn_html, flags=re.DOTALL)
        footnotes[fn_id] = fn_html.strip()

    if not footnotes:
        return

    # After each footnote ref, inject a sidenote span. Any punctuation that
    # immediately follows the reference is pulled in front of the sidenote so
    # it stays attached to the ref — otherwise on narrow screens, where the
    # sidenote is display:block, the trailing punctuation gets orphaned on its
    # own line below the sidenote box.
    def replace_ref(match):
        fn_id = match.group(1)
        fn_num = match.group(2)
        punct = match.group(3)
        fn_text = footnotes.get(fn_id, "")
        ref = (
            f'<sup id="fnref:{fn_id}">'
            f'<a class="footnote-ref" href="#fn:{fn_id}">{fn_num}</a></sup>'
        )
        sidenote = f'<span class="sidenote"><sup>{fn_num}</sup> {fn_text}</span>'
        return ref + punct + sidenote

    html = re.sub(
        r'<sup id="fnref:([^"]+)"><a class="footnote-ref" href="#fn:\1">(\d+)</a></sup>([.,;:!?)\'"]*)',
        replace_ref,
        html,
    )

    # Remove the bottom footnotes section entirely
    html = re.sub(r'\s*<div class="footnote">.*?</div>', "", html, flags=re.DOTALL)

    content._content = html


def register():
    signals.content_object_init.connect(transform_footnotes_to_sidenotes)
