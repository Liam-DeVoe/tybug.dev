import os

from pelican import signals

REDIRECT_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url={destination}">
<link rel="canonical" href="{destination}">
</head>
<body>
<p>This page has moved to <a href="{destination}">{destination}</a>.</p>
</body>
</html>
"""


def generate_redirects(generator, writer):
    redirects = generator.settings.get("REDIRECTS", {})
    for source, destination in redirects.items():
        # source is like "/2021/07/19/expensive-imports-in-GUIs/"
        # Write an index.html inside that path
        source = source.strip("/")
        redirect_html = REDIRECT_TEMPLATE.format(destination=destination)
        for output_path in [os.path.join(source, "index.html"), f"{source}.html"]:
            path = os.path.join(generator.output_path, output_path)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(redirect_html)


def register():
    signals.article_writer_finalized.connect(generate_redirects)
