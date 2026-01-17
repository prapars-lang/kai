
/**
 * *********************************************************************************
 * ระบบบริหารจัดการงานกิจกรรมกีฬาสี 2025 (Sports Day Management System)
 * ฉบับสมบูรณ์: รองรับการแจ้งเตือนผ่าน Telegram ทั้งตอนส่งงานและตอนตรวจงาน
 * *********************************************************************************
 */

// ⚙️ การตั้งค่าระบบ (Configuration)
const CONFIG = {
  FOLDER_ID: '1RFo4R9L4MmhuKLINTxU_MjnGm32IPTvS', // 📁 ID โฟลเดอร์ใน Google Drive
  SHEET_ID: '1Q8H3WkidkIfW_e5Voinf1Xro07fU3GPmGCJla4aq9tw' // 📊 ID ของ Google Sheets
};

// 📱 Telegram Configuration
const TELEGRAM_BOT_TOKEN = '8331424730:AAFSQohH5QXg380flhcLyW_xupp8eppGyro';
const TELEGRAM_CHAT_ID = '-1003596963057';

/**
 * 🚀 ฟังก์ชันหลักสำหรับรับคำขอจาก Web App
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const data = params.data;
    let result;

    switch(action) {
      case 'upload': 
        result = processSubmission(data); 
        break;
      case 'list': 
        result = getSubmissionsWithReviews(); 
        break;
      case 'grade': 
        result = saveRubricReview(data); 
        break;
      case 'login': 
        result = checkTeacherLogin(data.username, data.pin); 
        break;
      case 'get_rubric': 
        result = getRubricCriteria(); 
        break;
      case 'setup': 
        result = setupInitialSheets();
        break;
      default: 
        result = { success: false, message: 'ไม่พบคำสั่ง (Unknown Action)' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดที่ Server: ' + err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 📁 ฟังก์ชันจัดการอัปโหลดไฟล์วิดีโอ และส่งแจ้งเตือน Telegram
 */
function processSubmission(data) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    
    // 1. แปลงไฟล์และบันทึกลง Drive
    const decodedFile = Utilities.base64Decode(data.fileData);
    const blob = Utilities.newBlob(decodedFile, data.mimeType || 'video/mp4', data.fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    // 2. บันทึกข้อมูลลง Google Sheets
    const sheet = getSheet('Submissions');
    const nextId = sheet.getLastRow() > 0 ? sheet.getLastRow() : 1;
    sheet.appendRow([
      nextId, 
      new Date(), 
      data.name, 
      data.studentNumber, 
      data.grade, 
      data.room, 
      fileUrl
    ]);

    // 3. ส่งแจ้งเตือนผ่าน Telegram (ตอนส่งงาน)
    const tgMessage = `<b>📢 มีการส่งงานใหม่!</b>\n\n` +
                      `👤 <b>นักเรียน:</b> ${data.name}\n` +
                      `🔢 <b>เลขที่:</b> ${data.studentNumber}\n` +
                      `🏫 <b>ระดับชั้น:</b> ${data.grade} (${data.room.replace('Room ', 'ห้อง ')})\n\n` +
                      `🔗 <b>ลิงก์วิดีโอ:</b> <a href="${fileUrl}">คลิกเพื่อเปิดดูวิดีโอ</a>`;
    sendTelegramNotification(tgMessage);
    
    return { success: true, fileUrl: fileUrl };
  } catch (e) {
    return { success: false, message: 'อัปโหลดไม่สำเร็จ: ' + e.toString() };
  }
}

/**
 * 📝 ฟังก์ชันบันทึกการตรวจให้คะแนน และส่งแจ้งเตือน Telegram
 */
function saveRubricReview(data) {
  try {
    const sheet = getSheet('Reviews');
    const subSheet = getSheet('Submissions');
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // ค้นหาแถวที่จะอัปเดตหรือเพิ่มใหม่
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === data.rowId.toString()) { 
        rowIndex = i + 1; 
        break; 
      }
    }
    
    const rowData = [
      data.rowId, 
      data.contentAccuracy, 
      data.participation, 
      data.presentation, 
      data.discipline, 
      data.totalScore, 
      data.percentage, 
      data.comment, 
      new Date()
    ];
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    // --- ส่วนส่งแจ้งเตือน Telegram (ตอนตรวจงานเสร็จ) ---
    try {
      // ดึงชื่อนักเรียนจากชีต Submissions เพื่อนำมาใส่ในข้อความ
      const subData = subSheet.getDataRange().getValues();
      let studentName = "ไม่ระบุชื่อ";
      for (let j = 1; j < subData.length; j++) {
        if (subData[j][0].toString() === data.rowId.toString()) {
          studentName = subData[j][2]; // คอลัมน์ Name
          break;
        }
      }

      const reviewMessage = `<b>✅ ตรวจงานเสร็จเรียบร้อยแล้ว!</b>\n\n` +
                            `👤 <b>นักเรียน:</b> ${studentName}\n` +
                            `🏆 <b>คะแนนที่ได้:</b> ${data.totalScore}/20\n` +
                            `📊 <b>คิดเป็นร้อยละ:</b> ${data.percentage}%\n\n` +
                            `💬 <b>ข้อความจากครู:</b>\n<i>"${data.comment || 'ทำได้ดีมากจ๊ะ!'}"</i>`;
      sendTelegramNotification(reviewMessage);
    } catch (errTg) {
      console.error('Error sending Telegram in saveRubricReview: ' + errTg.toString());
    }
    
    return { success: true };
  } catch (e) {
    return { success: false, message: 'บันทึกคะแนนไม่สำเร็จ: ' + e.toString() };
  }
}

/**
 * 📡 ฟังก์ชันส่งข้อความไปยัง Telegram
 */
function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    'chat_id': TELEGRAM_CHAT_ID,
    'text': message,
    'parse_mode': 'HTML',
    'disable_web_page_preview': false
  };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error('Telegram Error: ' + e.toString());
  }
}

/**
 * 📊 ฟังก์ชันดึงรายการข้อมูลพร้อมผลการตรวจ
 */
function getSubmissionsWithReviews() {
  try {
    const subSheet = getSheet('Submissions');
    const revSheet = getSheet('Reviews');
    const subData = subSheet.getDataRange().getValues();
    const revData = revSheet.getDataRange().getValues();
    
    const reviewMap = {};
    for (let i = 1; i < revData.length; i++) {
      reviewMap[revData[i][0]] = {
        contentAccuracy: revData[i][1],
        participation: revData[i][2],
        presentation: revData[i][3],
        discipline: revData[i][4],
        totalScore: revData[i][5],
        percentage: revData[i][6],
        comment: revData[i][7],
        gradedAt: revData[i][8],
        status: 'Graded'
      };
    }

    const results = subData.slice(1).map(row => ({
      rowId: row[0],
      timestamp: row[1],
      name: row[2],
      studentNumber: row[3].toString(),
      grade: row[4],
      room: row[5],
      fileUrl: row[6],
      review: reviewMap[row[0]] || null
    }));
    
    return { success: true, data: results.reverse() };
  } catch (e) {
    return { success: false, message: 'ดึงข้อมูลล้มเหลว: ' + e.toString() };
  }
}

/**
 * 🔐 ฟังก์ชันตรวจสอบการล็อกอินของคุณครู
 */
function checkTeacherLogin(username, pin) {
  try {
    const sheet = getSheet('Teachers');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === username.toString() && data[i][1].toString() === pin.toString()) {
        return { success: true, teacherName: data[i][2] };
      }
    }
    return { success: false, message: "ชื่อผู้ใช้หรือรหัส PIN ไม่ถูกต้อง" };
  } catch (e) {
    return { success: false, message: "ระบบล็อกอินขัดข้อง" };
  }
}

/**
 * 🎨 ฟังก์ชันดึงเกณฑ์การประเมิน
 */
function getRubricCriteria() {
  try {
    const sheet = getSheet('Rubric');
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { 
        success: true, 
        data: [
          { name: 'เนื้อหาและความถูกต้อง', icon: '✅' },
          { name: 'การมีส่วนร่วมในกิจกรรม', icon: '🤝' },
          { name: 'เทคนิคการนำเสนอ', icon: '🎤' },
          { name: 'ความมีวินัยและตรงต่อเวลา', icon: '📏' }
        ] 
      };
    }
    return { success: true, data: data.slice(1).map(r => ({ name: r[0], icon: r[2] })) };
  } catch (e) {
    return { success: false, message: 'ดึงข้อมูลเกณฑ์ล้มเหลว' };
  }
}

/**
 * 🛠️ ฟังก์ชันช่วยเหลือ (Helpers)
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initSheetHeaders(sheet, sheetName);
  }
  return sheet;
}

function initSheetHeaders(sheet, sheetName) {
  let headers = [];
  if (sheetName === 'Submissions') headers = ['ID', 'Timestamp', 'Name', 'Student Number', 'Grade', 'Room', 'File URL'];
  else if (sheetName === 'Reviews') headers = ['Submission ID', 'Content Accuracy', 'Participation', 'Presentation', 'Discipline', 'Total Score', 'Percentage', 'Comment', 'Graded At'];
  else if (sheetName === 'Teachers') headers = ['Username', 'PIN', 'Name'];
  else if (sheetName === 'Rubric') headers = ['Criterion', 'Max Points', 'Icon'];

  if (headers.length > 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight('bold')
         .setBackground('#4F46E5')
         .setFontColor('#FFFFFF')
         .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }
}

function setupInitialSheets() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const teacherSheet = getSheet('Teachers');
    if (teacherSheet.getLastRow() === 1) {
      teacherSheet.appendRow(['admin', '1234', 'ครูใจดี มีความสุข']);
    }
    const rubricSheet = getSheet('Rubric');
    if (rubricSheet.getLastRow() === 1) {
      rubricSheet.appendRow(['เนื้อหาและความถูกต้อง', '5', '✅']);
      rubricSheet.appendRow(['การมีส่วนร่วมในกิจกรรม', '5', '🤝']);
      rubricSheet.appendRow(['เทคนิคการนำเสนอ', '5', '🎤']);
      rubricSheet.appendRow(['ความมีวินัยและตรงต่อเวลา', '5', '📏']);
    }
    return { success: true, message: 'Setup สำเร็จเรียบร้อยแล้ว' };
  } catch (e) {
    return { success: false, message: 'Setup ล้มเหลว: ' + e.toString() };
  }
}
