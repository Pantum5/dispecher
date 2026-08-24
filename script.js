/* =====================================================
   ՊԱՏՎԵՐՆԵՐ
===================================================== */

let orders =
    JSON.parse(
        localStorage.getItem("orders")
    ) || [];


let editingOrderId = null;

let pendingEdit = null;


/* =====================================================
   TEXT PARSER-Ի ԺԱՄԱՆԱԿԱՎՈՐ ՏՎՅԱԼՆԵՐ
===================================================== */

let recognizedOrderData = null;

let selectedPreparationTime = null;


/* =====================================================
   LOCAL STORAGE
===================================================== */

function saveOrders() {

    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );

}


/* =====================================================
   MODAL — ՆՈՐ ՊԱՏՎԵՐ
===================================================== */

function openOrderModal() {

    editingOrderId = null;

    document.getElementById(
        "modalTitle"
    ).textContent = "Նոր պատվեր";


    document
        .getElementById("orderForm")
        .reset();


    document
        .getElementById("orderModal")
        .classList.add("show");

}


function closeOrderModal() {

    document
        .getElementById("orderModal")
        .classList.remove("show");

    editingOrderId = null;

}


/* =====================================================
   TEXT MODAL
===================================================== */

function openTextOrderModal() {

    document
        .getElementById("textOrderModal")
        .classList.add("show");


    document
        .getElementById("orderText")
        .focus();

}


function closeTextOrderModal() {

    document
        .getElementById("textOrderModal")
        .classList.remove("show");


    recognizedOrderData = null;

    selectedPreparationTime = null;


    document
        .getElementById("recognizedOrder")
        .classList.remove("show");


    document
        .getElementById("createRecognizedBtn")
        .disabled = true;


    document
        .querySelectorAll(".prep-buttons button")
        .forEach(button => {

            button.classList.remove("selected");

        });

}


/* =====================================================
   SOURCE
===================================================== */

function detectSource(text) {

    const lower =
        text.toLowerCase();


    /*
       Murakami-ի տեքստում սովորաբար կան՝
       api.murakamicity.com
       Platform
       Murakami City
       Processing
    */

    if (
        lower.includes("api.murakamicity.com") ||
        lower.includes("murakami city") ||
        lower.includes("murakamicity")
    ) {

        return "Murakami";

    }


    /*
       Yandex-ի տեքստում սովորաբար կան՝
       РАБОТА С ЗАКАЗАМИ
       Яндекс
       yandex.ru/maps
       Доставка ресторана
    */

    if (
        lower.includes("yandex.ru/maps") ||
        lower.includes("работа с заказами") ||
        lower.includes("доставка ресторана")
    ) {

        return "Yandex";

    }


    return "Այլ";

}


/* =====================================================
   TIME — YANDEX
===================================================== */

function parseYandexTime(text) {

    /*
       Փնտրում ենք օրինակ՝

       Создан в 0:33
       Создан в 23:32
       Создан в 0:33 24 авг.
       Принято в 23:32

       Մեզ պետք է հենց "Создан в"-ից հետո եղած ժամը։
    */


    const match =
        text.match(
            /Создан\s+в\s+(\d{1,2}):(\d{2})/i
        );


    if (!match) {

        return "";

    }


    return (
        String(match[1]).padStart(2, "0")
        +
        ":"
        +
        match[2]
    );

}


/* =====================================================
   TIME — MURAKAMI
===================================================== */

function parseMurakamiTime(text) {

    /*
       Օրինակ՝

       AcceptedAug 24, 2026 23:07

       կամ

       Accepted Aug 24, 2026 23:07

       կամ

       Созданная ամսաթիվ :
       24 Aug 2026 20:54
    */


    let match =
        text.match(
            /Accepted\s*(?:Aug|Sep|Jan|Feb|Mar|Apr|May|Jun|Jul|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s+(\d{1,2}):(\d{2})/i
        );


    if (match) {

        return (
            String(match[1]).padStart(2, "0")
            +
            ":"
            +
            match[2]
        );

    }


    match =
        text.match(
            /Ստեղծած ամսաթիվ\s*:?\s*\d{1,2}\s+\w+\s+\d{4}\s+(\d{1,2}):(\d{2})/i
        );


    if (match) {

        return (
            String(match[1]).padStart(2, "0")
            +
            ":"
            +
            match[2]
        );

    }


    return "";

}


/* =====================================================
   AMOUNT
===================================================== */

function parseAmount(text, source) {

    /*
       Yandex

       Ի վերջո ունենք՝

       Итого:
       9 600 ֏

       կամ

       13 800 ֏
    */


    if (source === "Yandex") {

        const totalMatch =
            text.match(
                /Итого:\s*([\d\s\u00A0]+)\s*֏/i
            );


        if (totalMatch) {

            return normalizeAmount(
                totalMatch[1]
            );

        }


        /*
           Backup՝ եթե "Итого" չկա
        */

        const amounts =
            [
                ...text.matchAll(
                    /([\d\s\u00A0]+)\s*֏/g
                )
            ];


        if (amounts.length) {

            const values =
                amounts.map(
                    match =>
                        normalizeAmount(
                            match[1]
                        )
                );


            return Math.max(...values);

        }

    }


    /*
       Murakami

       Total15,600 AMD

       կամ

       Ընդհանուր:
       34 500֏
    */

    if (source === "Murakami") {

        let match =
            text.match(
                /Total\s*([\d\s,\.]+)\s*AMD/i
            );


        if (match) {

            return normalizeAmount(
                match[1]
            );

        }


        match =
            text.match(
                /Ընդհանուր:\s*([\d\s,\u00A0]+)\s*֏/i
            );


        if (match) {

            return normalizeAmount(
                match[1]
            );

        }


        match =
            text.match(
                /Total:\s*([\d\s,\.]+)\s*֏/i
            );


        if (match) {

            return normalizeAmount(
                match[1]
            );

        }

    }


    return 0;

}


/* =====================================================
   AMOUNT NORMALIZE
===================================================== */

function normalizeAmount(value) {

    return Number(
        String(value)
            .replace(/\s/g, "")
            .replace(/\u00A0/g, "")
            .replace(/,/g, "")
            .replace(/\./g, "")
    ) || 0;

}


/* =====================================================
   YANDEX ADDRESS
===================================================== */

function parseYandexAddress(text) {

    /*
       Փնտրում ենք՝

       Адрес доставки
       Ереван, 1-й тупик проспекта Тигран Мец, д. 8

       և վերցնում հաջորդ իմաստալից տողը։
    */


    const lines =
        text
            .split(/\r?\n/)
            .map(line =>
                line
                    .replace(/\*\*/g, "")
                    .trim()
            )
            .filter(Boolean);


    const index =
        lines.findIndex(
            line =>
                line.toLowerCase() ===
                "адрес доставки"
        );


    if (index === -1) {

        return "";

    }


    for (
        let i = index + 1;
        i < Math.min(index + 5, lines.length);
        i++
    ) {

        const line =
            lines[i];


        if (
            !line ||
            line === "Приборы" ||
            line.startsWith("Комментарий")
        ) {

            continue;

        }


        if (
            line.includes("http://") ||
            line.includes("https://")
        ) {

            continue;

        }


        return cleanAddress(line);

    }


    return "";

}


/* =====================================================
   MURAKAMI ADDRESS
===================================================== */

function parseMurakamiAddress(text) {

    /*
       Օրինակ՝

       Delivery address

       Zone...
       Name...
       AddressԵրևան, Գրիգոր Զոհրապի փողոց, 165

       Entrance...
    */


    let match =
        text.match(
            /Address\s*([^\n]+?)(?=\n(?:Entrance|Floor|Apartment|Phone|Yandex|Order note|Address note|Customer characteristics|$))/i
        );


    if (match) {

        return cleanAddress(
            match[1]
        );

    }


    /*
       Backup՝ հայերեն "Առաքվող:"
    */

    match =
        text.match(
            /Առաքվող:\s*([^\n]+)/i
        );


    if (match) {

        return cleanAddress(
            match[1]
        );

    }


    return "";

}


/* =====================================================
   ADDRESS CLEAN
===================================================== */

function cleanAddress(address) {

    return String(address)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

}


/* =====================================================
   COORDINATES
===================================================== */

function parseCoordinates(text) {

    /*
       Ամենակարևոր մասը։

       Yandex example:

       https://yandex.ru/maps/?whatshere%5Bpoint%5D=44.50422%2C40.18407

       այստեղ Yandex-ը տալիս է՝

       longitude,latitude

       Մենք պահում ենք՝

       latitude, longitude

       այսինքն՝

       40.18407, 44.50422
    */


    let match =
        text.match(
            /whatshere(?:%5B|\[)point(?:%5D|\])=([-+]?\d+(?:\.\d+)?)[,%2C]+([-+]?\d+(?:\.\d+)?)/i
        );


    if (match) {

        return formatCoordinates(
            match[2],
            match[1]
        );

    }


    /*
       Yandex-ի encoded տարբերակների համար
    */

    match =
        text.match(
            /whatshere.{0,20}?point.{0,10}?(-?\d+\.\d+)[,%2C]+(-?\d+\.\d+)/i
        );


    if (match) {

        return formatCoordinates(
            match[2],
            match[1]
        );

    }


    /*
       Murakami:

       pt=44.452579313869,40.199989784301
    */

    match =
        text.match(
            /[?&]pt=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i
        );


    if (match) {

        return formatCoordinates(
            match[2],
            match[1]
        );

    }


    /*
       Murakami Navigator

       lat_to=40.199989784301
       lon_to=44.452579313869
    */

    const lat =
        text.match(
            /lat_to=(-?\d+(?:\.\d+)?)/i
        );


    const lon =
        text.match(
            /lon_to=(-?\d+(?:\.\d+)?)/i
        );


    if (lat && lon) {

        return formatCoordinates(
            lat[1],
            lon[1]
        );

    }


    /*
       Վերջին fallback՝
       եթե տեքստում ուղղակի կա coordinates-ի նման զույգ։

       Սա օգտագործում ենք միայն այն դեպքում,
       երբ վերևի հատուկ ձևերը չեն գտնվել։
    */

    const pairs =
        [
            ...text.matchAll(
                /(-?\d{1,3}\.\d{4,})\s*[,;]\s*(-?\d{1,3}\.\d{4,})/g
            )
        ];


    for (const pair of pairs) {

        const first =
            Number(pair[1]);

        const second =
            Number(pair[2]);


        /*
           Երևանյան coordinates-ի range check

           latitude մոտ 40
           longitude մոտ 44
        */

        if (
            first >= 38 &&
            first <= 42 &&
            second >= 43 &&
            second <= 47
        ) {

            return formatCoordinates(
                first,
                second
            );

        }


        if (
            second >= 38 &&
            second <= 42 &&
            first >= 43 &&
            first <= 47
        ) {

            return formatCoordinates(
                second,
                first
            );

        }

    }


    return "";

}


/* =====================================================
   FORMAT COORDINATES
===================================================== */

function formatCoordinates(
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
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {

        return "";

    }


    return (
        lat.toString()
        +
        ", "
        +
        lon.toString()
    );

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
            "Տեղադրիր պատվերի Text-ը։"
        );

        return;

    }


    const source =
        detectSource(text);


    let createdTime = "";

    let address = "";


    if (source === "Yandex") {

        createdTime =
            parseYandexTime(text);

        address =
            parseYandexAddress(text);

    }

    else if (source === "Murakami") {

        createdTime =
            parseMurakamiTime(text);

        address =
            parseMurakamiAddress(text);

    }


    const amount =
        parseAmount(
            text,
            source
        );


    const coordinates =
        parseCoordinates(text);


    recognizedOrderData = {

        source,

        createdTime,

        amount,

        address,

        coordinates

    };


    selectedPreparationTime =
        null;


    document.getElementById(
        "recognizedSource"
    ).textContent =
        source || "—";


    document.getElementById(
        "recognizedTime"
    ).textContent =
        createdTime || "—";


    document.getElementById(
        "recognizedAmount"
    ).textContent =
        amount
            ? amount.toLocaleString("hy-AM") + " ֏"
            : "—";


    document.getElementById(
        "recognizedAddress"
    ).textContent =
        address || "—";


    document.getElementById(
        "recognizedCoordinates"
    ).textContent =
        coordinates || "—";


    document
        .getElementById("recognizedOrder")
        .classList.add("show");


    document
        .getElementById("createRecognizedBtn")
        .disabled = true;


    document
        .querySelectorAll(".prep-buttons button")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });

}


/* =====================================================
   PREPARATION TIME
===================================================== */

function selectPreparationTime(minutes) {

    selectedPreparationTime =
        Number(minutes);


    document
        .querySelectorAll(".prep-buttons button")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );


            if (
                Number(
                    button.dataset.time
                ) === minutes
            ) {

                button.classList.add(
                    "selected"
                );

            }

        });


    document.getElementById(
        "createRecognizedBtn"
    ).disabled = false;

}


/* =====================================================
   CREATE RECOGNIZED ORDER
===================================================== */

function createRecognizedOrder() {

    if (!recognizedOrderData) {

        return;

    }


    if (!selectedPreparationTime) {

        alert(
            "Ընտրիր պատրաստման ժամանակը։"
        );

        return;

    }


    const now =
        Date.now();


    const order = {

        id:
            crypto.randomUUID(),

        source:
            recognizedOrderData.source,

        createdTime:
            recognizedOrderData.createdTime ||
            getCurrentTime(),

        address:
            recognizedOrderData.address,

        amount:
            recognizedOrderData.amount,

        preparationTime:
            selectedPreparationTime,

        coordinates:
            recognizedOrderData.coordinates,

        note:
            "",

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


    orders.push(order);


    saveOrders();


    closeTextOrderModal();


    renderOrders();

}


/* =====================================================
   MANUAL ORDER
===================================================== */

document
    .getElementById("orderForm")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const source =
                document
                    .getElementById("source")
                    .value;


            const createdTime =
                document
                    .getElementById("createdTime")
                    .value;


            const address =
                document
                    .getElementById("address")
                    .value
                    .trim();


            const amount =
                Number(
                    document
                        .getElementById("amount")
                        .value
                );


            const preparationTime =
                Number(
                    document
                        .getElementById("preparationTime")
                        .value
                );


            const coordinates =
                document
                    .getElementById("coordinates")
                    .value
                    .trim();


            const note =
                document
                    .getElementById("note")
                    .value
                    .trim();


            if (!editingOrderId) {

                const now =
                    Date.now();


                const order = {

                    id:
                        crypto.randomUUID(),

                    source,

                    createdTime,

                    address,

                    amount,

                    preparationTime,

                    coordinates,

                    note,

                    timerStartedAt:
                        now,

                    readyAt:
                        now +
                        preparationTime *
                        60 *
                        1000,

                    status:
                        "preparing"

                };


                orders.push(order);


                saveOrders();

                closeOrderModal();

                renderOrders();

                return;

            }


            const order =
                orders.find(
                    item =>
                        item.id ===
                        editingOrderId
                );


            if (!order) {

                return;

            }


            const oldTime =
                order.preparationTime;


            const changedTime =
                oldTime !==
                preparationTime;


            order.source =
                source;

            order.createdTime =
                createdTime;

            order.address =
                address;

            order.amount =
                amount;

            order.preparationTime =
                preparationTime;

            order.coordinates =
                coordinates;

            order.note =
                note;


            if (changedTime) {

                pendingEdit = {

                    order,

                    newPreparationTime:
                        preparationTime

                };


                document
                    .getElementById(
                        "confirmModal"
                    )
                    .classList.add("show");


                return;

            }


            saveOrders();

            closeOrderModal();

            renderOrders();

        }
    );


/* =====================================================
   FINISH EDIT
===================================================== */

function finishEdit(
    restartTimer
) {

    if (!pendingEdit) {

        return;

    }


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


    document
        .getElementById(
            "confirmModal"
        )
        .classList.remove("show");


    pendingEdit = null;


    closeOrderModal();

    renderOrders();

}


/* =====================================================
   EDIT ORDER
===================================================== */

function editOrder(id) {

    const order =
        orders.find(
            item =>
                item.id === id
        );


    if (!order) {

        return;

    }


    editingOrderId =
        id;


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Փոփոխել պատվերը";


    document.getElementById(
        "source"
    ).value =
        order.source || "Այլ";


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
        "preparationTime"
    ).value =
        order.preparationTime || "";


    document.getElementById(
        "coordinates"
    ).value =
        order.coordinates || "";


    document.getElementById(
        "note"
    ).value =
        order.note || "";


    document
        .getElementById("orderModal")
        .classList.add("show");

}


/* =====================================================
   COMPLETE
===================================================== */

function completeOrder(id) {

    const order =
        orders.find(
            item =>
                item.id === id
        );


    if (!order) {

        return;

    }


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
        order.readyAt -
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


/* =====================================================
   FORMAT TIMER
===================================================== */

function formatTime(milliseconds) {

    const totalSeconds =
        Math.ceil(
            milliseconds / 1000
        );


    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const seconds =
        totalSeconds % 60;


    return (
        String(minutes).padStart(2, "0")
        +
        ":"
        +
        String(seconds).padStart(2, "0")
    );

}


/* =====================================================
   YANDEX MAP
===================================================== */

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
                    Number(value.trim())
            );


    if (
        parts.length !== 2 ||
        !Number.isFinite(parts[0]) ||
        !Number.isFinite(parts[1])
    ) {

        return null;

    }


    const latitude =
        parts[0];


    const longitude =
        parts[1];


    return (
        "https://yandex.com/maps/"
        +
        "?ll="
        +
        encodeURIComponent(
            longitude +
            "," +
            latitude
        )
        +
        "&pt="
        +
        encodeURIComponent(
            longitude +
            "," +
            latitude
        )
        +
        "&z=17"
    );

}


/* =====================================================
   RENDER ORDERS
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
        document
            .getElementById(
                "searchInput"
            )
            .value
            .toLowerCase()
            .trim();


    table.innerHTML = "";


    const filtered =
        orders.filter(
            order => {

                const address =
                    String(
                        order.address || ""
                    ).toLowerCase();


                return address.includes(
                    search
                );

            }
        );


    empty.style.display =
        filtered.length
            ? "none"
            : "block";


    filtered.forEach(
        order => {

            const remaining =
                getRemainingTime(
                    order
                );


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
                            📍 Map
                        </a>
                    `
                    :
                    "—";


            let sourceClass =
                "source-other";


            if (
                order.source ===
                "Yandex"
            ) {

                sourceClass =
                    "source-yandex";

            }


            if (
                order.source ===
                "Murakami"
            ) {

                sourceClass =
                    "source-murakami";

            }


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <span
                        class="source-badge ${sourceClass}"
                    >
                        ${escapeHTML(
                            order.source || "Այլ"
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


            table.appendChild(row);

        }
    );

}


/* =====================================================
   HTML SECURITY
===================================================== */

function escapeHTML(value) {

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
   CURRENT TIME
===================================================== */

function getCurrentTime() {

    const now =
        new Date();


    return (
        String(
            now.getHours()
        ).padStart(2, "0")
        +
        ":"
        +
        String(
            now.getMinutes()
        ).padStart(2, "0")
    );

}


/* =====================================================
   AUTO UPDATE TIMER
===================================================== */

setInterval(
    () => {

        renderOrders();

    },
    1000
);


/* =====================================================
   START
===================================================== */

renderOrders();
