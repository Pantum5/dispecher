/* =====================================================
   ՊԱՏՎԵՐՆԵՐ
===================================================== */

let orders =
    JSON.parse(
        localStorage.getItem("orders")
    ) || [];

let editingOrderId = null;

let pendingEdit = null;

let inputMode = "text";

let selectedPreparationTime = null;

let recognizedOrder = null;


/* =====================================================
   SAVE
===================================================== */

function saveOrders() {

    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );

}


/* =====================================================
   OPEN MODAL
===================================================== */

function openOrderModal() {

    editingOrderId = null;

    selectedPreparationTime = null;

    recognizedOrder = null;

    document.getElementById(
        "modalTitle"
    ).textContent = "Նոր պատվեր";

    document.getElementById(
        "orderText"
    ).value = "";

    document.getElementById(
        "recognizedData"
    ).style.display = "none";

    document.getElementById(
        "manualForm"
    ).reset();

    clearPreparationButtons();

    setInputMode("text");

    document.getElementById(
        "orderModal"
    ).classList.add("show");

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeOrderModal() {

    document.getElementById(
        "orderModal"
    ).classList.remove("show");

    editingOrderId = null;

    selectedPreparationTime = null;

    recognizedOrder = null;

}


/* =====================================================
   INPUT MODE
===================================================== */

function setInputMode(mode) {

    inputMode = mode;

    const textMode =
        document.getElementById(
            "textMode"
        );

    const manualMode =
        document.getElementById(
            "manualForm"
        );

    const textButton =
        document.getElementById(
            "textModeBtn"
        );

    const manualButton =
        document.getElementById(
            "manualModeBtn"
        );


    if (mode === "text") {

        textMode.style.display =
            "block";

        manualMode.style.display =
            "none";

        textButton.classList.add(
            "active"
        );

        manualButton.classList.remove(
            "active"
        );

    } else {

        textMode.style.display =
            "none";

        manualMode.style.display =
            "block";

        textButton.classList.remove(
            "active"
        );

        manualButton.classList.add(
            "active"
        );

    }

}


/* =====================================================
   PREPARATION TIME
===================================================== */

function selectPreparationTime(time) {

    selectedPreparationTime =
        Number(time);

    document
        .querySelectorAll(".time-btn")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    const selectedButton =
        document.querySelector(
            `.time-btn[data-time="${time}"]`
        );


    if (selectedButton) {

        selectedButton.classList.add(
            "active"
        );

    }

}


function clearPreparationButtons() {

    document
        .querySelectorAll(".time-btn")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });

}


/* =====================================================
   PARSE ORDER TEXT
===================================================== */

function parseOrderText() {

    const text =
        document
            .getElementById("orderText")
            .value
            .trim();


    if (!text) {

        alert(
            "Խնդրում եմ նախ paste արա պատվերի ամբողջական տեքստը։"
        );

        return;

    }


    const source =
        detectSource(text);


    let result;


    if (source === "Yandex") {

        result =
            parseYandexOrder(text);

    }

    else if (source === "Murakami") {

        result =
            parseMurakamiOrder(text);

    }

    else {

        alert(
            "Չհաջողվեց ճանաչել պատվերի աղբյուրը։\n\n" +
            "Կարող ես փորձել Yandex-ի կամ Murakami-ի ամբողջական տեքստը։"
        );

        return;

    }


    recognizedOrder = result;


    document.getElementById(
        "recognizedSource"
    ).textContent =
        result.source || "—";


    document.getElementById(
        "recognizedCreatedTime"
    ).textContent =
        result.createdTime || "—";


    document.getElementById(
        "recognizedAmount"
    ).textContent =
        result.amount
            ? formatAmount(result.amount)
            : "—";


    document.getElementById(
        "recognizedAddress"
    ).textContent =
        result.address || "—";


    document.getElementById(
        "recognizedCoordinates"
    ).textContent =
        result.coordinates || "—";


    document.getElementById(
        "recognizedData"
    ).style.display =
        "block";

}


/* =====================================================
   DETECT SOURCE
===================================================== */

function detectSource(text) {

    const lower =
        text.toLowerCase();


    /*
       Yandex-ի հիմնական նշանները
    */

    const isYandex =
        lower.includes(
            "работа с заказами"
        ) ||
        lower.includes(
            "управление ресторанами"
        ) ||
        lower.includes(
            "адрес доставки"
        ) &&
        (
            lower.includes(
                "создан в"
            ) ||
            lower.includes(
                "принято"
            )
        );


    /*
       Murakami-ի հիմնական նշանները
    */

    const isMurakami =
        lower.includes(
            "murakami city"
        ) ||
        lower.includes(
            "order information"
        ) ||
        lower.includes(
            "delivery address"
        ) &&
        (
            lower.includes(
                "subtotal"
            ) ||
            lower.includes(
                "accepted"
            )
        );


    if (isYandex)
        return "Yandex";


    if (isMurakami)
        return "Murakami";


    return null;

}


/* =====================================================
   YANDEX PARSER
===================================================== */

function parseYandexOrder(text) {

    const result = {

        source:
            "Yandex",

        createdTime:
            extractYandexCreatedTime(
                text
            ),

        amount:
            extractYandexAmount(
                text
            ),

        address:
            extractYandexAddress(
                text
            ),

        coordinates:
            extractCoordinatesFromText(
                text
            )

    };


    return result;

}


/* =====================================================
   YANDEX CREATION TIME
===================================================== */

function extractYandexCreatedTime(text) {

    let match =
        text.match(
            /Создан\s+в\s+(\d{1,2}:\d{2})/i
        );


    if (match)
        return normalizeTime(
            match[1]
        );


    match =
        text.match(
            /Создан\s+в\s+(\d{1,2}:\d{2})\s+\d{1,2}\s+\S+/i
        );


    if (match)
        return normalizeTime(
            match[1]
        );


    return "";

}


/* =====================================================
   YANDEX AMOUNT
===================================================== */

function extractYandexAmount(text) {

    /*
       Նախ փորձում ենք վերցնել «Итого»
    */

    let match =
        text.match(
            /Итого\s*:\s*([\d\s\u00A0]+)\s*֏/i
        );


    if (match) {

        return parseAmount(
            match[1]
        );

    }


    /*
       Եթե Итого չկա,
       փորձում ենք վերցնել վերևի գումարը։
    */

    const matches =
        [
            ...text.matchAll(
                /([\d\s\u00A0]+)\s*֏/g
            )
        ];


    if (!matches.length)
        return 0;


    /*
       Վերցնում ենք ամենամեծ հավանական գումարը։
       Սա պաշտպանում է 600 / 300 / 0 ֏
       նման փոքր արժեքներից։
    */

    const amounts =
        matches
            .map(match =>
                parseAmount(
                    match[1]
                )
            )
            .filter(
                amount =>
                    amount > 0
            );


    if (!amounts.length)
        return 0;


    return Math.max(
        ...amounts
    );

}


/* =====================================================
   YANDEX ADDRESS
===================================================== */

function extractYandexAddress(text) {

    const marker =
        "Адрес доставки";


    const index =
        text.indexOf(
            marker
        );


    if (index === -1)
        return "";


    let after =
        text
            .slice(
                index +
                marker.length
            )
            .trim();


    const lines =
        after
            .split(/\r?\n/)
            .map(
                line =>
                    cleanTextLine(line)
            )
            .filter(Boolean);


    /*
       Առաջին իրական տողը հասցեն է։
    */

    for (
        const line of lines
    ) {

        if (
            isYandexUnwantedAddressLine(
                line
            )
        ) {
            continue;
        }


        if (
            line.includes("Приборы") ||
            line.includes("Комментарий")
        ) {
            break;
        }


        return line;

    }


    return "";

}


function isYandexUnwantedAddressLine(line) {

    const lower =
        line.toLowerCase();


    return (
        lower === "приборы" ||
        lower.startsWith("квартира") ||
        lower.startsWith("подъезд") ||
        lower.startsWith("этаж") ||
        lower.startsWith("домофон")
    );

}


/* =====================================================
   MURAKAMI PARSER
===================================================== */

function parseMurakamiOrder(text) {

    return {

        source:
            "Murakami",

        createdTime:
            extractMurakamiCreatedTime(
                text
            ),

        amount:
            extractMurakamiAmount(
                text
            ),

        address:
            extractMurakamiAddress(
                text
            ),

        coordinates:
            extractCoordinatesFromText(
                text
            )

    };

}


/* =====================================================
   MURAKAMI CREATION TIME
===================================================== */

function extractMurakamiCreatedTime(text) {

    /*
       Օրինակ՝

       Accepted
       Aug 24, 2026 23:07

       կամ

       Ստեղծած ամսաթիվ :
       24 Aug 2026 20:54
    */


    let match =
        text.match(
            /Accepted[\s\S]{0,100}?(\d{1,2}:\d{2})/i
        );


    if (match)
        return normalizeTime(
            match[1]
        );


    match =
        text.match(
            /Ստեղծած\s+ամսաթիվ\s*:?\s*[\s\S]{0,50}?(\d{1,2}:\d{2})/i
        );


    if (match)
        return normalizeTime(
            match[1]
        );


    /*
       Անգլերեն տարբերակ
    */

    match =
        text.match(
            /Created[\s\S]{0,100}?(\d{1,2}:\d{2})/i
        );


    if (match)
        return normalizeTime(
            match[1]
        );


    return "";

}


/* =====================================================
   MURAKAMI AMOUNT
===================================================== */

function extractMurakamiAmount(text) {

    let match =
        text.match(
            /Total\s*([\d\s\u00A0]+)\s*AMD/i
        );


    if (match) {

        return parseAmount(
            match[1]
        );

    }


    match =
        text.match(
            /Ընդհանուր:\s*([\d\s\u00A0]+)\s*֏/i
        );


    if (match) {

        return parseAmount(
            match[1]
        );

    }


    match =
        text.match(
            /Subtotal\s*([\d\s\u00A0]+)\s*AMD/i
        );


    if (match) {

        return parseAmount(
            match[1]
        );

    }


    return 0;

}


/* =====================================================
   MURAKAMI ADDRESS
===================================================== */

function extractMurakamiAddress(text) {

    /*
       Օրինակ՝

       Delivery address

       Zone
       Դավթաշեն - Բանգլադեշ

       Name
       Տուն

       Address
       Երևան, Գրիգոր Զոհրապի փողոց, 165

       Entrance
       1
    */


    let match =
        text.match(
            /Address\s+([^\n\r]+)/i
        );


    if (match) {

        const value =
            cleanTextLine(
                match[1]
            );


        if (
            value &&
            !isGenericAddressWord(
                value
            )
        ) {

            return value;

        }

    }


    /*
       Հայերեն տարբերակ
    */

    match =
        text.match(
            /Հասցե\s+([^\n\r]+)/i
        );


    if (match) {

        return cleanTextLine(
            match[1]
        );

    }


    /*
       Եթե նույն տողում չկա,
       գտնում ենք Address-ից հետո հաջորդ իրական տողը։
    */

    const lines =
        text
            .split(/\r?\n/)
            .map(
                line =>
                    cleanTextLine(line)
            );


    for (
        let i = 0;
        i < lines.length;
        i++
    ) {

        if (
            lines[i].toLowerCase() ===
            "address"
        ) {

            for (
                let j = i + 1;
                j < Math.min(
                    i + 8,
                    lines.length
                );
                j++
            ) {

                const candidate =
                    lines[j];


                if (
                    !candidate ||
                    isMurakamiAddressMeta(
                        candidate
                    )
                ) {
                    continue;
                }


                return candidate;

            }

        }

    }


    return "";

}


function isGenericAddressWord(value) {

    const lower =
        value.toLowerCase();

    return (
        lower === "address" ||
        lower === "zone" ||
        lower === "name" ||
        lower === "entrance" ||
        lower === "floor" ||
        lower === "apartment"
    );

}


function isMurakamiAddressMeta(value) {

    const lower =
        value.toLowerCase();


    return (
        lower === "zone" ||
        lower === "name" ||
        lower === "entrance" ||
        lower === "floor" ||
        lower === "apartment" ||
        lower === "phone" ||
        lower === "order note"
    );

}


/* =====================================================
   COORDINATES
===================================================== */

function extractCoordinatesFromText(text) {

    /*
       1. Yandex / սովորական URL

       whatshere%5Bpoint%5D=44.50422%2C40.18407

       2. Yandex pt=

       pt=44.452579313869,40.199989784301

       Երկու դեպքում էլ URL-ը տալիս է
       longitude,latitude։

       Մենք վերադարձնում ենք՝

       latitude, longitude
    */


    let match =
        text.match(
            /whatshere(?:%5Bpoint%5D|\[point\])=([-\d.]+)(?:%2C|,)([-\d.]+)/i
        );


    if (match) {

        return normalizeCoordinates(
            match[2],
            match[1]
        );

    }


    match =
        text.match(
            /[?&]pt=([-\d.]+)(?:%2C|,)([-\d.]+)/i
        );


    if (match) {

        return normalizeCoordinates(
            match[2],
            match[1]
        );

    }


    /*
       Murakami Yandex URL-ի տարբերակ
    */

    match =
        text.match(
            /maps\/\?pt=([-\d.]+)(?:%2C|,)([-\d.]+)/i
        );


    if (match) {

        return normalizeCoordinates(
            match[2],
            match[1]
        );

    }


    /*
       Եթե URL-ը encoded է
    */

    const decoded =
        safeDecodeURIComponent(
            text
        );


    if (decoded !== text) {

        match =
            decoded.match(
                /whatshere\[point\]=([-\d.]+),([-\d.]+)/i
            );


        if (match) {

            return normalizeCoordinates(
                match[2],
                match[1]
            );

        }


        match =
            decoded.match(
                /[?&]pt=([-\d.]+),([-\d.]+)/i
            );


        if (match) {

            return normalizeCoordinates(
                match[2],
                match[1]
            );

        }

    }


    /*
       Վերջին fallback-ը՝
       եթե տեքստում ուղղակի գրված է

       40.199964, 44.452467
    */

    match =
        text.match(
            /\b(4[0-9]\.\d{4,})\s*,\s*(4[3-9]\.\d{4,})\b/
        );


    if (match) {

        return normalizeCoordinates(
            match[1],
            match[2]
        );

    }


    return "";

}


function normalizeCoordinates(
    latitude,
    longitude
) {

    const lat =
        Number(latitude);

    const lon =
        Number(longitude);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {

        return "";

    }


    if (
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
    ) {

        return "";

    }


    return (
        lat.toFixed(6) +
        ", " +
        lon.toFixed(6)
    );

}


/* =====================================================
   CREATE ORDER
===================================================== */

function createOrder() {

    if (
        !selectedPreparationTime
    ) {

        alert(
            "Խնդրում եմ ընտրել պատրաստման ժամանակը՝ 10, 20, 30, 40 կամ 50 րոպե։"
        );

        return;

    }


    let data;


    /*
       TEXT MODE
    */

    if (inputMode === "text") {

        if (!recognizedOrder) {

            alert(
                "Նախ paste արա պատվերի տեքստը և սեղմիր «Ճանաչել պատվերը»։"
            );

            return;

        }


        data =
            recognizedOrder;

    }


    /*
       MANUAL MODE
    */

    else {

        const source =
            document.getElementById(
                "manualSource"
            ).value;


        const createdTime =
            document.getElementById(
                "createdTime"
            ).value;


        const address =
            document.getElementById(
                "address"
            ).value.trim();


        const amount =
            Number(
                document.getElementById(
                    "amount"
                ).value
            );


        const coordinates =
            document.getElementById(
                "coordinates"
            ).value.trim();


        if (
            !createdTime ||
            !address ||
            !amount
        ) {

            alert(
                "Լրացրու ստեղծման ժամը, հասցեն և գումարը։"
            );

            return;

        }


        data = {

            source,

            createdTime,

            amount,

            address,

            coordinates:
                normalizeManualCoordinates(
                    coordinates
                )

        };

    }


    const now =
        Date.now();


    const newOrder = {

        id:
            crypto.randomUUID(),

        source:
            data.source || "Manual",

        createdTime:
            data.createdTime || "",

        amount:
            Number(
                data.amount || 0
            ),

        address:
            data.address || "",

        coordinates:
            data.coordinates || "",

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

    closeOrderModal();

    renderOrders();

}


/* =====================================================
   MANUAL COORDINATES
===================================================== */

function normalizeManualCoordinates(value) {

    if (!value)
        return "";


    const parts =
        value
            .split(",")
            .map(
                item =>
                    item.trim()
            );


    if (
        parts.length !== 2
    ) {

        return value;

    }


    const lat =
        Number(parts[0]);

    const lon =
        Number(parts[1]);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {

        return value;

    }


    return normalizeCoordinates(
        lat,
        lon
    );

}


/* =====================================================
   EDIT ORDER
===================================================== */

function editOrder(id) {

    const order =
        orders.find(
            o =>
                o.id === id
        );


    if (!order)
        return;


    editingOrderId =
        id;


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Փոփոխել պատվերը";


    setInputMode("manual");


    document.getElementById(
        "manualSource"
    ).value =
        order.source || "Manual";


    document.getElementById(
        "createdTime"
    ).value =
        order.createdTime || "";


    document.getElementById(
        "address"
    ).value =
        order.address || "";


    document.getElementById(
        "amount"
    ).value =
        order.amount || "";


    document.getElementById(
        "coordinates"
    ).value =
        order.coordinates || "";


    selectPreparationTime(
        order.preparationTime
    );


    document.getElementById(
        "orderModal"
    ).classList.add(
        "show"
    );

}


/* =====================================================
   FINISH EDIT
===================================================== */

function finishEdit(
    restartTimer
) {

    if (!pendingEdit)
        return;


    const order =
        pendingEdit.order;


    const newTime =
        pendingEdit.newPreparationTime;


    if (restartTimer) {

        const now =
            Date.now();


        order.timerStartedAt =
            now;


        order.readyAt =
            now +
            newTime *
            60 *
            1000;


        order.status =
            "preparing";

    }


    saveOrders();


    document.getElementById(
        "confirmModal"
    ).classList.remove(
        "show"
    );


    pendingEdit =
        null;


    closeOrderModal();

    renderOrders();

}


/* =====================================================
   COMPLETE
===================================================== */

function completeOrder(id) {

    const order =
        orders.find(
            o =>
                o.id === id
        );


    if (!order)
        return;


    order.status =
        "completed";


    saveOrders();

    renderOrders();

}


/* =====================================================
   DELETE
===================================================== */

function deleteOrder(id) {

    const confirmed =
        confirm(
            "Ջնջե՞լ այս պատվերը։"
        );


    if (!confirmed)
        return;


    orders =
        orders.filter(
            order =>
                order.id !== id
        );


    saveOrders();

    renderOrders();

}


/* =====================================================
   REMAINING TIME
===================================================== */

function getRemainingTime(order) {

    if (
        order.status ===
        "completed"
    ) {

        return 0;

    }


    const remaining =
        Number(
            order.readyAt
        ) -
        Date.now();


    if (
        remaining <= 0
    ) {

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


/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(
    milliseconds
) {

    const totalSeconds =
        Math.ceil(
            milliseconds /
            1000
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
            .padStart(2, "0")
        +
        ":"
        +
        String(seconds)
            .padStart(2, "0")
    );

}


/* =====================================================
   YANDEX MAP
===================================================== */

function getYandexMapLink(
    coordinates
) {

    if (!coordinates)
        return null;


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
            longitude +
            "," +
            latitude
        ) +
        "&pt=" +
        encodeURIComponent(
            longitude +
            "," +
            latitude
        ) +
        "&z=17"
    );

}


/* =====================================================
   RENDER
===================================================== */

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
        document.getElementById(
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
                getRemainingTime(
                    order
                );


            let statusText;
            let statusClass;


            if (
                order.status ===
                "completed"
            ) {

                statusText =
                    "Ավարտված";

                statusClass =
                    "completed";

            }

            else if (
                order.status ===
                "ready"
            ) {

                statusText =
                    "Պատրաստ է";

                statusClass =
                    "ready";

            }

            else {

                statusText =
                    "Պատրաստվում է";

                statusClass =
                    "preparing";

            }


            let timerHTML;


            if (
                order.status ===
                "completed"
            ) {

                timerHTML =
                    "—";

            }

            else if (
                order.status ===
                "ready"
            ) {

                timerHTML = `
                    <span class="timer danger">
                        00:00
                    </span>
                `;

            }

            else {

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


            const mapLink =
                getYandexMapLink(
                    order.coordinates
                );


            const mapHTML =
                mapLink
                    ?
                    `
                    <a
                        href="${mapLink}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="map-link"
                    >
                        🗺 Map
                    </a>
                    `
                    :
                    "—";


            const sourceClass =
                getSourceClass(
                    order.source
                );


            const sourceHTML = `
                <span class="source-badge ${sourceClass}">
                    ${escapeHTML(
                        order.source || "—"
                    )}
                </span>
            `;


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${sourceHTML}
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
                    ${formatAmount(
                        order.amount
                    )}
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

                    <span
                        class="
                            status
                            ${statusClass}
                        "
                    >
                        ${statusText}
                    </span>

                </td>


                <td>

                    <div class="actions">

                        <button
                            class="
                                action-btn
                                edit-btn
                            "
                            onclick="editOrder('${order.id}')"
                            title="Փոփոխել"
                        >
                            ✏️
                        </button>


                        ${
                            order.status !==
                            "completed"

                            ?

                            `
                            <button
                                class="
                                    action-btn
                                    complete-btn
                                "
                                onclick="completeOrder('${order.id}')"
                                title="Ավարտել"
                            >
                                ✓
                            </button>
                            `

                            :

                            ""
                        }


                        <button
                            class="
                                action-btn
                                delete-btn
                            "
                            onclick="deleteOrder('${order.id}')"
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


/* =====================================================
   SOURCE CLASS
===================================================== */

function getSourceClass(
    source
) {

    const value =
        String(
            source || ""
        )
        .toLowerCase();


    if (
        value === "yandex"
    ) {

        return "source-yandex";

    }


    if (
        value === "murakami"
    ) {

        return "source-murakami";

    }


    return "source-manual";

}


/* =====================================================
   FORMAT AMOUNT
===================================================== */

function formatAmount(
    amount
) {

    const number =
        Number(
            amount || 0
        );


    return (
        number.toLocaleString(
            "hy-AM"
        ) +
        " ֏"
    );

}


/* =====================================================
   PARSE AMOUNT
===================================================== */

function parseAmount(
    value
) {

    return Number(
        String(value)
            .replace(
                /[\s\u00A0]/g,
                ""
            )
            .replace(
                /,/g,
                ""
            )
    ) || 0;

}


/* =====================================================
   NORMALIZE TIME
===================================================== */

function normalizeTime(
    time
) {

    const parts =
        String(time)
            .split(":");


    if (
        parts.length !== 2
    ) {

        return time;

    }


    return (
        parts[0].padStart(2, "0") +
        ":" +
        parts[1].padStart(2, "0")
    );

}


/* =====================================================
   CLEAN TEXT
===================================================== */

function cleanTextLine(
    line
) {

    return String(line)
        .replace(
            /\*\*/g,
            ""
        )
        .replace(
            /^\s*[\|\-•]+\s*/,
            ""
        )
        .trim();

}


/* =====================================================
   SAFE DECODE
===================================================== */

function safeDecodeURIComponent(
    value
) {

    try {

        return decodeURIComponent(
            value
        );

    } catch {

        return value;

    }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =====================================================
   AUTO UPDATE
===================================================== */

setInterval(
    () => {

        renderOrders();

    },
    1000
);


/* =====================================================
   INITIAL
===================================================== */

renderOrders();
