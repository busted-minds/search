(function () {
    const panel = document.getElementById("weather-panel");

    if (!panel) {
        return;
    }

    const defaultLocation = {
        name: "Tokyo",
        country: "Japan",
        latitude: 35.6762,
        longitude: 139.6503
    };

    const storageKey = "bustedMindsWeatherLocation";
    const forecastUrl = "https://api.open-meteo.com/v1/forecast";
    const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";
    const elements = {
        location: document.getElementById("weather-location"),
        temp: document.getElementById("weather-temp"),
        condition: document.getElementById("weather-condition"),
        status: document.getElementById("weather-status"),
        form: document.getElementById("weather-form"),
        city: document.getElementById("weather-city"),
        suggestions: document.getElementById("weather-suggestions"),
        showSearch: document.getElementById("weather-show-search"),
        useLocation: document.getElementById("weather-use-location")
    };
    let suggestionTimer;

    const weatherCodes = {
        0: ["Clear", "clear"],
        1: ["Mostly clear", "clear"],
        2: ["Partly cloudy", "cloud"],
        3: ["Overcast", "cloud"],
        45: ["Fog", "fog"],
        48: ["Rime fog", "fog"],
        51: ["Light drizzle", "rain"],
        53: ["Drizzle", "rain"],
        55: ["Heavy drizzle", "rain"],
        56: ["Freezing drizzle", "rain"],
        57: ["Freezing drizzle", "rain"],
        61: ["Light rain", "rain"],
        63: ["Rain", "rain"],
        65: ["Heavy rain", "rain"],
        66: ["Freezing rain", "rain"],
        67: ["Freezing rain", "rain"],
        71: ["Light snow", "snow"],
        73: ["Snow", "snow"],
        75: ["Heavy snow", "snow"],
        77: ["Snow grains", "snow"],
        80: ["Rain showers", "rain"],
        81: ["Rain showers", "rain"],
        82: ["Heavy showers", "rain"],
        85: ["Snow showers", "snow"],
        86: ["Snow showers", "snow"],
        95: ["Thunderstorm", "storm"],
        96: ["Thunderstorm", "storm"],
        99: ["Thunderstorm", "storm"]
    };

    elements.showSearch.addEventListener("click", function () {
        const shouldOpen = elements.form.hidden;
        elements.form.hidden = !shouldOpen;
        elements.showSearch.setAttribute("aria-expanded", String(shouldOpen));

        if (shouldOpen) {
            elements.city.focus();
        } else {
            elements.city.blur();
            clearSuggestions();
        }
    });

    elements.city.addEventListener("input", function () {
        const query = elements.city.value.trim();
        window.clearTimeout(suggestionTimer);

        if (query.length < 2) {
            clearSuggestions();
            return;
        }

        suggestionTimer = window.setTimeout(function () {
            loadSuggestions(query);
        }, 220);
    });

    elements.city.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            clearSuggestions();
            elements.city.blur();
        }
    });

    elements.form.addEventListener("submit", function (event) {
        event.preventDefault();
        const query = elements.city.value.trim();

        if (query.length < 2) {
            setStatus("Enter at least 2 letters.", true);
            return;
        }

        searchLocation(query);
    });

    elements.useLocation.addEventListener("click", function () {
        if (!navigator.geolocation) {
                setStatus("Location unavailable.", true);
                return;
        }

        setLoading("Requesting location...");
        navigator.geolocation.getCurrentPosition(
            function (position) {
                loadWeather({
                    name: "Your location",
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            function () {
                setStatus("Showing saved city.");
                panel.classList.remove("is-loading", "is-error");
            },
            {
                enableHighAccuracy: false,
                maximumAge: 600000,
                timeout: 10000
            }
        );
    });

    loadWeather(getStoredLocation() || defaultLocation);

    async function searchLocation(query) {
        setLoading("Finding city...");

        try {
            const result = (await findLocations(query, 1))[0];

            if (!result) {
                throw new Error("No matching city found.");
            }

            await chooseLocation(result);
        } catch (error) {
            panel.classList.remove("is-loading");
            panel.classList.add("is-error");
            setStatus(error.message, true);
        }
    }

    async function loadSuggestions(query) {
        try {
            const results = await findLocations(query, 5);
            renderSuggestions(results);
        } catch (error) {
            clearSuggestions();
        }
    }

    async function findLocations(query, count) {
        const params = new URLSearchParams({
            name: query,
            count: String(count),
            language: "en",
            format: "json"
        });
        const response = await fetch(`${geocodingUrl}?${params.toString()}`);

        if (!response.ok) {
            throw new Error("Location search failed.");
        }

        const data = await response.json();
        return data.results || [];
    }

    function renderSuggestions(results) {
        elements.suggestions.innerHTML = "";

        if (!results.length) {
            clearSuggestions();
            return;
        }

        results.forEach(function (result) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "weather-suggestion";

            const place = document.createElement("span");
            place.className = "weather-suggestion-place";
            place.textContent = result.name;

            const region = document.createElement("span");
            region.className = "weather-suggestion-region";
            region.textContent = formatRegion(result);

            button.append(place, region);
            button.addEventListener("click", function () {
                chooseLocation(result);
            });
            elements.suggestions.appendChild(button);
        });

        elements.suggestions.hidden = false;
    }

    function formatRegion(result) {
        return [result.admin1, result.country].filter(Boolean).join(", ");
    }

    function clearSuggestions() {
        elements.suggestions.hidden = true;
        elements.suggestions.innerHTML = "";
    }

    async function chooseLocation(result) {
        clearSuggestions();
        await loadWeather({
            name: result.name,
            admin1: result.admin1,
            country: result.country,
            latitude: result.latitude,
            longitude: result.longitude
        });
        elements.city.value = "";
        elements.form.hidden = true;
        elements.showSearch.setAttribute("aria-expanded", "false");
    }

    async function loadWeather(location) {
        setLoading(`Loading ${formatLocation(location)}...`);

        try {
            const params = new URLSearchParams({
                latitude: String(location.latitude),
                longitude: String(location.longitude),
                current: "temperature_2m,weather_code",
                timezone: "auto",
                forecast_days: "1",
                temperature_unit: "celsius"
            });
            const response = await fetch(`${forecastUrl}?${params.toString()}`);

            if (!response.ok) {
                throw new Error("Weather could not be loaded.");
            }

            const data = await response.json();
            renderWeather(location, data);
            storeLocation(location);
        } catch (error) {
            panel.classList.remove("is-loading");
            panel.classList.add("is-error");
            setStatus(error.message, true);
        }
    }

    function renderWeather(location, data) {
        const current = data.current;

        if (!current) {
            throw new Error("Weather data was incomplete.");
        }

        const condition = describeWeather(current.weather_code);
        elements.location.textContent = formatLocation(location);
        elements.temp.textContent = `${round(current.temperature_2m)}°`;
        elements.condition.textContent = condition.label;
        panel.dataset.weather = condition.theme;

        panel.classList.remove("is-loading", "is-error");
        setStatus(`Updated ${formatTime(current.time, data.timezone)}`);
    }

    function describeWeather(code) {
        const fallback = ["Weather", "cloud"];
        const match = weatherCodes[Number(code)] || fallback;

        return {
            label: match[0],
            theme: match[1]
        };
    }

    function formatLocation(location) {
        const parts = [location.name];

        if (location.admin1 && location.admin1 !== location.name) {
            parts.push(location.admin1);
        }

        if (location.country) {
            parts.push(location.country);
        }

        return parts.filter(Boolean).join(", ");
    }

    function formatTime(value, timezone) {
        if (!value) {
            return "just now";
        }

        const localTime = value.includes("T") ? value.split("T")[1] : value;
        return `${localTime.slice(0, 5)} ${timezone || ""}`.trim();
    }

    function round(value) {
        return Number.isFinite(value) ? Math.round(value) : "--";
    }

    function setLoading(message) {
        panel.classList.add("is-loading");
        panel.classList.remove("is-error");
        setStatus(message);
    }

    function setStatus(message, isError) {
        elements.status.textContent = message;
        elements.status.style.color = isError ? "#b42318" : "";
    }

    function getStoredLocation() {
        try {
            const stored = window.localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    function storeLocation(location) {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(location));
        } catch (error) {
            // Weather still works when storage is blocked.
        }
    }
}());
