(function () {
    const targetQuery = "busted minds";
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function normalizeQuery(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function isBustedMindsQuery(value) {
        const normalized = normalizeQuery(value);
        return normalized === targetQuery || normalized.replace(/\s+/g, "") === "bustedminds";
    }

    function getCurrentSearchQuery() {
        const params = new URLSearchParams(window.location.search);
        const directQuery = params.get("q");

        if (directQuery) {
            return directQuery;
        }

        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        return hashParams.get("gsc.q") || "";
    }

    function setupHomeSearchReveal() {
        const form = document.querySelector(".search-form");

        if (!form) {
            return;
        }

        const input = form.querySelector('input[name="q"]');
        const submitButton = form.querySelector('[type="submit"]');
        const reveal = document.getElementById("bm-search-reveal");
        let isLaunching = false;

        if (!input) {
            return;
        }

        function syncQueryState() {
            const isActive = isBustedMindsQuery(input.value);
            form.classList.toggle("is-bm-query", isActive);
        }

        input.addEventListener("input", syncQueryState);
        syncQueryState();

        form.addEventListener("submit", function (event) {
            if (!isBustedMindsQuery(input.value) || isLaunching || !reveal) {
                return;
            }

            event.preventDefault();
            isLaunching = true;
            input.value = targetQuery;

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.setAttribute("aria-disabled", "true");
            }

            reveal.hidden = false;
            reveal.setAttribute("aria-hidden", "false");
            document.body.classList.add("bm-reveal-active", "bm-launching");

            window.requestAnimationFrame(function () {
                reveal.classList.add("is-visible");
            });

            window.setTimeout(function () {
                form.submit();
            }, reducedMotionQuery.matches ? 250 : 1950);
        });
    }

    function setupResultsSpotlight() {
        const spotlight = document.getElementById("bm-query-spotlight");

        if (!spotlight) {
            return;
        }

        function syncSpotlight() {
            const shouldShow = isBustedMindsQuery(getCurrentSearchQuery());

            if (!shouldShow) {
                spotlight.classList.remove("is-visible");
                spotlight.hidden = true;
                return;
            }

            spotlight.hidden = false;

            window.requestAnimationFrame(function () {
                spotlight.classList.add("is-visible");
            });
        }

        syncSpotlight();
        window.addEventListener("hashchange", syncSpotlight);
        window.addEventListener("popstate", syncSpotlight);
    }

    setupHomeSearchReveal();
    setupResultsSpotlight();
}());
