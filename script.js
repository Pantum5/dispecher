let orders =
    JSON.parse(
        localStorage.getItem("dispatcherOrders")
    ) || [];


let editingOrderId = null;

let pendingEdit = null;


/* ========================================
   SAVE
======================================== */

function saveOrders() {

    localStorage.setItem(
        "dispatcherOrders",
        JSON.stringify(orders)
    );

}


/* ========================================
   OPEN NEW ORDER
======================================== */

function openOrderModal() {

    editingOrderId = null;

    document.getElementById(
        "modalTitle"
    ).textContent = "Նոր պատվեր";


    document
        .getElementById("orderForm")
        .reset();


    document.getElementById(
        "parseMessage"
    ).textContent = "";


    document.getElementById(
        "parseMessage"
    ).className = "parse-message";


    clearPreparationSelection();


    document
        .getElementById("orderModal")
        .classList.add("show");

}


/* ========================================
   CLOSE MODAL
======================================== */

function closeOrderModal() {

    document
        .getElementById("orderModal")
        .classList.remove("show");

    editingOrderId = null;

}


/* ========================================
   PREPARATION TIME
======================================== */

function selectPreparationTime(minutes) {

    document.getElementById(
        "preparationTime"
    ).value = minutes;


    document
        .querySelectorAll(".time-btn")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });


    const selectedButton =
        document.querySelector(
            `.time-btn[data-time="${minutes}"]`
        );


    if (selectedButton) {

        selectedButton.classList.add(
            "selected"
        );

    }

}


function clearPreparationSelection() {

    document.getElementById(
        "preparationTime"
    ).value = "";


    document
        .querySelectorAll(".time-btn")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });

}


/* ========================================
   PARSER - MAIN
======================================== */

function parseOrderText() {

    const rawText =
        document
            .getElementById("rawText")
            .value
            .trim();


    if (!rawText) {

        showParseMessage(
            "Տեղադրիր պատվերի ամբողջ տեքստը։",
            true
        );

        return;

    }


    let result = null;


    /*
        ԱՎՏՈՄԱՏ ՃԱՆԱՉՈՒՄ
    */

    if (isYandexOrder(rawText)) {

        result =
            parseYandexOrder(rawText);

    }

    else if (isMurakamiOrder(rawText)) {

        result =
            parseMurakamiOrder(rawText);

    }

    else if (isYerevanCityOrder(rawText)) {

        result =
            parseYerevanCityOrder(rawText);

    }


    if (!result) {

        showParseMessage(
            "Չհաջողվեց ճանաչել պատվերի աղբյուրը կամ անհրաժեշտ տվյալները։",
            true
        );

        return;

    }


    fillParsedData(result);


    showParseMessage(
        `${result.source} պատվերը ճանաչվեց։`,
        false
    );

}


/* ========================================
   SOURCE DETECTION
======================================== */

function isYandexOrder(text) {

    return (
        text.includes("РАБОТА С ЗАКАЗАМИ") ||
        text.includes("УПРАВЛЕНИЕ РЕСТОРАНАМИ") ||
        text.includes("Адрес доставки") &&
        text.includes("Доставка ресторана")
    );

}


function isMurakamiOrder(text) {

    return (
        text.includes("api.murakamicity.com") ||
        text.includes("Murakami City") &&
        text.includes("Processing") &&
        text.includes("Fulfillment")
    );

}


function isYerevanCityOrder(text) {

    return (
        text.includes("erp-admin.innodream.com") ||
        text.includes("Order Information") &&
        text.includes("Ստեղծած ամսաթիվ") &&
        text.includes("Առաքվող")
    );

}


/* ========================================
   YANDEX PARSER
======================================== */

function parseYandexOrder(text) {

    let createdTime = "";


    /*
        Օրինակ՝

        Создан в 23:32 24 авг.
    */

    const createdMatch =
        text.match(
            /Создан\s+в\s+(\d{1,2}:\d{2})/i
        );


    if (createdMatch) {

        createdTime =
            createdMatch[1];

    }


    /*
        Ընդհանուր գումար

        Նախընտրում ենք Итого:
    */

    let amount = 0;


    const totalMatch =
        text.match(
            /Итого:\s*[\n\r| ]*\**([\d\s\u00A0]+)\s*֏/i
        );


    if (totalMatch) {

        amount =
            parseMoney(
                totalMatch[1]
            );

    }


    /*
        Եթե Итого-ն չգտավ,
        վերցնում ենք սկզբի գումարը
    */

    if (!amount) {

        const fallbackAmount =
            text.match(
                /(?:№[^\n]*\n)?([\d\s\u00A0]+)\s*֏\s*[・·]\s*\d+\s*блюд/i
            );


        if (fallbackAmount) {

            amount =
                parseMoney(
                    fallbackAmount[1]
                );

        }

    }


    /*
        Հասցե

        Yandex-ի copy-paste-ում
        հասցեն գտնվում է Адрес доставки-ից հետո։
    */

    let address = "";


    const addressMatch =
        text.match(
            /Адрес доставки\s*\n+\s*(?:\[)?([^\n\]]+?)(?:\]\([^)]+\))?\s*\n/i
        );


    if (addressMatch) {

        address =
            cleanAddress(
                addressMatch[1]
            );

    }


    /*
        Կոորդինատներ

        URL-ում լինում է.

        whatshere[point]=44.50422,40.18407

        կամ

        pt=44.50422,40.18407
    */

    let coordinates =
        extractCoordinatesFromText(
            text
        );


    return {

        source:
            "Yandex",

        createdTime,

        amount,

        address,

        coordinates

    };

}


/* ========================================
   MURAKAMI PARSER
======================================== */

function parseMurakamiOrder(text) {

    let createdTime = "";


    /*
        AcceptedAug 24, 2026 23:07

        կամ

        Accepted
        Aug 24, 2026 23:07
    */

    const acceptedMatch =
        text.match(
            /Accepted\s*(?:Aug|Jan|Feb|Mar|Apr|May|Jun|Jul|Sep|Oct|Nov|Dec)?\s*\d{1,2},?\s*\d{4}\s+(\d{1,2}:\d{2})/i
        );


    if (acceptedMatch) {

        createdTime =
            acceptedMatch[1];

    }


    /*
        Երկրորդ fallback.

        Status history

        Accepted Aug 24, 2026 23:07
    */

    if (!createdTime) {

        const fallback =
            text.match(
                /Accepted[\s\S]{0,50}?(\d{1,2}:\d{2})/i
            );


        if (fallback) {

            createdTime =
                fallback[1];

        }

    }


    /*
        Total15,600 AMD
    */

    let amount = 0;


    const totalMatch =
        text.match(
            /Total\s*([\d\s,\.]+)\s*AMD/i
        );


    if (totalMatch) {

        amount =
            parseMoney(
                totalMatch[1]
            );

    }


    /*
        Address

        AddressԵրևան...
    */

    let address = "";


    const addressMatch =
        text.match(
            /Address\s+(.+?)(?=\s+Entrance|\s+Floor|\s+Apartment|\s+Phone)/i
        );


    if (addressMatch) {

        address =
            cleanAddress(
                addressMatch[1]
            );

    }


    /*
        Coordinates

        Yandex Map URL.

        pt=44.452579313869,40.199989784301

        Կարևոր է՝ URL-ում առաջինը longitude է,
        երկրորդը latitude։

        Ծրագրում պահում ենք latitude, longitude։
    */

    let coordinates =
        extractCoordinatesFromText(
            text
        );


    return {

        source:
            "Murakami",

        createdTime,

        amount,

        address,

        coordinates

    };

}


/* ========================================
   YEREVAN CITY PARSER
======================================== */

function parseYerevanCityOrder(text) {

    let createdTime = "";


    /*
        Ստեղծած ամսաթիվ :

        24 Aug 2026 20:54
    */

    const createdMatch =
        text.match(
            /Ստեղծած\s+ամսաթիվ\s*:?\s*\n?\s*\d{1,2}\s+\w+\s+\d{4}\s+(\d{1,2}:\d{2})/i
        );


    if (createdMatch) {

        createdTime =
            createdMatch[1];

    }


    /*
        Գումար

        Ընդհանուր:

        34 500֏
    */

    let amount = 0;


    const totalMatch =
        text.match(
            /Ընդհանուր\s*:?\s*\n?\s*([\d\s\u00A0]+)\s*֏/i
        );


    if (totalMatch) {

        amount =
            parseMoney(
                totalMatch[1]
            );

    }


    /*
        Առաքվող

        վերցնում ենք մինչև Ստեղծած ամսաթիվ
    */

    let address = "";


    const addressMatch =
        text.match(
            /Առաքվող\s*:?\s*\n?\s*(.+?)(?=\s+Ստեղծած\s+ամսաթիվ)/is
        );


    if (addressMatch) {

        address =
            cleanAddress(
                addressMatch[1]
            );

    }


    /*
        Այս copy-paste կառուցվածքում
        կոորդինատներ չկան։
    */

    let coordinates =
        extractCoordinatesFromText(
            text
        );


    return {

        source:
            "YerevanCity",

        createdTime,

        amount,

        address,

        coordinates

    };

}


/* ========================================
   COORDINATE EXTRACTION
======================================== */

function extractCoordinatesFromText(text) {

    /*
        Yandex:

        whatshere[point]=44.50422,40.18407

        Murakami:

        pt=44.452579313869,40.199989784301

        Navigator:

        lat_to=40.199989784301&lon_to=44.452579313869
    */


    let match =
        text.match(
            /(?:whatshere(?:%5B|\[)point(?:%5D|\])|pt)[=](-?\d+(?:\.\d+)?)[,%2C]+(-?\d+(?:\.\d+)?)/i
        );


    if (match) {

        const longitude =
            Number(match[1]);

        const latitude =
            Number(match[2]);


        if (
            isValidCoordinate(
                latitude,
                longitude
            )
        ) {

            return (
                latitude.toFixed(
                    6
                )
                +
                ", "
                +
                longitude.toFixed(
                    6
                )
            );

        }

    }


    /*
        Murakami Navigator fallback
    */

    const navigatorMatch =
        text.match(
            /lat_to=(-?\d+(?:\.\d+)?).*?lon_to=(-?\d+(?:\.\d+)?)/i
        );


    if (navigatorMatch) {

        const latitude =
            Number(
                navigatorMatch[1]
            );

        const longitude =
            Number(
                navigatorMatch[2]
            );


        if (
            isValidCoordinate(
                latitude,
                longitude
            )
        ) {

            return (
                latitude.toFixed(
                    6
                )
                +
                ", "
                +
                longitude.toFixed(
                    6
                )
            );

        }

    }


    return "";

}


/* ========================================
   VALID COORDINATES
======================================== */

function isValidCoordinate(
    latitude,
    longitude
) {

    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );

}


/* ========================================
   FILL PARSED DATA
======================================== */

function fillParsedData(data) {

    document.getElementById(
        "source"
    ).value =
        data.source || "";


    document.getElementById(
        "createdTime"
    ).value =
        data.createdTime || "";


    document.getElementById(
        "amount"
    ).value =
        data.amount || "";


    document.getElementById(
        "address"
    ).value =
        data.address || "";


    document.getElementById(
        "coordinates"
    ).value =
        data.coordinates || "";

}


/* ========================================
   MESSAGE
======================================== */

function showParseMessage(
    message,
    error
) {

    const element =
        document.getElementById(
            "parseMessage"
        );


    element.textContent =
        message;


    element.className =
        error
            ? "parse-message error"
            : "parse-message success";

}


/* ========================================
   MONEY
======================================== */

function parseMoney(value) {

    if (!value)
        return 0;


    const normalized =
        String(value)
            .replaceAll(
                "\u00A0",
                ""
            )
            .replaceAll(
                " ",
                ""
            )
            .replaceAll(
                ",",
                ""
            )
            .replaceAll(
                "֏",
                ""
            )
            .replaceAll(
                "AMD",
                ""
            );


    const number =
        Number(
            normalized
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


/* ========================================
   ADDRESS CLEAN
======================================== */

function cleanAddress(value) {

    if (!value)
        return "";


    return String(value)

        .replace(
            /^\[|\]$/g,
            ""
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


/* ========================================
   FORM SUBMIT
======================================== */

document
    .getElementById("orderForm")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const source =
                document
                    .getElementById("source")
                    .value
                    .trim();


            const createdTime =
                document
                    .getElementById("createdTime")
                    .value;


            const amount =
                Number(
                    document
                        .getElementById("amount")
                        .value
                );


            const address =
                document
                    .getElementById("address")
                    .value
                    .trim();


            const coordinates =
                document
                    .getElementById("coordinates")
                    .value
                    .trim();


            const preparationTime =
                Number(
                    document
                        .getElementById(
                            "preparationTime"
                        )
                        .value
                );


            if (!source) {

                alert(
                    "Սկզբում ճանաչիր պատվերը։"
                );

                return;

            }


            if (!preparationTime) {

                alert(
                    "Ընտրիր պատրաստման ժամանակը։"
                );

                return;

            }


            /*
                ՆՈՐ ՊԱՏՎԵՐ
            */

            if (!editingOrderId) {

                const now =
                    Date.now();


                const newOrder = {

                    id:
                        crypto.randomUUID(),

                    source,

                    createdTime,

                    amount,

                    address,

                    coordinates,

                    preparationTime,

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


                orders.push(
                    newOrder
                );


                saveOrders();

                closeOrderModal();

                renderOrders();

                return;

            }


            /*
                ԽՄԲԱԳՐՈՒՄ
            */

            const order =
                orders.find(
                    item =>
                        item.id ===
                        editingOrderId
                );


            if (!order)
                return;


            const oldPreparationTime =
                order.preparationTime;


            const changedPreparationTime =
                oldPreparationTime !==
                preparationTime;


            order.source =
                source;

            order.createdTime =
                createdTime;

            order.amount =
                amount;

            order.address =
                address;

            order.coordinates =
                coordinates;

            order.preparationTime =
                preparationTime;


            if (
                changedPreparationTime
            ) {

                pendingEdit = {

                    order,

                    newPreparationTime:
                        preparationTime

                };


                document
                    .getElementById(
                        "confirmModal"
                    )
                    .classList.add(
                        "show"
                    );


                return;

            }


            saveOrders();

            closeOrderModal();

            renderOrders();

        }
    );


/* ========================================
   FINISH EDIT
======================================== */

function finishEdit(
    restartTimer
) {

    if (!pendingEdit)
        return;


    const order =
        pendingEdit.order;


    const newTime =
        pendingEdit
            .newPreparationTime;


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
        .classList.remove(
            "show"
        );


    pendingEdit =
        null;


    closeOrderModal();

    renderOrders();

}


/* ========================================
   EDIT ORDER
======================================== */

function editOrder(id) {

    const order =
        orders.find(
            item =>
                item.id === id
        );


    if (!order)
        return;


    editingOrderId =
        id;


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Փոփոխել պատվերը";


    document.getElementById(
        "rawText"
    ).value = "";


    document.getElementById(
        "source"
    ).value =
        order.source || "";


    document.getElementById(
        "createdTime"
    ).value =
        order.createdTime || "";


    document.getElementById(
        "amount"
    ).value =
        order.amount || "";


    document.getElementById(
        "address"
    ).value =
        order.address || "";


    document.getElementById(
        "coordinates"
    ).value =
        order.coordinates || "";


    selectPreparationTime(
        order.preparationTime
    );


    document
        .getElementById(
            "orderModal"
        )
        .classList.add(
            "show"
        );

}


/* ========================================
   COMPLETE
======================================== */

function completeOrder(id) {

    const order =
        orders.find(
            item =>
                item.id === id
        );


    if (!order)
        return;


    order.status =
        "completed";


    saveOrders();

    renderOrders();

}


/* ========================================
   DELETE
======================================== */

function deleteOrder(id) {

    const confirmed =
        confirm(
            "Ջնջե՞լ այս պատվերը։"
        );


    if (!confirmed)
        return;


    orders =
        orders.filter(
            item =>
                item.id !== id
        );


    saveOrders();

    renderOrders();

}


/* ========================================
   MOVE ORDER
======================================== */

function moveOrder(
    id,
    direction
) {

    const index =
        orders.findIndex(
            order =>
                order.id === id
        );


    if (index === -1)
        return;


    const newIndex =
        index + direction;


    if (
        newIndex < 0 ||
        newIndex >= orders.length
    ) {

        return;

    }


    const temp =
        orders[index];


    orders[index] =
        orders[newIndex];


    orders[newIndex] =
        temp;


    saveOrders();

    renderOrders();

}


/* ========================================
   REMAINING TIME
======================================== */

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


/* ========================================
   FORMAT TIMER
======================================== */

function formatTime(
    milliseconds
) {

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
        String(minutes)
            .padStart(
                2,
                "0"
            )
        +
        ":"
        +
        String(seconds)
            .padStart(
                2,
                "0"
            )
    );

}


/* ========================================
   YANDEX MAP
======================================== */

function getYandexMapLink(
    coordinates
) {

    if (!coordinates)
        return null;


    const parts =
        coordinates
            .split(",")
            .map(
                item =>
                    item.trim()
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
        !isValidCoordinate(
            latitude,
            longitude
        )
    ) {

        return null;

    }


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


/* ========================================
   RENDER
======================================== */

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
            order => {

                const address =
                    String(
                        order.address || ""
                    )
                        .toLowerCase();


                const source =
                    String(
                        order.source || ""
                    )
                        .toLowerCase();


                return (
                    address.includes(search) ||
                    source.includes(search)
                );

            }
        );


    if (
        filteredOrders.length === 0
    ) {

        empty.style.display =
            "block";

    }

    else {

        empty.style.display =
            "none";

    }


    filteredOrders.forEach(
        (order, visibleIndex) => {

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


            /*
                TIMER
            */

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


            /*
                MAP
            */

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


            /*
                ROW
            */

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        order.createdTime ||
                        "—"
                    )}
                </td>


                <td>
                    <span class="source-badge">
                        ${escapeHTML(
                            order.source ||
                            "—"
                        )}
                    </span>
                </td>


                <td>
                    ${escapeHTML(
                        order.address ||
                        "—"
                    )}
                </td>


                <td>
                    ${Number(
                        order.amount ||
                        0
                    ).toLocaleString(
                        "hy-AM"
                    )}
                    ֏
                </td>


                <td>
                    ${Number(
                        order.preparationTime ||
                        0
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
                                move-btn
                            "
                            onclick="
                                moveOrder(
                                    '${order.id}',
                                    -1
                                )
                            "
                            title="Վերև"
                        >
                            ↑
                        </button>


                        <button
                            class="
                                action-btn
                                move-btn
                            "
                            onclick="
                                moveOrder(
                                    '${order.id}',
                                    1
                                )
                            "
                            title="Ներքև"
                        >
                            ↓
                        </button>


                        <button
                            class="
                                action-btn
                                edit-btn
                            "
                            onclick="
                                editOrder(
                                    '${order.id}'
                                )
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
                                    completeOrder(
                                        '${order.id}'
                                    )
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


/* ========================================
   HTML SECURITY
======================================== */

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


/* ========================================
   AUTO TIMER UPDATE
======================================== */

setInterval(
    () => {

        renderOrders();

    },
    1000
);


/* ========================================
   INITIAL
======================================== */

renderOrders();
