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


    document.getElementById(
        "orderId"
    ).value = "";


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


            const orderNumber =
                document
                    .getElementById(
                        "orderNumber"
                    )
                    .value
                    .trim();


            const address =
                document
                    .getElementById(
                        "address"
                    )
                    .value
                    .trim();


            const amount =
                Number(
                    document
                        .getElementById(
                            "amount"
                        )
                        .value
                );


            const preparationTime =
                Number(
                    document
                        .getElementById(
                            "preparationTime"
                        )
                        .value
                );


            const coordinates =
                document
                    .getElementById(
                        "coordinates"
                    )
                    .value
                    .trim();


            const note =
                document
                    .getElementById(
                        "note"
                    )
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

                    orderNumber,

                    address,

                    amount,

                    preparationTime,

                    coordinates,

                    note,

                    createdAt:
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



            order.orderNumber =
                orderNumber;

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


        order.createdAt =
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
            "orderId"
        )
        .value =
        order.id;


    document
        .getElementById(
            "orderNumber"
        )
        .value =
        order.orderNumber;


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
            `Ջնջե՞լ պատվեր #${order.orderNumber}`
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

                return (

                    String(
                        order.orderNumber
                    )
                        .toLowerCase()
                        .includes(search)

                    ||

                    order.address
                        .toLowerCase()
                        .includes(search)

                );

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



            const row =
                document.createElement(
                    "tr"
                );



            row.innerHTML = `

                


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
                    ${
                        order.coordinates
                            ?
                            escapeHTML(
                                order.coordinates
                            )
                            :
                            "—"
                    }
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
