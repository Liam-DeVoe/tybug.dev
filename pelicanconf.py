import logging

LOG_FILTER = [(logging.WARN, "Empty alt attribute for image %s in %s")]

SITENAME = "Liam DeVoe"
SITEURL = ""
TIMEZONE = "America/New_York"

# Content paths
PATH = "content"
ARTICLE_PATHS = ["articles", "thoughts"]
PAGE_PATHS = ["pages"]
STATIC_PATHS = ["extra", "images"]
EXTRA_PATH_METADATA = {
    "extra/CNAME": {"path": "CNAME"},
    "extra/flexible_automatic_tpbt.pdf": {"path": "static/flexible_automatic_tpbt.pdf"},
    "extra/favicon.png": {"path": "favicon.png"},
}

# URL structure
ARTICLE_URL = "{slug}"
ARTICLE_SAVE_AS = "{slug}/index.html"
PAGE_URL = "{slug}"
PAGE_SAVE_AS = "{slug}/index.html"
TAG_URL = "tags/{slug}"
TAG_SAVE_AS = "tags/{slug}/index.html"

# Disable unused pages
AUTHOR_SAVE_AS = ""
CATEGORY_SAVE_AS = ""
ARCHIVES_SAVE_AS = ""
AUTHORS_SAVE_AS = ""
CATEGORIES_SAVE_AS = ""
TAGS_SAVE_AS = ""

# No pagination
DEFAULT_PAGINATION = False

FEED_ALL_ATOM = "feed.xml"
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

THEME = "theme"

MARKDOWN = {
    "extension_configs": {
        "markdown.extensions.meta": {},
        "markdown.extensions.footnotes": {},
        "markdown.extensions.codehilite": {
            "css_class": "highlight",
            "guess_lang": False,
        },
        "markdown.extensions.fenced_code": {},
        "markdown.extensions.tables": {},
        # we use this to automatically slugify our headers. we don't actually use
        # its toc feature
        "markdown.extensions.toc": {},
        "pymdownx.arithmatex": {
            "generic": True,
        },
    },
    "output_format": "html5",
}

PLUGIN_PATHS = ["plugins"]
PLUGINS = ["hidden_articles", "redirect_generator", "sidenotes", "thoughts", "webassets"]

WEBASSETS_CONFIG = [
    ("libsass_style", "expanded"),
]

REDIRECTS = {
    "/2021/07/19/expensive-imports-in-GUIs/": "/expensive-imports-in-GUIs/",
    "/2021/07/28/lru_cache-gotchas/": "/lru_cache-gotchas/",
    "/2021/11/06/tracking-all-subclasses-of-a-class/": "/tracking-all-subclasses-of-a-class/",
    "/2022/03/16/godels-incompleteness-theorem/": "/incompleteness/",
    "/2022/08/18/godels-second-incompleteness-theorem/": "/second-incompleteness/",
    "/2022/08/23/git-as-a-backup-system/": "/git-as-a-backup-system/",
    "/2022/10/31/a-quirk-in-super/": "/super-quirk/",
    "/2023/10/31/galois-connections/": "/galois-connections/",
    "/2024/08/27/homebrew-catan/": "/homebrew-catan/",
    "/swarm-testing/": "/activated-swarm-testing/",
}

DIRECT_TEMPLATES = ["index", "articles"]
ARTICLES_SAVE_AS = "articles/index.html"
ARTICLES_URL = "articles"

JINJA_ENVIRONMENT = {
    "trim_blocks": True,
    "lstrip_blocks": True,
}

DEFAULT_DATE_FORMAT = "%A, %B %d, %Y"
