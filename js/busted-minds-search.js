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
        const revealMessage = reveal && reveal.querySelector(".bm-reveal-message");
        const revealSteps = reveal ? Array.from(reveal.querySelectorAll(".bm-reveal-steps span")) : [];
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

            if (!reducedMotionQuery.matches) {
                window.setTimeout(function () {
                    if (revealMessage) {
                        revealMessage.textContent = "Warming up the weird...";
                    }
                    revealSteps.forEach(function (step, index) {
                        step.classList.toggle("is-active", index === 1);
                    });
                }, 650);

                window.setTimeout(function () {
                    if (revealMessage) {
                        revealMessage.textContent = "Portal open. Hold onto your brain.";
                    }
                    revealSteps.forEach(function (step, index) {
                        step.classList.toggle("is-active", index === 2);
                    });
                }, 1350);
            }

            window.setTimeout(function () {
                form.submit();
            }, reducedMotionQuery.matches ? 250 : 2200);
        });
    }

    function setupMindRush() {
        const game = document.getElementById("bm-mind-game");

        if (!game) {
            return;
        }

        const field = document.getElementById("bm-game-field");
        const intro = document.getElementById("bm-game-intro");
        const startButton = document.getElementById("bm-game-start");
        const spark = document.getElementById("bm-game-spark");
        const scoreElement = document.getElementById("bm-game-score");
        const bestElement = document.getElementById("bm-game-best");
        const countElement = document.getElementById("bm-game-count");
        const progressElement = document.getElementById("bm-game-progress");
        const messageElement = document.getElementById("bm-game-message");
        const bursts = document.getElementById("bm-game-bursts");
        const confetti = document.getElementById("bm-game-confetti");
        const goal = 7;
        let score = 0;
        let count = 0;
        let combo = 0;
        let lastCatch = 0;
        let audioContext;

        if (!field || !intro || !startButton || !spark) {
            return;
        }

        function readBestScore() {
            try {
                return Number(window.localStorage.getItem("bm-mind-rush-best")) || 0;
            } catch (error) {
                return 0;
            }
        }

        function writeBestScore(value) {
            try {
                window.localStorage.setItem("bm-mind-rush-best", String(value));
            } catch (error) {
                // The game still works when storage is unavailable.
            }
        }

        function formatScore(value) {
            return String(value).padStart(4, "0");
        }

        function playTone(frequency, duration) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;

                if (!AudioContext) {
                    return;
                }

                audioContext = audioContext || new AudioContext();
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                const now = audioContext.currentTime;
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(frequency, now);
                oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.45, now + duration);
                gain.gain.setValueAtTime(0.055, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                oscillator.connect(gain);
                gain.connect(audioContext.destination);
                oscillator.start(now);
                oscillator.stop(now + duration);
            } catch (error) {
                // Audio is a bonus and may be blocked by the browser.
            }
        }

        function moveSpark() {
            const x = 12 + Math.random() * 76;
            const y = 16 + Math.random() * 66;
            spark.style.setProperty("--spark-x", x + "%");
            spark.style.setProperty("--spark-y", y + "%");
        }

        function createBurst() {
            if (reducedMotionQuery.matches || !bursts) {
                return;
            }

            const burst = document.createElement("span");
            burst.style.left = spark.style.getPropertyValue("--spark-x");
            burst.style.top = spark.style.getPropertyValue("--spark-y");
            bursts.appendChild(burst);
            window.setTimeout(function () {
                burst.remove();
            }, 700);
        }

        function celebrate() {
            game.classList.add("is-won");
            spark.hidden = true;
            intro.hidden = false;
            intro.classList.add("is-victory");
            intro.querySelector("p").textContent = "Maximum brain chaos achieved!";
            startButton.textContent = "Play again";
            messageElement.textContent = "Secret mode complete ✦ " + score + " points";
            playTone(740, 0.3);

            if (!reducedMotionQuery.matches && confetti) {
                confetti.replaceChildren();
                for (let index = 0; index < 28; index += 1) {
                    const piece = document.createElement("i");
                    piece.style.setProperty("--confetti-x", (Math.random() * 100) + "%");
                    piece.style.setProperty("--confetti-delay", (Math.random() * -0.8) + "s");
                    piece.style.setProperty("--confetti-drift", ((Math.random() - 0.5) * 80) + "px");
                    confetti.appendChild(piece);
                }
            }
        }

        function startGame() {
            score = 0;
            count = 0;
            combo = 0;
            lastCatch = 0;
            game.classList.remove("is-won");
            intro.classList.remove("is-victory");
            intro.hidden = true;
            spark.hidden = false;
            if (confetti) {
                confetti.replaceChildren();
            }
            scoreElement.textContent = formatScore(score);
            countElement.textContent = count;
            progressElement.style.width = "0%";
            messageElement.textContent = "Go! Catch the glowing spark.";
            moveSpark();
            spark.setAttribute("aria-label", "Catch mind spark 1 of " + goal);
            spark.focus({ preventScroll: true });
            playTone(320, 0.18);
        }

        function catchSpark() {
            const now = Date.now();
            combo = lastCatch && now - lastCatch < 950 ? Math.min(combo + 1, 4) : 1;
            lastCatch = now;
            count += 1;
            score += 100 * combo;
            createBurst();
            playTone(360 + count * 55, 0.12);
            scoreElement.textContent = formatScore(score);
            countElement.textContent = count;
            progressElement.style.width = ((count / goal) * 100) + "%";
            messageElement.textContent = combo > 1 ? combo + "× combo — keep going!" : "Nice catch!";

            if (count >= goal) {
                const best = Math.max(readBestScore(), score);
                bestElement.textContent = formatScore(best);
                writeBestScore(best);
                celebrate();
                return;
            }

            spark.setAttribute("aria-label", "Catch mind spark " + (count + 1) + " of " + goal);
            moveSpark();
        }

        bestElement.textContent = formatScore(readBestScore());
        startButton.addEventListener("click", startGame);
        spark.addEventListener("click", catchSpark);
    }

    function setupResultsSpotlight() {
        const arcade = document.getElementById("bm-results-arcade");
        const spotlight = document.getElementById("bm-query-spotlight");

        if (!arcade && !spotlight) {
            return;
        }

        function setElementVisible(element, shouldShow) {
            if (!element) {
                return;
            }

            if (!shouldShow) {
                element.classList.remove("is-visible");
                element.hidden = true;
                return;
            }

            element.hidden = false;

            window.requestAnimationFrame(function () {
                element.classList.add("is-visible");
            });
        }

        function syncSpotlight() {
            const shouldShow = isBustedMindsQuery(getCurrentSearchQuery());
            document.body.classList.toggle("bm-results-mode", shouldShow);

            setElementVisible(arcade, shouldShow);
            setElementVisible(spotlight, shouldShow && !arcade);
        }

        syncSpotlight();
        window.addEventListener("hashchange", syncSpotlight);
        window.addEventListener("popstate", syncSpotlight);
    }

    setupHomeSearchReveal();
    setupResultsSpotlight();
    setupMindRush();
}());
