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
// หลักการคำนวณ: เงินเข้าบัญชีและยอดคงเหลือ
// ----------------------------------------------------------------------

/**
 * คำนวณยอดเงินเข้าบัญชีจริงในแต่ละวัน 
 * ตามหลักการ: เงินเข้า 50% ของยอดขายวันก่อนหน้า + ยอดคงเหลือที่ค้างมาจากวันก่อนๆ
 * @param {Array} data - ข้อมูลยอดขายทั้งหมด (ต้องเรียงตามวันที่)
 * @returns {Array} - ข้อมูลยอดขายพร้อมการคำนวณเงินเข้า
 */
function calculatePayments(data) {
    if (data.length === 0) return [];

    // จำลองการเงินคงเหลือในระบบ (ใช้ Map เพื่อให้เข้าถึงง่ายด้วย Key เป็น 'YYYY-MM-DD')
    let remainingBalances = new Map(); 
    let calculatedData = [];

    data.forEach((sale, index) => {
        // ยอดขายของวันนั้น
        const dailySale = parseFloat(sale.amount);
        // เงินที่จะเข้าบัญชีในวันถัดไป (50% ของยอดขายวันนี้)
        const nextDayPayment = dailySale / 2;
        // ยอดคงเหลือในระบบของวันนี้ (50% ของยอดขายวันนี้)
        const currentRemaining = dailySale / 2; 

        // ----------------- การคำนวณ "เงินเข้าบัญชีจริงในวันนี้" -----------------
        let actualPaymentToday = 0;

        // หา "วันถัดไป" (วันที่เงินควรจะเข้า)
        const paymentDate = new Date(sale.date);
        paymentDate.setDate(paymentDate.getDate() + 1);
        const paymentDateStr = paymentDate.toISOString().substring(0, 10);

        // 1. เงิน 50% ที่เข้าจากยอดขาย "เมื่อวาน" (ยอดที่กำลังถูกประมวลผล)
        actualPaymentToday += nextDayPayment;

        // 2. ตรวจสอบยอดคงเหลือที่ค้างอยู่ (ยอด 50% ที่ถูกแบ่งชำระจากวันก่อนหน้าเมื่อวาน)
        // ในโปรเจกต์คนละครึ่งเฟส 3 เป็นต้นไป (2564) เงินจะเข้า 50% ในวันถัดไป และ 50% ที่เหลือจะเข้ามาในรอบถัดไป
        // หากต้องการให้เป็นเหมือนการ "ทบ" ยอดคงเหลือ
        
        // เราจะเก็บยอดคงเหลือ (50% ที่สอง) ของยอดขายนี้ ไว้รอเข้าในรอบถัดไป (สมมติว่าเป็นรอบที่ 2)
        // เพื่อความเรียบง่ายตามโจทย์ "วันนี้เงินเข้าแล้ว ให้เรา กด กว่าเข้าแล้วเหลือเท่านี้"
        // เราจะกำหนดให้ยอด 50% ที่เข้า "วันนี้" คือยอดขายของเมื่อวาน
        
        // *** ปรับการคำนวณให้สอดคล้องกับหลักการเงินเข้าสองรอบ (50%+50%):
        
        // เงินเข้าบัญชีวันถัดไป (50% แรก): คือ nextDayPayment 
        // เงินคงเหลือในระบบ (50% ที่สอง): คือ currentRemaining ที่จะเข้าในรอบถัดไป

        // หากเรามีฟิลด์ `isReceived` ในข้อมูล แสดงว่าเราต้องติดตามสถานะเงินเข้า 2 ส่วน:
        // ส่วนที่ 1: เงิน 50% แรก (วันถัดไป)
        // ส่วนที่ 2: เงิน 50% ที่สอง (ที่เหลือ)
        
        // เพื่อความง่าย (Simple UI) ตามโจทย์:
        // เงินเข้าบัญชีจริงในวันนี้ (Actual Payment) = 50% ของยอดขายเมื่อวาน + ยอดคงเหลือจากวันก่อนๆ ที่ถูก "Mark as Received" แล้ว
        
        // --- ใช้หลักการที่ผู้ใช้ให้มา:
        // วันที่ 2: เงินเข้า = 600 (จาก 1200 วันที่ 1) + 500 (ที่เหลือของวันที่ 1) = 1100
        // วันที่ 3: เงินเข้า = 650 (จาก 1300 วันที่ 2) + 600 (ที่เหลือของวันที่ 2) = 1250

        // ดังนั้น **ยอดเงินเข้าในวันที่ $T+1$** คือ **$50\%$ ของยอดขายวันที่ $T$** **บวกกับ** **$50\%$ ที่เหลือของยอดขายวันที่ $T-1$**

        // เราจะหาข้อมูลของ 'เมื่อวาน' (T-1) เพื่อหา 'ยอดคงเหลือ'
        const yesterdayData = data[index - 1]; 
        let yesterdayRemaining = 0;
        
        // 50% ของยอดขายวันนี้: คือ 'เงินเข้าวันถัดไป'
        sale.nextDayPayment = nextDayPayment;
        // 50% ของยอดขายวันนี้: คือ 'ยอดคงเหลือในระบบ' 
        sale.remainingBalance = currentRemaining;
        
        // หากไม่ใช่รายการแรก และมี 'ยอดคงเหลือในระบบ' จากวันก่อนหน้า
        if (yesterdayData) {
            yesterdayRemaining = yesterdayData.remainingBalance;
            
            // **เงินเข้าบัญชีจริงในวันนี้ (T+1)**
            // คือ 50% ของยอดขายเมื่อวาน (yesterdayData.nextDayPayment)
            // บวกกับ 50% ที่เหลือของยอดขายวันก่อนหน้าเมื่อวาน (yesterdayData.remainingBalance)
            sale.actualPaymentToday = yesterdayData.nextDayPayment + yesterdayRemaining;
        } else {
             // รายการแรก (วันที่ 1): จะไม่มีเงินเข้าบัญชี
             sale.actualPaymentToday = 0;
        }

        // กำหนดสถานะการรับเงิน (isReceived) ให้กับรายการที่ถูกบันทึก
        // ในข้อมูลของเรา จะเป็นสถานะการรับเงินของ "ยอดขาย" ในวันนี้
        // sale.isReceived จะเป็น true/false สำหรับยอดขายของ **วันนี้** (dailySale)
        // เพื่อให้สอดคล้องกับ UI เราจะให้ isReceived คือสถานะการรับเงิน **Actual Payment Today**
        if (sale.isReceived === undefined) {
             sale.isReceived = false; 
        }

        calculatedData.push(sale);
    });

    return calculatedData;
}


// ----------------------------------------------------------------------
// ฟังก์ชันการจัดการ UI และ Event Listeners
// ----------------------------------------------------------------------

// สร้าง Option สำหรับ Month Selector
function populateMonthSelector() {
    const selector = document.getElementById('monthSelector');
    selector.innerHTML = ''; // เคลียร์ของเก่า

    // กรองและหาเดือน-ปีที่ไม่ซ้ำกัน
    const uniqueMonths = [...new Set(salesData.map(sale => sale.date.substring(0, 7)))];
    uniqueMonths.sort().reverse(); // เรียงจากเดือนล่าสุด

    // เพิ่มตัวเลือก "ทั้งหมด"
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

    // ตั้งค่าเดือนปัจจุบันเป็นค่าเริ่มต้น
    if (uniqueMonths.length > 0) {
        selector.value = uniqueMonths[0];
    } else {
        selector.value = 'all';
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
    
    // คำนวณข้อมูลใหม่ทั้งหมดก่อนแสดง
    const calculatedData = calculatePayments(salesData);

    // กรองข้อมูลตามเดือนที่เลือก
    const filteredData = calculatedData.filter(sale => {
        if (selectedMonth === 'all') return true;
        return sale.date.startsWith(selectedMonth);
    });
    
    tableBody.innerHTML = ''; // เคลียร์ตาราง
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4">ไม่พบข้อมูลในเดือนนี้</td></tr>';
        document.getElementById('currentMonthYear').textContent = '';
        return;
    }
    
    // อัพเดทชื่อเดือนที่แสดง
    const [year, month] = selectedMonth.split('-');
    document.getElementById('currentMonthYear').textContent = (selectedMonth === 'all' ? 'ทั้งหมด' : `${getMonthName(parseInt(month))} ${year}`);


    filteredData.forEach((sale, index) => {
        const row = tableBody.insertRow();
        
        // สถานะและคลาส
        const statusClass = sale.isReceived ? 'status-received' : 'status-pending';
        const statusText = sale.isReceived ? '✅ ได้รับแล้ว' : 'รอรับ / ยังไม่กด';

        // หา Index เดิมใน Array salesData (สำคัญสำหรับการแก้ไข/ลบ)
        const originalIndex = salesData.findIndex(d => d.date === sale.date);

        row.innerHTML = `
            <td data-label="วันที่">${formatDate(sale.date)}</td>
            <td data-label="ยอดขาย (บ.)">${sale.amount.toFixed(2)}</td>
            <td data-label="เงินเข้าวันถัดไป (บ.)">${sale.nextDayPayment.toFixed(2)}</td>
            <td data-label="เหลือในระบบ (บ.)">${sale.remainingBalance.toFixed(2)}</td>
            <td data-label="ยอดเข้าบัญชีจริง (บ.)"><strong>${sale.actualPaymentToday.toFixed(2)}</strong></td>
            <td data-label="สถานะเข้าบัญชี" class="${statusClass}">
                <button class="btn btn-sm ${sale.isReceived ? 'btn-success' : 'btn-warning'}" 
                        onclick="toggleReceivedStatus(${originalIndex})">
                    ${statusText}
                </button>
            </td>
            <td data-label="เครื่องมือ">
                <button class="btn btn-sm btn-info me-2" onclick="editSale(${originalIndex}, '${sale.date}', ${sale.amount})">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSale(${originalIndex})">🗑️</button>
            </td>
        `;
    });
}

// ฟอร์แมตวันที่ให้เป็น D/M/Y (แบบไทย)
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${parseInt(day)}/${parseInt(month)}/${parseInt(year) + 543}`;
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

    if (!date || isNaN(amount) || amount <= 0) {
        Swal.fire('ข้อผิดพลาด!', 'กรุณาใส่วันที่และยอดขายที่ถูกต้อง', 'error');
        return;
    }

    const existingIndex = salesData.findIndex(sale => sale.date === date);

    if (existingIndex !== -1) {
        // อัพเดทข้อมูลเดิม
        salesData[existingIndex].amount = amount;
        Swal.fire('อัพเดทสำเร็จ!', `ยอดขายวันที่ ${formatDate(date)} ถูกอัพเดทแล้ว`, 'success');
    } else {
        // เพิ่มข้อมูลใหม่
        const newSale = {
            date: date,
            amount: amount,
            isReceived: false // กำหนดค่าเริ่มต้นเป็น false
        };
        salesData.push(newSale);
        Swal.fire('บันทึกสำเร็จ!', `บันทึกยอดขายวันที่ ${formatDate(date)} จำนวน ${amount} บาท`, 'success');
    }

    saveSalesData();
    loadSalesData(); // โหลดใหม่เพื่อให้เรียงวันที่ถูกต้อง
    populateMonthSelector();
    displaySalesData();

    // ล้างฟอร์ม
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
            if (isNaN(newAmount) || newAmount <= 0) {
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
            salesData.splice(index, 1); // ลบ 1 รายการที่ index
            saveSalesData();
            loadSalesData();
            populateMonthSelector();
            displaySalesData();
            Swal.fire('ลบสำเร็จ!', `ลบยอดขายวันที่ ${formatDate(dateToDelete)} เรียบร้อย`, 'success');
        }
    });
}

// 4. สลับสถานะได้รับเงินแล้ว
function toggleReceivedStatus(index) {
    const currentStatus = salesData[index].isReceived;
    salesData[index].isReceived = !currentStatus;
    saveSalesData();
    displaySalesData();
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
        html: '<input type="file" id="importFile" accept=".xlsx, .xls" class="swal2-file">',
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
                // แปลงข้อมูลเป็น JSON Array
                const json = XLSX.utils.sheet_to_json(worksheet); 
                
                // แปลงโครงสร้างให้เข้ากับ salesData 
                const importedData = json.map(row => ({
                    date: row['วันที่'], // ต้องตรงกับชื่อคอลัมน์ในไฟล์
                    amount: parseFloat(row['ยอดขายคนละครึ่ง (บาท)']),
                    // isReceived อาจจะต้องกำหนดค่าเริ่มต้นหรือตามข้อมูลในไฟล์
                    isReceived: row['สถานะการรับเงิน'] === 'ได้รับแล้ว' 
                })).filter(item => item.date && !isNaN(item.amount));
                
                // ผนวกข้อมูลที่นำเข้ากับข้อมูลเดิม (สามารถเลือกที่จะแทนที่ได้)
                // เราจะใช้วิธีผนวกและแทนที่รายการที่มีวันที่ซ้ำกัน
                importedData.forEach(item => {
                    const existingIndex = salesData.findIndex(sale => sale.date === item.date);
                    if (existingIndex !== -1) {
                         salesData[existingIndex] = item; // แทนที่
                    } else {
                         salesData.push(item); // เพิ่มใหม่
                    }
                });

                saveSalesData();
                loadSalesData();
                populateMonthSelector();
                displaySalesData();
                Swal.fire('นำเข้าสำเร็จ!', `นำเข้าข้อมูล ${importedData.length} รายการ`, 'success');

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

// ตั้งค่าวันที่เริ่มต้นใน Input
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().substring(0, 10);
    document.getElementById('saleDate').value = today;
    
    // 1. โหลดข้อมูล
    loadSalesData();
    // 2. สร้างตัวเลือกเดือน
    populateMonthSelector();
    // 3. แสดงข้อมูล
    displaySalesData();

    // 4. PWA Service Worker (สำหรับทำให้ติดตั้งได้และทำงาน Offline)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('Service Worker: Registered'))
                .catch(err => console.error('Service Worker: Registration failed: ', err));
        });
    }
});