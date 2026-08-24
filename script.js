let orders =
    JSON.parse(
        localStorage.getItem("orders")
    ) || [];


let editingOrderId = null;

let pendingEdit = null;



// ========================================
// ՊԱՀՊԱՆԵԼ ՏՎՅԱԼՆԵՐԸ
// ========================================

function saveOrders() {

    localStorage.setItem(
        "orders",
        JSON.stringify(orders)
    );

}



// ========================================
// ՆՈՐ ՊԱՏՎԵՐ
// ========================================

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



// ========================================
// ՓԱԿԵԼ ՊԱՏՈՒՀԱՆԸ
// ========================================

function closeOrderModal() {

    document
        .getElementById("orderModal")
        .classList.remove("show");

    editingOrderId = null;

}



// ========================================
// ԱՎԵԼԱՑՆԵԼ / ՓՈՓՈԽԵԼ
// ========================================

document
    .getElementById("orderForm")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


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



            // ========================================
            // ՆՈՐ ՊԱՏՎԵՐ
            // ========================================

            if (!editingOrderId) {

                const now =
                    Date.now();


                const newOrder = {

                    id:
                        crypto.randomUUID(),

                    createdTime,

                    address,

                    amount,

                    preparationTime,

                    coordinates,

                    note,

                    // Timer-ի իրական մեկնարկի պահը
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



            // ========================================
            // ՓՈՓՈԽԵԼ ՊԱՏՎԵՐ
            // ========================================

            const order =
                orders.find(
                    o =>
                        o.id ===
                        editingOrderId
                );


            if (!order) return;


            const oldPreparationTime =
                order.preparationTime;


            const changedPreparationTime =
                oldPreparationTime !==
                preparationTime;



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



            // Եթե փոխվել է պատրաստման ժամանակը

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



// ========================================
// ՓՈՓՈԽՄԱՆ ՀԱՍՏԱՏՈՒՄ
// ========================================

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


    closeOrderModal();


    pendingEdit =
        null;


    renderOrders();

}



// ========================================
// ԽՄԲԱԳՐԵԼ ՊԱՏՎԵՐԸ
// ========================================

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


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
        "Փոփոխել պատվերը";



    document
        .getElementById(
            "createdTime"
        )
        .value =
        order.createdTime || "";


    document
        .getElementById(
            "address"
        )
        .value =
        order.address;


    document
        .getElementById(
            "amount"
        )
        .value =
        order.amount;


    document
        .getElementById(
            "preparationTime"
        )
        .value =
        order.preparationTime;


    document
        .getElementById(
            "coordinates"
        )
        .value =
        order.coordinates || "";


    document
        .getElementById(
            "note"
        )
        .value =
        order.note || "";


    document
        .getElementById(
            "orderModal"
        )
        .classList.add(
            "show"
        );

}



// ========================================
// ԱՎԱՐՏԵԼ ՊԱՏՎԵՐԸ
// ========================================

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



// ========================================
// ՋՆՋԵԼ ՊԱՏՎԵՐԸ
// ========================================

function deleteOrder(id) {

    const order =
        orders.find(
            o =>
                o.id === id
        );


    if (!order)
        return;


    const confirmed =
        confirm(
            "Ջնջե՞լ այս պատվերը"
        );


    if (!confirmed)
        return;


    orders =
        orders.filter(
            o =>
                o.id !== id
        );


    saveOrders();

    renderOrders();

}



// ========================================
// ՄՆԱՑԱԾ ԺԱՄԱՆԱԿ
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
// ԺԱՄԱՆԱԿԻ ՁԵՎԱՉԱՓ
// ========================================

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



// ========================================
// YANDEX MAP
// ========================================

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
        "https://yandex.com/maps/?ll=" +
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
// ՊԱՏՎԵՐՆԵՐԻ ՑՈՒՑԱԴՐՈՒՄ
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

                return String(
                    order.address
                )
                    .toLowerCase()
                    .includes(search);

            }
        );



    if (
        filteredOrders.length === 0
    ) {

        empty.style.display =
            "block";

    } else {

        empty.style.display =
            "none";

    }



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



            // ========================================
            // TIMER
            // ========================================

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



            // ========================================
            // MAP
            // ========================================

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



            // ========================================
            // ROW
            // ========================================

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        order.createdTime || "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        order.address
                    )}
                </td>


                <td>
                    ${Number(
                        order.amount
                    ).toLocaleString(
                        "hy-AM"
                    )}
                    ֏
                </td>


                <td>
                    ${order.preparationTime}
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



    updateStats();

}



// ========================================
// ՎԻՃԱԿԱԳՐՈՒԹՅՈՒՆ
// ========================================

function updateStats() {

    const total =
        orders.length;


    const active =
        orders.filter(
            o =>
                o.status ===
                "preparing"
        ).length;


    const ready =
        orders.filter(
            o =>
                o.status ===
                "ready"
        ).length;


    const amount =
        orders.reduce(
            (
                sum,
                order
            ) =>
                sum +
                Number(
                    order.amount ||
                    0
                ),
            0
        );



    document.getElementById(
        "totalOrders"
    ).textContent =
        total;


    document.getElementById(
        "activeOrders"
    ).textContent =
        active;


    document.getElementById(
        "readyOrders"
    ).textContent =
        ready;


    document.getElementById(
        "totalAmount"
    ).textContent =
        amount.toLocaleString(
            "hy-AM"
        )
        +
        " ֏";

}



// ========================================
// HTML ԱՆՎՏԱՆԳՈՒԹՅՈՒՆ
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
// ԱՎՏՈՄԱՏ ԹԱՐՄԱՑՈՒՄ
// ========================================

setInterval(
    () => {

        renderOrders();

    },
    1000
);



// ========================================
// ՍԿԶԲՆԱԿԱՆ ԲԱՑՈՒՄ
// ========================================

renderOrders();
