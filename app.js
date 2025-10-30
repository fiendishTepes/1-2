// app.js

const LS_KEY = 'khalngKruengSales';
let salesData = []; // Array สำหรับเก็บข้อมูลยอดขายทั้งหมด

// โหลดข้อมูลจาก LocalStorage
function loadSalesData() {
    const data = localStorage.getItem(LS_KEY);
    salesData = data ? JSON.parse(data) : [];
    // เรียงข้อมูลตามวันที่จากเก่าไปใหม่
    salesData.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// บันทึกข้อมูลลง LocalStorage
function saveSalesData() {
    localStorage.setItem(LS_KEY, JSON.stringify(salesData));
}

// ----------------------------------------------------------------------
// หลักการคำนวณ: เงินเข้าบัญชีและยอดคงเหลือ (ปรับปรุงแล้ว)
// ----------------------------------------------------------------------

/**
 * คำนวณยอดเงินเข้าบัญชีจริงในแต่ละวัน 
 * @param {Array} data - ข้อมูลยอดขายทั้งหมด (ต้องเรียงตามวันที่)
 * @returns {Array} - ข้อมูลยอดขายพร้อมการคำนวณเงินเข้า
 */
function calculatePayments(data) {
    if (data.length === 0) return [];

    let calculatedData = [];

    data.forEach((sale, index) => {
        const dailySale = parseFloat(sale.amount);
        // 50% แรกที่จะเข้าในวันถัดไป
        const nextDayPayment = dailySale / 2; 
        // 50% ที่สอง (ยอดคงเหลือ) ที่จะถูกทบไปจ่ายในวันมะรืน
        const currentRemaining = dailySale / 2; 

        sale.nextDayPayment = nextDayPayment;
        sale.remainingBalance = currentRemaining;
        
        let actualPaymentToday = 0;

        // **คำนวณยอดเงินเข้าบัญชีจริงในวันนี้ (T)**
        // ยอดเข้าบัญชีวันนี้ (T) = 50% ของยอดขาย (T-1) + ยอดคงเหลือ 50% ของ (T-2)
        
        // ข้อมูลของ 'เมื่อวาน' (T-1)
        const yesterdayData = data[index - 1]; 
        
        // ข้อมูลของ 'วันก่อนหน้าเมื่อวาน' (T-2)
        const dayBeforeYesterdayData = data[index - 2]; 

        if (yesterdayData) {
            // 1. ยอดเงิน 50% แรกจากยอดขายของ T-1
            const paymentFromYesterday = yesterdayData.nextDayPayment;
            actualPaymentToday += paymentFromYesterday;
        }

        if (dayBeforeYesterdayData) {
            // 2. ยอดเงิน 50% ที่เหลือจากยอดขายของ T-2 (ซึ่งคือ T-2.remainingBalance)
            const remainingFromDayBefore = dayBeforeYesterdayData.remainingBalance;
            actualPaymentToday += remainingFromDayBefore;
        }

        sale.actualPaymentToday = actualPaymentToday;

        if (sale.isReceived === undefined) {
             sale.isReceived = false; 
        }

        calculatedData.push(sale);
    });

    return calculatedData;
}


// ----------------------------------------------------------------------
// ฟังก์ชันการจัดการ UI และ Event Listeners (ไม่เปลี่ยนแปลง)
// ----------------------------------------------------------------------

// สร้าง Option สำหรับ Month Selector
function populateMonthSelector() {
    const selector = document.getElementById('monthSelector');
    selector.innerHTML = ''; 

    const uniqueMonths = [...new Set(salesData.map(sale => sale.date.substring(0, 7)))];
    uniqueMonths.sort().reverse(); 

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'แสดงทั้งหมด';
    selector.appendChild(allOption);

    uniqueMonths.forEach(monthYear => {
        const option = document.createElement('option');
        option.value = monthYear;
        const [year, month] = monthYear.split('-');
        option.textContent = `${getMonthName(parseInt(month))} ${year}`;
        selector.appendChild(option);
    });

    if (uniqueMonths.length > 0 && selector.value !== 'all') {
        selector.value = uniqueMonths[0];
    } 
}

// แปลงตัวเลขเดือนเป็นชื่อเดือนภาษาไทย
function getMonthName(monthNumber) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return months[monthNumber - 1];
}

// แสดงข้อมูลในตาราง
function displaySalesData() {
    const tableBody = document.getElementById('saleTableBody');
    const monthSelector = document.getElementById('monthSelector');
    const selectedMonth = monthSelector.value;
    
    const calculatedData = calculatePayments(salesData);

    const filteredData = calculatedData.filter(sale => {
        if (selectedMonth === 'all') return true;
        return sale.date.startsWith(selectedMonth);
    });
    
    tableBody.innerHTML = ''; 
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4">ไม่พบข้อมูลในเดือนนี้</td></tr>';
        document.getElementById('currentMonthYear').textContent = '';
        return;
    }
    
    const monthYearText = (selectedMonth === 'all' ? 'ทั้งหมด' : 
        selectedMonth.includes('-') ? `${getMonthName(parseInt(selectedMonth.split('-')[1]))} ${selectedMonth.split('-')[0]}` : '');
    document.getElementById('currentMonthYear').textContent = monthYearText;


    filteredData.forEach((sale, index) => {
        const originalIndex = salesData.findIndex(d => d.date === sale.date);
        
        // สถานะและคลาสสำหรับปุ่ม Toggle
        const statusClass = sale.isReceived ? 'status-received' : 'status-pending';
        const statusText = sale.isReceived ? '✅ เข้าแล้ว' : '⚠️ ยังไม่เข้า'; 

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td data-label="วันที่">${formatDate(sale.date)}</td>
            <td data-label="ยอดขาย (บ.)">${sale.amount.toFixed(2)}</td>
            <td data-label="เงินเข้าวันถัดไป (บ.)">${sale.nextDayPayment.toFixed(2)}</td>
            <td data-label="เหลือในระบบ (บ.)">${sale.remainingBalance.toFixed(2)}</td>
            <td data-label="ยอดเข้าบัญชีจริง (บ.)"><strong>${sale.actualPaymentToday.toFixed(2)}</strong></td>
            
            <td data-label="สถานะเข้าบัญชี" class="${statusClass}">
                ${sale.actualPaymentToday > 0 ? 
                    `<button class="btn btn-sm ${sale.isReceived ? 'btn-success' : 'btn-warning'}" 
                             onclick="toggleReceivedStatus(${originalIndex})">
                        ${statusText}
                    </button>` : '<span class="text-muted">N/A</span>'
                }
            </td>
            
            <td data-label="เครื่องมือ">
                <button class="btn btn-sm btn-info me-2" onclick="editSale(${originalIndex}, '${sale.date}', ${sale.amount})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSale(${originalIndex})">🗑️</button>
            </td>
        `;
    });
}

// ฟอร์แมตวันที่ให้เป็น D/M/Y (แบบ ISO: YYYY-MM-DD)
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${parseInt(day)}/${parseInt(month)}/${parseInt(year)}`; 
}


// ----------------------------------------------------------------------
// ฟังก์ชัน CRUD และ Status Update
// ----------------------------------------------------------------------

// 1. บันทึก/เพิ่มยอดขาย
document.getElementById('saveSaleBtn').addEventListener('click', () => {
    const dateInput = document.getElementById('saleDate');
    const amountInput = document.getElementById('dailySale');
    const date = dateInput.value;
    const amount = parseFloat(amountInput.value);

    if (!date || isNaN(amount) || amount < 0) { 
        Swal.fire('ข้อผิดพลาด!', 'กรุณาใส่วันที่และยอดขายที่ถูกต้อง', 'error');
        return;
    }

    const existingIndex = salesData.findIndex(sale => sale.date === date);

    if (existingIndex !== -1) {
        salesData[existingIndex].amount = amount;
        Swal.fire('อัพเดทสำเร็จ!', `ยอดขายวันที่ ${formatDate(date)} ถูกอัพเดทเป็น ${amount} บาท`, 'success');
    } else {
        const newSale = {
            date: date,
            amount: amount,
            isReceived: false 
        };
        salesData.push(newSale);
        Swal.fire('บันทึกสำเร็จ!', `บันทึกยอดขายวันที่ ${formatDate(date)} จำนวน ${amount} บาท`, 'success');
    }

    saveSalesData();
    loadSalesData(); 
    populateMonthSelector();
    displaySalesData();

    amountInput.value = '';
    dateInput.value = new Date().toISOString().substring(0, 10);
});

// 2. แก้ไขยอดขาย
function editSale(index, currentDate, currentAmount) {
    Swal.fire({
        title: `แก้ไขยอดขายวันที่ ${formatDate(currentDate)}`,
        html: `
            <label for="swal-input1" class="swal2-input-label">ยอดขายใหม่ (บาท):</label>
            <input id="swal-input1" class="swal2-input" type="number" value="${currentAmount}">
        `,
        focusConfirm: false,
        preConfirm: () => {
            const newAmount = parseFloat(document.getElementById('swal-input1').value);
            if (isNaN(newAmount) || newAmount < 0) {
                Swal.showValidationMessage('กรุณาใส่ตัวเลขที่ถูกต้อง');
                return false;
            }
            return newAmount;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            salesData[index].amount = result.value;
            saveSalesData();
            loadSalesData();
            displaySalesData();
            Swal.fire('แก้ไขสำเร็จ!', `อัพเดทยอดขายวันที่ ${formatDate(currentDate)} เป็น ${result.value} บาท`, 'success');
        }
    });
}

// 3. ลบยอดขาย
function deleteSale(index) {
    const dateToDelete = salesData[index].date;
     Swal.fire({
        title: 'คุณแน่ใจหรือไม่?',
        text: `ต้องการลบยอดขายวันที่ ${formatDate(dateToDelete)} ใช่ไหม?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            salesData.splice(index, 1); 
            saveSalesData();
            loadSalesData();
            populateMonthSelector();
            displaySalesData();
            Swal.fire('ลบสำเร็จ!', `ลบยอดขายวันที่ ${formatDate(dateToDelete)} เรียบร้อย`, 'success');
        }
    });
}

// 4. สลับสถานะได้รับเงินแล้ว (Toggle)
function toggleReceivedStatus(index) {
    const saleDate = salesData[index].date;
    const currentStatus = salesData[index].isReceived;
    
    // สลับสถานะ
    salesData[index].isReceived = !currentStatus; 
    
    saveSalesData();
    displaySalesData();
    
    // แสดง SweetAlert แจ้งสถานะ
    Swal.fire({
        icon: 'info',
        title: 'สถานะอัพเดท',
        text: `ยอดเงินโอนเข้าบัญชีจากยอดขายวันที่ ${formatDate(saleDate)} ถูกตั้งค่าเป็น ${!currentStatus ? '✅ ได้รับแล้ว' : '⚠️ รอรับ'}`,
        timer: 1500,
        showConfirmButton: false
    });
}

// 5. ล้างข้อมูลทั้งหมด
document.getElementById('clearDataBtn').addEventListener('click', () => {
    Swal.fire({
        title: 'คำเตือน!',
        text: "คุณต้องการล้างข้อมูลยอดขายทั้งหมดในเครื่องหรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ล้างทั้งหมด!',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem(LS_KEY);
            salesData = [];
            populateMonthSelector();
            displaySalesData();
            Swal.fire('ล้างข้อมูลสำเร็จ!', 'ข้อมูลทั้งหมดถูกลบออกจากเครื่องแล้ว', 'success');
        }
    });
});


// 6. Export to Excel (CSV-like)
document.getElementById('exportBtn').addEventListener('click', () => {
    const dataToExport = calculatePayments(salesData).map(sale => ({
        'วันที่': sale.date,
        'ยอดขายคนละครึ่ง (บาท)': sale.amount,
        'เงินเข้าวันถัดไป (50%)': sale.nextDayPayment,
        'ยอดคงเหลือในระบบ (50%)': sale.remainingBalance,
        'ยอดเงินเข้าบัญชีจริง (บาท)': sale.actualPaymentToday,
        'สถานะการรับเงิน': sale.isReceived ? 'ได้รับแล้ว' : 'รอรับ',
    }));
    
    if (dataToExport.length === 0) {
        Swal.fire('ไม่มีข้อมูล!', 'ไม่พบข้อมูลสำหรับ Export', 'warning');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ยอดขายคนละครึ่ง");
    XLSX.writeFile(wb, "ยอดขายคนละครึ่ง_Export.xlsx");
    
    Swal.fire('Export สำเร็จ!', 'ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว', 'success');
});

// 7. Import from Excel
document.getElementById('importBtn').addEventListener('click', () => {
    Swal.fire({
        title: 'นำเข้าข้อมูล (Import)',
        html: `
            <p><strong>หมายเหตุ:</strong> ไฟล์ Excel ควรมีคอลัมน์ "วันที่" (รูปแบบ YYYY-MM-DD) และ "ยอดขายคนละครึ่ง (บาท)"</p>
            <input type="file" id="importFile" accept=".xlsx, .xls" class="swal2-file">
        `,
        showCancelButton: true,
        confirmButtonText: 'นำเข้า',
        preConfirm: () => {
            const file = document.getElementById('importFile').files[0];
            if (!file) {
                Swal.showValidationMessage('กรุณาเลือกไฟล์');
                return false;
            }
            return file;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const file = result.value;
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet); 
                
                const importedData = json.map(row => ({
                    date: row['วันที่'], 
                    amount: parseFloat(row['ยอดขายคนละครึ่ง (บาท)']),
                    isReceived: row['สถานะการรับเงิน'] === 'ได้รับแล้ว' 
                })).filter(item => item.date && !isNaN(item.amount));
                
                importedData.forEach(item => {
                    const existingIndex = salesData.findIndex(sale => sale.date === item.date);
                    if (existingIndex !== -1) {
                         salesData[existingIndex] = item;
                    } else {
                         salesData.push(item);
                    }
                });

                saveSalesData();
                loadSalesData();
                populateMonthSelector();
                displaySalesData();
                Swal.fire('นำเข้าสำเร็จ!', `นำเข้า/อัพเดทข้อมูล ${importedData.length} รายการ`, 'success');

            };
            reader.readAsArrayBuffer(file);
        }
    });
});

// Event Listener สำหรับเปลี่ยนเดือน
document.getElementById('monthSelector').addEventListener('change', displaySalesData);

// ----------------------------------------------------------------------
// การเริ่มต้นโปรแกรม
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().substring(0, 10);
    document.getElementById('saleDate').value = today;
    
    loadSalesData();
    populateMonthSelector();
    displaySalesData();

    // PWA Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('Service Worker: Registered'))
                .catch(err => console.error('Service Worker: Registration failed: ', err));
        });
    }
});