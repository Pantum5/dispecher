let orders =
    JSON.parse(localStorage.getItem("orders")) || [];

let editingOrderId = null;
let pendingEdit = null;

let parsedOrder = null;
let selectedPreparationTime = null;


// ========================================
// SAVE
// ========================================

function saveOrders() {
    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );
}


// ========================================
// MANUAL ORDER
// ========================================

function openOrderModal() {

    editingOrderId = null;

    document.getElementById("modalTitle").textContent =
        "Նոր պատվեր";

    document.getElementById("orderForm").reset();

    document.getElementById("source").value =
        "Yandex";

    document.getElementById("orderModal")
        .classList.add("show");
}


function closeOrderModal() {

    document.getElementById("orderModal")
        .classList.remove("show");

    editingOrderId = null;
}


// ========================================
// MANUAL SAVE
// ========================================

document.getElementById("orderForm")
.addEventListener("submit", function(event) {

    event.preventDefault();

    const source =
        document.getElementById("source").value;

    const createdTime =
        document.getElementById("createdTime").value;

    const address =
        document.getElementById("address")
        .value
        .trim();

    const amount =
        Number(
            document.getElementById("amount").value
        );

    const coordinates =
        document.getElementById("coordinates")
        .value
        .trim();

    const note =
        document.getElementById("note")
        .value
        .trim();


    // MANUAL ORDER ALWAYS STARTS WITH 30 MINUTES
    // User can edit it afterwards.

    const preparationTime = 30;

    if (!editingOrderId) {

        const now = Date.now();

        orders.push({

            id: crypto.randomUUID(),

            source,
            createdTime,
            address,
            amount,
            coordinates,
            note,

            preparationTime,

            timerStartedAt: now,

            readyAt:
                now +
                preparationTime * 60 * 1000,

            status: "preparing"

        });

    } else {

        const order =
            orders.find(
                o => o.id === editingOrderId
            );

        if (!order) return;

        const oldPreparationTime =
            order.preparationTime;

        const changedPreparationTime =
            oldPreparationTime !== preparationTime;


        order.source = source;
        order.createdTime = createdTime;
        order.address = address;
        order.amount = amount;
        order.coordinates = coordinates;
        order.note = note;
        order.preparationTime = preparationTime;


        if (changedPreparationTime) {

            pendingEdit = {

                order,
                newPreparationTime:
                    preparationTime

            };

            document.getElementById("confirmModal")
                .classList.add("show");

            return;
        }
    }

    saveOrders();

    closeOrderModal();

    renderOrders();
});


// ========================================
// TEXT MODAL
// ========================================

function openTextModal() {

    document.getElementById("orderText").value = "";

    document.getElementById("parseError").textContent = "";

    document.getElementById("textModal")
        .classList.add("show");
}


function closeTextModal() {

    document.getElementById("textModal")
        .classList.remove("show");
}


// ========================================
// PARSER HELPERS
// ========================================

function normalizeText(text) {

    return text
        .replace(/\u00A0/g, " ")
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .trim();
}


function parseMoney(value) {

    if (!value) return null;

    const digits =
        value.replace(/[^\d]/g, "");

    if (!digits) return null;

    return Number(digits);
}


function normalizeCoordinates(lat, lon) {

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return "";
    }

    return `${latitude}, ${longitude}`;
}


// ========================================
// YANDEX PARSER
// ========================================

function parseYandex(text) {

    const result = {

        source: "Yandex",

        createdTime: "",

        amount: null,

        address: "",

        coordinates: ""

    };


    /*
        CREATION TIME

        Օրինակ.

        Создан в 0:33
        Создан в 23:32 24 авг.
    */

    const timeMatch =
        text.match(
            /Создан\s+в\s+(\d{1,2}:\d{2})/i
        );

    if (timeMatch) {

        result.createdTime =
            timeMatch[1]
                .padStart(5, "0");

    }


    /*
        ADDRESS

        Վերցնում ենք հենց
        "Адрес доставки"-ից հետո եկած
        առաջին իմաստալից տողը։

        Չենք վերցնում квартира,
        подъезд,
        этаж և այլն։
    */

    const addressMatch =
        text.match(
            /Адрес доставки\s*\n?\s*([^\n]+)/i
        );

    if (addressMatch) {

        let address =
            addressMatch[1].trim();

        address =
            address
                .replace(/^\[|\]$/g, "")
                .trim();

        /*
            Եթե markdown link է,
            վերցնում ենք նրա text-ը։
        */

        const markdownMatch =
            address.match(
                /^\[([^\]]+)\]/
            );

        if (markdownMatch) {

            address =
                markdownMatch[1].trim();

        }

        /*
            Հեռացնում ենք URL-ը,
            եթե մնացել է։
        */

        address =
            address
                .replace(
                    /\(https?:\/\/[^)]+\)/gi,
                    ""
                )
                .trim();

        result.address = address;
    }


    /*
        COORDINATES

        Yandex link-ի օրինակ.

        whatshere[point]=44.50422,40.18407

        կամ

        pt=44.50422,40.18407
    */

    let coordinateMatch =
        text.match(
            /whatshere%5Bpoint%5D=([-\d.]+)%2C([-\d.]+)/i
        );

    if (!coordinateMatch) {

        coordinateMatch =
            text.match(
                /whatshere\[point\]=([-\d.]+),([-\d.]+)/i
            );

    }

    if (!coordinateMatch) {

        coordinateMatch =
            text.match(
                /[?&]pt=([-\d.]+),([-\d.]+)/i
            );

    }

    if (coordinateMatch) {

        /*
            Yandex link-ում գալիս է

            longitude, latitude

            իսկ մեր համակարգում պահում ենք

            latitude, longitude
        */

        result.coordinates =
            normalizeCoordinates(
                coordinateMatch[2],
                coordinateMatch[1]
            );
    }


    /*
        TOTAL

        Շատ կարևոր.

        Չենք վերցնում առաջին հանդիպած գումարը։

        Փնտրում ենք "Итого:"-ից հետո
        եկող գումարը։
    */

    const totalMatch =
        text.match(
            /Итого:\s*[\s\S]{0,100}?([\d\s\u00A0]+)\s*֏/i
        );

    if (totalMatch) {

        result.amount =
            parseMoney(
                totalMatch[1]
            );

    } else {

        /*
            Backup տարբերակ.

            Փնտրում ենք այն տողը,
            որտեղ առանձին կա
            գումար + ֏,
            բայց միայն վերջի հատվածում։
        */

        const moneyMatches =
            [...text.matchAll(
                /([\d][\d\s\u00A0]*)\s*֏/g
            )];

        if (moneyMatches.length) {

            const last =
                moneyMatches[
                    moneyMatches.length - 1
                ];

            result.amount =
                parseMoney(last[1]);

        }
    }


    return result;
}


// ========================================
// MURAKAMI PARSER
// ========================================

function parseMurakami(text) {

    const result = {

        source: "Murakami",

        createdTime: "",

        amount: null,

        address: "",

        coordinates: ""

    };


    /*
        ACCEPTED

        Accepted
        Aug 24, 2026 23:07
    */

    const acceptedMatch =
        text.match(
            /Accepted\s+([A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+(\d{1,2}:\d{2}))/i
        );

    if (acceptedMatch) {

        result.createdTime =
            acceptedMatch[2]
                .padStart(5, "0");

    }


    /*
        ADDRESS

        Murakami-ի դեպքում փնտրում ենք.

        AddressԵրևան, ...
    */

    const addressMatch =
        text.match(
            /Address\s+(.+?)(?=\s+Entrance|\s+Floor|\s+Apartment|\s+Phone|\s+Yandex Map|\s+Order note)/i
        );

    if (addressMatch) {

        result.address =
            addressMatch[1].trim();

    }


    /*
        COORDINATES

        Murakami Yandex Map.

        pt=44.452579313869,40.199989784301

        Նույնը կարող է լինել
        ցանկացած Yandex map link-ում։
    */

    let coordinateMatch =
        text.match(
            /[?&]pt=([-\d.]+),([-\d.]+)/i
        );


    if (!coordinateMatch) {

        coordinateMatch =
            text.match(
                /[?&]ll=([-\d.]+),([-\d.]+)/i
            );

    }


    if (coordinateMatch) {

        result.coordinates =
            normalizeCoordinates(
                coordinateMatch[2],
                coordinateMatch[1]
            );

    }


    /*
        TOTAL

        Murakami-ի համար հատուկ վերցնում ենք

        Total 15,600 AMD

        կամ

        Total15,600 AMD
    */

    const totalMatch =
        text.match(
            /Total\s*([\d\s\u00A0,]+)\s*AMD/i
        );


    if (totalMatch) {

        result.amount =
            parseMoney(
                totalMatch[1]
            );

    }


    return result;
}


// ========================================
// YEREVAN CITY PARSER
// ========================================

function parseYerevanCity(text) {

    const result = {

        source: "Yerevan City",

        createdTime: "",

        amount: null,

        address: "",

        coordinates: ""

    };


    /*
        Ստեղծման ամսաթիվ

        24 Aug 2026 20:54
    */

    const createdMatch =
        text.match(
            /Ստեղծած ամսաթիվ\s*:?\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+(\d{1,2}:\d{2}))/i
        );


    if (createdMatch) {

        result.createdTime =
            createdMatch[2]
                .padStart(5, "0");

    }


    /*
        Առաքվող:

        Yerevan, Yerevan, ...
    */

    const addressMatch =
        text.match(
            /Առաքվող:\s*([\s\S]*?)(?=\s+Ստեղծած ամսաթիվ)/i
        );


    if (addressMatch) {

        result.address =
            addressMatch[1]
                .trim();

    }


    /*
        Ընդհանուր
    */

    const totalMatch =
        text.match(
            /Ընդհանուր:\s*([\d\s\u00A0]+)֏/i
        );


    if (totalMatch) {

        result.amount =
            parseMoney(
                totalMatch[1]
            );

    }


    /*
        Yandex Map coordinates
    */

    const coordinateMatch =
        text.match(
            /[?&]pt=([-\d.]+),([-\d.]+)/i
        );


    if (coordinateMatch) {

        result.coordinates =
            normalizeCoordinates(
                coordinateMatch[2],
                coordinateMatch[1]
            );

    }


    return result;
}


// ========================================
// PARSE ORDER TEXT
// ========================================

function parseOrderText() {

    const source =
        document.getElementById(
            "textSource"
        ).value;


    const rawText =
        document.getElementById(
            "orderText"
        ).value;


    const error =
        document.getElementById(
            "parseError"
        );


    error.textContent = "";


    if (!rawText.trim()) {

        error.textContent =
            "Տեղադրիր պատվերի Text-ը։";

        return;
    }


    const text =
        normalizeText(rawText);


    if (source === "Yandex") {

        parsedOrder =
            parseYandex(text);

    }

    else if (source === "Murakami") {

        parsedOrder =
            parseMurakami(text);

    }

    else if (source === "Yerevan City") {

        parsedOrder =
            parseYerevanCity(text);

    }


    /*
        Ստուգում ենք,
        որ գոնե հիմնական տվյալներից
        ինչ-որ բան գտնվել է։
    */

    if (
        !parsedOrder.createdTime &&
        !parsedOrder.amount &&
        !parsedOrder.address
    ) {

        error.textContent =
            "Պատվերի տվյալները չճանաչվեցին։ Ստուգիր աղբյուրը և Text-ը։";

        parsedOrder = null;

        return;
    }


    showParsedOrder();
}


// ========================================
// SHOW PARSED ORDER
// ========================================

function showParsedOrder() {

    document.getElementById("parsedSource")
        .textContent =
        parsedOrder.source || "—";


    document.getElementById("parsedTime")
        .textContent =
        parsedOrder.createdTime || "—";


    document.getElementById("parsedAmount")
        .textContent =
        parsedOrder.amount !== null
            ?
            parsedOrder.amount.toLocaleString("hy-AM") + " ֏"
            :
            "—";


    document.getElementById("parsedAddress")
        .textContent =
        parsedOrder.address || "—";


    document.getElementById("parsedCoordinates")
        .textContent =
        parsedOrder.coordinates || "—";


    selectedPreparationTime = null;


    document.querySelectorAll(
        ".prep-buttons button"
    ).forEach(button => {

        button.classList.remove(
            "selected"
        );

    });


    closeTextModal();


    document.getElementById("parsedModal")
        .classList.add("show");
}


// ========================================
// PREPARATION TIME
// ========================================

function selectPreparation(minutes) {

    selectedPreparationTime =
        minutes;


    document.querySelectorAll(
        ".prep-buttons button"
    ).forEach(button => {

        button.classList.remove(
            "selected"
        );

    });


    const buttons =
        document.querySelectorAll(
            ".prep-buttons button"
        );


    buttons.forEach(button => {

        if (
            button.textContent
                .includes(String(minutes))
        ) {

            button.classList.add(
                "selected"
            );

        }

    });
}


// ========================================
// CREATE PARSED ORDER
// ========================================

function createParsedOrder() {

    if (!parsedOrder) return;


    if (!selectedPreparationTime) {

        alert(
            "Ընտրիր պատվերի պատրաստման ժամանակը։"
        );

        return;
    }


    const now =
        Date.now();


    const newOrder = {

        id:
            crypto.randomUUID(),

        source:
            parsedOrder.source,

        createdTime:
            parsedOrder.createdTime,

        address:
            parsedOrder.address,

        amount:
            parsedOrder.amount || 0,

        coordinates:
            parsedOrder.coordinates,

        note: "",

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


    closeParsedModal();


    parsedOrder = null;


    renderOrders();
}


// ========================================
// CLOSE PARSED
// ========================================

function closeParsedModal() {

    document.getElementById("parsedModal")
        .classList.remove("show");

}


// ========================================
// EDIT ORDER
// ========================================

function editOrder(id) {

    const order =
        orders.find(
            o => o.id === id
        );


    if (!order) return;


    editingOrderId =
        id;


    document.getElementById("modalTitle")
        .textContent =
        "Փոփոխել պատվերը";


    document.getElementById("source")
        .value =
        order.source || "Yandex";


    document.getElementById("createdTime")
        .value =
        order.createdTime || "";


    document.getElementById("address")
        .value =
        order.address || "";


    document.getElementById("amount")
        .value =
        order.amount || "";


    document.getElementById("coordinates")
        .value =
        order.coordinates || "";


    document.getElementById("note")
        .value =
        order.note || "";


    document.getElementById("orderModal")
        .classList.add("show");
}


// ========================================
// COMPLETE
// ========================================

function completeOrder(id) {

    const order =
        orders.find(
            o => o.id === id
        );


    if (!order) return;


    order.status =
        "completed";


    saveOrders();

    renderOrders();
}


// ========================================
// DELETE
// ========================================

function deleteOrder(id) {

    const confirmed =
        confirm(
            "Ջնջե՞լ այս պատվերը"
        );


    if (!confirmed) return;


    orders =
        orders.filter(
            o => o.id !== id
        );


    saveOrders();

    renderOrders();
}


// ========================================
// REMAINING TIME
// ========================================

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


// ========================================
// FORMAT TIME
// ========================================

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


// ========================================
// YANDEX MAP
// ========================================

function getYandexMapLink(coordinates) {

    if (!coordinates) return null;


    const parts =
        coordinates
            .split(",")
            .map(
                value =>
                    value.trim()
            );


    if (parts.length !== 2) {
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


// ========================================
// RENDER
// ========================================

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
        orders.filter(order => {

            return (
                String(order.address || "")
                    .toLowerCase()
                    .includes(search)
            );

        });


    empty.style.display =
        filteredOrders.length === 0
            ? "block"
            : "none";


    filteredOrders.forEach(order => {

        const remaining =
            getRemainingTime(order);


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
                        Map
                    </a>
                `
                :
                "—";


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <span class="source-badge">
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
                        onclick="
                            editOrder('${order.id}')
                        "
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
                            onclick="
                                completeOrder('${order.id}')
                            "
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
                        onclick="
                            deleteOrder('${order.id}')
                        "
                        title="Ջնջել"
                    >
                        🗑️
                    </button>

                </div>

            </td>

        `;


        table.appendChild(row);

    });
}


// ========================================
// ESCAPE HTML
// ========================================

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


// ========================================
// TIMER CONFIRM
// ========================================

function finishEdit(restartTimer) {

    if (!pendingEdit) return;


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


    document.getElementById("confirmModal")
        .classList.remove("show");


    closeOrderModal();


    pendingEdit =
        null;


    renderOrders();
}


// ========================================
// START
// ========================================

setInterval(
    () => {
        renderOrders();
    },
    1000
);


renderOrders();
