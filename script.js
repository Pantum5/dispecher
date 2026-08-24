// ======================================================
// ՊԱՏՎԵՐՆԵՐ
// ======================================================

let orders = JSON.parse(
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

    const value = text.toLowerCase();

    // Yandex
    if (
        value.includes("работа с заказами") ||
        value.includes("управление ресторанами") ||
        value.includes("yandex.ru/maps") ||
        value.includes("доставка ресторана")
    ) {

        return "Yandex";

    }


    // Murakami
    if (
        value.includes("api.murakamicity.com") ||
        value.includes("murakami city") &&
        value.includes("fulfillment") ||
        value.includes("nearest branch")
    ) {

        return "Murakami";

    }


    // Yerevan City
    if (
        value.includes("erp-admin.innodream.com") ||
        value.includes("yerevan-city.am") ||
        value.includes("order information") ||
        value.includes("կապի և առաքման վերաբերյալ տեղեկություններ")
    ) {

        return "Yerevan City";

    }


    return "Unknown";

}


// ======================================================
// ԺԱՄԱՆԱԿԻ ՆՈՐՄԱԼԱՑՈՒՄ
// ======================================================

function normalizeTime(time) {

    if (!time) {
        return "";
    }

    const match = String(time).match(
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
// ԳՈՒՄԱՐԻ ՆՈՐՄԱԼԱՑՈՒՄ
// ======================================================

function parseAmount(value) {

    if (!value) {
        return 0;
    }

    let text = String(value)
        .replace(/\u00A0/g, " ")
        .replace(/[^\d]/g, "");

    return Number(text) || 0;

}


// ======================================================
// YANDEX
// ======================================================

function parseYandex(text) {

    let createdTime = "";
    let amount = 0;
    let address = "";
    let coordinates = "";


    // --------------------------------------------------
    // ՍՏԵՂԾՄԱՆ ԺԱՄ
    // Օրինակ՝ Создан в 23:32 24 авг.
    // --------------------------------------------------

    const createdMatch = text.match(
        /Создан\s+в\s+(\d{1,2}:\d{2})/i
    );

    if (createdMatch) {

        createdTime =
            normalizeTime(
                createdMatch[1]
            );

    }


    // --------------------------------------------------
    // ԸՆԴՀԱՆՈՒՐ ԳՈՒՄԱՐ
    // Փնտրում ենք Итого
    // --------------------------------------------------

    const totalMatch = text.match(
        /Итого:\s*[\s\S]{0,100}?\*\*?([\d\s\u00A0]+)\s*֏/i
    );

    if (totalMatch) {

        amount =
            parseAmount(
                totalMatch[1]
            );

    }


    // Եթե վերևի տարբերակը չաշխատի
    if (!amount) {

        const amountMatches = [
            ...text.matchAll(
                /([\d\s\u00A0]+)\s*֏/g
            )
        ];

        if (amountMatches.length) {

            const values =
                amountMatches.map(
                    m => parseAmount(m[1])
                );

            amount =
                Math.max(...values);

        }

    }


    // --------------------------------------------------
    // ՀԱՍՑԵ
    // --------------------------------------------------

    const addressMatch = text.match(
        /\*\*Адрес доставки\*\*\s*[\r\n]+(?:\[([^\]]+)\]|([^\r\n]+))/i
    );

    if (addressMatch) {

        address =
            (
                addressMatch[1] ||
                addressMatch[2] ||
                ""
            ).trim();

    }


    // --------------------------------------------------
    // ԿՈՈՐԴԻՆԱՏՆԵՐ
    //
    // Yandex link-ում լինում է՝
    // whatshere[point]=44.50422,40.18407
    //
    // Մենք պահում ենք՝
    // latitude, longitude
    // 40.18407, 44.50422
    // --------------------------------------------------

    const coordMatch = text.match(
        /whatshere(?:%5B|\[)point(?:%5D|\])=([\d.-]+)%2C([\d.-]+)/i
    );

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
// MURAKAMI
// ======================================================

function parseMurakami(text) {

    let createdTime = "";
    let amount = 0;
    let address = "";
    let coordinates = "";


    // --------------------------------------------------
    // ՍՏԵՂԾՄԱՆ ԺԱՄ
    //
    // Accepted Aug 24, 2026 23:07
    // --------------------------------------------------

    const acceptedMatch = text.match(
        /Accepted\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+(\d{1,2}:\d{2})/i
    );

    if (acceptedMatch) {

        createdTime =
            normalizeTime(
                acceptedMatch[1]
            );

    }


    // --------------------------------------------------
    // ԸՆԴՀԱՆՈՒՐ ԳՈՒՄԱՐ
    //
    // Total15,600 AMD
    // --------------------------------------------------

    const totalMatch = text.match(
        /Total\s*([\d\s,]+)\s*AMD/i
    );

    if (totalMatch) {

        amount =
            parseAmount(
                totalMatch[1]
            );

    }


    // --------------------------------------------------
    // ՀԱՍՑԵ
    //
    // AddressԵրևան, ...
    // --------------------------------------------------

    const addressMatch = text.match(
        /Address\s+([^\r\n]+?)(?=\s+Entrance\b|\s+Floor\b|\s+Apartment\b|\s+Phone\b)/i
    );

    if (addressMatch) {

        address =
            addressMatch[1].trim();

    }


    // --------------------------------------------------
    // ԿՈՈՐԴԻՆԱՏՆԵՐ
    //
    // Yandex Map
    // pt=44.452579313869,40.199989784301
    //
    // Պահում ենք՝
    // 40.199989784301, 44.452579313869
    // --------------------------------------------------

    const mapMatch = text.match(
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
// YEREVAN CITY
// ======================================================

function parseYerevanCity(text) {

    let createdTime = "";
    let amount = 0;
    let address = "";
    let coordinates = "";


    // --------------------------------------------------
    // ՍՏԵՂԾՄԱՆ ԺԱՄ
    //
    // Ստեղծած ամսաթիվ :
    // 24 Aug 2026 20:54
    // --------------------------------------------------

    const createdMatch = text.match(
        /Ստեղծած\s+ամսաթիվ\s*:\s*[\r\n]*\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+(\d{1,2}:\d{2})/i
    );

    if (createdMatch) {

        createdTime =
            normalizeTime(
                createdMatch[1]
            );

    }


    // --------------------------------------------------
    // ԸՆԴՀԱՆՈՒՐ ԳՈՒՄԱՐ
    //
    // Ընդհանուր:
    // 34 500֏
    // --------------------------------------------------

    const totalMatch = text.match(
        /Ընդհանուր\s*:\s*[\r\n]*\s*([\d\s\u00A0]+)\s*֏/i
    );

    if (totalMatch) {

        amount =
            parseAmount(
                totalMatch[1]
            );

    }


    // --------------------------------------------------
    // ՀԱՍՑԵ
    //
    // Առաքվող:
    // Yerevan, ...
    // մինչև հաջորդ դաշտը
    // --------------------------------------------------

    const addressMatch = text.match(
        /Առաքվող\s*:\s*[\r\n]*\s*([^\r\n]+?)(?=\s*[\r\n]+Ստեղծած\s+ամսաթիվ)/i
    );

    if (addressMatch) {

        address =
            addressMatch[1].trim();

    }


    // --------------------------------------------------
    // ԿՈՈՐԴԻՆԱՏՆԵՐ
    //
    // Եթե Yerevan City-ի էջում հետագայում
    // Yandex Map link լինի՝ վերցնում ենք դրանից
    // --------------------------------------------------

    const mapMatch =
        text.match(
            /yandex\.com\/maps\/\?[^ \r\n]*?(?:pt|ll)=([\d.-]+),([\d.-]+)/i
        );


    if (mapMatch) {

        const first =
            mapMatch[1];

        const second =
            mapMatch[2];


        // Yandex-ի URL-ում առաջինը longitude է,
        // երկրորդը latitude

        coordinates =
            `${second}, ${first}`;

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

    const text =
        document
            .getElementById("orderText")
            .value
            .trim();


    if (!text) {

        alert(
            "Խնդրում եմ ամբողջ պատվերի տեքստը տեղադրիր։"
        );

        return;

    }


    const source =
        detectSource(text);


    let result = null;


    // --------------------------------------------------
    // YANDEX
    // --------------------------------------------------

    if (source === "Yandex") {

        result =
            parseYandex(text);

    }


    // --------------------------------------------------
    // MURAKAMI
    // --------------------------------------------------

    else if (source === "Murakami") {

        result =
            parseMurakami(text);

    }


    // --------------------------------------------------
    // YEREVAN CITY
    // --------------------------------------------------

    else if (source === "Yerevan City") {

        result =
            parseYerevanCity(text);

    }


    // --------------------------------------------------
    // UNKNOWN
    // --------------------------------------------------

    else {

        alert(
            "Պատվերի աղբյուրը չճանաչվեց։\n\n" +
            "Աջակցվում են՝ Yandex, Murakami, Yerevan City։"
        );

        return;

    }


    parsedOrderData = result;


    // --------------------------------------------------
    // ՑՈՒՑԱԴՐԵԼ
    // --------------------------------------------------

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
            ? result.amount.toLocaleString("hy-AM") + " ֏"
            : "—";


    document.getElementById(
        "parsedAddress"
    ).textContent =
        result.address || "—";


    document.getElementById(
        "parsedCoordinates"
    ).textContent =
        result.coordinates || "—";


    // --------------------------------------------------
    // RESET PREPARATION
    // --------------------------------------------------

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


    // --------------------------------------------------
    // SHOW RESULT
    // --------------------------------------------------

    document
        .getElementById(
            "parsedOrder"
        )
        .classList.add(
            "show"
        );

}


// ======================================================
// ՊԱՏՐԱՍՏՄԱՆ ԺԱՄԱՆԱԿԻ ԸՆՏՐՈՒԹՅՈՒՆ
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
// PARSED ՊԱՏՎԵՐԸ ՍՏԵՂԾԵԼ
// ======================================================

function createParsedOrder() {

    if (!parsedOrderData) {

        alert(
            "Սկզբում պետք է վերլուծել պատվերի տեքստը։"
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

        address:
            parsedOrderData.address,

        amount:
            parsedOrderData.amount,

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


    // Մաքրել parser-ը

    clearParser();


    renderOrders();

}


// ======================================================
// PARSER-Ը ՄԱՔՐԵԼ
// ======================================================

function clearParser() {

    document.getElementById(
        "orderText"
    ).value = "";


    document
        .getElementById(
            "parsedOrder"
        )
        .classList.remove(
            "show"
        );


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
// ԺԱՄԱՆԱԿԻ ՁԵՎԱՉԱՓ
// ======================================================

function formatTime(milliseconds) {

    const totalSeconds =
        Math.max(
            0,
            Math.ceil(
                milliseconds / 1000
            )
        );


    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const seconds =
        totalSeconds % 60;


    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );

}


// ======================================================
// YANDEX MAP
// ======================================================

function getYandexMapLink(coordinates) {

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


    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .toLowerCase()
            .trim();


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


    empty.style.display =
        filteredOrders.length === 0
            ? "block"
            : "none";


    filteredOrders.forEach(
        order => {

            const remaining =
                getRemainingTime(order);


            // --------------------------------------------------
            // STATUS
            // --------------------------------------------------

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


            // --------------------------------------------------
            // TIMER
            // --------------------------------------------------

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


            // --------------------------------------------------
            // MAP
            // --------------------------------------------------

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


            // --------------------------------------------------
            // ROW
            // --------------------------------------------------

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
                    ).toLocaleString("hy-AM")}
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
// ԱՎՏՈՄԱՏ ԹԱՐՄԱՑՈՒՄ
// ======================================================

setInterval(
    () => {

        renderOrders();

    },
    1000
);


// ======================================================
// ՍԿԶԲՆԱԿԱՆ
// ======================================================

renderOrders();
