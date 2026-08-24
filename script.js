// ======================================================
// ՊԱՏՎԵՐՆԵՐ
// ======================================================

let orders =
    JSON.parse(
        localStorage.getItem("orders")
    ) || [];

let parsedOrderData = null;
let selectedPreparationTime = null;


// ======================================================
// LOCAL STORAGE
// ======================================================

function saveOrders() {

    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );

}


// ======================================================
// HTML SECURITY
// ======================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ======================================================
// ԱՂԲՅՈՒՐԻ ՃԱՆԱՉՈՒՄ
// ======================================================

function detectSource(text) {

    const value =
        String(text).toLowerCase();


    // YANDEX

    if (
        value.includes("работа с заказами") ||
        value.includes("управление ресторанами") ||
        value.includes("доставка ресторана") ||
        value.includes("адрес доставки") ||
        value.includes("yandex.ru/maps")
    ) {

        return "Yandex";

    }


    // MURAKAMI

    if (
        value.includes("api.murakamicity.com") ||
        (
            value.includes("murakami city") &&
            value.includes("fulfillment")
        ) ||
        value.includes("nearest branch")
    ) {

        return "Murakami";

    }


    // YEREVAN CITY

    if (
        value.includes("erp-admin.innodream.com") ||
        value.includes("yerevan-city.am") ||
        value.includes("order information") ||
        value.includes(
            "կապի և առաքման վերաբերյալ տեղեկություններ"
        )
    ) {

        return "Yerevan City";

    }


    return "Unknown";

}


// ======================================================
// ԹԻՎ
// ======================================================

function parseAmount(value) {

    if (!value) {
        return 0;
    }


    return Number(
        String(value)
            .replace(/\u00A0/g, "")
            .replace(/\s/g, "")
            .replace(/,/g, "")
            .replace(/[^\d]/g, "")
    ) || 0;

}


// ======================================================
// ԺԱՄ
// ======================================================

function normalizeTime(time) {

    if (!time) {
        return "";
    }


    const match =
        String(time).match(
            /(\d{1,2}):(\d{2})/
        );


    if (!match) {
        return "";
    }


    return (
        String(match[1]).padStart(2, "0") +
        ":" +
        match[2]
    );

}


// ======================================================
// YANDEX PARSER
// ======================================================

function parseYandex(text) {

    let createdTime = "";
    let amount = 0;
    let address = "";
    let coordinates = "";


    const cleanText =
        String(text)
            .replace(/\r/g, "")
            .replace(/\u00A0/g, " ")
            .replace(/\*\*/g, "")
            .trim();


    // ==================================================
    // ՍՏԵՂԾՄԱՆ ԺԱՄ
    // ==================================================

    const createdMatch =
        cleanText.match(
            /Создан\s+в\s+(\d{1,2}):(\d{2})/i
        );


    if (createdMatch) {

        createdTime =
            String(
                createdMatch[1]
            ).padStart(2, "0") +
            ":" +
            createdMatch[2];

    }


    // ==================================================
    // ԸՆԴՀԱՆՈՒՐ ԳՈՒՄԱՐ
    //
    // Միայն Итого-ից հետո
    // ==================================================

    const totalMatch =
        cleanText.match(
            /Итого\s*:\s*\n?\s*([\d\s]+)\s*֏/i
        );


    if (totalMatch) {

        amount =
            parseAmount(
                totalMatch[1]
            );

    }


    // Երկրորդ fallback

    if (!amount) {

        const fallbackTotal =
            cleanText.match(
                /Итого[\s\S]{0,80}?([\d\s]+)\s*֏/i
            );


        if (fallbackTotal) {

            amount =
                parseAmount(
                    fallbackTotal[1]
                );

        }

    }


    // ==================================================
    // ՀԱՍՑԵ
    //
    // Адрес доставки
    // հաջորդ տողը
    // ==================================================

    const addressMatch =
        cleanText.match(
            /Адрес доставки\s*\n\s*([^\n]+?)(?=\n\s*(?:квартира|Приборы|Комментарий ресторану|Комментарий курьеру|$))/i
        );


    if (addressMatch) {

        address =
            addressMatch[1].trim();

    }


    // Fallback

    if (!address) {

        const addressFallback =
            cleanText.match(
                /Адрес доставки\s*\n\s*([^\n]+)/i
            );


        if (addressFallback) {

            const possibleAddress =
                addressFallback[1].trim();


            if (
                possibleAddress &&
                !/^Приборы$/i.test(
                    possibleAddress
                ) &&
                !/^Комментарий/i.test(
                    possibleAddress
                )
            ) {

                address =
                    possibleAddress;

            }

        }

    }


    // ==================================================
    // ԿՈՈՐԴԻՆԱՏՆԵՐ
    // ==================================================

    let coordMatch =
        cleanText.match(
            /whatshere(?:%5B|\[)point(?:%5D|\])=([\d.-]+)(?:%2C|,)([\d.-]+)/i
        );


    // pt=

    if (!coordMatch) {

        coordMatch =
            cleanText.match(
                /[?&]pt=([\d.-]+),([\d.-]+)/i
            );

    }


    // ll=

    if (!coordMatch) {

        coordMatch =
            cleanText.match(
                /[?&]ll=([\d.-]+),([\d.-]+)/i
            );

    }


    if (coordMatch) {

        const longitude =
            coordMatch[1];

        const latitude =
            coordMatch[2];


        coordinates =
            `${latitude}, ${longitude}`;

    }


    return {

        source: "Yandex",

        createdTime,

        amount,

        address,

        coordinates

    };

}


// ======================================================
// MURAKAMI PARSER
// ======================================================

function parseMurakami(text) {

    let createdTime = "";
    let amount = 0;
    let address = "";
    let coordinates = "";


    const cleanText =
        String(text)
            .replace(/\r/g, "")
            .replace(/\u00A0/g, " ")
            .trim();


    // ==================================================
    // ACCEPTED
    // ==================================================

    const acceptedMatch =
        cleanText.match(
            /Accepted\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+(\d{1,2}:\d{2})/i
        );


    if (acceptedMatch) {

        createdTime =
            normalizeTime(
                acceptedMatch[1]
            );

    }


    // ==================================================
    // TOTAL
    // ==================================================

    const totalMatch =
        cleanText.match(
            /Total\s*([\d\s,]+)\s*AMD/i
        );


    if (totalMatch) {

        amount =
            parseAmount(
                totalMatch[1]
            );

    }


    // ==================================================
    // ADDRESS
    // ==================================================

    const addressMatch =
        cleanText.match(
            /Address\s+([^\r\n]+?)(?=\s+Entrance\b|\s+Floor\b|\s+Apartment\b|\s+Phone\b)/i
        );


    if (addressMatch) {

        address =
            addressMatch[1].trim();

    }


    // ==================================================
    // YANDEX MAP
    // ==================================================

    const mapMatch =
        cleanText.match(
            /yandex\.com\/maps\/\?pt=([\d.-]+),([\d.-]+)/i
        );


    if (mapMatch) {

        const longitude =
            mapMatch[1];

        const latitude =
            mapMatch[2];


        coordinates =
            `${latitude}, ${longitude}`;

    }


    return {

        source: "Murakami",

        createdTime,

        amount,

        address,

        coordinates

    };

}


// ======================================================
// YEREVAN CITY PARSER
// ======================================================

function parseYerevanCity(text) {

    let createdTime = "";
    let amount = 0;
    let address = "";
    let coordinates = "";


    const cleanText =
        String(text)
            .replace(/\r/g, "")
            .replace(/\u00A0/g, " ")
            .trim();


    // ==================================================
    // ՍՏԵՂԾԱԾ ԱՄՍԱԹԻՎ
    // ==================================================

    const createdMatch =
        cleanText.match(
            /Ստեղծած\s+ամսաթիվ\s*:\s*\n?\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+(\d{1,2}:\d{2})/i
        );


    if (createdMatch) {

        createdTime =
            normalizeTime(
                createdMatch[1]
            );

    }


    // ==================================================
    // ԸՆԴՀԱՆՈՒՐ
    // ==================================================

    const totalMatch =
        cleanText.match(
            /Ընդհանուր\s*:\s*\n?\s*([\d\s\u00A0]+)\s*֏/i
        );


    if (totalMatch) {

        amount =
            parseAmount(
                totalMatch[1]
            );

    }


    // ==================================================
    // ԱՌԱՔՎՈՂ
    // ==================================================

    const addressMatch =
        cleanText.match(
            /Առաքվող\s*:\s*\n?\s*([^\r\n]+?)(?=\s*\n+Ստեղծած\s+ամսաթիվ)/i
        );


    if (addressMatch) {

        address =
            addressMatch[1].trim();

    }


    // ==================================================
    // YANDEX MAP
    // ==================================================

    let mapMatch =
        cleanText.match(
            /yandex\.com\/maps\/\?[^ \r\n]*?(?:pt|ll)=([\d.-]+),([\d.-]+)/i
        );


    if (mapMatch) {

        const longitude =
            mapMatch[1];

        const latitude =
            mapMatch[2];


        coordinates =
            `${latitude}, ${longitude}`;

    }


    return {

        source: "Yerevan City",

        createdTime,

        amount,

        address,

        coordinates

    };

}


// ======================================================
// ԳԼԽԱՎՈՐ PARSER
// ======================================================

function parseOrderText() {

    const input =
        document.getElementById(
            "orderText"
        );


    if (!input) {

        alert(
            "orderText դաշտը HTML-ում չկա։"
        );

        return;

    }


    const text =
        input.value.trim();


    if (!text) {

        alert(
            "Խնդրում եմ ամբողջ պատվերի տեքստը տեղադրիր։"
        );

        return;

    }


    const source =
        detectSource(text);


    let result = null;


    if (source === "Yandex") {

        result =
            parseYandex(text);

    }

    else if (source === "Murakami") {

        result =
            parseMurakami(text);

    }

    else if (source === "Yerevan City") {

        result =
            parseYerevanCity(text);

    }

    else {

        alert(
            "Պատվերի աղբյուրը չճանաչվեց։\n\n" +
            "Աջակցվում են՝ Yandex, Murakami, Yerevan City։"
        );

        return;

    }


    parsedOrderData =
        result;


    // ==================================================
    // ԱՐԴՅՈՒՆՔ
    // ==================================================

    document.getElementById(
        "parsedSource"
    ).textContent =
        result.source || "—";


    document.getElementById(
        "parsedCreatedTime"
    ).textContent =
        result.createdTime || "—";


    document.getElementById(
        "parsedAmount"
    ).textContent =
        result.amount
            ? result.amount.toLocaleString(
                "hy-AM"
            ) + " ֏"
            : "—";


    document.getElementById(
        "parsedAddress"
    ).textContent =
        result.address || "—";


    document.getElementById(
        "parsedCoordinates"
    ).textContent =
        result.coordinates || "—";


    // ==================================================
    // PREPARATION RESET
    // ==================================================

    selectedPreparationTime =
        null;


    document
        .querySelectorAll(
            ".time-buttons button"
        )
        .forEach(
            button =>
                button.classList.remove(
                    "selected"
                )
        );


    document
        .getElementById(
            "parsedOrder"
        )
        .classList.add(
            "show"
        );

}


// ======================================================
// ՊԱՏՐԱՍՏՄԱՆ ԺԱՄԱՆԱԿ
// ======================================================

function selectPreparationTime(minutes) {

    selectedPreparationTime =
        Number(minutes);


    document
        .querySelectorAll(
            ".time-buttons button"
        )
        .forEach(
            button => {

                const value =
                    Number(
                        button.dataset.time
                    );


                button.classList.toggle(
                    "selected",
                    value ===
                    selectedPreparationTime
                );

            }
        );

}


// ======================================================
// PARSED ՊԱՏՎԵՐԻ ՍՏԵՂԾՈՒՄ
// ======================================================

function createParsedOrder() {

    if (!parsedOrderData) {

        alert(
            "Սկզբում վերլուծիր պատվերի տեքստը։"
        );

        return;

    }


    if (!selectedPreparationTime) {

        alert(
            "Ընտրիր պատրաստման ժամանակը՝ 10, 20, 30, 40 կամ 50 րոպե։"
        );

        return;

    }


    const now =
        Date.now();


    const newOrder = {

        id:
            crypto.randomUUID(),

        source:
            parsedOrderData.source,

        createdTime:
            parsedOrderData.createdTime,

        amount:
            parsedOrderData.amount,

        address:
            parsedOrderData.address,

        coordinates:
            parsedOrderData.coordinates,

        preparationTime:
            selectedPreparationTime,

        timerStartedAt:
            now,

        readyAt:
            now +
            selectedPreparationTime *
            60 *
            1000,

        status:
            "preparing"

    };


    orders.push(
        newOrder
    );


    saveOrders();

    clearParser();

    renderOrders();

}


// ======================================================
// PARSER RESET
// ======================================================

function clearParser() {

    const input =
        document.getElementById(
            "orderText"
        );


    if (input) {

        input.value = "";

    }


    const parsed =
        document.getElementById(
            "parsedOrder"
        );


    if (parsed) {

        parsed.classList.remove(
            "show"
        );

    }


    parsedOrderData =
        null;


    selectedPreparationTime =
        null;


    document
        .querySelectorAll(
            ".time-buttons button"
        )
        .forEach(
            button =>
                button.classList.remove(
                    "selected"
                )
        );

}


// ======================================================
// ՄՆԱՑԱԾ ԺԱՄԱՆԱԿ
// ======================================================

function getRemainingTime(order) {

    if (
        order.status ===
        "completed"
    ) {

        return 0;

    }


    const remaining =
        Number(order.readyAt) -
        Date.now();


    if (remaining <= 0) {

        if (
            order.status ===
            "preparing"
        ) {

            order.status =
                "ready";

            saveOrders();

        }


        return 0;

    }


    return remaining;

}


// ======================================================
// TIMER FORMAT
// ======================================================

function formatTime(milliseconds) {

    const totalSeconds =
        Math.max(
            0,
            Math.ceil(
                milliseconds /
                1000
            )
        );


    const minutes =
        Math.floor(
            totalSeconds /
            60
        );


    const seconds =
        totalSeconds %
        60;


    return (
        String(minutes)
            .padStart(2, "0") +
        ":" +
        String(seconds)
            .padStart(2, "0")
    );

}


// ======================================================
// YANDEX MAP LINK
// ======================================================

function getYandexMapLink(
    coordinates
) {

    if (!coordinates) {

        return null;

    }


    const parts =
        coordinates
            .split(",")
            .map(
                value =>
                    value.trim()
            );


    if (
        parts.length !== 2
    ) {

        return null;

    }


    const latitude =
        Number(parts[0]);


    const longitude =
        Number(parts[1]);


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        return null;

    }


    return (
        "https://yandex.com/maps/?" +
        "ll=" +
        encodeURIComponent(
            `${longitude},${latitude}`
        ) +
        "&pt=" +
        encodeURIComponent(
            `${longitude},${latitude}`
        ) +
        "&z=17"
    );

}


// ======================================================
// ԱՎԱՐՏԵԼ
// ======================================================

function completeOrder(id) {

    const order =
        orders.find(
            order =>
                order.id === id
        );


    if (!order) {
        return;
    }


    order.status =
        "completed";


    saveOrders();

    renderOrders();

}


// ======================================================
// ՋՆՋԵԼ
// ======================================================

function deleteOrder(id) {

    const confirmed =
        confirm(
            "Ջնջե՞լ այս պատվերը։"
        );


    if (!confirmed) {
        return;
    }


    orders =
        orders.filter(
            order =>
                order.id !== id
        );


    saveOrders();

    renderOrders();

}


// ======================================================
// ՊԱՏՎԵՐՆԵՐԻ ՑՈՒՑԱԴՐՈՒՄ
// ======================================================

function renderOrders() {

    const table =
        document.getElementById(
            "ordersTable"
        );


    const empty =
        document.getElementById(
            "emptyState"
        );


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (!table) {
        return;
    }


    const search =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    table.innerHTML = "";


    const filteredOrders =
        orders.filter(
            order =>
                String(
                    order.address || ""
                )
                .toLowerCase()
                .includes(search)
        );


    if (empty) {

        empty.style.display =
            filteredOrders.length === 0
                ? "block"
                : "none";

    }


    filteredOrders.forEach(
        order => {

            const remaining =
                getRemainingTime(
                    order
                );


            // ==================================================
            // STATUS
            // ==================================================

            let statusText =
                "Պատրաստվում է";

            let statusClass =
                "preparing";


            if (
                order.status ===
                "ready"
            ) {

                statusText =
                    "Պատրաստ է";

                statusClass =
                    "ready";

            }


            if (
                order.status ===
                "completed"
            ) {

                statusText =
                    "Ավարտված";

                statusClass =
                    "completed";

            }


            // ==================================================
            // TIMER
            // ==================================================

            let timerHTML =
                "—";


            if (
                order.status ===
                "preparing"
            ) {

                let timerClass =
                    "timer";


                if (
                    remaining <=
                    5 * 60 * 1000
                ) {

                    timerClass +=
                        " warning";

                }


                if (
                    remaining <=
                    60 * 1000
                ) {

                    timerClass +=
                        " danger";

                }


                timerHTML = `
                    <span class="${timerClass}">
                        ${formatTime(remaining)}
                    </span>
                `;

            }


            if (
                order.status ===
                "ready"
            ) {

                timerHTML = `
                    <span class="timer danger">
                        00:00
                    </span>
                `;

            }


            // ==================================================
            // MAP
            // ==================================================

            const mapLink =
                getYandexMapLink(
                    order.coordinates
                );


            const mapHTML =
                mapLink
                    ? `
                        <a
                            href="${mapLink}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="map-link"
                        >
                            Map
                        </a>
                    `
                    : "—";


            // ==================================================
            // ROW
            // ==================================================

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <span class="source">
                        ${escapeHTML(
                            order.source || "—"
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHTML(
                        order.createdTime || "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        order.address || "—"
                    )}
                </td>

                <td>
                    ${Number(
                        order.amount || 0
                    ).toLocaleString(
                        "hy-AM"
                    )}
                    ֏
                </td>

                <td>
                    ${Number(
                        order.preparationTime || 0
                    )}
                    րոպե
                </td>

                <td>
                    ${timerHTML}
                </td>

                <td>
                    ${mapHTML}
                </td>

                <td>
                    <span class="
                        status
                        ${statusClass}
                    ">
                        ${statusText}
                    </span>
                </td>

                <td>

                    <div class="actions">

                        ${
                            order.status !==
                            "completed"

                            ? `
                                <button
                                    class="
                                        action-btn
                                        complete-btn
                                    "
                                    onclick="
                                        completeOrder(
                                            '${order.id}'
                                        )
                                    "
                                    title="Ավարտել"
                                >
                                    ✓
                                </button>
                            `
                            : ""
                        }

                        <button
                            class="
                                action-btn
                                delete-btn
                            "
                            onclick="
                                deleteOrder(
                                    '${order.id}'
                                )
                            "
                            title="Ջնջել"
                        >
                            🗑️
                        </button>

                    </div>

                </td>

            `;


            table.appendChild(
                row
            );

        }
    );

}


// ======================================================
// ԱՎՏՈՄԱՏ TIMER UPDATE
// ======================================================

setInterval(
    () => {

        renderOrders();

    },
    1000
);


// ======================================================
// START
// ======================================================

renderOrders();
